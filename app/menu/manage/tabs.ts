// Menu management tabs (?tab=…), shared by the server page and the client view.
export const TABS = [
  ['meals', 'Meals'],
  ['dishes', 'Dishes'],
  ['ingredients', 'Ingredients & allergens'],
  ['plan', 'Menu plan'],
  ['sfct', 'SFDA SFCT library'],
] as const;
export type Tab = (typeof TABS)[number][0];
export const isTab = (t: string | undefined): t is Tab => TABS.some(([id]) => id === t);
