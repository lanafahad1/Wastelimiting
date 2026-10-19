// CareBite knowledge base: documented hospital diet categories and the
// screening rules behind them (the MedicalDietaryRules entity).
//
// CareBite is used in Saudi Arabia, so every food and health rule is based on
// Saudi government guidance (MOH, SFDA, MEWA, GFSA, the Saudi National
// Diabetes Center). Where no Saudi government source sets a number, CareBite
// does not invent one: the admin sets the value in the diet order, or the
// rule is marked as a documented prototype assumption.
//
// Governance: rules run only when status === 'active'. Every rule names its
// source(s), the exact logic applied and its review state. The rules were
// checked against the cited guidance by the CareBite project team. They have
// NOT been clinically validated; in a real hospital the dietetics department
// would review and approve every rule and threshold.

export const RULESET_VERSION = '4.0.0';
export const RULESET_REVIEW = {
  reviewedBy: 'CareBite project team (academic review against cited sources)',
  reviewedOn: '2026-10-19',
  clinicalValidation: 'Not clinically validated. A hospital dietetics department must review and approve these rules before real use.',
};

// authority: who issued the guidance. saudi: true for Saudi government bodies.
export const SOURCES = {
  // ---- Saudi Food & Drug Authority (SFDA)
  'SFDA-ALLERGENS': {
    authority: 'SFDA', saudi: true,
    title: 'Allergen disclosure for non-prepacked food, SFDA.FD 56 (14 allergens), as described in “Responses of consumers with food allergy to the new allergen-labelling legislation in Saudi Arabia”, Public Health Nutrition',
    publisher: 'Saudi Food & Drug Authority (SFDA)',
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC10195493/',
    summary: 'Food establishments selling non-prepacked food must disclose 14 allergens: cereals containing gluten, crustaceans, molluscs, eggs, fish, peanuts, soy, milk, tree nuts, celery, mustard, sesame, lupin and sulphites (above 10 mg/kg or 10 mg/L).',
  },
  'SFDA-SALT': {
    authority: 'SFDA', saudi: true,
    title: 'SFDA recommends using healthier alternatives to salt to enhance flavour',
    publisher: 'Saudi Food & Drug Authority (SFDA)',
    url: 'https://www.sfda.gov.sa/en/news/sfda-recommends-using-healthier-alternatives-salt-enhance-flavor',
    summary: 'SFDA urges reducing salt intake toward no more than 5 g of salt a day (about 2,000 mg of sodium), choosing low-sodium or no-added-salt products, and flavouring food with lemon, vinegar, herbs and spices.',
  },
  'SFDA-SFCT': {
    authority: 'SFDA', saudi: true,
    title: 'Saudi Food Composition Tables, first edition (released 25 June 2026)',
    publisher: 'Saudi Food & Drug Authority (SFDA), National Nutrition Committee',
    url: 'https://www.sfda.gov.sa/en/news/19089',
    summary: 'Laboratory-analysed nutrient values per 100 g (and per full recipe) for traditional dishes from the 13 regions of the Kingdom, with each standard recipe. This is CareBite’s only nutrient source: a hospital dish is linked to an SFCT entry only when it is prepared to that recipe. Dishes without a link have no nutrient values, and diets with nutrient limits need admin review for them.',
    links: [
      { label: 'Saudi Food Composition Tables (English PDF)', url: 'https://www.sfda.gov.sa/sites/default/files/2026-04/SFCT-E.pdf' },
      { label: 'جداول تركيب الأغذية السعودية (Arabic PDF)', url: 'https://www.sfda.gov.sa/sites/default/files/2026-04/SFCT-A.pdf' },
    ],
  },
  'SFDA-CLAIMS': {
    authority: 'SFDA', saudi: true,
    title: 'A Guide to Nutrition and Health Claims (Technical Regulation SFDA.FD 2333)',
    publisher: 'Saudi Food & Drug Authority (SFDA)',
    url: 'https://sfda.gov.sa/sites/default/files/2021-04/AGuidetoNutritionClaims.pdf',
    summary: 'Sets the conditions for nutrition claims. A food may be called “high in fibre” when it provides at least 6 g of fibre per 100 g or at least 3 g per 100 kcal.',
  },
  'SFDA-HFS': {
    authority: 'SFDA', saudi: true,
    title: 'SFDA Healthy Food Strategy (2018): reducing salt, sugar, saturated fat and trans fat',
    publisher: 'Saudi Food & Drug Authority (SFDA), as reported by Arab News',
    url: 'https://www.arabnews.com/node/1374226',
    summary: 'SFDA’s strategy aims to reduce salt, sugar, saturated fat and trans fat in food. It limited sodium in bread to 1 g per 100 g and, from 2020, banned partially hydrogenated oils (the main source of industrial trans fat) in food products.',
    links: [{ label: 'The SFDA’s Comprehensive Approach to Health (PDF)', url: 'https://www.sfda.gov.sa/sites/default/files/2024-02/The%20SFDA%E2%80%99s%20Comprehensive%20Approach%20to%20Health.pdf' }],
  },
  'SFDA-HALAL': {
    authority: 'SFDA', saudi: true,
    title: 'Saudi Halal Center',
    publisher: 'Saudi Food & Drug Authority (SFDA)',
    url: 'https://www.sfda.gov.sa/en/news/87404',
    summary: 'The Saudi Halal Center, part of SFDA, ensures that livestock slaughter and the storage of meat and poultry in the Kingdom follow Islamic Sharia, and grants halal certificates to food establishments.',
  },
  'SFDA-MENU': {
    authority: 'SFDA', saudi: true,
    title: 'Calorie and nutrition information on restaurant and café menus',
    publisher: 'Saudi Food & Drug Authority (SFDA), as reported by Gulf News',
    url: 'https://gulfnews.com/world/gulf/saudi/saudi-arabia-to-enforce-new-food-labelling-rules-from-july-1-1.500169964',
    summary: 'SFDA requires food service menus, printed and digital, to show calories, with indicators for salty and caffeinated items. CareBite shows each dish’s energy first wherever SFDA dish values exist.',
  },
  // ---- Ministry of Health (MOH) and the Saudi National Diabetes Center
  'MOH-SALT': {
    authority: 'MOH', saudi: true,
    title: 'MOH warns of excessive salt consumption',
    publisher: 'Ministry of Health (MOH), Saudi Arabia',
    url: 'https://www.moh.gov.sa/en/Ministry/MediaCenter/News/Pages/News-2017-03-28-004.aspx',
    summary: 'Daily salt intake for an adult should not exceed one teaspoon: 5 g of salt, equivalent to 2 g (2,000 mg) of sodium. Excess salt raises the risk of hypertension, heart attack and stroke.',
  },
  'MOH-DGS': {
    authority: 'MOH', saudi: true,
    title: 'The Dietary Guidelines for Saudis (“Healthy Food Palm”)',
    publisher: 'Ministry of Health (MOH), General Directorate of Nutrition',
    url: 'https://www.moh.gov.sa/en/HealthAwareness/Pages/SaudihealthFoodGuide.aspx',
    summary: 'National dietary guidelines on the kinds and amounts of food to eat. They promote nutrient-rich foods and discourage sugary, salty and fatty foods to reduce the risk of obesity, diabetes and hypertension.',
  },
  'MOH-FOODCHOICES': {
    authority: 'MOH', saudi: true,
    title: 'Healthy food choices',
    publisher: 'Ministry of Health (MOH), Saudi Arabia',
    url: 'https://www.moh.gov.sa/en/HealthAwareness/Campaigns/badana/Pages/002.aspx',
    summary: 'Make complex carbohydrates (vegetables, bread, rice) the main source of carbohydrate rather than simple sugars, and eat small amounts of fat without exceeding the daily allowance.',
  },
  'MOH-DIABETES': {
    authority: 'MOH', saudi: true,
    title: 'MOH health tips on diabetes',
    publisher: 'Ministry of Health (MOH), Saudi Arabia',
    url: 'https://www.moh.gov.sa/en/ministry/mediacenter/news/pages/news-2013-11-20-001.aspx',
    summary: 'A diabetic diet sets appropriate calories with suitable food alternatives and a regular meal schedule. People with diabetes are advised not to add sugar to food, and to favour complex carbohydrates such as brown bread and brown rice.',
    links: [{ label: 'MOH advice on complex carbohydrates', url: 'https://www.moh.gov.sa/en/ministry/mediacenter/news/pages/news-2020-05-07-003.aspx' }],
  },
  'SDCPG': {
    authority: 'Saudi National Diabetes Center', saudi: true,
    title: 'Saudi Diabetes Clinical Practice Guidelines (first edition, 2021)',
    publisher: 'Saudi National Diabetes Center and Saudi Health Council',
    url: 'https://www.moh.gov.sa/Ministry/MediaCenter/Publications/Documents/Saudi-Diabetes-Clinical-Practice-Guidelines.pdf',
    summary: 'The national clinical practice guideline for diabetes care, including assessment, goal setting and a treatment plan for each patient. In CareBite the carbohydrate amount per meal is set by the admin for each patient, not by a fixed default.',
  },
  'MOH-KIDNEY': {
    authority: 'MOH', saudi: true,
    title: 'Healthy nutrition for diabetics with kidney disease',
    publisher: 'Ministry of Health (MOH), Saudi Arabia',
    url: 'https://www.moh.gov.sa/en/healthawareness/educationalcontent/diseases/diabetic/pages/healthy-nutrition-for-diabetics-with-kidney-disease.aspx',
    summary: 'People with kidney disease should reduce salt, and depending on the stage of the disease may also need to reduce potassium, phosphorus and protein. Salt substitutes high in potassium should be avoided unless a nutritionist approves.',
  },
  'MOH-CELIAC': {
    authority: 'MOH', saudi: true,
    title: 'MOH provides gluten-free diet at hospitals',
    publisher: 'Ministry of Health (MOH), Saudi Arabia',
    url: 'https://www.moh.gov.sa/en/ministry/mediacenter/news/pages/news-2018-11-08-004.aspx',
    summary: 'MOH supplies gluten-free products for patients with coeliac disease through hospitals in every region, because a strict gluten-free diet is the treatment.',
  },
  // ---- Ministry of Environment, Water and Agriculture (MEWA) and GASTAT
  'MEWA-LOCAL': {
    authority: 'MEWA', saudi: true,
    title: 'Campaigns encouraging consumers to choose local produce, and national self-sufficiency in dates, fresh dairy products and table eggs',
    publisher: 'Ministry of Environment, Water and Agriculture (MEWA)',
    url: 'https://www.arabnews.com/node/2620297',
    summary: 'MEWA promotes local agricultural produce. Saudi Arabia reports self-sufficiency of more than 100% in dates, dairy products and table eggs (GASTAT, 2024).',
  },
  // ---- General Food Security Authority (GFSA)
  'GFSA': {
    authority: 'GFSA', saudi: true,
    title: 'Cabinet approval of the Saudi Grains Organization’s transformation into the General Food Security Authority (January 2023)',
    publisher: 'General Food Security Authority (GFSA), Saudi Arabia, as reported by Argaam',
    url: 'https://www.argaam.com/en/article/articledetail/id/1616600',
    summary: 'GFSA, formerly the Saudi Grains Organization (SAGO), is chaired by the Minister of Environment, Water and Agriculture. Its tasks include reviewing the national food security strategy and preparing implementation plans, strategic food storage, and an early warning system for food security.',
  },
  'GFSA-WASTE': {
    authority: 'GFSA', saudi: true,
    title: 'National Program to Reduce Food Loss and Waste, and the SAGO field study of food waste in Saudi Arabia',
    publisher: 'Saudi Grains Organization (SAGO, now GFSA), as reported by Arab News',
    url: 'https://www.arabnews.com/node/1654461',
    summary: 'SAGO (now GFSA) launched the National Program to Reduce Food Loss and Waste in 2018. Its field study estimated that 33.1% of targeted food commodities, about 4.06 million tonnes a year worth about SR 40 billion, are wasted. CareBite records reported leftovers and weighed plate waste to support hospital food-waste reduction.',
    links: [{ label: 'National Program to Reduce Food Loss and Waste (Saudipedia)', url: 'https://saudipedia.com/en/article/509/economy-and-business/economic-affairs/the-national-program-to-reduce-food-loss-and-waste' }],
  },
  // ---- International framework (no Saudi government equivalent found)
  'IDDSI': {
    authority: 'IDDSI', saudi: false,
    title: 'The IDDSI Framework, and its implementation in Saudi Arabia',
    publisher: 'International Dysphagia Diet Standardisation Initiative (Saudi Arabia IDDSI Reference Group)',
    url: 'https://iddsi.org/saudi-arabia',
    summary: 'A standard set of levels for texture-modified foods. No Saudi government texture standard was found; the Saudi Arabia IDDSI Reference Group promotes IDDSI across Saudi public and private healthcare. The texture level is set by the care team.',
  },
  // ---- CareBite prototype assumptions (documented, not external guidance)
  'CAREBITE-ALLOC': {
    authority: 'CareBite', saudi: false,
    title: 'CareBite meal-share allocation (prototype assumption)',
    publisher: 'CareBite project team',
    url: null,
    summary: 'To screen one meal against a daily limit, the daily amount is divided by meal period: breakfast 25%, lunch 30%, dinner 30%, snack 15%. A snack’s carbohydrate allowance is one-third of the per-meal amount.',
  },
  'CAREBITE-FLAGS': {
    authority: 'CareBite', saudi: false,
    title: 'CareBite intake review prompts (prototype thresholds)',
    publisher: 'CareBite project team',
    url: null,
    summary: 'Thresholds chosen by the project team to prompt a nutrition team review of recorded intake. They are not a validated malnutrition screening tool; a hospital would apply its own nutrition screening and escalation policy.',
  },
  'CAREBITE-PORTIONS': {
    authority: 'CareBite', saudi: false,
    title: 'Demonstration kitchen portion sizes',
    publisher: 'CareBite project team',
    url: null,
    summary: 'Small = ½ standard serving, regular = 1 standard serving, large = 1½ standard servings. Each portion is screened separately.',
  },
};

