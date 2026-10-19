// CareBite transparent rule-based recommendation engine (hospital version).
//
// Order of operations (safety first):
//   1. Diet order status (NPO), allergies, intolerances, diet categories and
//      medically required exclusions → EXCLUDED when a conflict is certain.
//   2. Missing or unverified information (allergies not assessed, uncoded or
//      patient-reported allergies awaiting review, texture-modified diets,
//      missing diet limits, menu information not yet verified, incomplete
//      nutrition data) → NEEDS REVIEW by an admin; never assumed to pass.
//   3. Medical nutrient rules, screened separately for every portion the diet
//      order permits. A meal with no passing portion is EXCLUDED.
//   4. Only then are eligible meals ranked by preferences, appetite and
//      recorded intake, and a portion is suggested.
// Preferences and feedback can never bring back an excluded meal.

import { MEDICAL_RULES, MEAL_SHARE, DIET_CATEGORIES, dietCategory } from './rules.js';
import { ALLERGENS, PORTIONS, portionFactor } from './constants.js';
import { energyShare, NUTRIENTS, scaleNutrition } from './nutrition.js';
import { TEXTURE_LEVELS } from './patient.js';

export const ENGINE_VERSION = '3.0.0';

const NUTRIENT_META = Object.fromEntries(NUTRIENTS.map((n) => [n.key, n]));
const ORDER = PORTIONS.map((p) => p.id);
const lc = (s) => s.charAt(0).toLowerCase() + s.slice(1);
const fmt = (v, unit) => `${Number(v).toLocaleString('en-US', { maximumFractionDigits: 1 })}${unit === 'kcal' ? ' kcal' : ` ${unit}`}`;
const pct = (x) => `${Math.round(x * 100)}%`;
const portionLabel = (id) => PORTIONS.find((p) => p.id === id)?.label.toLowerCase() ?? id;
const phraseOf = (g) => ALLERGENS.find((x) => x.id === g)?.phrase ?? g;

/** Numeric parameters of a diet order, with documented defaults. */
export function dietParams(patient) {
  const o = patient.dietOrder;
  const sodiumDefaults = o.categories.map((c) => dietCategory(c)?.defaults?.sodiumMgPerDay).filter(Boolean);
  return {
    sodiumMgPerDay: o.sodiumMgPerDay ?? (sodiumDefaults.length ? Math.min(...sodiumDefaults) : null),
    sodiumFromOrder: o.sodiumMgPerDay != null,
    carbsGPerMeal: o.carbsGPerMeal ?? null,
    potassiumMgPerDay: o.potassiumMgPerDay ?? null,
    phosphorusMgPerDay: o.phosphorusMgPerDay ?? null,
  };
}

/** Medical rules that apply to a patient's diet order (plus rules that apply to everyone). */
export function activeRules(patient) {
  const ids = new Set(patient.dietOrder.categories.flatMap((c) => dietCategory(c)?.rules ?? []));
  return MEDICAL_RULES.filter((r) => r.status === 'active' && (r.everyone || ids.has(r.id)));
}

function limitFor(rule, period, params) {
  const share = MEAL_SHARE[period] ?? 0.3;
  if (rule.method === 'daily-allocation' || rule.kind === 'rank-limit') {
    const daily = rule.dailyLimit ?? params[rule.param];
    if (daily == null) return null;
    const source = rule.dailyLimit ? 'MOH and SFDA salt guidance' : rule.param === 'sodiumMgPerDay' && !params.sodiumFromOrder ? 'MOH/SFDA default for this diet' : 'diet order';
    return { value: Math.round(daily * share), explain: `${pct(share)} of ${fmt(daily, rule.unit)}/day, ${source}` };
  }
  if (rule.method === 'per-meal') {
    const v = params.carbsGPerMeal;
    if (v == null) return null; // set by the admin; covered by the DIET-CHO-PARAMS review
    return period === 'snack' ? { value: Math.round(v / 3), explain: `one-third of ${v} g per meal, diet order` } : { value: v, explain: `${v} g per meal, diet order` };
  }
  return null;
}

// An ingredient and its varieties (sameFood) are treated as one food.
const foodRoot = (ing) => ing?.sameFood ?? ing?.id;
const siblings = (ingId, ingredients) => {
  const root = foodRoot(ingredients[ingId]) ?? ingId;
  return Object.values(ingredients).filter((i) => i.id === ingId || foodRoot(i) === root).map((i) => i.id);
};

