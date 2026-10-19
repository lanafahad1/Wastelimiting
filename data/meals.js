// The meals the demonstration hospital offers: what a patient chooses for one
// meal period. An individual-dish meal has one component; a complete meal
// combines several dishes (data/dishes.js), and its nutrition is the sum of
// its components where SFDA values exist for every one of them.
//
// Menu management lets authorised staff add and edit meals, so this file is
// only the starting catalogue that the database is seeded with.

import { DISHES } from './dishes.js';

// Dishes that are only served as part of a complete meal, not on their own.
const COMPONENT_ONLY = new Set(['garden-salad', 'purslane-stew', 'lahouh']);

const single = (d) => ({ id: d.id, name: d.name, category: d.category, description: '', components: [{ dish: d.id }], ...(d.portions ? { portions: d.portions } : {}) });

const COMPLETE = [
  { id: 'kabsa-lunch-tray', name: 'Chicken Kabsa Lunch Tray', category: 'lunch', cuisine: 'Saudi',
    description: 'Chicken kabsa with a side of purslane stew. Both dishes are prepared to SFDA Saudi Food Composition Tables standard recipes.',
    components: [{ dish: 'chicken-kabsa' }, { dish: 'purslane-stew' }] },
  { id: 'fish-dinner-tray', name: 'Fried Fish with Lentil Rice', category: 'dinner', cuisine: 'Saudi',
    description: 'Fried najel fish served with lentil rice, both prepared to SFCT standard recipes.',
    components: [{ dish: 'fried-fish' }, { dish: 'lentil-rice' }] },
  { id: 'saleeg-dinner-tray', name: 'Saleeg Dinner Tray', category: 'dinner', cuisine: 'Saudi',
    description: 'Taifi saleeg with chicken and a side of purslane stew (SFCT standard recipes).',
    components: [{ dish: 'saleeg-chicken' }, { dish: 'purslane-stew' }] },
  { id: 'bukhari-lunch-tray', name: 'Bukhari Chicken with Garden Salad', category: 'lunch', cuisine: 'Saudi',
    description: 'Bukhari rice with chicken (SFCT standard recipe) and a fresh garden salad. The salad has no SFCT entry, so nutrition totals are partial.',
    components: [{ dish: 'bukhari-chicken' }, { dish: 'garden-salad' }] },
  { id: 'lahouh-breakfast', name: 'Lahouh Breakfast with Laban and Dates', category: 'breakfast', cuisine: 'Saudi',
    description: 'Jazani lahouh flatbread (SFCT standard recipe) with a glass of laban and two dates. The laban and dates have no SFCT entry, so totals are partial.',
    components: [{ dish: 'lahouh' }, { dish: 'laban-dates' }] },
];

export const MEALS = [...DISHES.filter((d) => !COMPONENT_ONLY.has(d.id)).map(single), ...COMPLETE];
