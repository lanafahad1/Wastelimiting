// Kitchen production quantities for confirmed trays. Each tray's ingredient
// grams are the meal's standard-portion grams × the portion factor
// (small ½, regular 1, large 1½). Optional ingredients are listed separately.

import { INGREDIENT_GROUPS, portionFactor } from './constants.js';

/** @param {Array<{mealId, portion}>} trays */
export function ingredientRequirements(trays, catalog) {
  const groups = new Map();
  for (const t of trays) {
    const meal = catalog.byId[t.mealId];
    if (!meal) continue;
    const factor = portionFactor(t.portion);
    for (const line of meal.ingredients) {
      const ing = catalog.ingredients[line.ing] ?? line.ingredient;
      const g = groups.get(ing.id) ?? { ingredient: ing, grams: 0, optionalGrams: 0, meals: new Set() };
      if (line.optional) g.optionalGrams += line.g * factor; else g.grams += line.g * factor;
      g.meals.add(meal.name);
      groups.set(ing.id, g);
    }
  }
  const order = INGREDIENT_GROUPS.map((c) => c.id);
  return [...groups.values()].map((g) => ({
    ingredientId: g.ingredient.id, name: g.ingredient.name, group: g.ingredient.group ?? 'other',
    grams: Math.round(g.grams * 10) / 10, optionalGrams: Math.round(g.optionalGrams * 10) / 10,
    usedIn: [...g.meals], labelCheck: Boolean(g.ingredient.labelCheck),
  })).sort((a, b) => order.indexOf(a.group) - order.indexOf(b.group) || a.name.localeCompare(b.name));
}

export const formatGrams = (g) => (g >= 1000 ? `${(Math.round(g / 100) / 10).toLocaleString('en-US')} kg` : g > 0 && g < 1 ? 'under 1 g' : `${Math.round(g)} g`);