function nutrientValue(values, key) {
  return values[key];
}

/**
 * Evaluate one meal for one patient in one meal period.
 * @returns {{mealId, status: 'eligible'|'review'|'excluded', exclusions, reviewReasons, warnings, checks,
 *            reasons, score, points, matchLevel, portion, kitchenInstructions}}
 */
export function evaluateMeal(meal, patient, ctx) {
  const { catalog, intake = [] } = ctx;
  const period = ctx.period ?? meal.category;
  const ingredients = catalog.ingredients;
  const lines = meal.ingredients.map((l) => ({ ...l, ingredient: l.ingredient ?? ingredients[l.ing] }));
  // In a complete meal, name the component an ingredient comes from.
  const multi = meal.components?.length > 1;
  const names = (ls) => [...new Set(ls.map((l) => (multi ? `${l.ingredient.name} (${l.dishName})` : l.ingredient.name)))].join(', ');
  const order = patient.dietOrder;
  const cats = order.categories;
  const exclusions = [];
  const review = [];
  const warnings = [];
  const checks = [];
  const reasons = [];
  const exclude = (ruleId, message) => exclusions.push({ ruleId, message });
  const needsReview = (ruleId, message) => { if (!review.some((r) => r.ruleId === ruleId && r.message === message)) review.push({ ruleId, message }); };
  const withFlag = (flag) => lines.filter((l) => (l.ingredient.flags ?? []).includes(flag));

  // ---- 1. Diet order status, allergies, intolerances, restrictions ---------
  if (order.npo) exclude('DIET-NPO', 'The diet order is currently “nothing by mouth” (NPO). No meal can be offered.');

  if (patient.allergies.status === 'unknown') needsReview('ALG-UNKNOWN', 'Food allergies have not been assessed for this patient.');
  for (const group of patient.allergies.confirmed) {
    const a = ALLERGENS.find((x) => x.id === group);
    const phrase = phraseOf(group);
    const hits = lines.filter((l) => (l.ingredient.allergens ?? []).includes(group));
    const cross = lines.filter((l) => !hits.includes(l) && (l.ingredient.mayContain ?? []).includes(group));
    if (hits.length) exclude('ALG-CONTAINS', `Contains ${phrase} (${names(hits)}). The patient has a confirmed allergy to ${phrase}.`);
    else if (cross.length) exclude('ALG-CROSS', `${names(cross)} may contain ${phrase} through cross-contact or varying product formulations. This cannot be ruled out with the available data.`);
    else checks.push({ ruleId: 'ALG-CONTAINS', status: 'pass', label: `${a?.label ?? group} allergy`, detail: `No ingredient lists ${phrase} and no ${phrase} cross-contact risk is recorded.` });
  }
  for (const ingId of patient.allergies.ingredients) {
    const hits = lines.filter((l) => siblings(ingId, ingredients).includes(l.ing));
    const name = ingredients[ingId].name;
    if (hits.length) exclude('ALG-CONTAINS', `Contains ${names(hits)}. The patient has a confirmed allergy to ${lc(name)}.`);
    else checks.push({ ruleId: 'ALG-CONTAINS', status: 'pass', label: `${name} allergy`, detail: `${name} is not an ingredient.` });
  }
  for (const text of patient.allergies.uncoded) needsReview('ALG-UNCODED', `Allergy “${text}” could not be matched to the ingredient database, so this meal cannot be screened for it.`);
  // A possible allergy reported by the patient and not yet reviewed: precaution, not exclusion.
  for (const rep of patient.reportedAllergies ?? []) {
    if (patient.allergies.confirmed.includes(rep.group)) continue;
    const phrase = phraseOf(rep.group);
    const hits = lines.filter((l) => (l.ingredient.allergens ?? []).includes(rep.group) || (l.ingredient.mayContain ?? []).includes(rep.group));
    if (hits.length) needsReview('ALG-REPORTED', `The patient reported a possible allergy to ${phrase}${rep.date ? ` on ${rep.date}` : ''}, which an admin has not reviewed yet. This meal contains or may contain ${phrase} (${names(hits).toLowerCase()}).`);
  }

  if (patient.intolerances.selected.includes('lactose')) {
    const hits = withFlag('lactose');
    if (hits.length) exclude('INT-CONTAINS', `Contains lactose (${names(hits)}). The patient has lactose intolerance.`);
    else checks.push({ ruleId: 'INT-CONTAINS', status: 'pass', label: 'Lactose intolerance', detail: 'No lactose-containing dairy ingredients.' });
  }
  if (patient.intolerances.selected.includes('gluten-sensitivity')) {
    const hits = withFlag('gluten');
    if (hits.length) exclude('INT-CONTAINS', `Contains gluten (${names(hits)}). The patient has gluten sensitivity.`);
  }
  for (const ingId of patient.intolerances.ingredients) {
    const hits = lines.filter((l) => siblings(ingId, ingredients).includes(l.ing));
    if (hits.length) exclude('INT-CONTAINS', `Contains ${names(hits)}. The patient has an intolerance to ${lc(ingredients[ingId].name)}.`);
  }
  for (const text of patient.intolerances.uncoded) needsReview('ALG-UNCODED', `Intolerance “${text}” could not be matched to the ingredient database.`);

  const flesh = lines.filter((l) => ['meat', 'poultry', 'fish', 'shellfish'].some((f) => (l.ingredient.flags ?? []).includes(f)));
  if (cats.includes('vegan')) {
    const animal = lines.filter((l) => ['dairy', 'egg', 'honey'].some((f) => (l.ingredient.flags ?? []).includes(f)));
    if (flesh.length || animal.length) exclude('DIET-VEGAN', `Not vegan: contains ${names([...flesh, ...animal])}.`);
    else checks.push({ ruleId: 'DIET-VEGAN', status: 'pass', label: 'Vegan', detail: 'No animal products, based on ingredient data.' });
  } else if (cats.includes('vegetarian')) {
    if (flesh.length) exclude('DIET-VEGETARIAN', `Not vegetarian: contains ${names(flesh)}.`);
    else checks.push({ ruleId: 'DIET-VEGETARIAN', status: 'pass', label: 'Vegetarian', detail: 'No meat, poultry, fish or shellfish.' });
  }
  if (cats.includes('gluten-free')) {
    const gluten = lines.filter((l) => (l.ingredient.flags ?? []).includes('gluten') || (l.ingredient.allergens ?? []).includes('gluten'));
    const cross = lines.filter((l) => !gluten.includes(l) && (l.ingredient.mayContain ?? []).includes('gluten'));
    if (gluten.length) exclude('DIET-GLUTENFREE', `Not gluten-free: contains ${names(gluten)}.`);
    else if (cross.length) exclude('DIET-GLUTENFREE', `${names(cross)} may carry gluten through cross-contact, which a coeliac gluten-free diet cannot accept.`);
    else checks.push({ ruleId: 'DIET-GLUTENFREE', status: 'pass', label: 'Gluten-free', detail: 'No gluten-containing cereals and no gluten cross-contact risk recorded.' });
  }
  if (cats.includes('lactose-free')) {
    const hits = withFlag('lactose');
    if (hits.length) exclude('DIET-LACTOSEFREE', `Not lactose-free: contains ${names(hits)}.`);
    else checks.push({ ruleId: 'DIET-LACTOSEFREE', status: 'pass', label: 'Lactose-free', detail: 'No lactose-containing dairy ingredients.' });
  }
  for (const ingId of patient.restrictions.medicalExclusions) {
    const hits = lines.filter((l) => siblings(ingId, ingredients).includes(l.ing));
    if (hits.length) exclude('EXCL-MEDICAL', `Contains ${names(hits)}, which the care team has excluded.`);
  }
  if (meal.infoReview?.status === 'pending') {
    needsReview('MENU-INFO-REVIEW', `The dietary information for this meal (ingredients, allergens or nutrition source) was changed${meal.infoReview.changedBy ? ` by ${meal.infoReview.changedBy}` : ''} and has not been verified by an admin yet.`);
  }
  if (cats.includes('texture-modified')) {
    const lvl = TEXTURE_LEVELS.find((t) => t.id === order.textureLevel)?.label ?? 'the prescribed level';
    needsReview('DIET-TEXTURE', `Texture-modified diet (${lvl}). This menu item has no recorded IDDSI level, so the admin must confirm it can be prepared at this level.`);
  }
  if (cats.includes('consistent-carb')) {
    const sweet = withFlag('added_sugar');
    const required = sweet.filter((l) => !l.optional);
    if (required.length) exclude('DIET-NOSUGAR', `Contains added sugar (${names(required).toLowerCase()}). MOH advises people with diabetes not to add sugar to food.`);
    else checks.push({ ruleId: 'DIET-NOSUGAR', status: 'pass', label: 'No added sugar', detail: sweet.length ? `The optional ${names(sweet).toLowerCase()} is left out by the kitchen.` : 'The recipe adds no sugar, honey or syrup.' });
    if (order.carbsGPerMeal == null) needsReview('DIET-CHO-PARAMS', 'The consistent-carbohydrate diet order has no carbohydrate amount per meal yet, so carbohydrate cannot be screened.');
  }
  if (cats.includes('renal') && (order.potassiumMgPerDay == null || order.phosphorusMgPerDay == null)) {
    needsReview('DIET-RENAL-PARAMS', 'The renal diet order has no potassium and phosphorus limits yet, so potassium and phosphorus cannot be screened.');
  }

  // ---- 2. Medical nutrient rules, screened per permitted portion ------------
  const params = dietParams(patient);
  const permitted = ORDER.filter((p) => order.portionsPermitted.includes(p) && meal.portions.includes(p));
  if (!permitted.length) exclude('PORTION-SCREEN', `This meal is only available as ${meal.portions.map(portionLabel).join(' or ')}, which the diet order does not permit.`);
  const per = meal.nutrition.perServing;
  const portionFails = Object.fromEntries(permitted.map((p) => [p, []]));
  const passedRules = [];
  const rankRules = [];
  const unchecked = [];
  for (const rule of activeRules(patient)) {
    if (rule.kind.startsWith('rank')) { rankRules.push(rule); continue; }
    const meta = NUTRIENT_META[rule.nutrient];
    const missing = [...new Set([...(meal.nutrition.missing[rule.nutrient] ?? []), ...(rule.kind === 'energy-share' ? meal.nutrition.missing.kcal ?? [] : [])])].map((x) => x.replace(/ \((no SFCT values|not reported by the SFCT)\)$/, ''));
    if (missing.length) { unchecked.push({ title: lc(rule.title), missing }); continue; }
    if (rule.kind === 'limit') {
      const lim = limitFor(rule, period, params);
      if (!lim) continue; // required parameter missing; covered by DIET-RENAL-PARAMS review
      for (const p of permitted) {
        const v = per[rule.nutrient] * portionFactor(p);
        if (v > lim.value) portionFails[p].push({ ruleId: rule.id, message: `${meta.label} ${fmt(Math.round(v * 10) / 10, meta.unit)} in the ${portionLabel(p)} portion is above the ${period} limit of ${fmt(lim.value, meta.unit)} (${lim.explain}).` });
      }
      passedRules.push({ rule, lim });
    } else if (rule.kind === 'energy-share') {
      const share = rule.nutrient === 'addedSugar' ? (per.kcal ? (per.addedSugar * 4) / per.kcal : 0) : energyShare(per, rule.nutrient);
      const lbl = rule.nutrient === 'addedSugar' ? 'Added sugars' : meta.label;
      if (share > rule.maxShare) for (const p of permitted) portionFails[p].push({ ruleId: rule.id, message: `${lbl} provide ${pct(share)} of the meal’s energy, above the ${pct(rule.maxShare)} limit.` });
      else checks.push({ ruleId: rule.id, status: 'pass', label: rule.title, detail: `${lbl} provide ${pct(share)} of the meal’s energy (limit ${pct(rule.maxShare)}).` });
    }
  }
  if (unchecked.length) {
    const titles = unchecked.map((u) => u.title);
    const list = titles.length > 1 ? `${titles.slice(0, -1).join(', ')} and ${titles.at(-1)}` : titles[0];
    if (!meal.nutrition.available) needsReview('DATA-REQUIRED', `The ${list} cannot be checked: ${multi ? 'none of this meal’s dishes has' : 'this dish has no'} SFDA Saudi Food Composition Table values. Values are never estimated.`);
    else for (const u of unchecked) needsReview('DATA-REQUIRED', `The ${u.title} cannot be checked: no SFDA value for ${u.missing.join(', ')}. Values are never estimated.`);
  }
  const eligiblePortions = permitted.filter((p) => portionFails[p].length === 0);
  if (permitted.length && !eligiblePortions.length) {
    const smallest = permitted[0];
    for (const f of portionFails[smallest]) exclude(f.ruleId, `${f.message}${permitted.length > 1 ? ' No permitted portion meets this limit.' : ''}`);
  }

  const status = exclusions.length ? 'excluded' : review.length ? 'review' : 'eligible';

  // ---- 3. Portion suggestion -------------------------------------------------
  let portion = null;
  if (status !== 'excluded') {
    const candidates = eligiblePortions.length ? eligiblePortions : permitted;
    const preferred = patient.preferences.preferredPortion ?? 'regular';
    const appetite = patient.appetite?.level ?? 'good';
    let target = ORDER.indexOf(preferred);
    let why;
    if (appetite === 'poor') { target = 0; why = 'the patient’s current appetite is poor'; }
    else if (appetite === 'fair') { target = Math.min(target, 1); why = target < ORDER.indexOf(preferred) ? 'the patient’s appetite is reduced' : `it matches the patient’s preferred ${portionLabel(preferred)} portion`; }
    else { why = `it matches the patient’s preferred ${portionLabel(preferred)} portion`; }
    if (cats.includes('high-protein') && appetite === 'good' && target < 1) { target = 1; why = 'the high-protein, high-energy diet and good appetite favour at least a regular portion'; }
    const recent = intake.slice(-3);
    if (recent.some((r) => r.reasons?.includes('portion-too-large')) && target > 0) { target -= 1; why = 'the patient recently reported portions were too large'; }
    else if (appetite === 'good' && recent.some((r) => r.reasons?.includes('portion-too-small')) && target < 2) { target += 1; why = 'the patient recently reported portions were too small'; }
    const chosen = [...candidates].sort((a, b) => Math.abs(ORDER.indexOf(a) - target) - Math.abs(ORDER.indexOf(b) - target) || ORDER.indexOf(a) - ORDER.indexOf(b))[0];
    const targetId = ORDER[target];
    let explanation = `${PORTIONS.find((x) => x.id === chosen).label} portion suggested because ${why}`;
    if (chosen !== targetId) {
      explanation += `. A ${portionLabel(targetId)} portion ${!order.portionsPermitted.includes(targetId) ? 'is not permitted by the diet order' : !meal.portions.includes(targetId) ? 'is not offered for this meal' : 'does not meet the diet limits'}, so the nearest suitable portion is offered`;
    }
    explanation += '.';
    const unavailable = ORDER.filter((p) => !eligiblePortions.includes(p)).map((p) => ({
      portion: p,
      reason: !meal.portions.includes(p) ? 'Not offered for this meal.' : !order.portionsPermitted.includes(p) ? 'Not permitted by the diet order.' : portionFails[p]?.[0]?.message ?? 'Needs review.',
    }));
    portion = { suggested: chosen, eligible: eligiblePortions, permitted, unavailable, explanation, nutrition: scaleNutrition(per, portionFactor(chosen)) };
    for (const { rule, lim } of passedRules) {
      const v = per[rule.nutrient] * portionFactor(chosen);
      const meta = NUTRIENT_META[rule.nutrient];
      checks.push({ ruleId: rule.id, status: 'pass', label: rule.title, detail: `${meta.label} ${fmt(Math.round(v * 10) / 10, meta.unit)} in the ${portionLabel(chosen)} portion is within the ${period} limit of ${fmt(lim.value, meta.unit)} (${lim.explain}).` });
    }
  }

  // ---- 4. Ranking (eligible and review meals) ---------------------------------
  let points = null;
  let score = null;
  if (status !== 'excluded') {
    const add = (pts, text) => reasons.push({ points: pts, text });
    const prefs = patient.preferences;
    const pv = portion.nutrition;
    if (prefs.cuisines.includes(meal.cuisine)) add(15, `Matches the patient’s preferred cuisine: ${meal.cuisine}.`);
    const favs = lines.filter((l) => prefs.favorites.some((f) => siblings(f, ingredients).includes(l.ing)));
    if (favs.length) add(Math.min(12, favs.length * 6), `Includes foods the patient enjoys: ${names(favs).toLowerCase()}.`);
    const disliked = lines.filter((l) => prefs.dislikes.some((d) => siblings(d, ingredients).includes(l.ing)));
    if (disliked.length) {
      const optionalOnly = disliked.every((l) => l.optional);
      add(optionalOnly ? -8 : -25, optionalOnly ? `Has an optional ingredient the patient dislikes (${names(disliked).toLowerCase()}); ask the kitchen to leave it out.` : `Contains ${names(disliked).toLowerCase()}, which the patient dislikes.`);
    } else if (prefs.dislikes.length) {
      add(0, `Contains none of the patient’s disliked ingredients (${prefs.dislikes.map((d) => ingredients[d]?.name.toLowerCase()).join(', ')}).`);
    }
    for (const rule of rankRules) {
      if (rule.kind === 'rank' && pv[rule.nutrient] != null && pv[rule.nutrient] >= rule.min) {
        add(rule.points, `${NUTRIENT_META[rule.nutrient].label} ${fmt(pv[rule.nutrient], rule.unit)} in the ${portionLabel(portion.suggested)} portion meets the ${fmt(rule.min, rule.unit)} level preferred for this diet.`);
      } else if (rule.kind === 'rank-per-100kcal' && pv[rule.nutrient] != null && pv.kcal) {
        const density = (pv[rule.nutrient] / pv.kcal) * 100;
        if (density >= rule.min) add(rule.points, `High in fibre by SFDA’s definition: ${fmt(Math.round(density * 10) / 10, 'g')} per 100 kcal (at least ${rule.min} g).`);
      } else if (rule.kind === 'rank-limit' && pv.sodium != null) {
        const lim = limitFor(rule, period, params);
        if (pv.sodium <= lim.value) add(rule.points, `Lower in salt: ${fmt(pv.sodium, 'mg')} sodium, within the ${period} share of the MOH and SFDA limit of 5 g salt (2,000 mg sodium) a day.`);
      }
    }
    // Learning from recorded intake and feedback (ranking only).
    const mine = intake.filter((r) => r.mealId === meal.id);
    const liked = mine.filter((r) => r.accepted && (r.satisfaction ?? 0) >= 4);
    const refusedTaste = mine.filter((r) => !r.accepted && (r.reasons ?? []).some((x) => x === 'taste' || x === 'not-preferred'));
    const lowRated = mine.filter((r) => r.satisfaction != null && r.satisfaction <= 2);
    if (liked.length) add(15, `The patient rated this meal ${liked.at(-1).satisfaction}/5 on ${liked.at(-1).date}.`);
    if (refusedTaste.length) add(-25, `The patient refused this meal on ${refusedTaste.at(-1).date} (did not like it).`);
    else if (lowRated.length) add(-15, `The patient rated this meal ${lowRated.at(-1).satisfaction}/5 on ${lowRated.at(-1).date}.`);
    const likedCuisines = new Set(intake.filter((r) => r.mealId !== meal.id && r.accepted && (r.satisfaction ?? 0) >= 4).map((r) => catalog.byId[r.mealId]?.cuisine));
    if (!mine.length && likedCuisines.has(meal.cuisine)) add(4, `The patient rated another ${meal.cuisine} meal highly.`);
    add(0, portion.explanation);
    points = reasons.reduce((s, r) => s + r.points, 0);
    score = Math.max(0, Math.min(100, 40 + points));
  }

  // ---- 5. Kitchen instructions (minimum necessary information) ----------------
  const kitchenInstructions = [];
  if (status !== 'excluded') {
    const allergyPhrases = [...patient.allergies.confirmed.map(phraseOf), ...patient.allergies.ingredients.map((i) => ingredients[i].name.toLowerCase())];
    if (allergyPhrases.length) kitchenInstructions.push(`Allergy: ${allergyPhrases.join(', ')}. Prepare and plate separately.`);
    const intol = [...patient.intolerances.selected.map((i) => (i === 'lactose' ? 'lactose' : 'gluten')), ...patient.intolerances.ingredients.map((i) => ingredients[i].name.toLowerCase())];
    if (intol.length) kitchenInstructions.push(`Intolerance: ${intol.join(', ')}.`);
    if (cats.some((c) => ['low-sodium', 'heart-healthy', 'renal'].includes(c))) kitchenInstructions.push('No added salt at plating.');
    if (cats.includes('consistent-carb')) {
      const optSweet = lines.filter((l) => l.optional && (l.ingredient.flags ?? []).includes('added_sugar'));
      kitchenInstructions.push(optSweet.length ? `No added sugar: leave out the optional ${names(optSweet).toLowerCase()}.` : 'No added sugar or sweet sauces.');
    }
    if (cats.includes('heart-healthy')) kitchenInstructions.push('Small amounts of fat: no added ghee or butter at plating.');
    if (lines.some((l) => ['meat', 'poultry'].some((f) => (l.ingredient.flags ?? []).includes(f)))) kitchenInstructions.push('Use halal-certified meat and poultry (SFDA Saudi Halal Center).');
    if (cats.includes('gluten-free')) kitchenInstructions.push('Gluten-free preparation: separate area and utensils.');
    if (cats.includes('texture-modified')) kitchenInstructions.push(`Prepare to ${TEXTURE_LEVELS.find((t) => t.id === order.textureLevel)?.label ?? 'the prescribed texture level'}.`);
    const relies = allergyPhrases.length || intol.length || cats.some((c) => ['gluten-free', 'lactose-free', 'vegetarian', 'vegan'].includes(c));
    if (relies && meal.allergenSummary.labelCheck.length) {
      kitchenInstructions.push(`Check labels of: ${meal.allergenSummary.labelCheck.join(', ')}.`);
      warnings.push({ code: 'label-check', message: `Packaged ingredients vary by brand. The kitchen will check the labels of: ${meal.allergenSummary.labelCheck.join(', ')}.` });
    }
    if ((cats.includes('vegetarian') || cats.includes('vegan')) && withFlag('rennet_check').length) kitchenInstructions.push(`Use vegetarian-labelled cheese (${names(withFlag('rennet_check'))}).`);
    const disliked = lines.filter((l) => l.optional && patient.preferences.dislikes.some((d) => siblings(d, ingredients).includes(l.ing)));
    if (disliked.length) kitchenInstructions.push(`Leave out the optional ${names(disliked).toLowerCase()}.`);
  }
  if (!meal.nutrition.available) {
    warnings.push({ code: 'nutrition-unavailable', message: `No nutrition values are available: ${multi ? 'none of the dishes in this meal is' : 'this dish is not'} linked to an SFDA Saudi Food Composition Table entry. Values are not estimated.` });
  } else if (!meal.nutrition.allAvailable) {
    const lacking = meal.components.filter((c) => !c.nutrition.available).map((c) => c.name);
    warnings.push({ code: 'nutrition-partial', message: `Nutrition totals leave out ${lacking.join(', ')}, which ${lacking.length === 1 ? 'has' : 'have'} no SFDA Saudi Food Composition Table values. They are not estimated.` });
  } else if (!meal.nutrition.allComplete) {
    const missingKeys = Object.entries(meal.nutrition.missing).filter(([, v]) => v.length).map(([k]) => NUTRIENT_META[k].label.toLowerCase());
    warnings.push({ code: 'nutrition-incomplete', message: `The SFDA values do not report ${missingKeys.join(', ')}; these are not estimated.` });
  }

  return {
    mealId: meal.id, period, status, eligible: status === 'eligible',
    exclusions, reviewReasons: review, warnings, checks, reasons, points, score,
    matchLevel: score == null ? null : score >= 75 ? 'Excellent match' : score >= 60 ? 'Good match' : 'Fair match',
    portion, kitchenInstructions,
  };
}

