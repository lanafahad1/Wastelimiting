// Demonstration hospital menu: a 7-day cycle (Monday = day 0). Each meal
// period lists the meals the kitchen prepares that day. Staff can change the
// cycle, or the menu of a single date, in menu management; this is only the
// starting cycle. Friday lunch keeps the Saudi tradition of kabsa.

export const MENU_CYCLE = [
  { // Monday
    breakfast: ['overnight-oats-berries', 'vegetable-shakshuka', 'foul-medames', 'dates-aseedah', 'avocado-egg-toast'],
    lunch: ['red-lentil-soup', 'jareesh', 'bukhari-lunch-tray', 'chicken-veggie-wrap', 'tuna-white-bean-salad', 'black-bean-sweet-potato-bowl'],
    dinner: ['saleeg-chicken', 'fish-dinner-tray', 'chickpea-spinach-curry', 'herb-chicken-sweet-potato', 'whole-wheat-pasta-primavera'],
    snack: ['hummus-veggie-sticks', 'yogurt-berries', 'laban-dates', 'wheat-aseedah', 'cinnamon-popcorn'],
  },
  { // Tuesday
    breakfast: ['spinach-feta-egg-muffins', 'tofu-veggie-scramble', 'foul-medames', 'lahouh-breakfast', 'yogurt-cucumber-zaatar-bowl'],
    lunch: ['red-lentil-soup', 'kabsa-lunch-tray', 'fattoush-grilled-chicken', 'tabbouleh-chickpeas', 'tashreebah-chicken', 'peanut-noodle-salad'],
    dinner: ['margouq', 'sayadiah', 'turkey-bean-chili', 'tofu-vegetable-stir-fry', 'lentil-stuffed-peppers'],
    snack: ['dates-walnuts', 'muhalla', 'roasted-spiced-chickpeas', 'mango-chia-pudding', 'yogurt-berries'],
  },
  { // Wednesday
    breakfast: ['overnight-oats-berries', 'vegetable-shakshuka', 'balaleet', 'yogurt-parfait-pomegranate', 'tofu-veggie-scramble'],
    lunch: ['red-lentil-soup', 'madini-chicken', 'jareesh', 'mediterranean-quinoa-salad', 'chicken-veggie-wrap', 'black-bean-sweet-potato-bowl'],
    dinner: ['couscousiyah-chicken', 'saleeg-dinner-tray', 'salmon-quinoa-asparagus', 'chickpea-spinach-curry', 'harissa-fish-vegetables'],
    snack: ['hummus-veggie-sticks', 'laban-dates', 'apple-almond-butter', 'wheat-aseedah', 'edamame-lime-chili'],
  },
  { // Thursday
    breakfast: ['foul-medames', 'spinach-feta-egg-muffins', 'dates-aseedah', 'yogurt-cucumber-zaatar-bowl', 'overnight-oats-berries'],
    lunch: ['red-lentil-soup', 'timman-rice', 'bukhari-lunch-tray', 'fattoush-grilled-chicken', 'tabbouleh-chickpeas', 'shrimp-mango-salad'],
    dinner: ['saleeg-chicken', 'fish-dinner-tray', 'herb-chicken-sweet-potato', 'baked-cod-tomato-olive', 'lentil-stuffed-peppers'],
    snack: ['yogurt-berries', 'dates-walnuts', 'muhalla', 'mango-chia-pudding', 'laban-dates'],
  },
  { // Friday
    breakfast: ['vegetable-shakshuka', 'foul-medames', 'lahouh-breakfast', 'balaleet', 'tofu-veggie-scramble'],
    lunch: ['kabsa-lunch-tray', 'chicken-kabsa', 'red-lentil-soup', 'jareesh', 'mediterranean-quinoa-salad', 'black-bean-sweet-potato-bowl'],
    dinner: ['margouq', 'sayadiah', 'turkey-bean-chili', 'chickpea-spinach-curry', 'whole-wheat-pasta-primavera'],
    snack: ['hummus-veggie-sticks', 'laban-dates', 'dates-walnuts', 'cinnamon-popcorn', 'wheat-aseedah'],
  },
  { // Saturday
    breakfast: ['overnight-oats-berries', 'spinach-feta-egg-muffins', 'dates-aseedah', 'foul-medames', 'yogurt-cucumber-zaatar-bowl'],
    lunch: ['red-lentil-soup', 'madini-chicken', 'tashreebah-chicken', 'fattoush-grilled-chicken', 'tuna-white-bean-salad', 'tabbouleh-chickpeas'],
    dinner: ['couscousiyah-chicken', 'saleeg-dinner-tray', 'salmon-quinoa-asparagus', 'tofu-vegetable-stir-fry', 'harissa-fish-vegetables'],
    snack: ['apple-almond-butter', 'muhalla', 'roasted-spiced-chickpeas', 'mango-chia-pudding', 'laban-dates'],
  },
  { // Sunday
    breakfast: ['vegetable-shakshuka', 'tofu-veggie-scramble', 'lahouh-breakfast', 'yogurt-parfait-pomegranate', 'overnight-oats-berries'],
    lunch: ['red-lentil-soup', 'timman-rice', 'jareesh', 'shrimp-mango-salad', 'chicken-veggie-wrap', 'black-bean-sweet-potato-bowl'],
    dinner: ['margouq', 'fish-dinner-tray', 'herb-chicken-sweet-potato', 'chickpea-spinach-curry', 'lentil-stuffed-peppers'],
    snack: ['hummus-veggie-sticks', 'yogurt-berries', 'dates-walnuts', 'cinnamon-popcorn', 'laban-dates'],
  },
];
