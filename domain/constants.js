// Controlled vocabularies shared by the server, the engine and the UI.
// Coded values (instead of free text) are what make automatic screening
// reliable; free text that cannot be coded is flagged for review.

export const ROLES = [
  { id: 'admin', label: 'Admin', staff: true, hint: 'Controls the whole platform: staff access and roles, diet orders, allergies and restrictions, approving meals that need review, verifying menu information and deleting records, plus every staff task. In a hospital this role belongs to the clinical dietitian or nutrition lead.' },
  { id: 'staff', label: 'Staff', staff: true, hint: 'Runs daily meal service: offers and confirms eligible meals, records choices, intake and admission status, prepares and delivers trays, maintains the menu and answers patient requests. Cannot change clinical information or approve meals that need review.' },
  { id: 'patient', label: 'Patient', staff: false, hint: 'Sees their own meals and profile; chooses meals, updates preferences, appetite and feedback, and sends requests.' },
];
/** Roles an administrator can assign to an approved staff account. */
export const ASSIGNABLE_STAFF_ROLES = ['staff', 'admin'];

export const ACCOUNT_STATUS = [
  { id: 'active', label: 'Active' },
  { id: 'pending', label: 'Waiting for admin approval' },
  { id: 'declined', label: 'Access request declined' },
  { id: 'deactivated', label: 'Deactivated' },
];

export const AGE_RANGES = [
  { id: '18-29', label: '18–29' },
  { id: '30-44', label: '30–44' },
  { id: '45-59', label: '45–59' },
  { id: '60-74', label: '60–74' },
  { id: '75+', label: '75 or older' },
];

// Fictional wards of the demonstration hospital.
export const WARDS = [
  { id: '2A', label: 'Ward 2A · Surgery' },
  { id: '3A', label: 'Ward 3A · Internal Medicine' },
  { id: '3C', label: 'Ward 3C · Endocrinology' },
  { id: '4B', label: 'Ward 4B · Cardiology' },
  { id: '5C', label: 'Ward 5C · Nephrology' },
  { id: '6A', label: 'Ward 6A · Oncology' },
];

export const CONDITIONS = [
  { id: 't1d', label: 'Type 1 Diabetes' },
  { id: 't2d', label: 'Type 2 Diabetes' },
  { id: 'hypertension', label: 'Hypertension' },
  { id: 'cholesterol', label: 'High Cholesterol' },
  { id: 'kidney', label: 'Kidney Disease' },
  { id: 'coeliac', label: 'Coeliac Disease' },
  { id: 'dysphagia', label: 'Swallowing difficulty (dysphagia)' },
  { id: 'surgery', label: 'Before or after surgery' },
  { id: 'other', label: 'Other condition' },
  { id: 'none', label: 'No diet-related condition recorded' },
];

// The 14 allergens food establishments must disclose under SFDA.FD 56 (Saudi Food & Drug Authority).
export const ALLERGENS = [
  { id: 'gluten', label: 'Cereals containing gluten', phrase: 'cereals containing gluten', hint: 'Wheat, barley, rye, oats' },
  { id: 'shellfish', label: 'Crustaceans', phrase: 'crustaceans', hint: 'Shrimp, prawns, crab, lobster' },
  { id: 'mollusc', label: 'Molluscs', phrase: 'molluscs', hint: 'Squid, octopus, mussels, clams, oysters' },
  { id: 'egg', label: 'Eggs', phrase: 'eggs' },
  { id: 'fish', label: 'Fish', phrase: 'fish' },
  { id: 'peanut', label: 'Peanuts', phrase: 'peanuts' },
  { id: 'soy', label: 'Soy', phrase: 'soy' },
  { id: 'milk', label: 'Milk', phrase: 'milk' },
  { id: 'tree_nut', label: 'Tree nuts', phrase: 'tree nuts', hint: 'Almonds, walnuts, pistachios, cashews…' },
  { id: 'celery', label: 'Celery', phrase: 'celery' },
  { id: 'mustard', label: 'Mustard', phrase: 'mustard' },
  { id: 'sesame', label: 'Sesame', phrase: 'sesame' },
  { id: 'lupin', label: 'Lupin', phrase: 'lupin' },
  { id: 'sulphites', label: 'Sulphites', phrase: 'sulphites', hint: 'Above 10 mg/kg' },
];