/**
 * Evaluate every meal in `mealIds` (or the whole catalogue) for one patient and period.
 * Meals marked unavailable by the kitchen are not screened: they are listed separately.
 */
export function recommend(patient, catalog, { mealIds, period, intake = [] } = {}) {
  const all = (mealIds ?? catalog.list.map((m) => m.id)).map((id) => catalog.byId[id]).filter(Boolean);
  const meals = all.filter((m) => m.available);
  const unavailable = all.filter((m) => !m.available).map((m) => m.id);
  const evaluations = meals.map((m) => evaluateMeal(m, patient, { catalog, period, intake }));
  const byPoints = (a, b) => b.points - a.points || catalog.byId[a.mealId].name.localeCompare(catalog.byId[b.mealId].name);
  const eligible = evaluations.filter((e) => e.status === 'eligible').sort(byPoints);
  const review = evaluations.filter((e) => e.status === 'review').sort(byPoints);
  const excluded = evaluations.filter((e) => e.status === 'excluded');
  return {
    eligible, review, excluded, unavailable,
    counts: { total: evaluations.length, eligible: eligible.length, review: review.length, excluded: excluded.length, unavailable: unavailable.length },
    // No meal passes screening and none can be made suitable by admin review: flag, never relax.
    noSuitable: !patient.dietOrder.npo && eligible.length === 0 && review.length === 0,
    reviewOnly: !patient.dietOrder.npo && eligible.length === 0 && review.length > 0,
  };
}

