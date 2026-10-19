// Local production in Saudi Arabia, used to highlight ingredients the Kingdom
// produces widely and to support MEWA's campaigns encouraging people to choose
// local produce.
//
// Self-sufficiency ratio = domestic production ÷ domestic consumption. A ratio of
// 100% or more means national production meets demand; it does not guarantee
// that a particular product on a shop shelf was grown or made locally.

export const LOCAL_PRODUCTION_SOURCES = [
  {
    id: 'GASTAT-2024',
    publisher: 'General Authority for Statistics (GASTAT), food security statistics, 2024 figures as reported by Argaam',
    url: 'https://www.argaam.com/en/article/articledetail/id/1867020',
  },
  {
    id: 'MEWA-2026',
    publisher: 'Ministry of Environment, Water and Agriculture (MEWA), statement on full self-sufficiency in dates, fresh dairy products and table eggs, reported by Arab News',
    url: 'https://www.arabnews.com/node/2620297',
  },
  {
    id: 'MEWA-LOCAL',
    publisher: 'Ministry of Environment, Water and Agriculture (MEWA), campaigns encouraging consumers to choose local produce (for example “Harvest Season”)',
    url: 'https://arab.news/nvc4t',
  },
];

/** Commodity groups with their national self-sufficiency ratio (%) in 2024. */
export const LOCAL_PRODUCTION = {
  dates: { label: 'Dates', selfSufficiency: 121, year: 2024, sources: ['GASTAT-2024', 'MEWA-2026'] },
  dairy: { label: 'Dairy products', selfSufficiency: 131, year: 2024, sources: ['GASTAT-2024', 'MEWA-2026'] },
  eggs: { label: 'Table eggs', selfSufficiency: 103, year: 2024, sources: ['GASTAT-2024', 'MEWA-2026'] },
  poultry: { label: 'Poultry meat', selfSufficiency: 72, year: 2024, sources: ['GASTAT-2024'] },
  potatoes: { label: 'Potatoes', selfSufficiency: 93, year: 2024, sources: ['GASTAT-2024'] },
  tomatoes: { label: 'Tomatoes', selfSufficiency: 83, year: 2024, sources: ['GASTAT-2024'] },
  onions: { label: 'Onions', selfSufficiency: 72, year: 2024, sources: ['GASTAT-2024'] },
};