export const ALLERGY_STATUS = [
  { id: 'unknown', label: 'Not yet assessed', hint: 'Every meal needs admin review until allergies are assessed.' },
  { id: 'nka', label: 'No known food allergies' },
  { id: 'recorded', label: 'Allergies recorded below' },
];

export const INTOLERANCES = [
  { id: 'lactose', label: 'Lactose intolerance' },
  { id: 'gluten-sensitivity', label: 'Gluten sensitivity (non-coeliac)' },
];

export const CUISINES = ['Saudi', 'Middle Eastern', 'Mediterranean', 'Italian', 'North African', 'Asian', 'Indian', 'Mexican', 'American', 'International'];

export const PERIODS = [
  { id: 'breakfast', label: 'Breakfast' },
  { id: 'lunch', label: 'Lunch' },
  { id: 'dinner', label: 'Dinner' },
  { id: 'snack', label: 'Snack' },
];
export const PERIOD_IDS = PERIODS.map((p) => p.id);

// Approximate service times of the demonstration hospital (local time). Used
// only to work out a patient's next meal; a real hospital sets its own.
export const SERVICE_TIMES = { breakfast: '07:30', lunch: '12:30', dinner: '18:30', snack: '20:30' };

export const ADMISSION_STATUS = [
  { id: 'admitted', label: 'Admitted', hint: 'Active inpatient: meals are planned and prepared.' },
  { id: 'discharged', label: 'Discharged', hint: 'No longer on meal lists. Past meals, intake and requests are kept.' },
];

/**
 * Meal workflow. Each stage is updated only by the roles listed in `by`.
 * `patient` is the plain-language message shown on the patient's own screen.
 */
export const ENTRY_STATUS = [
  { id: 'offered', label: 'Options offered', short: 'Offered', by: ['admin', 'staff'], patient: 'Choose your {period}.', hint: 'Approved options are waiting for the patient’s choice.' },
  { id: 'selected', label: 'Patient choice submitted', short: 'Choice submitted', by: ['patient', 'admin', 'staff'], patient: 'Your choice has been sent to the nutrition team.', hint: 'A meal was chosen; the nutrition team has not confirmed it yet.' },
  { id: 'confirmed', label: 'Confirmed by nutrition team', short: 'Confirmed', by: ['admin', 'staff'], patient: 'Your meal is confirmed.', hint: 'Confirmed and sent to the kitchen.' },
  { id: 'prepared', label: 'Prepared', short: 'Prepared', by: ['admin', 'staff'], patient: 'Your meal is being prepared.', hint: 'The kitchen has prepared the tray.' },
  { id: 'delivered', label: 'Delivered', short: 'Delivered', by: ['admin', 'staff'], patient: 'Your meal has been delivered.', hint: 'The tray reached the patient. Delivery does not mean the meal was eaten.' },
  { id: 'on-hold', label: 'On hold: needs review', short: 'On hold', by: [], patient: 'Your nutrition team is checking this meal because some information changed.', hint: 'A change made this meal unsafe or uncertain. It cannot move forward until the nutrition team reviews it.' },
  { id: 'cancelled', label: 'Cancelled', short: 'Cancelled', by: ['admin', 'staff'], patient: 'This meal was cancelled.', hint: 'No meal will be prepared for this period.' },
];
export const WORKFLOW_STEPS = ['offered', 'selected', 'confirmed', 'prepared', 'delivered'];

/** Why a scheduled meal was flagged or changed after it was offered, chosen or confirmed. */
export const CHANGE_CAUSES = [
  { id: 'diet-change', label: 'Diet order, allergy or restriction changed' },
  { id: 'allergy-report', label: 'Patient reported a possible allergy' },
  { id: 'meal-change', label: 'Meal information changed' },
  { id: 'meal-unavailable', label: 'Meal marked unavailable' },
  { id: 'menu-change', label: 'Meal removed from the menu' },
  { id: 'staff-change', label: 'Meal changed by the nutrition team' },
  { id: 'npo', label: 'Diet order changed to nothing by mouth (NPO)' },
  { id: 'discharge', label: 'Patient discharged' },
];

/** Kinds of menu components. A complete meal combines several; an individual dish is offered on its own. */
export const DISH_KINDS = [
  { id: 'main', label: 'Main dish' },
  { id: 'soup', label: 'Soup' },
  { id: 'salad', label: 'Salad' },
  { id: 'side', label: 'Side dish' },
  { id: 'bread', label: 'Bread' },
  { id: 'dessert', label: 'Dessert' },
  { id: 'drink', label: 'Drink' },
  { id: 'fruit', label: 'Fruit' },
  { id: 'snack', label: 'Snack' },
];