/** Compatibility of a meal with each documented diet category, using default parameters. */
export function dietCompatibility(meal, catalog) {
  return DIET_CATEGORIES.filter((d) => d.id !== 'regular' && d.status !== 'retired').map((d) => {
    const synthetic = {
      dietOrder: { categories: [d.id], npo: false, textureLevel: d.id === 'texture-modified' ? '5' : '', portionsPermitted: ['small', 'regular', 'large'] },
      allergies: { status: 'nka', confirmed: [], ingredients: [], uncoded: [] }, reportedAllergies: [],
      intolerances: { selected: [], ingredients: [], uncoded: [] },
      restrictions: { medicalExclusions: [], medicalNotes: '' },
      preferences: { cuisines: [], favorites: [], dislikes: [], preferredPortion: 'regular' },
      appetite: { level: 'good' },
    };
    const ev = evaluateMeal(meal, synthetic, { catalog, period: meal.category });
    const note = ev.status === 'excluded' ? ev.exclusions[0]?.message : ev.status === 'review' ? ev.reviewReasons[0]?.message : d.id === 'renal' ? 'Sodium within the default limit; potassium and phosphorus depend on the admin’s limits.' : `Passes with the default ${lc(d.label)} rules.`;
    const status = d.id === 'renal' && ev.status === 'eligible' ? 'depends' : ev.status;
    return { id: d.id, code: d.code, label: d.label, status, note, portions: ev.portion?.eligible ?? [] };
  });
}

