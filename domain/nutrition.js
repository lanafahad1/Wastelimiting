// Meal nutrition. CareBite's only nutrient source is the SFDA Saudi Food
// Composition Tables (SFCT): laboratory-analysed values per 100 g of whole
// traditional dishes. A dish is linked to an SFCT entry only when the kitchen
// prepares it to that standard recipe. A dish without an SFCT link has no
// nutrient values. Missing values are never estimated or treated as zero;
// rules that need them send the meal to admin review.
//
// A complete meal sums its components. A total is shown as complete only when
// every component reports that nutrient; otherwise the known part is shown as a
// partial total with the components it leaves out.

/**
 * Consistency check of a published SFCT table: energy must agree with protein,
 * fat, available carbohydrate and fibre (4/9/4/2 kcal per g), kJ with kcal, and
 * total with available carbohydrate plus fibre. Values are never corrected;
 * an entry that fails is shown as published and cannot be linked to a dish.
 */
export function sfctConsistencyIssue(entry) {
  const p = entry?.per100g;
  if (!p || p.kcal == null || p.protein == null || p.fat == null || p.availableCarbs == null) return null;
  const issues = [];
  const calc = 4 * p.protein + 9 * p.fat + 4 * p.availableCarbs + 2 * (p.fiber ?? 0);
  if (Math.abs(calc - p.kcal) > Math.max(8, p.kcal * 0.06)) issues.push(`energy ${p.kcal} kcal vs about ${Math.round(calc)} kcal from its macronutrients`);
  if (p.energyKj != null && Math.abs(p.kcal * 4.184 - p.energyKj) > 15) issues.push(`${p.energyKj} kJ does not match ${p.kcal} kcal`);
  if (p.totalCarbs != null && Math.abs(p.availableCarbs + (p.fiber ?? 0) - p.totalCarbs) > 0.6) issues.push(`total carbohydrate ${p.totalCarbs} g vs available carbohydrate plus fibre ${Math.round((p.availableCarbs + (p.fiber ?? 0)) * 10) / 10} g`);
  return issues.length ? `The published table is internally inconsistent (per 100 g: ${issues.join('; ')}).` : null;
}

export const NUTRIENTS = [
  { key: 'kcal', label: 'Energy', unit: 'kcal', decimals: 0, sfct: 'kcal' },
  { key: 'protein', label: 'Protein', unit: 'g', decimals: 1, sfct: 'protein' },
  { key: 'carbs', label: 'Total carbohydrate', unit: 'g', decimals: 1, sfct: 'totalCarbs' },
  { key: 'availableCarbs', label: 'Available carbohydrate', unit: 'g', decimals: 1, sfct: 'availableCarbs' },
  { key: 'fiber', label: 'Dietary fibre', unit: 'g', decimals: 1, sfct: 'fiber' },
  { key: 'sugar', label: 'Total sugars', unit: 'g', decimals: 1, sfct: 'totalSugars' },
  { key: 'addedSugar', label: 'Added sugar', unit: 'g', decimals: 1, sfct: 'addedSugar' },
  { key: 'fat', label: 'Total fat', unit: 'g', decimals: 1, sfct: 'fat' },
  { key: 'satFat', label: 'Saturated fat', unit: 'g', decimals: 1, sfct: 'satFat' },
  { key: 'cholesterol', label: 'Cholesterol', unit: 'mg', decimals: 0, sfct: 'cholesterol' },
  { key: 'sodium', label: 'Sodium', unit: 'mg', decimals: 0, sfct: 'sodium' },
  { key: 'potassium', label: 'Potassium', unit: 'mg', decimals: 0, sfct: 'potassium' },
  { key: 'phosphorus', label: 'Phosphorus', unit: 'mg', decimals: 0, sfct: 'phosphorus' },
  { key: 'calcium', label: 'Calcium', unit: 'mg', decimals: 0, sfct: 'calcium' },
  { key: 'iron', label: 'Iron', unit: 'mg', decimals: 1, sfct: 'iron' },
];

const round = (v, d) => (v == null ? null : Math.round(v * 10 ** d) / 10 ** d);
const empty = (v = null) => Object.fromEntries(NUTRIENTS.map((n) => [n.key, v]));

/**
 * Nutrition of one standard portion of a dish.
 * @param {object} dish  { name, portionG, nutrition: { source: 'sfct'|'none', sfctId } }
 * @param {object} sfct  the SFCT library ({ [id]: entry })
 */