/** Share of a daily limit assigned to one meal in each period. */
export const MEAL_SHARE = { breakfast: 0.25, lunch: 0.3, dinner: 0.3, snack: 0.15 };

/**
 * Documented hospital diet categories. A diet order combines one or more.
 * `support` says how completely CareBite can screen the category, so that
 * cases needing professional review are visible instead of looking automatic.
 *   ingredient – screened from ingredient data alone
 *   nutrient   – nutrient limits screened where SFDA SFCT values exist; meals without them need review
 *   ranking    – changes the order of options only; nothing is excluded by it
 *   review     – every meal needs admin review
 * Retired categories are not offered for new diet orders (see `retiredReason`).
 */
export const DIET_CATEGORIES = [
  { id: 'regular', code: 'REG', label: 'Regular diet', plain: 'Regular diet', rules: [], support: 'ingredient',
    description: 'No therapeutic nutrient limits. Allergy, intolerance and exclusion screening still applies, and lower-salt meals are ranked first for everyone (MOH and SFDA salt guidance).' },
  { id: 'consistent-carb', code: 'CCHO', label: 'Consistent carbohydrate (diabetes)', plain: 'Diabetes diet (steady carbohydrate)', rules: ['DIET-CHO', 'DIET-NOSUGAR', 'DIET-FIBER-RANK'], requires: ['carbsGPerMeal'], support: 'nutrient',
    description: 'Carbohydrate per meal kept within the amount the admin sets for the patient (snacks one-third of it), no added sugar (MOH), and meals high in fibre by SFDA’s definition ranked first.' },
  { id: 'low-sodium', code: 'NA', label: 'Sodium-restricted', plain: 'Low-salt diet', rules: ['DIET-NA'], defaults: { sodiumMgPerDay: 2000 }, support: 'nutrient',
    description: 'Sodium per meal kept within a share of the daily limit. Default 2,000 mg of sodium a day (5 g of salt), the MOH and SFDA adult limit.' },
  { id: 'heart-healthy', code: 'CARD', label: 'Heart-healthy (cardiac)', plain: 'Heart-healthy diet', rules: ['DIET-NA', 'DIET-CARD-FAT'], defaults: { sodiumMgPerDay: 2000 }, support: 'nutrient',
    description: 'Sodium-restricted (2,000 mg a day by default), and prepared with small amounts of fat as MOH advises: no added ghee or butter at plating.' },
  { id: 'renal', code: 'REN', label: 'Renal', plain: 'Kidney diet', rules: ['DIET-NA', 'DIET-K', 'DIET-P'], defaults: { sodiumMgPerDay: 2000 }, requires: ['potassiumMgPerDay', 'phosphorusMgPerDay'], support: 'nutrient',
    description: 'Reduced salt (2,000 mg of sodium a day by default, MOH). Potassium and phosphorus limits depend on the stage of kidney disease and must be set by the admin.' },
  { id: 'gluten-free', code: 'GF', label: 'Gluten-free (coeliac)', plain: 'Gluten-free diet (coeliac disease)', rules: ['DIET-GLUTENFREE'], support: 'ingredient',
    description: 'No cereals containing gluten (wheat, barley, rye, oats; SFDA allergen list) and no ingredient with a gluten cross-contact risk. MOH provides gluten-free diets through hospitals.' },
  { id: 'vegetarian', code: 'VEG', label: 'Vegetarian', plain: 'Vegetarian diet', rules: ['DIET-VEGETARIAN'], support: 'ingredient',
    description: 'No meat, poultry, fish or shellfish, based on ingredient data.' },
  { id: 'high-protein', code: 'HPHE', label: 'High-protein, high-energy', plain: 'High-protein, high-energy diet', rules: ['DIET-HP-RANK'], support: 'ranking',
    description: 'Ranking and portion preference only: meals with at least 20 g of protein per portion are listed first (a CareBite prototype level, not a Saudi standard), and larger permitted portions are suggested when appetite allows. Energy and protein targets are set and monitored by the admin.' },
  { id: 'texture-modified', code: 'TXT', label: 'Texture-modified (IDDSI level)', plain: 'Texture-modified diet (soft or minced)', rules: ['DIET-TEXTURE'], requires: ['textureLevel'], support: 'review',
    description: 'Menu items have no recorded texture level, so every meal needs admin review and kitchen preparation to the prescribed IDDSI level.' },
  // Retired in ruleset 4.0: not offered for new diet orders.
  { id: 'lactose-free', code: 'LF', label: 'Lactose-free', plain: 'Lactose-free diet', rules: ['DIET-LACTOSEFREE'], support: 'ingredient', status: 'retired',
    retiredReason: 'Recorded as a lactose intolerance on the patient’s allergy record instead, which applies the same ingredient screening. Keeping both caused duplicate entries.',
    description: 'No lactose-containing dairy ingredients.' },
  { id: 'vegan', code: 'VGN', label: 'Vegan', plain: 'Vegan diet', rules: ['DIET-VEGAN'], support: 'ingredient', status: 'retired',
    retiredReason: 'No Saudi government source, no demonstration patient and too few suitable hospital meals for a complete workflow. An admin can record specific exclusions instead.',
    description: 'No animal products, including dairy, eggs and honey.' },
];
export const ACTIVE_DIET_CATEGORIES = DIET_CATEGORIES.filter((d) => d.status !== 'retired');
export const DIET_SUPPORT = {
  ingredient: { label: 'Screened from ingredients', text: 'Checked automatically from each meal’s ingredient data.' },
  nutrient: { label: 'Needs SFDA nutrient values', text: 'Nutrient limits are checked automatically where SFDA Saudi Food Composition Table values exist for every dish in the meal; other meals need admin review.' },
  ranking: { label: 'Ranking only', text: 'Changes the order of suitable options; it never excludes a meal. Targets are monitored by the admin.' },
  review: { label: 'Always needs professional review', text: 'No meal can be approved automatically; an admin reviews every meal.' },
};
export const dietCategory = (id) => DIET_CATEGORIES.find((d) => d.id === id);

