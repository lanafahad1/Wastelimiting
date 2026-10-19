// SQLite persistence (Node's built-in node:sqlite). Creates the schema, keeps
// the read-only reference data in sync (SFDA SFCT library, diet categories,
// rules, local production), and exposes the repository interface used by
// shared/service.js. The editable menu catalogue (ingredients, dishes, meals,
// menu plan) is seeded once and then maintained by authorised staff.

import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { SFCT_LIBRARY } from '../data/sfct-dishes.js';
import { LOCAL_PRODUCTION } from '../data/local-production.js';
import { MEDICAL_RULES, SAFETY_RULES, INTAKE_FLAG_RULES, DIET_CATEGORIES } from './rules.js';
import { CONDITIONS } from './constants.js';

export const SCHEMA_VERSION = 6;
const STATUS = "('offered','selected','confirmed','prepared','delivered','on-hold','cancelled')";

const SCHEMA = `
PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

-- Accounts --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS Patients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  demo_id TEXT NOT NULL UNIQUE CHECK (demo_id GLOB 'CB-[0-9][0-9][0-9][0-9]'),
  preferred_name TEXT,
  age_range TEXT NOT NULL,
  ward TEXT NOT NULL,
  bed TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('admitted','discharged')),
  admitted_on TEXT,
  discharged_on TEXT,
  discharged_by TEXT,
  discharge_note TEXT,
  allergy_status TEXT NOT NULL CHECK (allergy_status IN ('unknown','nka','recorded')),
  other_condition_text TEXT,
  medical_notes TEXT,
  appetite TEXT NOT NULL CHECK (appetite IN ('good','fair','poor')),
  preferred_portion TEXT NOT NULL CHECK (preferred_portion IN ('small','regular','large')),
  link_code TEXT UNIQUE,
  link_code_expires_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  updated_by TEXT
);

-- Accounts and sessions live in better-auth's "user", "session", "account" and
-- "verification" tables (created by its migrations in the same database). The
-- "user" table carries CareBite's role, access status and patient link.

-- Reference data (read-only) ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS MedicalConditions (id TEXT PRIMARY KEY, label TEXT NOT NULL);

CREATE TABLE IF NOT EXISTS DietCategories (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  plain_label TEXT,
  description TEXT NOT NULL,
  rule_ids TEXT NOT NULL DEFAULT '[]',
  defaults TEXT NOT NULL DEFAULT '{}',
  requires TEXT NOT NULL DEFAULT '[]',
  support TEXT,
  status TEXT NOT NULL DEFAULT 'active'
);

-- SFDA Saudi Food Composition Tables: laboratory values per 100 g of each dish (the only nutrient source).
CREATE TABLE IF NOT EXISTS SfctDishes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  name_ar TEXT,
  region TEXT NOT NULL,
  recipe_page INTEGER,
  table_page INTEGER,
  yield TEXT,
  ingredients TEXT NOT NULL DEFAULT '[]',
  per_100g TEXT NOT NULL,
  full_recipe TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS LocalProduction (
  commodity TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  self_sufficiency_pct REAL NOT NULL,
  year INTEGER NOT NULL,
  sources TEXT NOT NULL DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS MedicalDietaryRules (
  id TEXT PRIMARY KEY,
  rule_type TEXT NOT NULL CHECK (rule_type IN ('medical','safety','intake-flag')),
  kind TEXT,
  title TEXT NOT NULL,
  logic TEXT NOT NULL,
  parameters TEXT NOT NULL DEFAULT '{}',
  sources TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL,
  version TEXT NOT NULL,
  reviewed_by TEXT NOT NULL,
  reviewed_on TEXT NOT NULL,
  clinical_validation TEXT NOT NULL
);

-- Editable menu catalogue --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS Ingredients (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  same_food TEXT,
  ingredient_group TEXT NOT NULL,
  local_commodity TEXT REFERENCES LocalProduction(commodity),
  allergens TEXT NOT NULL DEFAULT '[]',
  may_contain TEXT NOT NULL DEFAULT '[]',
  flags TEXT NOT NULL DEFAULT '[]',
  label_check INTEGER NOT NULL DEFAULT 0,
  note TEXT,
  updated_at TEXT,
  updated_by TEXT
);

-- A dish is one menu component; nutrition comes only from a linked SFCT entry.
CREATE TABLE IF NOT EXISTS Dishes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  name_ar TEXT,
  kind TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('breakfast','lunch','dinner','snack')),
  cuisine TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  portion_g INTEGER NOT NULL CHECK (portion_g > 0),
  serving_size TEXT NOT NULL,
  batch_portions INTEGER,
  portions TEXT,
  steps TEXT NOT NULL DEFAULT '[]',
  notes TEXT NOT NULL DEFAULT '[]',
  art TEXT NOT NULL DEFAULT '{}',
  nutrition_source TEXT NOT NULL CHECK (nutrition_source IN ('sfct','none')),
  sfct_id TEXT REFERENCES SfctDishes(id),
  sfct_recipe TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT,
  updated_by TEXT
);

CREATE TABLE IF NOT EXISTS DishIngredients (
  dish_id TEXT NOT NULL REFERENCES Dishes(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  ingredient_id TEXT NOT NULL REFERENCES Ingredients(id),
  grams REAL NOT NULL,
  preparation TEXT,
  optional INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (dish_id, position)
);

-- A meal is what is offered for one meal period: one dish, or a complete meal of several.
CREATE TABLE IF NOT EXISTS Meals (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('breakfast','lunch','dinner','snack')),
  cuisine TEXT,
  description TEXT NOT NULL DEFAULT '',
  portions TEXT,
  art TEXT,
  available INTEGER NOT NULL DEFAULT 1,
  unavailable_reason TEXT,
  availability_changed_by TEXT,
  availability_changed_at TEXT,
  info_review TEXT NOT NULL DEFAULT '{"status":"verified"}',
  active INTEGER NOT NULL DEFAULT 1,
  version INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT,
  updated_by TEXT,
  last_change TEXT
);

CREATE TABLE IF NOT EXISTS MealComponents (
  meal_id TEXT NOT NULL REFERENCES Meals(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  dish_id TEXT NOT NULL REFERENCES Dishes(id),
  factor REAL NOT NULL DEFAULT 1,
  PRIMARY KEY (meal_id, position)
);

-- The 7-day menu cycle (day 0 = Monday) and date-specific menus that replace it.
CREATE TABLE IF NOT EXISTS MenuCycle (
  cycle_day INTEGER NOT NULL CHECK (cycle_day BETWEEN 0 AND 6),
  period TEXT NOT NULL CHECK (period IN ('breakfast','lunch','dinner','snack')),
  position INTEGER NOT NULL,
  meal_id TEXT NOT NULL REFERENCES Meals(id),
  PRIMARY KEY (cycle_day, period, position)
);
CREATE TABLE IF NOT EXISTS MenuDates (
  date TEXT NOT NULL,
  period TEXT NOT NULL CHECK (period IN ('breakfast','lunch','dinner','snack')),
  meal_ids TEXT NOT NULL DEFAULT '[]',
  PRIMARY KEY (date, period)
);

-- Patient nutrition profile -----------------------------------------------------
CREATE TABLE IF NOT EXISTS PatientConditions (
  patient_id INTEGER NOT NULL REFERENCES Patients(id) ON DELETE CASCADE,
  condition_id TEXT NOT NULL REFERENCES MedicalConditions(id),
  PRIMARY KEY (patient_id, condition_id)
);
CREATE TABLE IF NOT EXISTS DietOrders (
  patient_id INTEGER PRIMARY KEY REFERENCES Patients(id) ON DELETE CASCADE,
  npo INTEGER NOT NULL DEFAULT 0,
  texture_level TEXT,
  portions_permitted TEXT NOT NULL,
  sodium_mg_per_day INTEGER,
  potassium_mg_per_day INTEGER,
  phosphorus_mg_per_day INTEGER,
  carbs_g_per_meal INTEGER,
  notes TEXT
);
CREATE TABLE IF NOT EXISTS DietOrderCategories (
  patient_id INTEGER NOT NULL REFERENCES DietOrders(patient_id) ON DELETE CASCADE,
  category_id TEXT NOT NULL REFERENCES DietCategories(id),
  position INTEGER NOT NULL,
  PRIMARY KEY (patient_id, category_id)
);
-- Allergies and intolerances are recorded separately (reaction_type).
CREATE TABLE IF NOT EXISTS PatientAllergies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER NOT NULL REFERENCES Patients(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('allergy','intolerance')),
  coding TEXT NOT NULL CHECK (coding IN ('allergen-group','intolerance-code','ingredient','uncoded')),
  code TEXT,
  ingredient_id TEXT,
  free_text TEXT
);
CREATE TABLE IF NOT EXISTS MedicalExclusions (
  patient_id INTEGER NOT NULL REFERENCES Patients(id) ON DELETE CASCADE,
  ingredient_id TEXT NOT NULL,
  PRIMARY KEY (patient_id, ingredient_id)
);
-- Preferences only rank meals; they are never used for safety decisions.
CREATE TABLE IF NOT EXISTS FoodPreferences (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER NOT NULL REFERENCES Patients(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('cuisine','favorite','dislike')),
  value TEXT NOT NULL
);

-- Meal workflow --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS MealSchedule (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER NOT NULL REFERENCES Patients(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  period TEXT NOT NULL CHECK (period IN ('breakfast','lunch','dinner','snack')),
  status TEXT NOT NULL CHECK (status IN ${STATUS}),
  hold_from TEXT,
  selected_meal_id TEXT,
  meal_name TEXT,
  meal_version INTEGER,
  portion TEXT CHECK (portion IN ('small','regular','large')),
  selected_by TEXT, selected_by_role TEXT, selected_at TEXT,
  confirmed_by TEXT, confirmed_by_role TEXT, confirmed_at TEXT, confirm_mode TEXT,
  prepared_by TEXT, prepared_at TEXT,
  delivered_by TEXT, delivered_by_role TEXT, delivered_at TEXT,
  cancelled_reason TEXT,
  replaces TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (patient_id, date, period)
);
CREATE INDEX IF NOT EXISTS idx_schedule_date ON MealSchedule(date);

-- Approved options offered for one schedule entry. Review items carry the admin's note.
CREATE TABLE IF NOT EXISTS MealOffers (
  schedule_id INTEGER NOT NULL REFERENCES MealSchedule(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  meal_id TEXT NOT NULL,
  meal_name TEXT,
  screened_as TEXT NOT NULL CHECK (screened_as IN ('eligible','review')),
  approved_by INTEGER,
  approved_by_name TEXT,
  review_note TEXT,
  review_reasons TEXT NOT NULL DEFAULT '[]',
  suggested_portion TEXT,
  portions TEXT NOT NULL DEFAULT '[]',
  PRIMARY KEY (schedule_id, position)
);

-- Changes after an order: what changed, the effect, review status and kitchen acknowledgement.
CREATE TABLE IF NOT EXISTS ScheduleChanges (
  schedule_id INTEGER NOT NULL REFERENCES MealSchedule(id) ON DELETE CASCADE,
  change_id TEXT NOT NULL,
  at TEXT NOT NULL,
  cause TEXT NOT NULL,
  cause_label TEXT,
  change TEXT NOT NULL,
  details TEXT NOT NULL DEFAULT '[]',
  meal_id TEXT, meal_name TEXT, portion TEXT,
  previous_status TEXT,
  hold INTEGER NOT NULL DEFAULT 0,
  kitchen_affected INTEGER NOT NULL DEFAULT 0,
  reviewed INTEGER NOT NULL DEFAULT 0,
  reviewed_by TEXT, reviewed_by_role TEXT, reviewed_at TEXT,
  resolution TEXT,
  kitchen_ack_by TEXT, kitchen_ack_at TEXT, kitchen_ack_stage TEXT,
  PRIMARY KEY (schedule_id, change_id)
);

-- Every step of the workflow: who, when, what.
CREATE TABLE IF NOT EXISTS ScheduleEvents (
  schedule_id INTEGER NOT NULL REFERENCES MealSchedule(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  at TEXT NOT NULL,
  actor_name TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  action TEXT NOT NULL,
  status TEXT,
  meal_id TEXT, meal_name TEXT, portion TEXT,
  note TEXT,
  PRIMARY KEY (schedule_id, position)
);

-- Intake and feedback: one record per meal per source (the patient's report, the staff observation).
CREATE TABLE IF NOT EXISTS MealIntake (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER NOT NULL REFERENCES Patients(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  period TEXT NOT NULL CHECK (period IN ('breakfast','lunch','dinner','snack')),
  source TEXT NOT NULL CHECK (source IN ('patient','staff')),
  meal_id TEXT NOT NULL,
  meal_name TEXT,
  portion TEXT NOT NULL,
  appetite_before TEXT CHECK (appetite_before IN ('good','fair','poor')),
  accepted INTEGER NOT NULL,
  amount TEXT NOT NULL CHECK (amount IN ('none','some','most','all')),
  reasons TEXT NOT NULL DEFAULT '[]',
  satisfaction INTEGER CHECK (satisfaction BETWEEN 1 AND 5),
  comment TEXT,
  measured_waste_g INTEGER CHECK (measured_waste_g >= 0),
  recorded_by TEXT NOT NULL,
  recorded_by_role TEXT NOT NULL,
  recorded_at TEXT NOT NULL,
  UNIQUE (patient_id, date, period, source),
  CHECK (source = 'staff' OR measured_waste_g IS NULL)
);
CREATE INDEX IF NOT EXISTS idx_intake_date ON MealIntake(date);

CREATE TABLE IF NOT EXISTS PatientRequests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER NOT NULL REFERENCES Patients(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('alternative','schedule-change','assistance','clinical-change')),
  clinical INTEGER NOT NULL DEFAULT 0,
  message TEXT NOT NULL,
  date TEXT,
  period TEXT,
  meal_id TEXT,
  meal_name TEXT,
  report_kind TEXT,
  report_allergen TEXT,
  status TEXT NOT NULL CHECK (status IN ('open','resolved','declined')),
  created_by TEXT NOT NULL,
  created_by_role TEXT NOT NULL,
  created_at TEXT NOT NULL,
  response TEXT,
  resolved_by TEXT,
  resolved_at TEXT
);

-- Who changed what, and when.
CREATE TABLE IF NOT EXISTS AuditLog (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  at TEXT NOT NULL,
  actor_id INTEGER,
  actor_role TEXT NOT NULL,
  actor_name TEXT NOT NULL,
  patient_id INTEGER REFERENCES Patients(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  detail TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_audit_patient ON AuditLog(patient_id, id);
`;

