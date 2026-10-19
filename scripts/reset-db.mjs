// Delete every CareBite table (hospital data, menu, accounts and sessions) in the
// Postgres database at DATABASE_URL, so the next server start creates and seeds
// them again. It cannot be undone, so it asks for --yes. To reset only the
// demonstration hospital, sign in as admin.demo and use the reset in Settings.
import pg from 'pg';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('Set DATABASE_URL first (for example in .env.local).');
  process.exit(1);
}
const { host, pathname } = new URL(url);
const target = `database "${decodeURIComponent(pathname.slice(1))}" on ${host}`;
if (!process.argv.includes('--yes')) {
  console.log(`This deletes all CareBite data and accounts in ${target}.\nTo continue, run: npm run reset-db -- --yes`);
  process.exit(1);
}
const TABLES = [
  'AuditLog', 'PatientRequests', 'MealIntake', 'ScheduleEvents', 'ScheduleChanges', 'MealOffers', 'MealSchedule',
  'FoodPreferences', 'MedicalExclusions', 'PatientAllergies', 'DietOrderCategories', 'DietOrders', 'PatientConditions', 'Patients',
  'MenuDates', 'MenuCycle', 'MealComponents', 'Meals', 'DishIngredients', 'Dishes', 'Ingredients',
  'MedicalDietaryRules', 'LocalProduction', 'SfctDishes', 'DietCategories', 'MedicalConditions', 'Meta',
  '"rateLimit"', '"verification"', '"account"', '"session"', '"user"',
];
const client = new pg.Client({ connectionString: url });
await client.connect();
try {
  await client.query(`DROP TABLE IF EXISTS ${TABLES.join(', ')} CASCADE`);
  console.log(`Deleted the CareBite tables in ${target}. Start the server (npm run dev or npm start) to re-create and seed them.`);
} finally {
  await client.end();
}