export function dishNutrition(dish, sfct = {}) {
  const entry = dish.nutrition?.source === 'sfct' ? sfct[dish.nutrition.sfctId] : null;
  if (!entry) {
    const reason = dish.nutrition?.source === 'sfct' ? `the linked SFCT entry “${dish.nutrition.sfctId}” was not found` : 'no SFDA Saudi Food Composition Table entry is linked';
    return { available: false, perPortion: empty(), complete: empty(false), source: null, reason, entry: null };
  }
  const perPortion = {};
  const complete = {};
  for (const n of NUTRIENTS) {
    const v = entry.per100g?.[n.sfct];
    complete[n.key] = v != null;
    perPortion[n.key] = v == null ? null : round((v * dish.portionG) / 100, n.decimals);
  }
  return {
    available: true, perPortion, complete, reason: null,
    source: { id: 'SFDA-SFCT', sfctId: dish.nutrition.sfctId, dish: entry.name, nameAr: entry.nameAr ?? null, region: entry.region, page: entry.tablePage, grams: dish.portionG },
    entry,
  };
}

/**
 * Nutrition of one standard serving of a meal (all components).
 * @param {Array<{name, grams, factor, nutrition}>} components  enriched components; `nutrition` is dishNutrition()
 */
export function mealNutrition(components) {
  const perServing = {};
  const partial = {};
  const complete = {};
  const missing = {};
  for (const n of NUTRIENTS) {
    const known = [];
    const lacking = [];
    for (const c of components) {
      const v = c.nutrition.perPortion[n.key];
      if (v == null) lacking.push(c.nutrition.available ? `${c.name} (not reported by the SFCT)` : `${c.name} (no SFCT values)`);
      else known.push(v * c.factor);
    }
    const sum = known.length ? round(known.reduce((s, v) => s + v, 0), n.decimals) : null;
    complete[n.key] = lacking.length === 0;
    missing[n.key] = lacking;
    perServing[n.key] = lacking.length ? null : sum;
    partial[n.key] = lacking.length && known.length ? sum : null;
  }
  const withData = components.filter((c) => c.nutrition.available);
  const available = withData.length > 0;
  const allComplete = Object.values(complete).every(Boolean);
  const sources = withData.map((c) => ({ component: c.name, ...c.nutrition.source, grams: c.grams }));
  let method;
  if (!available) method = 'No nutrient values are available: none of this meal’s dishes is linked to an SFDA Saudi Food Composition Table entry. Values are never estimated.';
  else if (withData.length < components.length) method = `Partial: laboratory values from the SFDA Saudi Food Composition Tables for ${withData.map((c) => c.name).join(', ')}. ${components.filter((c) => !c.nutrition.available).map((c) => c.name).join(', ')} ${components.length - withData.length === 1 ? 'has' : 'have'} no SFCT values, so totals that need ${components.length - withData.length === 1 ? 'it' : 'them'} are not shown.`;
  else method = `Laboratory-analysed values from the SFDA Saudi Food Composition Tables, per 100 g of each dish, multiplied by the portion weight${components.length > 1 ? ' and added across the components' : ''}.`;
  return {
    perServing, partial, complete, missing, available, allComplete,
    allAvailable: available && withData.length === components.length,
    source: available ? 'SFDA-SFCT' : null, sources, method,
    byComponent: components.map((c) => ({ name: c.name, dishId: c.dishId, kind: c.kind, grams: c.grams, available: c.nutrition.available, values: scaleNutrition(c.nutrition.perPortion, c.factor), source: c.nutrition.source })),
  };
}

/** Scale per-serving nutrition by a portion factor (null stays null). */
export function scaleNutrition(perServing, factor) {
  const out = {};
  for (const n of NUTRIENTS) out[n.key] = perServing?.[n.key] == null ? null : round(perServing[n.key] * factor, n.decimals);
  return out;
}

/** Share of a serving's energy that comes from a nutrient (kcal per g: fat 9, carbohydrate and sugar 4). */
export function energyShare(perServing, key) {
  const kcalPerGram = key === 'satFat' || key === 'fat' ? 9 : 4;
  if (perServing[key] == null || !perServing.kcal) return null;
  return (perServing[key] * kcalPerGram) / perServing.kcal;
}