const base = { status: 'active', version: '3.0', ...RULESET_REVIEW };

/** Nutrient rules. They need SFDA dish values; without them the meal goes to admin review. */
export const MEDICAL_RULES = [
  { ...base, id: 'DIET-NA', kind: 'limit', nutrient: 'sodium', unit: 'mg', method: 'daily-allocation', param: 'sodiumMgPerDay',
    title: 'Sodium limit per meal',
    logic: 'Sodium in the portion must not exceed the meal-period share of the daily limit in the diet order (default 2,000 mg a day, 5 g of salt, for sodium-restricted, heart-healthy and renal diets).',
    sources: ['MOH-SALT', 'SFDA-SALT', 'MOH-KIDNEY', 'CAREBITE-ALLOC'] },
  { ...base, id: 'DIET-CHO', kind: 'limit', nutrient: 'carbs', unit: 'g', method: 'per-meal', param: 'carbsGPerMeal', required: true,
    title: 'Carbohydrate per meal',
    logic: 'Total carbohydrate in the portion (the SFCT “Total Carbohydrates” value, which includes dietary fibre) must not exceed the per-meal amount the admin sets in the diet order; snacks are limited to one-third of it. There is no fixed default: until the amount is set, meals need admin review. Available carbohydrate is shown alongside for the admin.',
    sources: ['SDCPG', 'MOH-DIABETES', 'CAREBITE-ALLOC'] },
  { ...base, id: 'DIET-FIBER-RANK', kind: 'rank-per-100kcal', nutrient: 'fiber', unit: 'g', min: 3, points: 6,
    title: 'High-fibre preference',
    logic: 'Rank meals higher when the portion meets SFDA’s “high in fibre” level of at least 3 g of fibre per 100 kcal. Ranking only.',
    sources: ['SFDA-CLAIMS', 'MOH-FOODCHOICES'] },
  { ...base, id: 'DIET-K', kind: 'limit', nutrient: 'potassium', unit: 'mg', method: 'daily-allocation', param: 'potassiumMgPerDay', required: true,
    title: 'Potassium limit per meal', logic: 'Potassium in the portion must not exceed the meal-period share of the admin’s daily limit.', sources: ['MOH-KIDNEY', 'CAREBITE-ALLOC'] },
  { ...base, id: 'DIET-P', kind: 'limit', nutrient: 'phosphorus', unit: 'mg', method: 'daily-allocation', param: 'phosphorusMgPerDay', required: true,
    title: 'Phosphorus limit per meal', logic: 'Phosphorus in the portion must not exceed the meal-period share of the admin’s daily limit.', sources: ['MOH-KIDNEY', 'CAREBITE-ALLOC'] },
  { ...base, id: 'DIET-HP-RANK', kind: 'rank', nutrient: 'protein', unit: 'g', min: 20, points: 8,
    title: 'Protein preference', logic: 'Rank meals higher when the portion provides at least 20 g of protein (CareBite prototype threshold). Ranking only.', sources: [] },
  { ...base, id: 'SFDA-SALT-RANK', kind: 'rank-limit', nutrient: 'sodium', unit: 'mg', dailyLimit: 2000, points: 4, everyone: true,
    title: 'Lower-salt preference (MOH and SFDA)', logic: 'For every patient, rank meals higher when sodium in the portion is within the meal-period share of 2,000 mg (5 g of salt) a day. Ranking only.', sources: ['MOH-SALT', 'SFDA-SALT', 'CAREBITE-ALLOC'] },
];

