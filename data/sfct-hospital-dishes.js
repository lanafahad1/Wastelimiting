// Hospital dishes prepared to SFDA Saudi Food Composition Tables standard recipes.
// Generated from the SFCT recipes: ingredient grams per standard portion =
// SFCT recipe quantity × (hospital portion ÷ cooked weight of the SFCT recipe).
// Water is not listed. Where the SFCT gives a count ("2 pieces"), an approximate
// piece weight is used for kitchen quantities only (dried lime 4 g, chili 10 g,
// egg 50 g); it never affects nutrition, which comes from the SFCT per-100 g
// laboratory values. Portion weights are demonstration hospital values.

export const SFCT_HOSPITAL_DISHES = [
  {
    id: 'chicken-kabsa',
    name: 'Chicken Kabsa',
    nameAr: 'كبسة بالدجاج',
    kind: 'main',
    category: 'lunch',
    cuisine: 'Saudi',
    description: 'Prepared to the SFDA Saudi Food Composition Tables standard recipe for Chicken Kabsa (Al-Baha region).',
    portionG: 350,
    servingSize: '1 plate of rice with chicken (350 g)',
    ingredients: [
      {
        ing: 'chicken',
        g: 118.9
      },
      {
        ing: 'tail-fat',
        g: 14.3
      },
      {
        ing: 'tomato',
        g: 38
      },
      {
        ing: 'onion',
        g: 16.6
      },
      {
        ing: 'black-pepper',
        g: 0.9
      },
      {
        ing: 'rice-uncooked',
        g: 106.9
      },
      {
        ing: 'salt',
        g: 6.4
      }
    ],
    nutrition: {
      source: 'sfct',
      sfctId: 'chicken-kabsa'
    },
    art: {
      vessel: 'platter',
      base: 'rice-yellow',
      items: [
        'chicken*6',
        'tomato-dice*5',
        'herb*4'
      ]
    },
    sfctRecipe: {
      yield: 'Approximately 4 adults',
      recipeGrams: 1964,
      recipePage: 224
    }
  },
  {
    id: 'bukhari-chicken',
    name: 'Bukhari Rice with Chicken',
    nameAr: 'أرز بخاري بالدجاج',
    kind: 'main',
    category: 'lunch',
    cuisine: 'Saudi',
    description: 'Prepared to the SFDA Saudi Food Composition Tables standard recipe for Bukhari Rice with Chicken (Makkah region).',
    portionG: 350,
    servingSize: '1 plate of rice with chicken (350 g)',
    ingredients: [
      {
        ing: 'chicken',
        g: 52.8
      },
      {
        ing: 'carrot',
        g: 46.3
      },
      {
        ing: 'tomato',
        g: 50.6
      },
      {
        ing: 'rice-uncooked',
        g: 67.9
      },
      {
        ing: 'cumin',
        g: 0.1
      },
      {
        ing: 'onion',
        g: 10.1
      },
      {
        ing: 'vegetable-oil',
        g: 21.7
      },
      {
        ing: 'salt',
        g: 2
      }
    ],
    nutrition: {
      source: 'sfct',
      sfctId: 'bukhari-rice-with-chicken'
    },
    art: {
      vessel: 'platter',
      base: 'rice-yellow',
      items: [
        'chicken*5',
        'carrot*8',
        'tomato-dice*4'
      ]
    },
    sfctRecipe: {
      yield: 'Approximately 4 adults',
      recipeGrams: 2421,
      recipePage: 38
    }
  },
  {
    id: 'saleeg-chicken',
    name: 'Taifi Saleeg with Chicken',
    nameAr: 'السليق الطائفي بالدجاج',
    kind: 'main',
    category: 'dinner',
    cuisine: 'Saudi',
    description: 'Prepared to the SFDA Saudi Food Composition Tables standard recipe for Al-Saleeg with Chicken (Makkah region).',
    portionG: 350,
    servingSize: '1 bowl of creamy rice with chicken (350 g)',
    ingredients: [
      {
        ing: 'rice-uncooked',
        g: 74.6
      },
      {
        ing: 'mastic',
        g: 0.9
      },
      {
        ing: 'chicken',
        g: 153.8
      },
      {
        ing: 'salt',
        g: 4.7
      }
    ],
    nutrition: {
      source: 'sfct',
      sfctId: 'al-saleeg-with-chicken'
    },
    art: {
      vessel: 'platter',
      base: 'saleeg',
      items: [
        'chicken*5',
        'herb*3'
      ]
    },
    sfctRecipe: {
      yield: 'Approximately 4 adults',
      recipeGrams: 1502,
      recipePage: 50
    }
  },
  {
    id: 'jareesh',
    name: 'Jareesh with Laban',
    nameAr: 'جريش',
    kind: 'main',
    category: 'lunch',
    cuisine: 'Saudi',
    description: 'Prepared to the SFDA Saudi Food Composition Tables standard recipe for Al-Jareesh (Riyadh region).',
    portionG: 300,
    servingSize: '1 bowl (300 g)',
    ingredients: [
      {
        ing: 'jareesh',
        g: 61.8
      },
      {
        ing: 'ghee',
        g: 7.4
      },
      {
        ing: 'cumin',
        g: 1
      },
      {
        ing: 'salt',
        g: 1.9
      },
      {
        ing: 'onion',
        g: 12.4
      },
      {
        ing: 'vegetable-oil',
        g: 12.4
      },
      {
        ing: 'laban',
        g: 185.5
      }
    ],
    nutrition: {
      source: 'sfct',
      sfctId: 'al-jareesh'
    },
    art: {
      vessel: 'bowl',
      base: 'jareesh',
      items: [
        'onion-fried*6',
        'cumin*10',
        'herb*3'
      ]
    },
    sfctRecipe: {
      yield: 'Approximately 4 adults',
      recipeGrams: 2426,
      recipePage: 16
    }
  },
  {
    id: 'margouq',
    name: 'Margouq (Vegetable and Lamb Stew with Dough)',
    nameAr: 'مرقوق خضار',
    kind: 'main',
    category: 'dinner',
    cuisine: 'Saudi',
    description: 'Prepared to the SFDA Saudi Food Composition Tables standard recipe for Margaouq (Riyadh region).',
    portionG: 350,
    servingSize: '1 deep bowl (350 g)',
    ingredients: [
      {
        ing: 'onion',
        g: 15.5
      },
      {
        ing: 'pumpkin',
        g: 15.5
      },
      {
        ing: 'zucchini',
        g: 15.5
      },
      {
        ing: 'eggplant',
        g: 15.5
      },
      {
        ing: 'green-beans',
        g: 7.8
      },
      {
        ing: 'turmeric',
        g: 0.3
      },
      {
        ing: 'tomato-paste',
        g: 3.1
      },
      {
        ing: 'tomato',
        g: 38.8
      },
      {
        ing: 'lamb',
        g: 62.1
      },
      {
        ing: 'ghee',
        g: 4.7
      },
      {
        ing: 'green-chili',
        g: 3.1
      },
      {
        ing: 'loomi',
        g: 1.2
      },
      {
        ing: 'mixed-spices',
        g: 0.8
      },
      {
        ing: 'salt',
        g: 0.8
      },
      {
        ing: 'black-pepper',
        g: 0.3
      },
      {
        ing: 'ww-flour',
        g: 46.6
      }
    ],
    nutrition: {
      source: 'sfct',
      sfctId: 'margaouq'
    },
    art: {
      vessel: 'bowl',
      base: 'stew-red',
      items: [
        'dough*6',
        'zucchini*4',
        'eggplant*3',
        'herb*4'
      ]
    },
    sfctRecipe: {
      yield: 'Approximately 4 adults',
      recipeGrams: 2255,
      recipePage: 18
    }
  },
  {
    id: 'madini-chicken',
    name: 'Madini Rice with Chicken',
    nameAr: 'أرز مديني بالدجاج',
    kind: 'main',
    category: 'lunch',
    cuisine: 'Saudi',
    description: 'Prepared to the SFDA Saudi Food Composition Tables standard recipe for Madini Rice with Chicken (Al-Madinah region).',
    portionG: 350,
    servingSize: '1 plate of rice with chicken (350 g)',
    ingredients: [
      {
        ing: 'rice-uncooked',
        g: 86.7
      },
      {
        ing: 'cardamom',
        g: 0.9
      },
      {
        ing: 'black-pepper',
        g: 1.2
      },
      {
        ing: 'chicken',
        g: 86.7
      },
      {
        ing: 'cloves',
        g: 0.5
      },
      {
        ing: 'mastic',
        g: 0.2
      },
      {
        ing: 'salt',
        g: 3.5
      },
      {
        ing: 'ghee',
        g: 13
      },
      {
        ing: 'raisins',
        g: 3.5
      },
      {
        ing: 'tomato-paste',
        g: 22.5
      },
      {
        ing: 'cumin',
        g: 0.3
      },
      {
        ing: 'saffron',
        g: 0.2
      },
      {
        ing: 'coriander-ground',
        g: 0.3
      },
      {
        ing: 'citric-acid',
        g: 0.5
      },
      {
        ing: 'kadi-water',
        g: 13.9
      }
    ],
    nutrition: {
      source: 'sfct',
      sfctId: 'madini-rice-with-chicken'
    },
    art: {
      vessel: 'platter',
      base: 'rice-yellow',
      items: [
        'chicken*5',
        'raisin*6',
        'herb*3'
      ]
    },
    sfctRecipe: {
      yield: 'Approximately 4 adults',
      recipeGrams: 2019,
      recipePage: 89
    }
  },
  {
    id: 'lentil-rice',
    name: 'Lentil Rice',
    nameAr: 'أرز بالعدس',
    kind: 'side',
    category: 'dinner',
    cuisine: 'Saudi',
    description: 'Prepared to the SFDA Saudi Food Composition Tables standard recipe for Lentil Rice (Al-Madinah region).',
    portionG: 250,
    servingSize: '1 bowl (250 g)',
    ingredients: [
      {
        ing: 'rice-uncooked',
        g: 29
      },
      {
        ing: 'onion',
        g: 13
      },
      {
        ing: 'salt',
        g: 3.2
      },
      {
        ing: 'turmeric',
        g: 0.5
      },
      {
        ing: 'coriander-ground',
        g: 0.3
      },
      {
        ing: 'red-lentils',
        g: 15.3
      },
      {
        ing: 'ghee',
        g: 7.7
      },
      {
        ing: 'green-chili',
        g: 1.1
      },
      {
        ing: 'cumin',
        g: 0.3
      },
      {
        ing: 'black-pepper',
        g: 0.2
      }
    ],
    nutrition: {
      source: 'sfct',
      sfctId: 'lentil-rice'
    },
    art: {
      vessel: 'bowl',
      base: 'rice-yellow',
      items: [
        'chickpea*14',
        'herb*4'
      ]
    },
    sfctRecipe: {
      yield: 'Approximately 4 adults',
      recipeGrams: 1639,
      recipePage: 84
    }
  },
  {
    id: 'sayadiah',
    name: 'Sayadiah (Fish with Spiced Rice)',
    nameAr: 'صيادية',
    kind: 'main',
    category: 'dinner',
    cuisine: 'Saudi',
    description: 'Prepared to the SFDA Saudi Food Composition Tables standard recipe for Al-Sayadiah (Tabuk region).',
    portionG: 350,
    servingSize: '1 plate of rice with fish (350 g)',
    ingredients: [
      {
        ing: 'fish-emperor',
        g: 156.5
      },
      {
        ing: 'cinnamon',
        g: 2.4
      },
      {
        ing: 'rice-uncooked',
        g: 56.9
      },
      {
        ing: 'black-pepper',
        g: 1
      },
      {
        ing: 'ghee',
        g: 2.8,
        prep: 'for garnish'
      },
      {
        ing: 'green-chili',
        g: 1.6
      },
      {
        ing: 'cardamom',
        g: 0.1
      },
      {
        ing: 'loomi',
        g: 0.6
      },
      {
        ing: 'cloves',
        g: 0.1
      },
      {
        ing: 'coriander-ground',
        g: 1
      },
      {
        ing: 'cumin',
        g: 1
      },
      {
        ing: 'bay-leaves',
        g: 1
      },
      {
        ing: 'vegetable-oil',
        g: 18.9
      },
      {
        ing: 'salt',
        g: 1.8
      },
      {
        ing: 'onion',
        g: 75.8
      }
    ],
    nutrition: {
      source: 'sfct',
      sfctId: 'al-sayadiah'
    },
    art: {
      vessel: 'platter',
      base: 'rice-brown',
      items: [
        'fish-white*3',
        'onion-fried*6',
        'herb*3'
      ]
    },
    sfctRecipe: {
      yield: 'Approximately 4 adults',
      recipeGrams: 2460,
      recipePage: 194
    }
  },
  {
    id: 'couscousiyah-chicken',
    name: 'Couscousiyah with Chicken',
    nameAr: 'كُسكسيُة بالدجاج',
    kind: 'main',
    category: 'dinner',
    cuisine: 'Saudi',
    description: 'Prepared to the SFDA Saudi Food Composition Tables standard recipe for Couscousiyah with Chicken (Al-Baha region).',
    portionG: 350,
    servingSize: '1 plate (350 g)',
    ingredients: [
      {
        ing: 'chicken',
        g: 52.4
      },
      {
        ing: 'onion',
        g: 21
      },
      {
        ing: 'tomato',
        g: 26.2
      },
      {
        ing: 'coriander-ground',
        g: 0.8
      },
      {
        ing: 'black-pepper',
        g: 0.5
      },
      {
        ing: 'cumin',
        g: 0.6
      },
      {
        ing: 'turmeric',
        g: 0.4
      },
      {
        ing: 'olive-oil',
        g: 8.8
      },
      {
        ing: 'salt',
        g: 0.9
      },
      {
        ing: 'ww-flour',
        g: 52.4
      },
      {
        ing: 'ghee',
        g: 9.6
      },
      {
        ing: 'zucchini',
        g: 26.1
      },
      {
        ing: 'red-pepper',
        g: 8.7
      },
      {
        ing: 'carrot',
        g: 8.7
      },
      {
        ing: 'parsley',
        g: 5.2
      },
      {
        ing: 'green-chili',
        g: 3.5
      }
    ],
    nutrition: {
      source: 'sfct',
      sfctId: 'couscousiyah-with-chicken'
    },
    art: {
      vessel: 'platter',
      base: 'couscous',
      items: [
        'chicken*4',
        'carrot*5',
        'zucchini*4',
        'herb*4'
      ]
    },
    sfctRecipe: {
      yield: 'Approximately 6 adults',
      recipeGrams: 4004,
      recipePage: 217
    }
  },
  {
    id: 'tashreebah-chicken',
    name: 'Tashreebah with Chicken (Bread in Broth)',
    nameAr: 'التشريبة بالدجاج',
    kind: 'main',
    category: 'lunch',
    cuisine: 'Saudi',
    description: 'Prepared to the SFDA Saudi Food Composition Tables standard recipe for Al-Tashreebah with chicken (Northern Borders region).',
    portionG: 350,
    servingSize: '1 deep bowl (350 g)',
    ingredients: [
      {
        ing: 'chicken',
        g: 76.2
      },
      {
        ing: 'salt',
        g: 1.8
      },
      {
        ing: 'loomi',
        g: 0.6
      },
      {
        ing: 'turmeric',
        g: 0.3
      },
      {
        ing: 'onion',
        g: 7.6
      },
      {
        ing: 'black-pepper',
        g: 0.2
      },
      {
        ing: 'cinnamon',
        g: 1
      },
      {
        ing: 'vegetable-oil',
        g: 6.4
      },
      {
        ing: 'saj-bread',
        g: 50.8
      },
      {
        ing: 'ww-flour',
        g: 50.8
      }
    ],
    nutrition: {
      source: 'sfct',
      sfctId: 'al-tashreebah-with-chicken'
    },
    art: {
      vessel: 'bowl',
      base: 'curry',
      items: [
        'dough*6',
        'chicken*3',
        'herb*3'
      ]
    },
    sfctRecipe: {
      yield: 'Approximately 4 adults',
      recipeGrams: 2204,
      recipePage: 230
    }
  },
  {
    id: 'purslane-stew',
    name: 'Purslane Stew (Idam Rijlah)',
    nameAr: 'إيدام رجلة',
    kind: 'side',
    category: 'lunch',
    cuisine: 'Saudi',
    description: 'Prepared to the SFDA Saudi Food Composition Tables standard recipe for Purslane Stew (Al-Baha region).',
    portionG: 150,
    servingSize: '1 small bowl (150 g)',
    ingredients: [
      {
        ing: 'onion',
        g: 20.9
      },
      {
        ing: 'tomato',
        g: 50.5
      },
      {
        ing: 'salt',
        g: 1
      },
      {
        ing: 'purslane',
        g: 55.7
      },
      {
        ing: 'ghee',
        g: 7
      }
    ],
    nutrition: {
      source: 'sfct',
      sfctId: 'purslane-stew'
    },
    art: {
      vessel: 'bowl',
      base: 'stew-red',
      items: [
        'herb*12',
        'tomato-dice*5'
      ]
    },
    sfctRecipe: {
      yield: 'Approximately 4 adults',
      recipeGrams: 861,
      recipePage: 198
    }
  },
  {
    id: 'fried-fish',
    name: 'Fried Fish',
    nameAr: 'سمك مقلي',
    kind: 'main',
    category: 'lunch',
    cuisine: 'Saudi',
    description: 'Prepared to the SFDA Saudi Food Composition Tables standard recipe for Fried Fish (Makkah region).',
    portionG: 150,
    servingSize: '1 fish portion (150 g)',
    ingredients: [
      {
        ing: 'fish-najel',
        g: 212.5
      },
      {
        ing: 'coriander-ground',
        g: 0.7
      },
      {
        ing: 'cumin',
        g: 0.7
      },
      {
        ing: 'citric-acid',
        g: 0.4
      },
      {
        ing: 'salt',
        g: 0.4
      },
      {
        ing: 'vegetable-oil',
        g: 0.1,
        prep: 'as needed (SFCT recipe)'
      }
    ],
    nutrition: {
      source: 'sfct',
      sfctId: 'fried-fish'
    },
    art: {
      vessel: 'plate',
      base: 'none',
      items: [
        'fish-white*2',
        'lemon*2',
        'herb*3'
      ]
    },
    sfctRecipe: {
      yield: 'Approximately 4 adults',
      recipeGrams: 847,
      recipePage: 54
    }
  },
  {
    id: 'dates-aseedah',
    name: 'Dates Aseedah',
    nameAr: 'عصيدة تمر',
    kind: 'main',
    category: 'breakfast',
    cuisine: 'Saudi',
    description: 'Prepared to the SFDA Saudi Food Composition Tables standard recipe for Dates Aseedah (Eastern region).',
    portionG: 200,
    servingSize: '1 bowl (200 g)',
    ingredients: [
      {
        ing: 'ww-flour',
        g: 41.3
      },
      {
        ing: 'butter',
        g: 6.3,
        prep: 'for garnish'
      },
      {
        ing: 'dates',
        g: 62.5
      },
      {
        ing: 'black-pepper',
        g: 0.1,
        prep: 'for garnish'
      }
    ],
    nutrition: {
      source: 'sfct',
      sfctId: 'dates-aseedah'
    },
    art: {
      vessel: 'bowl',
      base: 'porridge',
      items: [
        'date*4',
        'drizzle*1'
      ]
    },
    sfctRecipe: {
      yield: 'Approximately 4 adults',
      recipeGrams: 1599,
      recipePage: 118
    }
  },
  {
    id: 'wheat-aseedah',
    name: 'Whole Wheat Aseedah',
    nameAr: 'عصيدة بدقيق البر',
    kind: 'dessert',
    category: 'snack',
    cuisine: 'Saudi',
    description: 'Prepared to the SFDA Saudi Food Composition Tables standard recipe for Whole Wheat Aseedah (Makkah region).',
    portionG: 150,
    servingSize: '1 small bowl (150 g)',
    ingredients: [
      {
        ing: 'ww-flour',
        g: 10.7
      },
      {
        ing: 'dates',
        g: 53.6
      },
      {
        ing: 'ghee',
        g: 8.6
      },
      {
        ing: 'cardamom',
        g: 0.4
      }
    ],
    nutrition: {
      source: 'sfct',
      sfctId: 'whole-wheat-aseedah'
    },
    art: {
      vessel: 'bowl',
      base: 'porridge',
      items: [
        'date*3',
        'cinnamon*8'
      ]
    },
    sfctRecipe: {
      yield: 'Approximately 4 adults',
      recipeGrams: 1400,
      recipePage: 56
    }
  },
  {
    id: 'lahouh',
    name: 'Lahouh (Jazani Flatbread)',
    nameAr: 'لحوح',
    kind: 'bread',
    category: 'breakfast',
    cuisine: 'Saudi',
    description: 'Prepared to the SFDA Saudi Food Composition Tables standard recipe for Lahouh (Jazan region).',
    portionG: 100,
    servingSize: '1 flatbread (100 g)',
    ingredients: [
      {
        ing: 'white-flour',
        g: 19.7
      },
      {
        ing: 'millet-flour',
        g: 18.1
      },
      {
        ing: 'sorghum-flour',
        g: 12.6
      },
      {
        ing: 'laban',
        g: 22.1
      },
      {
        ing: 'cumin',
        g: 0.5
      },
      {
        ing: 'yeast',
        g: 0.8
      },
      {
        ing: 'salt',
        g: 0.8
      }
    ],
    nutrition: {
      source: 'sfct',
      sfctId: 'lahouh'
    },
    art: {
      vessel: 'plate',
      base: 'oats',
      items: [
        'seed*10'
      ]
    },
    sfctRecipe: {
      yield: 'Approximately 4 adults',
      recipeGrams: 847,
      recipePage: 280
    }
  },
  {
    id: 'balaleet',
    name: 'Balaleet (Sweet Vermicelli with Egg)',
    nameAr: 'بلاليط بالبيض والبصل / سيوية / شعيرية',
    kind: 'main',
    category: 'breakfast',
    cuisine: 'Saudi',
    description: 'Prepared to the SFDA Saudi Food Composition Tables standard recipe for Balaleet Eggs and Onions (Eastern region).',
    portionG: 200,
    servingSize: '1 plate (200 g)',
    ingredients: [
      {
        ing: 'vermicelli',
        g: 62.5
      },
      {
        ing: 'sugar',
        g: 19.5
      },
      {
        ing: 'ghee',
        g: 6.2
      },
      {
        ing: 'egg',
        g: 15.6
      },
      {
        ing: 'onion',
        g: 12.5
      },
      {
        ing: 'salt',
        g: 0.3
      }
    ],
    nutrition: {
      source: 'sfct',
      sfctId: 'balaleet-eggs-and-onions'
    },
    art: {
      vessel: 'plate',
      base: 'noodles',
      items: [
        'egg-fried*1',
        'herb*2'
      ]
    },
    sfctRecipe: {
      yield: 'Approximately 4 adults',
      recipeGrams: 1279,
      recipePage: 114
    }
  },
  {
    id: 'muhalla',
    name: 'Muhalla (Date and Wheat Pudding)',
    nameAr: 'محلى',
    kind: 'dessert',
    category: 'snack',
    cuisine: 'Saudi',
    description: 'Prepared to the SFDA Saudi Food Composition Tables standard recipe for Muhalla (Riyadh region).',
    portionG: 120,
    servingSize: '1 small bowl (120 g)',
    ingredients: [
      {
        ing: 'ww-flour',
        g: 33
      },
      {
        ing: 'dates',
        g: 26.4
      },
      {
        ing: 'ghee',
        g: 6.6
      },
      {
        ing: 'black-pepper',
        g: 0.3
      },
      {
        ing: 'salt',
        g: 0.1
      }
    ],
    nutrition: {
      source: 'sfct',
      sfctId: 'muhalla'
    },
    art: {
      vessel: 'bowl',
      base: 'porridge',
      items: [
        'date*3',
        'drizzle*1'
      ]
    },
    sfctRecipe: {
      yield: 'Approximately 4 adults',
      recipeGrams: 1816,
      recipePage: 24
    }
  },
  {
    id: 'timman-rice',
    name: 'Timman Rice with Lamb and Vegetables',
    nameAr: 'أرز التمن',
    kind: 'main',
    category: 'lunch',
    cuisine: 'Saudi',
    description: 'Prepared to the SFDA Saudi Food Composition Tables standard recipe for Timman Rice (Hail region).',
    portionG: 350,
    servingSize: '1 plate (350 g)',
    ingredients: [
      {
        ing: 'rice-uncooked',
        g: 43.1
      },
      {
        ing: 'lamb',
        g: 50.3
      },
      {
        ing: 'tail-fat',
        g: 7.2
      },
      {
        ing: 'tomato',
        g: 28.8
      },
      {
        ing: 'zucchini',
        g: 14.4
      },
      {
        ing: 'eggplant',
        g: 21.6
      },
      {
        ing: 'pumpkin',
        g: 14.4
      },
      {
        ing: 'onion',
        g: 14.4
      },
      {
        ing: 'tomato-paste',
        g: 2.9
      },
      {
        ing: 'green-chili',
        g: 2.9
      },
      {
        ing: 'mixed-spices',
        g: 2.1
      },
      {
        ing: 'cumin',
        g: 1.4
      },
      {
        ing: 'salt',
        g: 1.4
      },
      {
        ing: 'turmeric',
        g: 0.7
      },
      {
        ing: 'loomi',
        g: 1
      },
      {
        ing: 'black-pepper',
        g: 0.3
      },
      {
        ing: 'ghee',
        g: 2.9,
        prep: 'for garnish'
      }
    ],
    nutrition: {
      source: 'sfct',
      sfctId: 'timman-rice'
    },
    art: {
      vessel: 'platter',
      base: 'rice-spiced',
      items: [
        'zucchini*3',
        'eggplant*3',
        'herb*4'
      ]
    },
    sfctRecipe: {
      yield: 'Approximately 4 adults',
      recipeGrams: 2434,
      recipePage: 162
    }
  }
];
