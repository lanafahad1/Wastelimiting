// CareBite ingredient reference table.
//
// Ingredients carry allergen, diet and local-production data. They carry no
// nutrient values: nutrition comes only from laboratory dish values in the SFDA
// Saudi Food Composition Tables (data/sfct-dishes.js), never from estimates.
//
// Allergen fields
//   allergens   – allergen groups the ingredient itself contains (strict).
//   mayContain  – groups the ingredient may contain through cross-contact or
//                 because commercial formulations vary. Treated as an
//                 unresolved conflict for people with that confirmed allergy.
//   sameFood    – the ingredient is a variety of another one (cherry tomato →
//                 tomato), so an allergy, exclusion or dislike of one covers both.
//   labelCheck  – packaged product: the label of the product actually bought
//                 must be checked. Meals using it are never called "allergy-safe".
//
// Allergen group codes follow the 14 allergens SFDA requires food
// establishments to disclose (SFDA.FD 56): gluten (cereals containing gluten),
// shellfish (crustaceans), mollusc, egg, fish, peanut, soy, milk, tree_nut,
// celery, mustard, sesame, lupin, sulphites.
//
// Flags drive dietary-pattern screening (vegetarian, vegan, lactose-free…):
//   meat, poultry, fish, shellfish, dairy, egg, honey, lactose, gluten,
//   added_sugar (sugars in this ingredient count as added sugars),
//   rennet_check (cheese that may be made with animal rennet),
//   halal_check (meat/poultry: halal certification must be confirmed).

// Ingredient groups are listed in shared/constants.js (INGREDIENT_GROUPS).