/** Ingredient flags used by dietary-pattern screening (editable in menu management). */
export const INGREDIENT_FLAGS = [
  { id: 'meat', label: 'Meat' }, { id: 'poultry', label: 'Poultry' }, { id: 'fish', label: 'Fish' }, { id: 'shellfish', label: 'Shellfish' },
  { id: 'dairy', label: 'Dairy' }, { id: 'lactose', label: 'Contains lactose' }, { id: 'egg', label: 'Egg' }, { id: 'honey', label: 'Honey' },
  { id: 'gluten', label: 'Gluten-containing cereal' }, { id: 'added_sugar', label: 'Added sugar (sugar, honey, syrup)' },
  { id: 'rennet_check', label: 'Cheese: check rennet for vegetarians' },
];

export const INGREDIENT_GROUPS = [
  { id: 'vegetables', label: 'Vegetables & herbs' },
  { id: 'fruits', label: 'Fruits' },
  { id: 'proteins', label: 'Proteins' },
  { id: 'grains', label: 'Grains & breads' },
  { id: 'dairy', label: 'Dairy & alternatives' },
  { id: 'pantry', label: 'Pantry items' },
  { id: 'other', label: 'Other ingredients' },
];

// Portion sizes offered by the demonstration hospital kitchen, as a multiple of
// one standard recipe serving. This is a documented kitchen definition.
export const PORTIONS = [
  { id: 'small', label: 'Small', factor: 0.5, short: '½ standard' },
  { id: 'regular', label: 'Regular', factor: 1, short: 'standard' },
  { id: 'large', label: 'Large', factor: 1.5, short: '1½ standard' },
];
export const portionFactor = (id) => PORTIONS.find((p) => p.id === id)?.factor ?? 1;

export const APPETITE = [
  { id: 'good', label: 'Good appetite' },
  { id: 'fair', label: 'Reduced appetite' },
  { id: 'poor', label: 'Poor appetite' },
];

export const INTAKE_AMOUNTS = [
  { id: 'none', label: 'None', share: 0 },
  { id: 'some', label: 'Some (about a quarter)', share: 0.25 },
  { id: 'most', label: 'Most (about three quarters)', share: 0.75 },
  { id: 'all', label: 'All', share: 1 },
];

export const REFUSAL_REASONS = [
  { id: 'taste', label: 'Did not like the taste' },
  { id: 'portion-too-large', label: 'Portion too large' },
  { id: 'portion-too-small', label: 'Portion too small' },
  { id: 'low-appetite', label: 'Low appetite' },
  { id: 'nausea', label: 'Nausea or feeling unwell' },
  { id: 'temperature', label: 'Temperature (too cold or too hot)' },
  { id: 'not-preferred', label: 'Not what I wanted to eat' },
  { id: 'other', label: 'Other reason' },
];

export const REQUEST_TYPES = [
  { id: 'alternative', label: 'Request a different meal', patient: true },
  { id: 'schedule-change', label: 'Request a change to my meal schedule', patient: true },
  { id: 'assistance', label: 'Ask the nutrition team for support', patient: true },
  { id: 'clinical-change', label: 'Report a change to allergies or diet', patient: true, clinical: true },
];

/** Request statuses, shared by the patient's and the staff views. */
export const REQUEST_STATUS = [
  { id: 'open', label: 'Pending', hint: 'Waiting for the nutrition team.' },
  { id: 'resolved', label: 'Resolved', hint: 'The nutrition team has dealt with it.' },
  { id: 'declined', label: 'Declined', hint: 'The nutrition team could not do this; their response explains why.' },
];

/** What a patient can report about allergies or diet. Reports never change the record by themselves. */
export const REPORT_KINDS = [
  { id: 'new-allergy', label: 'I think I have a new food allergy' },
  { id: 'intolerance', label: 'A food upsets me (intolerance)' },
  { id: 'allergy-wrong', label: 'A recorded allergy is wrong' },
  { id: 'diet', label: 'My doctor changed my diet' },
  { id: 'other', label: 'Something else' },
];

export const label = (list, id) => list.find((x) => x.id === id)?.label ?? id;
