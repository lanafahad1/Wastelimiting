// Builds the enriched menu catalogue from the editable menu data.
//
//   Dish  – one menu component (a main dish, soup, salad, bread, drink…), with
//           ingredients in grams per standard portion and an optional link to
//           an SFDA Saudi Food Composition Table entry for nutrition.
//   Meal  – what is offered to a patient for one meal period. An individual
//           dish meal has one component; a complete meal has several.
//
// Allergen and diet attributes are derived from ingredient data, never typed
// onto a meal. Nutrition is summed from the components (see nutrition.js).

import { dishNutrition, mealNutrition } from './nutrition.js';
import { LOCAL_PRODUCTION } from '../data/local-production.js';

export const DEFAULT_PORTIONS = { breakfast: ['small', 'regular', 'large'], lunch: ['small', 'regular', 'large'], dinner: ['small', 'regular', 'large'], snack: ['regular'] };
const r1 = (x) => Math.round(x * 10) / 10;

function attributes(lines) {
  const contains = new Set();
  const mayContain = new Set();
  const flags = new Set();
  const labelCheck = [];
  for (const { ingredient: ing } of lines) {
    (ing.allergens ?? []).forEach((a) => contains.add(a));
    (ing.mayContain ?? []).forEach((a) => mayContain.add(a));
    (ing.flags ?? []).forEach((f) => flags.add(f));
    if (ing.labelCheck && !labelCheck.includes(ing.name)) labelCheck.push(ing.name);
  }
  const glutenCrossContact = mayContain.has('gluten');
  for (const a of contains) mayContain.delete(a);
  const animalFlesh = ['meat', 'poultry', 'fish', 'shellfish'].some((f) => flags.has(f));
  return {
    allergenSummary: { contains: [...contains], mayContain: [...mayContain], labelCheck },
    flags: [...flags],
    diet: {
      vegetarian: !animalFlesh,
      vegan: !animalFlesh && !['dairy', 'egg', 'honey'].some((f) => flags.has(f)),
      glutenFree: !flags.has('gluten') && !contains.has('gluten'),
      glutenCrossContact,
      lactoseFree: !flags.has('lactose'),
    },
  };
}

const localOf = (lines) => [...new Map(lines.filter((l) => l.ingredient.local && LOCAL_PRODUCTION[l.ingredient.local])
  .map((l) => [l.ingredient.id, { ingredient: l.ingredient.name, group: l.ingredient.local, ...LOCAL_PRODUCTION[l.ingredient.local] }])).values()];

const UNKNOWN_INGREDIENT = (id) => ({ id, name: id, allergens: [], mayContain: [], flags: [], unknown: true });

export function enrichDish(dish, ingredients, sfct = {}) {
  const lines = dish.ingredients.map((l) => ({ ...l, ingredient: ingredients[l.ing] ?? UNKNOWN_INGREDIENT(l.ing) }));
  return {
    ...dish,
    steps: dish.steps ?? [], notes: dish.notes ?? [],
    lines,
    ...attributes(lines),
    nutrition: dishNutrition(dish, sfct),
    local: localOf(lines),
  };
}

export function enrichMeal(meal, dishes, ingredients) {
  const components = meal.components.filter((c) => dishes[c.dish]).map((c) => {
    const d = dishes[c.dish];
    const factor = c.factor ?? 1;
    return { dishId: d.id, name: d.name, nameAr: d.nameAr ?? null, kind: d.kind, cuisine: d.cuisine, factor, grams: Math.round(d.portionG * factor), servingSize: d.servingSize, nutrition: d.nutrition, art: d.art, version: d.version ?? 1 };
  });
  // Ingredient lines of the whole meal, keeping track of the component they belong to.
  const lines = meal.components.filter((c) => dishes[c.dish]).flatMap((c) => dishes[c.dish].lines.map((l) => ({
    ing: l.ing, g: r1(l.g * (c.factor ?? 1)), prep: l.prep, optional: Boolean(l.optional), dishId: c.dish, dishName: dishes[c.dish].name, ingredient: l.ingredient,
  })));
  const first = dishes[meal.components[0]?.dish];
  const single = components.length === 1;
  const grams = components.reduce((s, c) => s + c.grams, 0);
  return {
    ...meal,
    type: single ? 'single' : 'complete',
    cuisine: meal.cuisine ?? first?.cuisine ?? 'International',
    description: meal.description || first?.description || '',
    servingSize: single ? first.servingSize : `${components.length} items, about ${grams} g`,
    grams,
    art: meal.art ?? first?.art ?? {},
    portions: meal.portions ?? DEFAULT_PORTIONS[meal.category],
    available: meal.available !== false,
    infoReview: meal.infoReview ?? { status: 'verified' },
    version: meal.version ?? 1,
    components,
    ingredients: lines,
    ingredientIds: [...new Set(lines.map((l) => l.ing))],
    dishIds: components.map((c) => c.dishId),
    nutrition: mealNutrition(components),
    ...attributes(lines),
    local: localOf(lines),
    steps: single ? first.steps : [],
    notes: single ? first.notes : [],
  };
}

/**
 * @param {{ dishes: object[], meals: object[], ingredients: object, sfct: object }} data
 *   ingredients: { [id]: ingredient }, sfct: { [id]: SFCT entry }
 */
export function buildCatalog({ dishes, meals, ingredients, sfct = {} }) {
  const dishById = Object.fromEntries(dishes.map((d) => [d.id, enrichDish(d, ingredients, sfct)]));
  const list = meals.filter((m) => m.active !== false && m.components?.some((c) => dishById[c.dish])).map((m) => enrichMeal(m, dishById, ingredients));
  return { list, byId: Object.fromEntries(list.map((m) => [m.id, m])), dishes: dishById, ingredients, sfct };
}

/** Compact meal representation for cards and lists. */
export function mealSummary(meal) {
  const p = meal.nutrition.perServing;
  const part = meal.nutrition.partial;
  const val = (k) => p[k] ?? null;
  return {
    id: meal.id, name: meal.name, category: meal.category, cuisine: meal.cuisine, description: meal.description,
    type: meal.type, servingSize: meal.servingSize, grams: meal.grams, art: meal.art, portions: meal.portions,
    components: meal.components.map((c) => ({ dishId: c.dishId, name: c.name, nameAr: c.nameAr, kind: c.kind, grams: c.grams, nutritionAvailable: c.nutrition.available })),
    nutrition: { kcal: val('kcal'), protein: val('protein'), carbs: val('carbs'), fiber: val('fiber'), sodium: val('sodium'), satFat: val('satFat') },
    nutritionPartial: { kcal: part.kcal, protein: part.protein, carbs: part.carbs, fiber: part.fiber, sodium: part.sodium },
    nutritionSource: meal.nutrition.source,
    nutritionAvailable: meal.nutrition.available,
    nutritionComplete: meal.nutrition.allAvailable,
    nutritionMissingFrom: [...new Set(Object.values(meal.nutrition.missing).flat())],
    allergens: meal.allergenSummary, diet: meal.diet, local: meal.local.map((l) => l.ingredient),
    available: meal.available, unavailableReason: meal.available ? null : meal.unavailableReason ?? null,
    infoStatus: meal.infoReview.status, version: meal.version,
  };
}