export const INGREDIENTS = [
  // ---- Grains & breads -----------------------------------------------------
  { id: 'rolled-oats', name: 'Rolled oats', group: 'grains', allergens: ['gluten'], mayContain: ['gluten'],
    note: 'Oats are listed among cereals containing gluten in the SFDA allergen list, and they are commonly processed alongside wheat. People on a medically required gluten-free diet should only use oats labelled gluten-free.' },
  { id: 'quinoa', name: 'Quinoa, cooked', group: 'grains' },
  { id: 'brown-rice', name: 'Brown rice, cooked', group: 'grains' },
  { id: 'white-rice', name: 'Long-grain white rice (e.g. basmati), cooked', group: 'grains' },
  { id: 'bulgur', name: 'Bulgur wheat, cooked', group: 'grains', allergens: ['gluten'], flags: ['gluten'] },
  { id: 'couscous', name: 'Couscous, cooked', group: 'grains', allergens: ['gluten'], flags: ['gluten'] },
  { id: 'ww-pasta', name: 'Whole-wheat pasta, cooked', group: 'grains', allergens: ['gluten'], flags: ['gluten'] },
  { id: 'rice-noodles', name: 'Rice noodles, cooked', group: 'grains' },
  { id: 'ww-bread', name: 'Whole-wheat bread', group: 'grains', allergens: ['gluten'], flags: ['gluten'],
    mayContain: ['soy', 'milk', 'egg', 'sesame'], labelCheck: true,
    note: 'Commercial breads vary: many contain or may contain soy, milk, egg or sesame. Sodium also varies by brand.' },
  { id: 'ww-pita', name: 'Whole-wheat pita bread', group: 'grains', allergens: ['gluten'], flags: ['gluten'],
    mayContain: ['sesame', 'soy', 'milk'], labelCheck: true,
    note: 'Pita is often baked in bakeries that also use sesame. Check the label.' },
  { id: 'ww-tortilla', name: 'Whole-wheat tortilla', group: 'grains', allergens: ['gluten'], flags: ['gluten'],
    mayContain: ['soy', 'milk'], labelCheck: true },
  { id: 'popcorn', name: 'Popcorn, air-popped', group: 'grains' },
  { id: 'jareesh', name: 'Jareesh (crushed wheat), dry', group: 'grains', allergens: ['gluten'], flags: ['gluten'] },
  { id: 'whole-wheat-grain', name: 'Whole wheat grains (for harees)', group: 'grains', allergens: ['gluten'], flags: ['gluten'] },
  { id: 'ww-flour', name: 'Whole-wheat flour', group: 'grains', allergens: ['gluten'], flags: ['gluten'] },

  // ---- Proteins ------------------------------------------------------------
  { id: 'egg', name: 'Eggs', group: 'proteins', local: 'eggs', allergens: ['egg'], flags: ['egg'] },
  { id: 'egg-white', name: 'Egg whites', group: 'proteins', local: 'eggs', allergens: ['egg'], flags: ['egg'] },
  { id: 'chicken-breast', name: 'Chicken breast, skinless, boneless (raw)', group: 'proteins', local: 'poultry', flags: ['poultry', 'halal_check'] },
  { id: 'ground-turkey', name: 'Ground turkey, 93% lean (raw)', group: 'proteins', flags: ['poultry', 'halal_check'] },
  { id: 'salmon', name: 'Salmon fillet, Atlantic (raw)', group: 'proteins', allergens: ['fish'], flags: ['fish'] },
  { id: 'cod', name: 'Cod fillet (raw)', group: 'proteins', allergens: ['fish'], flags: ['fish'] },
  { id: 'grouper', name: 'Grouper (hammour) fillet (raw)', group: 'proteins', allergens: ['fish'], flags: ['fish'] },
  { id: 'shrimp', name: 'Shrimp, peeled (raw)', group: 'proteins', allergens: ['shellfish'], flags: ['shellfish'], mayContain: ['sulphites'],
    note: 'Frozen shrimp is often treated with sodium-containing solutions (such as sodium phosphates) and sometimes with sulphites.' },
  { id: 'tuna', name: 'Light tuna, canned in water (drained)', group: 'proteins', allergens: ['fish'], flags: ['fish'],
    mayContain: ['soy'], labelCheck: true,
    note: 'Some canned tuna contains vegetable broth made with soy. Check the label.' },
  { id: 'red-lentils', name: 'Red lentils (dry)', group: 'proteins' },
  { id: 'lentils', name: 'Brown or green lentils, cooked', group: 'proteins' },
  { id: 'chickpeas', name: 'Chickpeas, cooked (no salt added)', group: 'proteins',
    note: 'Values are for chickpeas cooked without salt. Regular canned chickpeas contain considerably more sodium; choose no-salt-added and rinse.' },
  { id: 'black-beans', name: 'Black beans, cooked (no salt added)', group: 'proteins',
    note: 'Values are for beans cooked without salt. Regular canned beans contain more sodium.' },
  { id: 'kidney-beans', name: 'Kidney beans, cooked (no salt added)', group: 'proteins',
    note: 'Values are for beans cooked without salt. Regular canned beans contain more sodium.' },
  { id: 'white-beans', name: 'White (cannellini) beans, cooked (no salt added)', group: 'proteins',
    note: 'Values are for beans cooked without salt. Regular canned beans contain more sodium.' },
  { id: 'fava-beans', name: 'Fava beans, cooked (no salt added)', group: 'proteins',
    note: 'People with G6PD deficiency are generally advised to avoid fava beans. Values are for beans cooked without salt.' },
  { id: 'tofu', name: 'Firm tofu', group: 'proteins', allergens: ['soy'] },
  { id: 'edamame', name: 'Edamame, shelled, cooked', group: 'proteins', allergens: ['soy'] },
  { id: 'peanut-butter', name: 'Peanut butter, unsalted', group: 'pantry', allergens: ['peanut'],
    mayContain: ['tree_nut'], labelCheck: true },
  { id: 'almond-butter', name: 'Almond butter, unsalted', group: 'pantry', allergens: ['tree_nut'],
    mayContain: ['peanut'], labelCheck: true },
  { id: 'almonds', name: 'Almonds', group: 'pantry', allergens: ['tree_nut'] },
  { id: 'walnuts', name: 'Walnuts', group: 'pantry', allergens: ['tree_nut'] },
  { id: 'chia', name: 'Chia seeds', group: 'pantry' },
  { id: 'pumpkin-seeds', name: 'Pumpkin seeds, roasted, unsalted', group: 'pantry' },
  { id: 'tahini', name: 'Tahini (sesame paste)', group: 'pantry', allergens: ['sesame'],
    mayContain: ['peanut', 'tree_nut'], labelCheck: true },
  { id: 'sesame-seeds', name: 'Sesame seeds', group: 'pantry', allergens: ['sesame'] },

  // ---- Dairy & alternatives ------------------------------------------------
  { id: 'greek-yogurt', name: 'Greek yogurt, plain, nonfat', group: 'dairy', local: 'dairy', allergens: ['milk'], flags: ['dairy', 'lactose'] },
  { id: 'yogurt', name: 'Plain low-fat yogurt', group: 'dairy', local: 'dairy', allergens: ['milk'], flags: ['dairy', 'lactose'] },
  { id: 'milk', name: 'Low-fat milk (1%)', group: 'dairy', local: 'dairy', allergens: ['milk'], flags: ['dairy', 'lactose'] },
  { id: 'feta', name: 'Feta cheese', group: 'dairy', allergens: ['milk'], flags: ['dairy', 'lactose', 'rennet_check'] },
  { id: 'mozzarella', name: 'Part-skim mozzarella', group: 'dairy', allergens: ['milk'], flags: ['dairy', 'lactose', 'rennet_check'] },
  { id: 'parmesan', name: 'Parmesan, grated', group: 'dairy', allergens: ['milk'], flags: ['dairy', 'lactose', 'rennet_check'],
    note: 'Traditional Parmesan is made with animal rennet. Vegetarian versions exist.' },
  { id: 'soy-milk', name: 'Soy milk, original, calcium-fortified', group: 'dairy', allergens: ['soy'], labelCheck: true,
    note: 'Original and vanilla soy milks may be sweetened; check the label.' },
  { id: 'laban', name: 'Laban (cultured low-fat buttermilk)', group: 'dairy', local: 'dairy', allergens: ['milk'], flags: ['dairy', 'lactose'],
    note: 'Commercial laban contains some salt; check the label.' },
  { id: 'ghee', name: 'Ghee (samn)', group: 'dairy', allergens: ['milk'], flags: ['dairy', 'lactose'],
    note: 'Ghee contains only traces of lactose but is treated as a dairy ingredient to be cautious.' },
  { id: 'almond-milk', name: 'Almond milk, unsweetened', group: 'dairy', allergens: ['tree_nut'], labelCheck: true },

  // ---- Vegetables & herbs --------------------------------------------------
  { id: 'spinach', name: 'Baby spinach', group: 'vegetables' },
  { id: 'tomato', local: 'tomatoes', name: 'Tomatoes', group: 'vegetables' },
  { id: 'cherry-tomato', sameFood: 'tomato', local: 'tomatoes', name: 'Cherry tomatoes', group: 'vegetables' },
  { id: 'cucumber', name: 'Cucumber', group: 'vegetables' },
  { id: 'onion', local: 'onions', name: 'Onion', group: 'vegetables' },
  { id: 'red-onion', sameFood: 'onion', local: 'onions', name: 'Red onion', group: 'vegetables' },
  { id: 'garlic', name: 'Garlic', group: 'vegetables' },
  { id: 'red-pepper', name: 'Red bell pepper', group: 'vegetables' },
  { id: 'green-pepper', name: 'Green bell pepper', group: 'vegetables' },
  { id: 'broccoli', name: 'Broccoli', group: 'vegetables' },
  { id: 'zucchini', name: 'Zucchini', group: 'vegetables' },
  { id: 'eggplant', name: 'Eggplant', group: 'vegetables' },
  { id: 'mushrooms', name: 'White mushrooms', group: 'vegetables' },
  { id: 'romaine', name: 'Romaine lettuce', group: 'vegetables' },
  { id: 'arugula', name: 'Arugula (rocket)', group: 'vegetables' },
  { id: 'cabbage', name: 'Green cabbage', group: 'vegetables' },
  { id: 'red-cabbage', name: 'Red cabbage', group: 'vegetables' },
  { id: 'parsley', name: 'Fresh parsley', group: 'vegetables' },
  { id: 'mint', name: 'Fresh mint', group: 'vegetables' },
  { id: 'cilantro', name: 'Fresh cilantro (coriander leaves)', group: 'vegetables' },
  { id: 'basil', name: 'Fresh basil', group: 'vegetables' },
  { id: 'green-onion', name: 'Green onions (scallions)', group: 'vegetables' },
  { id: 'corn', name: 'Sweet corn kernels', group: 'vegetables' },
  { id: 'asparagus', name: 'Asparagus', group: 'vegetables' },
  { id: 'green-beans', name: 'Green beans', group: 'vegetables' },
  { id: 'radish', name: 'Radishes', group: 'vegetables' },
  { id: 'avocado', name: 'Avocado', group: 'vegetables' },
  { id: 'ginger', name: 'Fresh ginger', group: 'vegetables' },
  { id: 'jalapeno', name: 'Jalapeño pepper', group: 'vegetables' },
  { id: 'carrot', name: 'Carrots', group: 'vegetables' },
  { id: 'cauliflower', name: 'Cauliflower', group: 'vegetables' },
  { id: 'snow-peas', name: 'Snow peas', group: 'vegetables' },
  { id: 'sweet-potato', name: 'Sweet potato', group: 'vegetables' },
  { id: 'potato', name: 'Potatoes', group: 'vegetables', local: 'potatoes' },

  // ---- Fruits --------------------------------------------------------------
  { id: 'banana', name: 'Banana', group: 'fruits' },
  { id: 'blueberries', name: 'Blueberries', group: 'fruits' },
  { id: 'strawberries', name: 'Strawberries', group: 'fruits' },
  { id: 'raspberries', name: 'Raspberries', group: 'fruits' },
  { id: 'apple', name: 'Apple', group: 'fruits' },
  { id: 'mango', name: 'Mango', group: 'fruits' },
  { id: 'pomegranate', name: 'Pomegranate arils', group: 'fruits' },
  { id: 'dates', local: 'dates', name: 'Dates (deglet noor)', group: 'fruits' },
  { id: 'raisins', name: 'Raisins', group: 'fruits', mayContain: ['sulphites'], labelCheck: true,
    note: 'Some raisins, especially golden raisins, are treated with sulphites. Check the label.' },
  { id: 'lemon-juice', name: 'Lemon juice (fresh)', group: 'fruits' },
  { id: 'lime-juice', name: 'Lime juice (fresh)', group: 'fruits' },

  // ---- Pantry --------------------------------------------------------------
  { id: 'olive-oil', name: 'Olive oil', group: 'pantry' },
  { id: 'sesame-oil', name: 'Toasted sesame oil', group: 'pantry', allergens: ['sesame'] },
  { id: 'honey', name: 'Honey', group: 'pantry', flags: ['honey', 'added_sugar'] },
  { id: 'maple-syrup', name: 'Maple syrup', group: 'pantry', flags: ['added_sugar'] },
  { id: 'salt', name: 'Salt', group: 'pantry' },
  { id: 'black-pepper', name: 'Ground black pepper', group: 'pantry' },
  { id: 'cumin', name: 'Ground cumin', group: 'pantry' },
  { id: 'turmeric', name: 'Ground turmeric', group: 'pantry' },
  { id: 'cinnamon', name: 'Ground cinnamon', group: 'pantry' },
  { id: 'paprika', name: 'Paprika', group: 'pantry' },
  { id: 'chili-powder', name: 'Chili powder (blend)', group: 'pantry', labelCheck: true,
    note: 'Chili powder is a blend that usually contains salt; formulations vary.' },
  { id: 'cardamom', name: 'Ground cardamom', group: 'pantry' },
  { id: 'curry-powder', name: 'Curry powder (blend)', group: 'pantry', labelCheck: true, mayContain: ['mustard', 'celery'],
    note: 'Curry powder blends may include mustard seed or celery seed. Check the label.' },
  { id: 'oregano', name: 'Dried oregano', group: 'pantry' },
  { id: 'cayenne', name: 'Cayenne / red pepper flakes', group: 'pantry' },
  { id: 'garlic-powder', name: 'Garlic powder', group: 'pantry' },
  { id: 'cloves', name: 'Ground cloves', group: 'pantry' },
  { id: 'cider-vinegar', name: 'Apple cider vinegar', group: 'pantry', mayContain: ['sulphites'], labelCheck: true },
  { id: 'soy-sauce', name: 'Low-sodium soy sauce', group: 'pantry', allergens: ['soy', 'gluten'], flags: ['gluten'],
    labelCheck: true, note: 'Most soy sauces are brewed with wheat. Tamari is sometimes wheat-free; check the label.' },
  { id: 'chicken-broth', name: 'Low-sodium chicken broth', group: 'pantry', flags: ['poultry', 'halal_check'], labelCheck: true, mayContain: ['celery'],
    note: 'Commercial broths often contain celery. Check the label.' },
  { id: 'canned-tomatoes', name: 'Canned diced tomatoes, no salt added', group: 'pantry', labelCheck: true },
  { id: 'tomato-paste', name: 'Tomato paste, no salt added', group: 'pantry', labelCheck: true },
  { id: 'olives', name: 'Black olives (canned)', group: 'pantry', labelCheck: true },

  // ---- Ingredients without verified nutrient data --------------------------
  // These are kept on purpose: CareBite must show "data unavailable" rather
  // than guess, and must not pass sodium screening it cannot verify.
  { id: 'zaatar', name: "Za'atar spice blend", group: 'pantry', allergens: ['sesame'], labelCheck: true,
    note: "Za'atar blends usually contain sesame and often contain salt." },
  { id: 'loomi', name: 'Dried black lime (loomi)', group: 'pantry',
    note: 'Simmered whole for aroma and removed before serving, so it is listed as optional.' },
  { id: 'harissa', name: 'Harissa paste', group: 'other', labelCheck: true,
    note: 'Sodium varies widely between brands of harissa; check the label.' },

  // ---- Ingredients of the SFDA Saudi Food Composition Tables standard recipes
  { id: 'chicken', name: 'Chicken pieces with bone (raw)', group: 'proteins', local: 'poultry', flags: ['poultry', 'halal_check'] },
  { id: 'lamb', name: 'Lamb with bone (raw)', group: 'proteins', flags: ['meat', 'halal_check'] },
  { id: 'tail-fat', name: 'Sheep tail fat or rendered fat (waddak)', group: 'proteins', flags: ['meat', 'halal_check'] },
  { id: 'fish-emperor', name: 'Spangled emperor fish (shaour)', group: 'proteins', allergens: ['fish'], flags: ['fish'] },
  { id: 'fish-najel', name: 'Najel fish (coral grouper), whole', group: 'proteins', allergens: ['fish'], flags: ['fish'] },
  { id: 'rice-uncooked', name: 'Rice, uncooked (long- or short-grain)', group: 'grains' },
  { id: 'vermicelli', name: 'Vermicelli (syouyah), wheat', group: 'grains', allergens: ['gluten'], flags: ['gluten'], labelCheck: true },
  { id: 'white-flour', name: 'White wheat flour', group: 'grains', allergens: ['gluten'], flags: ['gluten'] },
  { id: 'millet-flour', name: 'Millet flour', group: 'grains', mayContain: ['gluten'], labelCheck: true, note: 'Millet is naturally gluten-free, but milled flour is often processed alongside wheat. Check the label.' },
  { id: 'sorghum-flour', name: 'Red sorghum flour', group: 'grains', mayContain: ['gluten'], labelCheck: true, note: 'Sorghum is naturally gluten-free, but milled flour is often processed alongside wheat. Check the label.' },
  { id: 'saj-bread', name: 'Saj flatbread (shurak), wheat', group: 'grains', allergens: ['gluten'], flags: ['gluten'] },
  { id: 'yeast', name: 'Instant yeast', group: 'pantry' },
  { id: 'butter', name: 'Butter', group: 'dairy', local: 'dairy', allergens: ['milk'], flags: ['dairy', 'lactose'] },
  { id: 'pumpkin', name: 'Pumpkin', group: 'vegetables' },
  { id: 'purslane', name: 'Purslane (rijlah), fresh', group: 'vegetables' },
  { id: 'green-chili', name: 'Green chili pepper', group: 'vegetables' },
  { id: 'vegetable-oil', name: 'Vegetable oil', group: 'pantry' },
  { id: 'sugar', name: 'Sugar', group: 'pantry', flags: ['added_sugar'] },
  { id: 'mastic', name: 'Mastic gum (mistika)', group: 'pantry' },
  { id: 'saffron', name: 'Saffron threads or saffron colouring', group: 'pantry', labelCheck: true },
  { id: 'citric-acid', name: 'Citric acid', group: 'pantry' },
  { id: 'kadi-water', name: 'Kadi (screwpine) flower water', group: 'pantry', labelCheck: true },
  { id: 'coriander-ground', name: 'Ground dried coriander', group: 'pantry' },
  { id: 'bay-leaves', name: 'Bay leaves', group: 'pantry' },
  { id: 'galangal', name: 'Galangal', group: 'pantry' },
  { id: 'shiba', name: 'Shiba (artemisia) herb, dried', group: 'pantry' },
  { id: 'nigella', name: 'Nigella seeds', group: 'pantry' },
  { id: 'mixed-spices', name: 'Saudi mixed spices (bzar)', group: 'pantry', labelCheck: true,
    note: 'Spice blends vary by supplier. Check the label for mustard, celery or sesame before serving patients with those allergies.' },
];

/** Ingredient-level coded concepts a person can record as an allergy,
 *  intolerance or medically required exclusion, beyond the major allergen groups. */
export const INGREDIENT_LOOKUP = Object.fromEntries(INGREDIENTS.map((i) => [i.id, i]));