const J = (v) => JSON.stringify(v ?? null);
const P = (s, fallback) => { try { return s == null ? fallback : JSON.parse(s); } catch { return fallback; } };

export function openDatabase(file) {
  if (file !== ':memory:') mkdirSync(dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  migrate(db);
  db.exec(SCHEMA);
  db.exec(`PRAGMA user_version = ${SCHEMA_VERSION}`);
  seedReferenceData(db);
  return db;
}

/** Earlier schema versions held only synthetic demo data, so they are rebuilt. */
function migrate(db) {
  const version = db.prepare('PRAGMA user_version').get().user_version;
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'").all().map((t) => t.name);
  if (version < SCHEMA_VERSION && tables.length) {
    db.exec('PRAGMA foreign_keys = OFF');
    for (const t of tables) db.exec(`DROP TABLE IF EXISTS "${t}"`);
    db.exec('PRAGMA foreign_keys = ON');
  }
}

/** Map a better-auth "user" row to the domain's user shape. */
function authUser(r) {
  if (!r) return null;
  return {
    id: String(r.id), username: r.displayUsername ?? r.username, email: r.email, name: r.name, role: r.role ?? null, status: r.status ?? 'pending',
    requestedRole: r.requestedRole ?? null, requestNote: r.requestNote ?? null, decidedBy: r.decidedBy ?? null, decidedAt: r.decidedAt ?? null, decisionNote: r.decisionNote ?? null,
    patientId: r.patientId ?? null, isDemo: Boolean(r.isDemo), createdAt: r.createdAt, updatedAt: r.updatedAt,
  };
}

let savepoints = 0;
/** Run fn atomically. Inside an outer transaction (e.g. better-auth's sign-up) it uses a savepoint. */
function tx(db, fn) {
  if (db.isTransaction) {
    const sp = `cb_sp_${++savepoints}`;
    db.exec(`SAVEPOINT ${sp}`);
    try { const r = fn(); db.exec(`RELEASE ${sp}`); return r; } catch (e) { db.exec(`ROLLBACK TO ${sp}`); db.exec(`RELEASE ${sp}`); throw e; }
  }
  db.exec('BEGIN');
  try { const r = fn(); db.exec('COMMIT'); return r; } catch (e) { db.exec('ROLLBACK'); throw e; }
}

/** Upsert the read-only reference data from data/ so code and database stay in sync. */
export function seedReferenceData(db) {
  tx(db, () => {
    const cond = db.prepare('INSERT INTO MedicalConditions (id,label) VALUES (?,?) ON CONFLICT(id) DO UPDATE SET label=excluded.label');
    for (const c of CONDITIONS) cond.run(c.id, c.label);
    const diet = db.prepare(`INSERT INTO DietCategories (id,code,label,plain_label,description,rule_ids,defaults,requires,support,status) VALUES (?,?,?,?,?,?,?,?,?,?)
      ON CONFLICT(id) DO UPDATE SET code=excluded.code, label=excluded.label, plain_label=excluded.plain_label, description=excluded.description, rule_ids=excluded.rule_ids,
      defaults=excluded.defaults, requires=excluded.requires, support=excluded.support, status=excluded.status`);
    for (const d of DIET_CATEGORIES) diet.run(d.id, d.code, d.label, d.plain ?? null, d.description, J(d.rules), J(d.defaults ?? {}), J(d.requires ?? []), d.support ?? null, d.status ?? 'active');
    const lp = db.prepare(`INSERT INTO LocalProduction (commodity,label,self_sufficiency_pct,year,sources) VALUES (?,?,?,?,?)
      ON CONFLICT(commodity) DO UPDATE SET label=excluded.label, self_sufficiency_pct=excluded.self_sufficiency_pct, year=excluded.year, sources=excluded.sources`);
    for (const [k, v] of Object.entries(LOCAL_PRODUCTION)) lp.run(k, v.label, v.selfSufficiency, v.year, J(v.sources));
    const sf = db.prepare(`INSERT INTO SfctDishes (id,name,name_ar,region,recipe_page,table_page,yield,ingredients,per_100g,full_recipe) VALUES (?,?,?,?,?,?,?,?,?,?)
      ON CONFLICT(id) DO UPDATE SET name=excluded.name, name_ar=excluded.name_ar, region=excluded.region, recipe_page=excluded.recipe_page, table_page=excluded.table_page,
      yield=excluded.yield, ingredients=excluded.ingredients, per_100g=excluded.per_100g, full_recipe=excluded.full_recipe`);
    for (const [id, e] of Object.entries(SFCT_LIBRARY)) sf.run(id, e.name, e.nameAr ?? null, e.region, e.recipePage ?? null, e.tablePage ?? null, e.yield ?? null, J(e.ingredients), J(e.per100g), J(e.fullRecipe));
    const rule = db.prepare(`INSERT INTO MedicalDietaryRules (id,rule_type,kind,title,logic,parameters,sources,status,version,reviewed_by,reviewed_on,clinical_validation)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET rule_type=excluded.rule_type, kind=excluded.kind, title=excluded.title, logic=excluded.logic,
      parameters=excluded.parameters, sources=excluded.sources, status=excluded.status, version=excluded.version, reviewed_by=excluded.reviewed_by, reviewed_on=excluded.reviewed_on,
      clinical_validation=excluded.clinical_validation`);
    const params = (r) => { const { id, kind, title, logic, sources, status, version, reviewedBy, reviewedOn, clinicalValidation, ...rest } = r; return rest; };
    for (const r of MEDICAL_RULES) rule.run(r.id, 'medical', r.kind, r.title, r.logic, J(params(r)), J(r.sources), r.status, r.version, r.reviewedBy, r.reviewedOn, r.clinicalValidation);
    for (const r of SAFETY_RULES) rule.run(r.id, 'safety', r.outcome, r.title, r.logic, '{}', J(r.sources), r.status, r.version, r.reviewedBy, r.reviewedOn, r.clinicalValidation);
    for (const r of INTAKE_FLAG_RULES) rule.run(r.id, 'intake-flag', r.outcome, r.title, r.logic, J({ window: r.window, days: r.days, min: r.min }), J(r.sources), r.status, r.version, r.reviewedBy, r.reviewedOn, r.clinicalValidation);
  });
}

/** Repository over SQLite implementing the interface used by shared/service.js. */
export function createSqliteRepo(db) {
  const cache = new Map();
  const q = (sql) => { let s = cache.get(sql); if (!s) { s = db.prepare(sql); cache.set(sql, s); } return s; };
  const S = (v) => (v == null ? null : String(v));
  const N = (v) => (v == null ? null : Number(v));
  // ---- patients: assemble the patient record from its tables
  function patientRow(r) {
    if (!r) return null;
    const id = r.id;
    const order = q('SELECT * FROM DietOrders WHERE patient_id = ?').get(id) ?? {};
    const alg = q('SELECT * FROM PatientAllergies WHERE patient_id = ? ORDER BY id').all(id);
    const prefs = q('SELECT kind, value FROM FoodPreferences WHERE patient_id = ? ORDER BY id').all(id);
    const of = (kind) => prefs.filter((x) => x.kind === kind).map((x) => x.value);
    const dietOrder = {
      categories: q('SELECT category_id FROM DietOrderCategories WHERE patient_id = ? ORDER BY position').all(id).map((x) => x.category_id),
      npo: Boolean(order.npo), textureLevel: order.texture_level ?? '', portionsPermitted: P(order.portions_permitted, []), notes: order.notes ?? '',
    };
    for (const [k, col] of [['sodiumMgPerDay', 'sodium_mg_per_day'], ['potassiumMgPerDay', 'potassium_mg_per_day'], ['phosphorusMgPerDay', 'phosphorus_mg_per_day'], ['carbsGPerMeal', 'carbs_g_per_meal']]) {
      if (order[col] != null) dietOrder[k] = Number(order[col]);
    }
    const pick = (type, coding, field) => alg.filter((a) => a.reaction_type === type && a.coding === coding).map((a) => a[field]);
    return {
      id: String(id), demoId: r.demo_id, preferredName: r.preferred_name ?? '', ageRange: r.age_range, ward: r.ward, bed: r.bed, status: r.status,
      admittedOn: r.admitted_on, dischargedOn: r.discharged_on ?? null, dischargedBy: r.discharged_by ?? null, dischargeNote: r.discharge_note ?? '',
      conditions: { selected: q('SELECT condition_id FROM PatientConditions WHERE patient_id = ? ORDER BY rowid').all(id).map((x) => x.condition_id), otherText: r.other_condition_text ?? '' },
      dietOrder,
      allergies: { status: r.allergy_status, confirmed: pick('allergy', 'allergen-group', 'code'), ingredients: pick('allergy', 'ingredient', 'ingredient_id'), uncoded: pick('allergy', 'uncoded', 'free_text') },
      intolerances: { selected: pick('intolerance', 'intolerance-code', 'code'), ingredients: pick('intolerance', 'ingredient', 'ingredient_id'), uncoded: pick('intolerance', 'uncoded', 'free_text') },
      restrictions: { medicalExclusions: q('SELECT ingredient_id FROM MedicalExclusions WHERE patient_id = ? ORDER BY rowid').all(id).map((x) => x.ingredient_id), medicalNotes: r.medical_notes ?? '' },
      preferences: { cuisines: of('cuisine'), favorites: of('favorite'), dislikes: of('dislike'), preferredPortion: r.preferred_portion },
      appetite: { level: r.appetite },
      linkCode: r.link_code ?? null, linkCodeExpiresAt: r.link_code_expires_at ?? null,
      createdAt: r.created_at, updatedAt: r.updated_at, updatedBy: r.updated_by ?? null,
    };
  }

  function writeChildren(id, p) {
    for (const t of ['PatientConditions', 'DietOrderCategories', 'PatientAllergies', 'MedicalExclusions', 'FoodPreferences']) q(`DELETE FROM ${t} WHERE patient_id = ?`).run(id);
    q('DELETE FROM DietOrders WHERE patient_id = ?').run(id);
    for (const c of p.conditions.selected) q('INSERT INTO PatientConditions (patient_id, condition_id) VALUES (?,?)').run(id, c);
    const o = p.dietOrder;
    q('INSERT INTO DietOrders (patient_id,npo,texture_level,portions_permitted,sodium_mg_per_day,potassium_mg_per_day,phosphorus_mg_per_day,carbs_g_per_meal,notes) VALUES (?,?,?,?,?,?,?,?,?)')
      .run(id, o.npo ? 1 : 0, o.textureLevel || null, J(o.portionsPermitted), o.sodiumMgPerDay ?? null, o.potassiumMgPerDay ?? null, o.phosphorusMgPerDay ?? null, o.carbsGPerMeal ?? null, o.notes || null);
    o.categories.forEach((c, i) => q('INSERT INTO DietOrderCategories (patient_id, category_id, position) VALUES (?,?,?)').run(id, c, i));
    const alg = q('INSERT INTO PatientAllergies (patient_id,reaction_type,coding,code,ingredient_id,free_text) VALUES (?,?,?,?,?,?)');
    for (const g of p.allergies.confirmed) alg.run(id, 'allergy', 'allergen-group', g, null, null);
    for (const i of p.allergies.ingredients) alg.run(id, 'allergy', 'ingredient', null, i, null);
    for (const t of p.allergies.uncoded) alg.run(id, 'allergy', 'uncoded', null, null, t);
    for (const c of p.intolerances.selected) alg.run(id, 'intolerance', 'intolerance-code', c, null, null);
    for (const i of p.intolerances.ingredients) alg.run(id, 'intolerance', 'ingredient', null, i, null);
    for (const t of p.intolerances.uncoded) alg.run(id, 'intolerance', 'uncoded', null, null, t);
    for (const i of p.restrictions.medicalExclusions) q('INSERT INTO MedicalExclusions (patient_id, ingredient_id) VALUES (?,?)').run(id, i);
    const pref = q('INSERT INTO FoodPreferences (patient_id, kind, value) VALUES (?,?,?)');
    for (const c of p.preferences.cuisines) pref.run(id, 'cuisine', c);
    for (const f of p.preferences.favorites) pref.run(id, 'favorite', f);
    for (const d of p.preferences.dislikes) pref.run(id, 'dislike', d);
  }

  const patientValues = (p) => [p.demoId, p.preferredName || null, p.ageRange, p.ward, p.bed, p.status, p.admittedOn ?? null, p.dischargedOn ?? null, p.dischargedBy ?? null, p.dischargeNote || null,
    p.allergies.status, p.conditions.otherText || null, p.restrictions.medicalNotes || null, p.appetite.level, p.preferences.preferredPortion, p.linkCode ?? null, p.linkCodeExpiresAt ?? null,
    p.createdAt, p.updatedAt, p.updatedBy ?? null];
  const PATIENT_COLS = 'demo_id,preferred_name,age_range,ward,bed,status,admitted_on,discharged_on,discharged_by,discharge_note,allergy_status,other_condition_text,medical_notes,appetite,preferred_portion,link_code,link_code_expires_at,created_at,updated_at,updated_by';

  // ---- catalogue
  const ingredientRow = (r) => ({
    id: r.id, name: r.name, sameFood: r.same_food ?? undefined, group: r.ingredient_group, local: r.local_commodity ?? undefined, allergens: P(r.allergens, []), mayContain: P(r.may_contain, []),
    flags: P(r.flags, []), labelCheck: Boolean(r.label_check), note: r.note ?? undefined, updatedAt: r.updated_at ?? undefined, updatedBy: r.updated_by ?? undefined,
  });
  function writeIngredient(i) {
    q(`INSERT INTO Ingredients (id,name,same_food,ingredient_group,local_commodity,allergens,may_contain,flags,label_check,note,updated_at,updated_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
      ON CONFLICT(id) DO UPDATE SET name=excluded.name, same_food=excluded.same_food, ingredient_group=excluded.ingredient_group, local_commodity=excluded.local_commodity, allergens=excluded.allergens,
      may_contain=excluded.may_contain, flags=excluded.flags, label_check=excluded.label_check, note=excluded.note, updated_at=excluded.updated_at, updated_by=excluded.updated_by`)
      .run(i.id, i.name, i.sameFood ?? null, i.group ?? 'other', i.local ?? null, J(i.allergens ?? []), J(i.mayContain ?? []), J(i.flags ?? []), i.labelCheck ? 1 : 0, i.note ?? null, i.updatedAt ?? null, i.updatedBy ?? null);
  }
  function writeDish(d) {
    q(`INSERT INTO Dishes (id,name,name_ar,kind,category,cuisine,description,portion_g,serving_size,batch_portions,portions,steps,notes,art,nutrition_source,sfct_id,sfct_recipe,version,updated_at,updated_by)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name, name_ar=excluded.name_ar, kind=excluded.kind, category=excluded.category, cuisine=excluded.cuisine,
      description=excluded.description, portion_g=excluded.portion_g, serving_size=excluded.serving_size, batch_portions=excluded.batch_portions, portions=excluded.portions, steps=excluded.steps,
      notes=excluded.notes, art=excluded.art, nutrition_source=excluded.nutrition_source, sfct_id=excluded.sfct_id, sfct_recipe=excluded.sfct_recipe, version=excluded.version,
      updated_at=excluded.updated_at, updated_by=excluded.updated_by`)
      .run(d.id, d.name, d.nameAr ?? null, d.kind, d.category, d.cuisine, d.description ?? '', d.portionG, d.servingSize, d.batchPortions ?? null, d.portions ? J(d.portions) : null,
        J(d.steps ?? []), J(d.notes ?? []), J(d.art ?? {}), d.nutrition?.source === 'sfct' ? 'sfct' : 'none', d.nutrition?.source === 'sfct' ? d.nutrition.sfctId : null,
        d.sfctRecipe ? J(d.sfctRecipe) : null, d.version ?? 1, d.updatedAt ?? null, d.updatedBy ?? null);
    q('DELETE FROM DishIngredients WHERE dish_id = ?').run(d.id);
    d.ingredients.forEach((l, i) => q('INSERT INTO DishIngredients (dish_id,position,ingredient_id,grams,preparation,optional) VALUES (?,?,?,?,?,?)').run(d.id, i, l.ing, l.g, l.prep ?? null, l.optional ? 1 : 0));
  }
  function writeMeal(m) {
    q(`INSERT INTO Meals (id,name,category,cuisine,description,portions,art,available,unavailable_reason,availability_changed_by,availability_changed_at,info_review,active,version,updated_at,updated_by,last_change)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name, category=excluded.category, cuisine=excluded.cuisine, description=excluded.description,
      portions=excluded.portions, art=excluded.art, available=excluded.available, unavailable_reason=excluded.unavailable_reason, availability_changed_by=excluded.availability_changed_by,
      availability_changed_at=excluded.availability_changed_at, info_review=excluded.info_review, active=excluded.active, version=excluded.version, updated_at=excluded.updated_at,
      updated_by=excluded.updated_by, last_change=excluded.last_change`)
      .run(m.id, m.name, m.category, m.cuisine ?? null, m.description ?? '', m.portions ? J(m.portions) : null, m.art ? J(m.art) : null, m.available === false ? 0 : 1, m.unavailableReason ?? null,
        m.availabilityChangedBy ?? null, m.availabilityChangedAt ?? null, J(m.infoReview ?? { status: 'verified' }), m.active === false ? 0 : 1, m.version ?? 1, m.updatedAt ?? null, m.updatedBy ?? null, m.lastChange ?? null);
    q('DELETE FROM MealComponents WHERE meal_id = ?').run(m.id);
    m.components.forEach((c, i) => q('INSERT INTO MealComponents (meal_id,position,dish_id,factor) VALUES (?,?,?,?)').run(m.id, i, c.dish, c.factor ?? 1));
  }

  // ---- schedule entries
  function entryRow(r) {
    if (!r) return null;
    const offers = q('SELECT * FROM MealOffers WHERE schedule_id = ? ORDER BY position').all(r.id).map((o) => ({
      mealId: o.meal_id, mealName: o.meal_name, screenedAs: o.screened_as, approvedBy: S(o.approved_by), approvedByName: o.approved_by_name, reviewNote: o.review_note,
      reviewReasons: P(o.review_reasons, []), suggestedPortion: o.suggested_portion, portions: P(o.portions, []),
    }));
    const changes = q('SELECT * FROM ScheduleChanges WHERE schedule_id = ? ORDER BY at, rowid').all(r.id).map((c) => ({
      id: c.change_id, at: c.at, cause: c.cause, causeLabel: c.cause_label, change: c.change, details: P(c.details, []), mealId: c.meal_id, mealName: c.meal_name, portion: c.portion,
      previousStatus: c.previous_status, hold: Boolean(c.hold), kitchenAffected: Boolean(c.kitchen_affected), reviewed: Boolean(c.reviewed), reviewedBy: c.reviewed_by, reviewedByRole: c.reviewed_by_role,
      reviewedAt: c.reviewed_at, resolution: c.resolution, kitchenAck: c.kitchen_ack_by ? { by: c.kitchen_ack_by, at: c.kitchen_ack_at, stage: c.kitchen_ack_stage } : null,
    }));
    const history = q('SELECT * FROM ScheduleEvents WHERE schedule_id = ? ORDER BY position').all(r.id).map((h) => ({
      at: h.at, by: h.actor_name, role: h.actor_role, action: h.action, status: h.status, mealId: h.meal_id, mealName: h.meal_name, portion: h.portion, note: h.note,
    }));
    return {
      id: String(r.id), patientId: String(r.patient_id), date: r.date, period: r.period, status: r.status, holdFrom: r.hold_from, offers,
      selectedMealId: r.selected_meal_id, mealName: r.meal_name, mealVersion: N(r.meal_version), portion: r.portion,
      selectedBy: r.selected_by, selectedByRole: r.selected_by_role, selectedAt: r.selected_at,
      confirmedBy: r.confirmed_by, confirmedByRole: r.confirmed_by_role, confirmedAt: r.confirmed_at, confirmMode: r.confirm_mode,
      preparedBy: r.prepared_by, preparedAt: r.prepared_at, deliveredBy: r.delivered_by, deliveredByRole: r.delivered_by_role, deliveredAt: r.delivered_at,
      cancelledReason: r.cancelled_reason, replaces: P(r.replaces, null), changes, history, createdAt: r.created_at, updatedAt: r.updated_at,
    };
  }
  const intakeRow = (r) => (r ? {
    id: String(r.id), patientId: String(r.patient_id), date: r.date, period: r.period, source: r.source, mealId: r.meal_id, mealName: r.meal_name, portion: r.portion, appetiteBefore: r.appetite_before,
    accepted: Boolean(r.accepted), amount: r.amount, reasons: P(r.reasons, []), satisfaction: N(r.satisfaction), comment: r.comment ?? '', measuredWasteG: N(r.measured_waste_g),
    recordedBy: r.recorded_by, recordedByRole: r.recorded_by_role, recordedAt: r.recorded_at,
  } : null);
  const requestRow = (r) => (r ? {
    id: String(r.id), patientId: String(r.patient_id), type: r.type, clinical: Boolean(r.clinical), message: r.message, date: r.date, period: r.period, mealId: r.meal_id, mealName: r.meal_name,
    report: r.report_kind ? { kind: r.report_kind, allergen: r.report_allergen ?? null } : null, status: r.status,
    createdBy: r.created_by, createdByRole: r.created_by_role, createdAt: r.created_at, response: r.response, resolvedBy: r.resolved_by, resolvedAt: r.resolved_at,
  } : null);
  const rangeSql = (qry) => {
    const where = [];
    const args = [];
    if (qry.patientId) { where.push('patient_id = ?'); args.push(Number(qry.patientId)); }
    if (qry.date) { where.push('date = ?'); args.push(qry.date); }
    if (qry.from) { where.push('date >= ?'); args.push(qry.from); }
    if (qry.to) { where.push('date <= ?'); args.push(qry.to); }
    return { where: where.length ? `WHERE ${where.join(' AND ')}` : '', args };
  };

  return {
    kind: 'sqlite',
    // ---- users (better-auth "user" table; passwords and sessions are managed by better-auth)
    getUserById: (id) => authUser(q('SELECT * FROM "user" WHERE id = ?').get(String(id))),
    getUserByEmail: (email) => authUser(q('SELECT * FROM "user" WHERE email = ?').get(String(email).toLowerCase())),
    getUserByUsername: (username) => authUser(q('SELECT * FROM "user" WHERE username = ?').get(String(username).toLowerCase())),
    updateUser(id, f) {
      const map = { name: 'name', role: 'role', status: 'status', requestedRole: 'requestedRole', requestNote: 'requestNote',
        decidedBy: 'decidedBy', decidedAt: 'decidedAt', decisionNote: 'decisionNote', patientId: 'patientId', updatedAt: 'updatedAt' };
      const sets = [];
      const args = [];
      for (const [k, col] of Object.entries(map)) if (k in f) { sets.push(`"${col}" = ?`); args.push(k === 'patientId' ? (f[k] == null ? null : String(f[k])) : f[k] ?? null); }
      if (!('updatedAt' in f)) { sets.push('"updatedAt" = ?'); args.push(new Date().toISOString()); }
      q(`UPDATE "user" SET ${sets.join(', ')} WHERE id = ?`).run(...args, String(id));
      return authUser(q('SELECT * FROM "user" WHERE id = ?').get(String(id)));
    },
    listUsers: () => q('SELECT * FROM "user" ORDER BY "createdAt", id').all().map(authUser),
    listUsersByPatient: (patientId) => q('SELECT * FROM "user" WHERE "patientId" = ? ORDER BY "createdAt"').all(String(patientId)).map(authUser),
    countActiveAdmins: () => q(`SELECT COUNT(*) AS n FROM "user" WHERE role = 'admin' AND status = 'active'`).get().n,
    /** Sign a user out everywhere (deactivation, role change). */
    deleteUserSessions: (userId) => { q('DELETE FROM "session" WHERE "userId" = ?').run(String(userId)); },

    // ---- patients
    listPatients: () => q('SELECT * FROM Patients ORDER BY id').all().map(patientRow),
    getPatient: (id) => patientRow(q('SELECT * FROM Patients WHERE id = ?').get(Number(id))),
    getPatientByDemoId: (demoId) => patientRow(q('SELECT * FROM Patients WHERE demo_id = ?').get(demoId)),
    getPatientByLinkCode: (code) => patientRow(q('SELECT * FROM Patients WHERE link_code = ?').get(code)),
    createPatient(p) {
      return tx(db, () => {
        const r = q(`INSERT INTO Patients (${PATIENT_COLS}) VALUES (${PATIENT_COLS.split(',').map(() => '?').join(',')})`).run(...patientValues(p));
        writeChildren(Number(r.lastInsertRowid), p);
        return patientRow(q('SELECT * FROM Patients WHERE id = ?').get(r.lastInsertRowid));
      });
    },
    updatePatient(id, p) {
      return tx(db, () => {
        q(`UPDATE Patients SET ${PATIENT_COLS.split(',').map((c) => `${c}=?`).join(', ')} WHERE id = ?`).run(...patientValues(p), Number(id));
        writeChildren(Number(id), p);
        return patientRow(q('SELECT * FROM Patients WHERE id = ?').get(Number(id)));
      });
    },
    deletePatient: (id) => { q('DELETE FROM Patients WHERE id = ?').run(Number(id)); },

    // ---- editable menu catalogue
    getCatalogData() {
      const lines = q('SELECT * FROM DishIngredients ORDER BY dish_id, position').all();
      const comps = q('SELECT * FROM MealComponents ORDER BY meal_id, position').all();
      const byDish = new Map();
      for (const l of lines) { const a = byDish.get(l.dish_id) ?? []; a.push({ ing: l.ingredient_id, g: l.grams, prep: l.preparation ?? undefined, optional: Boolean(l.optional) || undefined }); byDish.set(l.dish_id, a); }
      const byMeal = new Map();
      for (const c of comps) { const a = byMeal.get(c.meal_id) ?? []; a.push({ dish: c.dish_id, factor: c.factor }); byMeal.set(c.meal_id, a); }
      return {
        ingredients: q('SELECT * FROM Ingredients ORDER BY rowid').all().map(ingredientRow),
        dishes: q('SELECT * FROM Dishes ORDER BY rowid').all().map((r) => ({
          id: r.id, name: r.name, nameAr: r.name_ar ?? undefined, kind: r.kind, category: r.category, cuisine: r.cuisine, description: r.description, portionG: r.portion_g, servingSize: r.serving_size,
          batchPortions: r.batch_portions ?? undefined, portions: P(r.portions, undefined) ?? undefined, steps: P(r.steps, []), notes: P(r.notes, []), art: P(r.art, {}),
          nutrition: { source: r.nutrition_source, sfctId: r.sfct_id ?? undefined }, sfctRecipe: P(r.sfct_recipe, undefined) ?? undefined, version: r.version,
          updatedAt: r.updated_at ?? undefined, updatedBy: r.updated_by ?? undefined, ingredients: byDish.get(r.id) ?? [],
        })),
        meals: q('SELECT * FROM Meals ORDER BY rowid').all().map((r) => ({
          id: r.id, name: r.name, category: r.category, cuisine: r.cuisine ?? undefined, description: r.description, portions: P(r.portions, undefined) ?? undefined, art: P(r.art, undefined) ?? undefined,
          available: Boolean(r.available), unavailableReason: r.unavailable_reason ?? null, availabilityChangedBy: r.availability_changed_by ?? null, availabilityChangedAt: r.availability_changed_at ?? null,
          infoReview: P(r.info_review, { status: 'verified' }), active: Boolean(r.active), version: r.version, updatedAt: r.updated_at ?? undefined, updatedBy: r.updated_by ?? undefined,
          lastChange: r.last_change ?? undefined, components: byMeal.get(r.id) ?? [],
        })),
      };
    },
    saveIngredient: (i) => { writeIngredient(i); return i; },
    saveDish: (d) => tx(db, () => { writeDish(d); return d; }),
    saveMeal: (m) => tx(db, () => { writeMeal(m); return m; }),
    getMenu() {
      const cycle = Array.from({ length: 7 }, () => ({}));
      for (const r of q('SELECT * FROM MenuCycle ORDER BY cycle_day, period, position').all()) (cycle[r.cycle_day][r.period] ??= []).push(r.meal_id);
      const dates = {};
      for (const r of q('SELECT * FROM MenuDates').all()) (dates[r.date] ??= {})[r.period] = P(r.meal_ids, []);
      return { cycle, dates };
    },
    saveMenuCycle: (day, period, ids) => tx(db, () => {
      q('DELETE FROM MenuCycle WHERE cycle_day = ? AND period = ?').run(day, period);
      ids.forEach((id, i) => q('INSERT INTO MenuCycle (cycle_day,period,position,meal_id) VALUES (?,?,?,?)').run(day, period, i, id));
    }),
    saveMenuDate: (date, period, ids) => {
      if (ids == null) q('DELETE FROM MenuDates WHERE date = ? AND period = ?').run(date, period);
      else q('INSERT INTO MenuDates (date,period,meal_ids) VALUES (?,?,?) ON CONFLICT(date,period) DO UPDATE SET meal_ids=excluded.meal_ids').run(date, period, J(ids));
    },
    replaceCatalog({ ingredients, dishes, meals, menu }) {
      tx(db, () => {
        for (const t of ['MenuDates', 'MenuCycle', 'MealComponents', 'Meals', 'DishIngredients', 'Dishes', 'Ingredients']) q(`DELETE FROM ${t}`).run();
        for (const i of ingredients) writeIngredient(i);
        for (const d of dishes) writeDish(d);
        for (const m of meals) writeMeal(m);
        menu.cycle.forEach((day, d) => { for (const [period, ids] of Object.entries(day)) ids.forEach((id, i) => q('INSERT INTO MenuCycle (cycle_day,period,position,meal_id) VALUES (?,?,?,?)').run(d, period, i, id)); });
        for (const [date, per] of Object.entries(menu.dates ?? {})) for (const [period, ids] of Object.entries(per)) q('INSERT INTO MenuDates (date,period,meal_ids) VALUES (?,?,?)').run(date, period, J(ids));
      });
    },

    // ---- meal schedule
    listEntries(qry = {}) {
      const { where, args } = rangeSql(qry);
      let rows = q(`SELECT * FROM MealSchedule ${where} ORDER BY date, patient_id, period`).all(...args).map(entryRow);
      if (qry.mealId) rows = rows.filter((e) => e.selectedMealId === qry.mealId || e.offers.some((o) => o.mealId === qry.mealId));
      return rows;
    },
    getEntry: (patientId, date, period) => entryRow(q('SELECT * FROM MealSchedule WHERE patient_id = ? AND date = ? AND period = ?').get(Number(patientId), date, period)),
    getEntryById: (id) => entryRow(q('SELECT * FROM MealSchedule WHERE id = ?').get(Number(id))),
    saveEntry(e) {
      return tx(db, () => {
        const pid = Number(e.patientId);
        q(`INSERT INTO MealSchedule (patient_id,date,period,status,hold_from,selected_meal_id,meal_name,meal_version,portion,selected_by,selected_by_role,selected_at,confirmed_by,confirmed_by_role,confirmed_at,confirm_mode,
             prepared_by,prepared_at,delivered_by,delivered_by_role,delivered_at,cancelled_reason,replaces,created_at,updated_at)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
           ON CONFLICT(patient_id,date,period) DO UPDATE SET status=excluded.status, hold_from=excluded.hold_from, selected_meal_id=excluded.selected_meal_id, meal_name=excluded.meal_name,
             meal_version=excluded.meal_version, portion=excluded.portion, selected_by=excluded.selected_by, selected_by_role=excluded.selected_by_role, selected_at=excluded.selected_at,
             confirmed_by=excluded.confirmed_by, confirmed_by_role=excluded.confirmed_by_role, confirmed_at=excluded.confirmed_at, confirm_mode=excluded.confirm_mode,
             prepared_by=excluded.prepared_by, prepared_at=excluded.prepared_at, delivered_by=excluded.delivered_by, delivered_by_role=excluded.delivered_by_role, delivered_at=excluded.delivered_at,
             cancelled_reason=excluded.cancelled_reason, replaces=excluded.replaces, updated_at=excluded.updated_at`)
          .run(pid, e.date, e.period, e.status, e.holdFrom ?? null, e.selectedMealId ?? null, e.mealName ?? null, e.mealVersion ?? null, e.portion ?? null, e.selectedBy ?? null, e.selectedByRole ?? null,
            e.selectedAt ?? null, e.confirmedBy ?? null, e.confirmedByRole ?? null, e.confirmedAt ?? null, e.confirmMode ?? null, e.preparedBy ?? null, e.preparedAt ?? null, e.deliveredBy ?? null,
            e.deliveredByRole ?? null, e.deliveredAt ?? null, e.cancelledReason ?? null, e.replaces ? J(e.replaces) : null, e.createdAt ?? new Date().toISOString(), e.updatedAt ?? new Date().toISOString());
        const row = q('SELECT * FROM MealSchedule WHERE patient_id = ? AND date = ? AND period = ?').get(pid, e.date, e.period);
        for (const t of ['MealOffers', 'ScheduleChanges', 'ScheduleEvents']) q(`DELETE FROM ${t} WHERE schedule_id = ?`).run(row.id);
        const ins = q('INSERT INTO MealOffers (schedule_id,position,meal_id,meal_name,screened_as,approved_by,approved_by_name,review_note,review_reasons,suggested_portion,portions) VALUES (?,?,?,?,?,?,?,?,?,?,?)');
        (e.offers ?? []).forEach((o, i) => ins.run(row.id, i, o.mealId, o.mealName ?? null, o.screenedAs, o.approvedBy == null ? null : Number(o.approvedBy), o.approvedByName ?? null, o.reviewNote ?? null, J(o.reviewReasons ?? []), o.suggestedPortion ?? null, J(o.portions ?? [])));
        const ch = q(`INSERT INTO ScheduleChanges (schedule_id,change_id,at,cause,cause_label,change,details,meal_id,meal_name,portion,previous_status,hold,kitchen_affected,reviewed,reviewed_by,reviewed_by_role,reviewed_at,resolution,kitchen_ack_by,kitchen_ack_at,kitchen_ack_stage)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
        for (const c of e.changes ?? []) ch.run(row.id, c.id, c.at, c.cause, c.causeLabel ?? null, c.change, J(c.details ?? []), c.mealId ?? null, c.mealName ?? null, c.portion ?? null, c.previousStatus ?? null,
          c.hold ? 1 : 0, c.kitchenAffected ? 1 : 0, c.reviewed ? 1 : 0, c.reviewedBy ?? null, c.reviewedByRole ?? null, c.reviewedAt ?? null, c.resolution ?? null, c.kitchenAck?.by ?? null, c.kitchenAck?.at ?? null, c.kitchenAck?.stage ?? null);
        const ev = q('INSERT INTO ScheduleEvents (schedule_id,position,at,actor_name,actor_role,action,status,meal_id,meal_name,portion,note) VALUES (?,?,?,?,?,?,?,?,?,?,?)');
        (e.history ?? []).forEach((h, i) => ev.run(row.id, i, h.at, h.by ?? 'CareBite', h.role ?? 'system', h.action, h.status ?? null, h.mealId ?? null, h.mealName ?? null, h.portion ?? null, h.note ?? null));
        return entryRow(row);
      });
    },
    deleteEntry: (patientId, date, period) => { q('DELETE FROM MealSchedule WHERE patient_id = ? AND date = ? AND period = ?').run(Number(patientId), date, period); },

    // ---- intake and feedback
    listIntake(qry = {}) {
      const { where, args } = rangeSql(qry);
      return q(`SELECT * FROM MealIntake ${where} ORDER BY date, period, source`).all(...args).map(intakeRow);
    },
    saveIntake(r) {
      q(`INSERT INTO MealIntake (patient_id,date,period,source,meal_id,meal_name,portion,appetite_before,accepted,amount,reasons,satisfaction,comment,measured_waste_g,recorded_by,recorded_by_role,recorded_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
         ON CONFLICT(patient_id,date,period,source) DO UPDATE SET meal_id=excluded.meal_id, meal_name=excluded.meal_name, portion=excluded.portion, appetite_before=excluded.appetite_before, accepted=excluded.accepted,
           amount=excluded.amount, reasons=excluded.reasons, satisfaction=excluded.satisfaction, comment=excluded.comment, measured_waste_g=excluded.measured_waste_g,
           recorded_by=excluded.recorded_by, recorded_by_role=excluded.recorded_by_role, recorded_at=excluded.recorded_at`)
        .run(Number(r.patientId), r.date, r.period, r.source, r.mealId, r.mealName ?? null, r.portion, r.appetiteBefore ?? null, r.accepted ? 1 : 0, r.amount, J(r.reasons ?? []), r.satisfaction ?? null,
          r.comment || null, r.measuredWasteG ?? null, r.recordedBy, r.recordedByRole, r.recordedAt);
      return intakeRow(q('SELECT * FROM MealIntake WHERE patient_id = ? AND date = ? AND period = ? AND source = ?').get(Number(r.patientId), r.date, r.period, r.source));
    },

    // ---- requests
    listRequests(qry = {}) {
      const where = [];
      const args = [];
      if (qry.patientId) { where.push('patient_id = ?'); args.push(Number(qry.patientId)); }
      if (qry.status) { where.push('status = ?'); args.push(qry.status); }
      return q(`SELECT * FROM PatientRequests ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY id`).all(...args).map(requestRow);
    },
    getRequest: (id) => requestRow(q('SELECT * FROM PatientRequests WHERE id = ?').get(Number(id))),
    addRequest(r) {
      const res = q(`INSERT INTO PatientRequests (patient_id,type,clinical,message,date,period,meal_id,meal_name,report_kind,report_allergen,status,created_by,created_by_role,created_at,response,resolved_by,resolved_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
        .run(Number(r.patientId), r.type, r.clinical ? 1 : 0, r.message, r.date ?? null, r.period ?? null, r.mealId ?? null, r.mealName ?? null, r.report?.kind ?? null, r.report?.allergen ?? null,
          r.status, r.createdBy, r.createdByRole, r.createdAt, r.response ?? null, r.resolvedBy ?? null, r.resolvedAt ?? null);
      return requestRow(q('SELECT * FROM PatientRequests WHERE id = ?').get(res.lastInsertRowid));
    },
    updateRequest(id, f) {
      q('UPDATE PatientRequests SET status = COALESCE(?, status), response = COALESCE(?, response), resolved_by = COALESCE(?, resolved_by), resolved_at = COALESCE(?, resolved_at) WHERE id = ?')
        .run(f.status ?? null, f.response ?? null, f.resolvedBy ?? null, f.resolvedAt ?? null, Number(id));
      return requestRow(q('SELECT * FROM PatientRequests WHERE id = ?').get(Number(id)));
    },

    // ---- audit log
    addAudit(a) {
      q('INSERT INTO AuditLog (at,actor_id,actor_role,actor_name,patient_id,action,detail) VALUES (?,?,?,?,?,?,?)')
        .run(a.at, a.actorId == null ? null : Number(a.actorId), a.actorRole, a.actorName, a.patientId == null ? null : Number(a.patientId), a.action, a.detail);
    },
    listAudit({ patientId = null, scope = null, limit = 50 } = {}) {
      const rows = patientId
        ? q('SELECT * FROM AuditLog WHERE patient_id = ? ORDER BY id DESC LIMIT ?').all(Number(patientId), limit)
        : scope ? q('SELECT * FROM AuditLog WHERE action LIKE ? ORDER BY id DESC LIMIT ?').all(`${scope}%`, limit)
          : q('SELECT * FROM AuditLog ORDER BY id DESC LIMIT ?').all(limit);
      return rows.map((r) => ({ id: String(r.id), at: r.at, actorId: S(r.actor_id), actorRole: r.actor_role, actorName: r.actor_name, patientId: S(r.patient_id), action: r.action, detail: r.detail }));
    },

    clearHospitalData() {
      tx(db, () => {
        q('UPDATE "user" SET "patientId" = NULL').run();
        for (const t of ['AuditLog', 'PatientRequests', 'MealIntake', 'ScheduleEvents', 'ScheduleChanges', 'MealOffers', 'MealSchedule', 'FoodPreferences', 'MedicalExclusions', 'PatientAllergies', 'DietOrderCategories', 'DietOrders', 'PatientConditions', 'Patients']) q(`DELETE FROM ${t}`).run();
      });
    },
  };
}