/**
 * Screen a single ingredient (e.g. a suggested substitution) against a patient's
 * allergies, intolerances and diet categories. Nutrient rules are not applied.
 */
export function screenIngredient(ing, patient) {
  const problems = [];
  const flags = ing.flags ?? [];
  for (const g of patient.allergies.confirmed) {
    if ((ing.allergens ?? []).includes(g)) problems.push(`contains ${phraseOf(g)}`);
    else if ((ing.mayContain ?? []).includes(g)) problems.push(`may contain ${phraseOf(g)}`);
  }
  if (patient.allergies.ingredients.includes(ing.id)) problems.push('recorded allergy');
  if (patient.intolerances.selected.includes('lactose') && flags.includes('lactose')) problems.push('contains lactose');
  if (patient.intolerances.selected.includes('gluten-sensitivity') && flags.includes('gluten')) problems.push('contains gluten');
  if (patient.intolerances.ingredients.includes(ing.id)) problems.push('recorded intolerance');
  const c = patient.dietOrder.categories;
  if ((c.includes('vegetarian') || c.includes('vegan')) && ['meat', 'poultry', 'fish', 'shellfish'].some((f) => flags.includes(f))) problems.push('not vegetarian');
  if (c.includes('vegan') && ['dairy', 'egg', 'honey'].some((f) => flags.includes(f))) problems.push('not vegan');
  if (c.includes('gluten-free') && (flags.includes('gluten') || (ing.allergens ?? []).includes('gluten') || (ing.mayContain ?? []).includes('gluten'))) problems.push('not gluten-free');
  if (c.includes('lactose-free') && flags.includes('lactose')) problems.push('contains lactose');
  if (patient.restrictions.medicalExclusions.includes(ing.id)) problems.push('excluded by the care team');
  return { compatible: problems.length === 0, problems: [...new Set(problems)], labelCheck: Boolean(ing.labelCheck) };
}

export { nutrientValue };