/** Allergy, restriction, preparation and review rules (ingredient-based; they work without nutrient data). */
export const SAFETY_RULES = [
  { ...base, id: 'ALG-CONTAINS', outcome: 'exclude', title: 'Confirmed allergen present', logic: 'Exclude any meal containing an ingredient in a confirmed allergen group, including optional ingredients.', sources: ['SFDA-ALLERGENS'] },
  { ...base, id: 'ALG-CROSS', outcome: 'exclude', title: 'Unresolved cross-contact risk', logic: 'Exclude any meal with an ingredient that may contain a confirmed allergen through cross-contact or varying product formulations.', sources: ['SFDA-ALLERGENS'] },
  { ...base, id: 'ALG-LABEL', outcome: 'kitchen', title: 'Packaged ingredient label check', logic: 'For patients with allergies, intolerances or restrictions, the kitchen is told which packaged products’ labels to check. Meals are never described as allergy-safe.', sources: ['SFDA-ALLERGENS'] },
  { ...base, id: 'ALG-UNKNOWN', outcome: 'review', title: 'Allergies not yet assessed', logic: 'If the care team has not recorded either allergies or “no known food allergies”, every meal needs admin review.', sources: [] },
  { ...base, id: 'ALG-UNCODED', outcome: 'review', title: 'Allergy that could not be coded', logic: 'An allergy or intolerance recorded as free text that does not match the ingredient database cannot be screened, so every meal needs admin review.', sources: [] },
  { ...base, id: 'INT-CONTAINS', outcome: 'exclude', title: 'Intolerance trigger present', logic: 'Exclude meals containing a recorded intolerance trigger (cross-contact is not applied to intolerances).', sources: [] },
  { ...base, id: 'EXCL-MEDICAL', outcome: 'exclude', title: 'Medically required ingredient exclusion', logic: 'Exclude meals containing any ingredient the care team has excluded.', sources: [] },
  { ...base, id: 'DIET-NOSUGAR', outcome: 'exclude', title: 'No added sugar (diabetes)', logic: 'For consistent-carbohydrate diets, exclude meals whose recipe adds sugar, honey or syrup. If the sweetener is optional, the kitchen leaves it out instead.', sources: ['MOH-DIABETES', 'MOH-DGS'] },
  { ...base, id: 'DIET-GLUTENFREE', outcome: 'exclude', title: 'Gluten-free (coeliac)', logic: 'Exclude meals with cereals containing gluten (wheat, barley, rye, oats), or any ingredient with gluten cross-contact risk.', sources: ['SFDA-ALLERGENS', 'MOH-CELIAC'] },
  { ...base, id: 'DIET-LACTOSEFREE', outcome: 'exclude', title: 'Lactose-free', logic: 'Exclude meals with lactose-containing dairy ingredients.', sources: [] },
  { ...base, id: 'DIET-VEGETARIAN', outcome: 'exclude', title: 'Vegetarian', logic: 'Exclude meals with meat, poultry, fish or shellfish (including poultry broth). Cheeses that may use animal rennet are flagged for the kitchen.', sources: [] },
  { ...base, id: 'DIET-VEGAN', outcome: 'exclude', title: 'Vegan', logic: 'Vegetarian rule plus exclusion of dairy, eggs and honey.', sources: [] },
  { ...base, id: 'DIET-CARD-FAT', outcome: 'kitchen', title: 'Small amounts of fat (heart-healthy)', logic: 'For heart-healthy diets, the kitchen prepares meals with small amounts of fat and adds no ghee or butter at plating. Partially hydrogenated oils are banned in food in Saudi Arabia.', sources: ['MOH-FOODCHOICES', 'SFDA-HFS'] },
  { ...base, id: 'HALAL', outcome: 'kitchen', title: 'Halal meat and poultry', logic: 'For every patient, meals with meat or poultry are prepared with halal-certified meat and poultry, as overseen by the SFDA Saudi Halal Center.', sources: ['SFDA-HALAL'] },
  { ...base, id: 'DIET-TEXTURE', outcome: 'review', title: 'Texture-modified diet', logic: 'Menu items have no recorded texture level, so every meal needs admin review and kitchen preparation at the prescribed IDDSI level.', sources: ['IDDSI'] },
  { ...base, id: 'DIET-RENAL-PARAMS', outcome: 'review', title: 'Renal limits missing', logic: 'A renal diet without potassium and phosphorus limits from the admin cannot be screened fully, so every meal needs review.', sources: ['MOH-KIDNEY'] },
  { ...base, id: 'DIET-CHO-PARAMS', outcome: 'review', title: 'Carbohydrate amount missing', logic: 'A consistent-carbohydrate diet without a per-meal carbohydrate amount from the admin cannot be screened, so every meal needs review.', sources: ['SDCPG'] },
  { ...base, id: 'DIET-NPO', outcome: 'exclude', title: 'Nothing by mouth (NPO)', logic: 'While the diet order is NPO, no meal is recommended, offered or sent to the kitchen.', sources: [] },
  { ...base, id: 'DATA-REQUIRED', outcome: 'review', title: 'Nutrition data not available', logic: 'If a rule needs a nutrient value and any dish in the meal has no SFDA Saudi Food Composition Table value for it, the meal needs admin review instead of being assumed to pass. Values are never estimated and partial totals are never used for a limit.', sources: ['SFDA-SFCT'] },
  { ...base, id: 'ALG-REPORTED', outcome: 'review', title: 'Patient-reported allergy awaiting review', logic: 'When a patient reports a possible allergy to one of the 14 SFDA allergens, meals that contain or may contain it need admin review until the report is resolved. The report never changes the allergy record by itself.', sources: ['SFDA-ALLERGENS'] },
  { ...base, id: 'MENU-INFO-REVIEW', outcome: 'review', title: 'Menu information not yet verified', logic: 'When a meal’s ingredients, allergens, portion weights or nutrition source are changed by anyone other than an admin who verifies them, the meal needs admin review for every patient until an admin verifies the information.', sources: [] },
  { ...base, id: 'MENU-UNAVAILABLE', outcome: 'exclude', title: 'Meal unavailable', logic: 'A meal the kitchen marks as unavailable is not screened, offered or confirmed. Upcoming orders for it are put on hold for the nutrition team to replace.', sources: [] },
  { ...base, id: 'CHANGE-HOLD', outcome: 'flag', title: 'Changes after an order', logic: 'When a patient’s diet order, allergies or restrictions, a reported allergy, a meal’s information or its availability changes, every upcoming offered, chosen, confirmed or prepared meal is screened again. A meal that no longer passes is put on hold: it cannot be confirmed, prepared or delivered until the nutrition team replaces, cancels or (admin only) approves it, and the kitchen is alerted when the tray was already on its list. Delivered and past meals are never changed.', sources: [] },
  { ...base, id: 'PORTION-SCREEN', outcome: 'exclude', title: 'Portions screened separately', logic: 'Each available portion permitted by the diet order is screened on its own. Only portions that pass every rule can be suggested; a meal with no passing portion is excluded.', sources: ['CAREBITE-PORTIONS'] },
  { ...base, id: 'NO-OPTIONS', outcome: 'flag', title: 'No suitable meal', logic: 'If no meal on the menu passes screening for a meal period, the case is flagged for the nutrition team. Requirements are never relaxed automatically.', sources: [] },
];

/** Review prompts raised from recorded intake. Indicators only: they never change screening. */
export const INTAKE_FLAG_RULES = [
  { ...base, id: 'INTAKE-REFUSAL', outcome: 'flag', window: 6, days: 3, min: 2, title: 'Repeated meal refusal',
    logic: 'Flag the patient when 2 or more of their last 6 recorded meals (within 3 days) were refused.', sources: ['CAREBITE-FLAGS'] },
  { ...base, id: 'INTAKE-LOW', outcome: 'flag', window: 6, days: 3, min: 3, title: 'Low reported intake',
    logic: 'Flag the patient when 3 or more of their last 6 recorded meals (within 3 days) were recorded as none or some eaten.', sources: ['CAREBITE-FLAGS'] },
];

export function ruleById(id) {
  return MEDICAL_RULES.find((r) => r.id === id) ?? SAFETY_RULES.find((r) => r.id === id) ?? INTAKE_FLAG_RULES.find((r) => r.id === id) ?? null;
}
