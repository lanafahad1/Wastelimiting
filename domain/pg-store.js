// Postgres persistence (Neon in production, any Postgres 14+ locally).
//
// The domain service is plain synchronous JavaScript, so every request works on
// a snapshot of the data:
// 1. One SQL statement loads a consistent snapshot of the hospital data:
//    patients, meal schedule, intake, requests, accounts and the recent audit
//    log. The menu catalogue is cached per server instance and reloaded only
//    when its version number changes.
// 2. createSnapshotRepo() serves the domain from that snapshot, with the same
//    interface and ordering as the in-memory test repository (and the SQLite
//    version CareBite used before).
// 3. A request that changes data runs in one transaction under a database-wide
//    write lock (pg_advisory_xact_lock), so changes made on different server
//    instances are applied one at a time. Only the records that changed are
//    written back, batched per table. If the operation fails, nothing is saved.
//
// Accounts and sessions live in better-auth's "user", "session", "account",
// "verification" and "rateLimit" tables (created by its migrations). The "user"
// table carries CareBite's role, access status and patient link.

import { createHash } from 'node:crypto';
import { SFCT_LIBRARY } from '../data/sfct-dishes.js';
import { LOCAL_PRODUCTION } from '../data/local-production.js';
import { MEDICAL_RULES, SAFETY_RULES, INTAKE_FLAG_RULES, DIET_CATEGORIES } from './rules.js';
import { CONDITIONS } from './constants.js';

export const SCHEMA_VERSION = 1;
/** Audit rows kept in a snapshot: the newest per patient and action group. listAudit limits must stay at or below this. */
export const AUDIT_WINDOW = 50;
/** Advisory lock keys: one for start-up (schema and seeding), one for every change to the data. */
export const INIT_LOCK = 72_420_001;
export const WRITE_LOCK = 72_420_002;

const STATUS = "('offered','selected','confirmed','prepared','delivered','on-hold','cancelled')";
const PERIOD = "('breakfast','lunch','dinner','snack')";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS Meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);

-- Patients -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS Patients (
  id INTEGER PRIMARY KEY,
  demo_id TEXT NOT NULL UNIQUE CHECK (demo_id ~ '^CB-[0-9]{4}$'),
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

-- Reference data (read-only, synced from data/ and domain/rules.js) ---------------------
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
  self_sufficiency_pct DOUBLE PRECISION NOT NULL,
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

-- Editable menu catalogue (seq keeps the catalogue order) -----------------------------------
CREATE TABLE IF NOT EXISTS Ingredients (
  id TEXT PRIMARY KEY,
  seq INTEGER NOT NULL,
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
  seq INTEGER NOT NULL,
  name TEXT NOT NULL,
  name_ar TEXT,
  kind TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ${PERIOD}),
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
  grams DOUBLE PRECISION NOT NULL,
  preparation TEXT,
  optional INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (dish_id, position)
);

-- A meal is what is offered for one meal period: one dish, or a complete meal of several.
CREATE TABLE IF NOT EXISTS Meals (
  id TEXT PRIMARY KEY,
  seq INTEGER NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ${PERIOD}),
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
  factor DOUBLE PRECISION NOT NULL DEFAULT 1,
  PRIMARY KEY (meal_id, position)
);

-- The 7-day menu cycle (day 0 = Monday) and date-specific menus that replace it.
CREATE TABLE IF NOT EXISTS MenuCycle (
  cycle_day INTEGER NOT NULL CHECK (cycle_day BETWEEN 0 AND 6),
  period TEXT NOT NULL CHECK (period IN ${PERIOD}),
  position INTEGER NOT NULL,
  meal_id TEXT NOT NULL REFERENCES Meals(id),
  PRIMARY KEY (cycle_day, period, position)
);
CREATE TABLE IF NOT EXISTS MenuDates (
  date TEXT NOT NULL,
  period TEXT NOT NULL CHECK (period IN ${PERIOD}),
  meal_ids TEXT NOT NULL DEFAULT '[]',
  PRIMARY KEY (date, period)
);

-- Patient nutrition profile (position keeps the recorded order) ---------------------------------
CREATE TABLE IF NOT EXISTS PatientConditions (
  patient_id INTEGER NOT NULL REFERENCES Patients(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
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
  patient_id INTEGER NOT NULL REFERENCES Patients(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('allergy','intolerance')),
  coding TEXT NOT NULL CHECK (coding IN ('allergen-group','intolerance-code','ingredient','uncoded')),
  code TEXT,
  ingredient_id TEXT,
  free_text TEXT,
  PRIMARY KEY (patient_id, position)
);
CREATE TABLE IF NOT EXISTS MedicalExclusions (
  patient_id INTEGER NOT NULL REFERENCES Patients(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  ingredient_id TEXT NOT NULL,
  PRIMARY KEY (patient_id, ingredient_id)
);
-- Preferences only rank meals; they are never used for safety decisions.
CREATE TABLE IF NOT EXISTS FoodPreferences (
  patient_id INTEGER NOT NULL REFERENCES Patients(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('cuisine','favorite','dislike')),
  value TEXT NOT NULL,
  PRIMARY KEY (patient_id, position)
);

-- Meal workflow -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS MealSchedule (
  id INTEGER PRIMARY KEY,
  patient_id INTEGER NOT NULL REFERENCES Patients(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  period TEXT NOT NULL CHECK (period IN ${PERIOD}),
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
  approved_by TEXT,
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
  position INTEGER NOT NULL,
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
  id INTEGER PRIMARY KEY,
  patient_id INTEGER NOT NULL REFERENCES Patients(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  period TEXT NOT NULL CHECK (period IN ${PERIOD}),
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
  id INTEGER PRIMARY KEY,
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
  id INTEGER PRIMARY KEY,
  at TEXT NOT NULL,
  actor_id TEXT,
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
const S = (v) => (v == null ? null : String(v));
const N = (v) => (v == null ? null : Number(v));
const clone = (x) => (x == null ? x : structuredClone(x));
/** Byte-order comparison of text (independent of the database's collation). */
const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

// ------------------------------------------------------------------ rows <-> domain records
// Each record is stored in the snapshot exactly as it would be read back from the
// database (record -> rows -> record), so a value returned after a write equals
// what the next request will load.

/** Map a better-auth "user" row to the domain's user shape. */
function userFromRow(r) {
  return {
    id: String(r.id), username: r.displayUsername ?? r.username, email: r.email, name: r.name, role: r.role ?? null, status: r.status ?? 'pending',
    requestedRole: r.requestedRole ?? null, requestNote: r.requestNote ?? null, decidedBy: r.decidedBy ?? null, decidedAt: r.decidedAt ?? null, decisionNote: r.decisionNote ?? null,
    patientId: r.patientId ?? null, isDemo: Boolean(r.isDemo), createdAt: r.createdAt, updatedAt: r.updatedAt,
  };
}
/** Domain user fields the domain may change, and their "user" columns. */
const USER_FIELDS = { name: 'name', role: 'role', status: 'status', requestedRole: 'requestedRole', requestNote: 'requestNote', decidedBy: 'decidedBy', decidedAt: 'decidedAt', decisionNote: 'decisionNote', patientId: 'patientId', updatedAt: 'updatedAt' };

function patientToRows(p, id) {
  const o = p.dietOrder;
  const allergy = (reaction_type, coding, field) => (v) => ({ reaction_type, coding, code: null, ingredient_id: null, free_text: null, [field]: v });
  return {
    row: {
      id: Number(id), demo_id: p.demoId, preferred_name: p.preferredName || null, age_range: p.ageRange, ward: p.ward, bed: p.bed, status: p.status, admitted_on: p.admittedOn ?? null,
      discharged_on: p.dischargedOn ?? null, discharged_by: p.dischargedBy ?? null, discharge_note: p.dischargeNote || null, allergy_status: p.allergies.status,
      other_condition_text: p.conditions.otherText || null, medical_notes: p.restrictions.medicalNotes || null, appetite: p.appetite.level, preferred_portion: p.preferences.preferredPortion,
      link_code: p.linkCode ?? null, link_code_expires_at: p.linkCodeExpiresAt ?? null, created_at: p.createdAt, updated_at: p.updatedAt, updated_by: p.updatedBy ?? null,
    },
    conditions: [...p.conditions.selected],
    order: {
      npo: o.npo ? 1 : 0, texture_level: o.textureLevel || null, portions_permitted: J(o.portionsPermitted), sodium_mg_per_day: o.sodiumMgPerDay ?? null, potassium_mg_per_day: o.potassiumMgPerDay ?? null,
      phosphorus_mg_per_day: o.phosphorusMgPerDay ?? null, carbs_g_per_meal: o.carbsGPerMeal ?? null, notes: o.notes || null,
    },
    categories: [...o.categories],
    allergies: [
      ...p.allergies.confirmed.map(allergy('allergy', 'allergen-group', 'code')),
      ...p.allergies.ingredients.map(allergy('allergy', 'ingredient', 'ingredient_id')),
      ...p.allergies.uncoded.map(allergy('allergy', 'uncoded', 'free_text')),
      ...p.intolerances.selected.map(allergy('intolerance', 'intolerance-code', 'code')),
      ...p.intolerances.ingredients.map(allergy('intolerance', 'ingredient', 'ingredient_id')),
      ...p.intolerances.uncoded.map(allergy('intolerance', 'uncoded', 'free_text')),
    ],
    exclusions: [...p.restrictions.medicalExclusions],
    prefs: [...p.preferences.cuisines.map((value) => ({ kind: 'cuisine', value })), ...p.preferences.favorites.map((value) => ({ kind: 'favorite', value })), ...p.preferences.dislikes.map((value) => ({ kind: 'dislike', value }))],
  };
}

function patientFromRows({ row: r, conditions, order, categories, allergies, exclusions, prefs }) {
  const o = order ?? {};
  const of = (kind) => prefs.filter((x) => x.kind === kind).map((x) => x.value);
  const dietOrder = { categories: [...categories], npo: Boolean(o.npo), textureLevel: o.texture_level ?? '', portionsPermitted: P(o.portions_permitted, []), notes: o.notes ?? '' };
  for (const [k, col] of [['sodiumMgPerDay', 'sodium_mg_per_day'], ['potassiumMgPerDay', 'potassium_mg_per_day'], ['phosphorusMgPerDay', 'phosphorus_mg_per_day'], ['carbsGPerMeal', 'carbs_g_per_meal']]) {
    if (o[col] != null) dietOrder[k] = Number(o[col]);
  }
  const pick = (type, coding, field) => allergies.filter((a) => a.reaction_type === type && a.coding === coding).map((a) => a[field]);
  return {
    id: String(r.id), demoId: r.demo_id, preferredName: r.preferred_name ?? '', ageRange: r.age_range, ward: r.ward, bed: r.bed, status: r.status,
    admittedOn: r.admitted_on, dischargedOn: r.discharged_on ?? null, dischargedBy: r.discharged_by ?? null, dischargeNote: r.discharge_note ?? '',
    conditions: { selected: [...conditions], otherText: r.other_condition_text ?? '' },
    dietOrder,
    allergies: { status: r.allergy_status, confirmed: pick('allergy', 'allergen-group', 'code'), ingredients: pick('allergy', 'ingredient', 'ingredient_id'), uncoded: pick('allergy', 'uncoded', 'free_text') },
    intolerances: { selected: pick('intolerance', 'intolerance-code', 'code'), ingredients: pick('intolerance', 'ingredient', 'ingredient_id'), uncoded: pick('intolerance', 'uncoded', 'free_text') },
    restrictions: { medicalExclusions: [...exclusions], medicalNotes: r.medical_notes ?? '' },
    preferences: { cuisines: of('cuisine'), favorites: of('favorite'), dislikes: of('dislike'), preferredPortion: r.preferred_portion },
    appetite: { level: r.appetite },
    linkCode: r.link_code ?? null, linkCodeExpiresAt: r.link_code_expires_at ?? null,
    createdAt: r.created_at, updatedAt: r.updated_at, updatedBy: r.updated_by ?? null,
  };
}

function entryToRows(e, id, createdAt) {
  return {
    row: {
      id: Number(id), patient_id: Number(e.patientId), date: e.date, period: e.period, status: e.status, hold_from: e.holdFrom ?? null, selected_meal_id: e.selectedMealId ?? null,
      meal_name: e.mealName ?? null, meal_version: e.mealVersion ?? null, portion: e.portion ?? null, selected_by: e.selectedBy ?? null, selected_by_role: e.selectedByRole ?? null,
      selected_at: e.selectedAt ?? null, confirmed_by: e.confirmedBy ?? null, confirmed_by_role: e.confirmedByRole ?? null, confirmed_at: e.confirmedAt ?? null, confirm_mode: e.confirmMode ?? null,
      prepared_by: e.preparedBy ?? null, prepared_at: e.preparedAt ?? null, delivered_by: e.deliveredBy ?? null, delivered_by_role: e.deliveredByRole ?? null, delivered_at: e.deliveredAt ?? null,
      cancelled_reason: e.cancelledReason ?? null, replaces: e.replaces ? J(e.replaces) : null, created_at: createdAt, updated_at: e.updatedAt ?? new Date().toISOString(),
    },
    offers: (e.offers ?? []).map((o, i) => ({
      position: i, meal_id: o.mealId, meal_name: o.mealName ?? null, screened_as: o.screenedAs, approved_by: o.approvedBy == null ? null : String(o.approvedBy), approved_by_name: o.approvedByName ?? null,
      review_note: o.reviewNote ?? null, review_reasons: J(o.reviewReasons ?? []), suggested_portion: o.suggestedPortion ?? null, portions: J(o.portions ?? []),
    })),
    changes: (e.changes ?? []).map((c, i) => ({
      change_id: c.id, position: i, at: c.at, cause: c.cause, cause_label: c.causeLabel ?? null, change: c.change, details: J(c.details ?? []), meal_id: c.mealId ?? null, meal_name: c.mealName ?? null,
      portion: c.portion ?? null, previous_status: c.previousStatus ?? null, hold: c.hold ? 1 : 0, kitchen_affected: c.kitchenAffected ? 1 : 0, reviewed: c.reviewed ? 1 : 0,
      reviewed_by: c.reviewedBy ?? null, reviewed_by_role: c.reviewedByRole ?? null, reviewed_at: c.reviewedAt ?? null, resolution: c.resolution ?? null,
      kitchen_ack_by: c.kitchenAck?.by ?? null, kitchen_ack_at: c.kitchenAck?.at ?? null, kitchen_ack_stage: c.kitchenAck?.stage ?? null,
    })),
    events: (e.history ?? []).map((h, i) => ({
      position: i, at: h.at, actor_name: h.by ?? 'CareBite', actor_role: h.role ?? 'system', action: h.action, status: h.status ?? null, meal_id: h.mealId ?? null,
      meal_name: h.mealName ?? null, portion: h.portion ?? null, note: h.note ?? null,
    })),
  };
}

function entryFromRows({ row: r, offers, changes, events }) {
  return {
    id: String(r.id), patientId: String(r.patient_id), date: r.date, period: r.period, status: r.status, holdFrom: r.hold_from,
    offers: offers.map((o) => ({
      mealId: o.meal_id, mealName: o.meal_name, screenedAs: o.screened_as, approvedBy: S(o.approved_by), approvedByName: o.approved_by_name, reviewNote: o.review_note,
      reviewReasons: P(o.review_reasons, []), suggestedPortion: o.suggested_portion, portions: P(o.portions, []),
    })),
    selectedMealId: r.selected_meal_id, mealName: r.meal_name, mealVersion: N(r.meal_version), portion: r.portion,
    selectedBy: r.selected_by, selectedByRole: r.selected_by_role, selectedAt: r.selected_at,
    confirmedBy: r.confirmed_by, confirmedByRole: r.confirmed_by_role, confirmedAt: r.confirmed_at, confirmMode: r.confirm_mode,
    preparedBy: r.prepared_by, preparedAt: r.prepared_at, deliveredBy: r.delivered_by, deliveredByRole: r.delivered_by_role, deliveredAt: r.delivered_at,
    cancelledReason: r.cancelled_reason, replaces: P(r.replaces, null),
    changes: [...changes].sort((a, b) => cmp(a.at, b.at) || a.position - b.position).map((c) => ({
      id: c.change_id, at: c.at, cause: c.cause, causeLabel: c.cause_label, change: c.change, details: P(c.details, []), mealId: c.meal_id, mealName: c.meal_name, portion: c.portion,
      previousStatus: c.previous_status, hold: Boolean(c.hold), kitchenAffected: Boolean(c.kitchen_affected), reviewed: Boolean(c.reviewed), reviewedBy: c.reviewed_by, reviewedByRole: c.reviewed_by_role,
      reviewedAt: c.reviewed_at, resolution: c.resolution, kitchenAck: c.kitchen_ack_by ? { by: c.kitchen_ack_by, at: c.kitchen_ack_at, stage: c.kitchen_ack_stage } : null,
    })),
    history: events.map((h) => ({ at: h.at, by: h.actor_name, role: h.actor_role, action: h.action, status: h.status, mealId: h.meal_id, mealName: h.meal_name, portion: h.portion, note: h.note })),
    createdAt: r.created_at, updatedAt: r.updated_at,
  };
}

const intakeToRow = (r, id) => ({
  id: Number(id), patient_id: Number(r.patientId), date: r.date, period: r.period, source: r.source, meal_id: r.mealId, meal_name: r.mealName ?? null, portion: r.portion,
  appetite_before: r.appetiteBefore ?? null, accepted: r.accepted ? 1 : 0, amount: r.amount, reasons: J(r.reasons ?? []), satisfaction: r.satisfaction ?? null, comment: r.comment || null,
  measured_waste_g: r.measuredWasteG ?? null, recorded_by: r.recordedBy, recorded_by_role: r.recordedByRole, recorded_at: r.recordedAt,
});
const intakeFromRow = (r) => ({
  id: String(r.id), patientId: String(r.patient_id), date: r.date, period: r.period, source: r.source, mealId: r.meal_id, mealName: r.meal_name, portion: r.portion, appetiteBefore: r.appetite_before,
  accepted: Boolean(r.accepted), amount: r.amount, reasons: P(r.reasons, []), satisfaction: N(r.satisfaction), comment: r.comment ?? '', measuredWasteG: N(r.measured_waste_g),
  recordedBy: r.recorded_by, recordedByRole: r.recorded_by_role, recordedAt: r.recorded_at,
});

const requestToRow = (r, id) => ({
  id: Number(id), patient_id: Number(r.patientId), type: r.type, clinical: r.clinical ? 1 : 0, message: r.message, date: r.date ?? null, period: r.period ?? null, meal_id: r.mealId ?? null,
  meal_name: r.mealName ?? null, report_kind: r.report?.kind ?? null, report_allergen: r.report?.allergen ?? null, status: r.status, created_by: r.createdBy, created_by_role: r.createdByRole,
  created_at: r.createdAt, response: r.response ?? null, resolved_by: r.resolvedBy ?? null, resolved_at: r.resolvedAt ?? null,
});
const requestFromRow = (r) => ({
  id: String(r.id), patientId: String(r.patient_id), type: r.type, clinical: Boolean(r.clinical), message: r.message, date: r.date, period: r.period, mealId: r.meal_id, mealName: r.meal_name,
  report: r.report_kind ? { kind: r.report_kind, allergen: r.report_allergen ?? null } : null, status: r.status,
  createdBy: r.created_by, createdByRole: r.created_by_role, createdAt: r.created_at, response: r.response, resolvedBy: r.resolved_by, resolvedAt: r.resolved_at,
});

const auditToRow = (a, id) => ({
  id: Number(id), at: a.at, actor_id: a.actorId == null ? null : String(a.actorId), actor_role: a.actorRole, actor_name: a.actorName,
  patient_id: a.patientId == null ? null : Number(a.patientId), action: a.action, detail: a.detail,
});
const auditFromRow = (r) => ({ id: String(r.id), at: r.at, actorId: S(r.actor_id), actorRole: r.actor_role, actorName: r.actor_name, patientId: S(r.patient_id), action: r.action, detail: r.detail });

const ingredientToRow = (i, seq) => ({
  id: i.id, seq, name: i.name, same_food: i.sameFood ?? null, ingredient_group: i.group ?? 'other', local_commodity: i.local ?? null, allergens: J(i.allergens ?? []), may_contain: J(i.mayContain ?? []),
  flags: J(i.flags ?? []), label_check: i.labelCheck ? 1 : 0, note: i.note ?? null, updated_at: i.updatedAt ?? null, updated_by: i.updatedBy ?? null,
});
const ingredientFromRow = (r) => ({
  id: r.id, name: r.name, sameFood: r.same_food ?? undefined, group: r.ingredient_group, local: r.local_commodity ?? undefined, allergens: P(r.allergens, []), mayContain: P(r.may_contain, []),
  flags: P(r.flags, []), labelCheck: Boolean(r.label_check), note: r.note ?? undefined, updatedAt: r.updated_at ?? undefined, updatedBy: r.updated_by ?? undefined,
});
const dishToRows = (d, seq) => ({
  row: {
    id: d.id, seq, name: d.name, name_ar: d.nameAr ?? null, kind: d.kind, category: d.category, cuisine: d.cuisine, description: d.description ?? '', portion_g: d.portionG, serving_size: d.servingSize,
    batch_portions: d.batchPortions ?? null, portions: d.portions ? J(d.portions) : null, steps: J(d.steps ?? []), notes: J(d.notes ?? []), art: J(d.art ?? {}),
    nutrition_source: d.nutrition?.source === 'sfct' ? 'sfct' : 'none', sfct_id: d.nutrition?.source === 'sfct' ? d.nutrition.sfctId : null, sfct_recipe: d.sfctRecipe ? J(d.sfctRecipe) : null,
    version: d.version ?? 1, updated_at: d.updatedAt ?? null, updated_by: d.updatedBy ?? null,
  },
  lines: d.ingredients.map((l, i) => ({ position: i, ingredient_id: l.ing, grams: l.g, preparation: l.prep ?? null, optional: l.optional ? 1 : 0 })),
});
const dishFromRows = ({ row: r, lines }) => ({
  id: r.id, name: r.name, nameAr: r.name_ar ?? undefined, kind: r.kind, category: r.category, cuisine: r.cuisine, description: r.description, portionG: r.portion_g, servingSize: r.serving_size,
  batchPortions: r.batch_portions ?? undefined, portions: P(r.portions, undefined) ?? undefined, steps: P(r.steps, []), notes: P(r.notes, []), art: P(r.art, {}),
  nutrition: { source: r.nutrition_source, sfctId: r.sfct_id ?? undefined }, sfctRecipe: P(r.sfct_recipe, undefined) ?? undefined, version: r.version,
  updatedAt: r.updated_at ?? undefined, updatedBy: r.updated_by ?? undefined,
  ingredients: lines.map((l) => ({ ing: l.ingredient_id, g: l.grams, prep: l.preparation ?? undefined, optional: Boolean(l.optional) || undefined })),
});
const mealToRows = (m, seq) => ({
  row: {
    id: m.id, seq, name: m.name, category: m.category, cuisine: m.cuisine ?? null, description: m.description ?? '', portions: m.portions ? J(m.portions) : null, art: m.art ? J(m.art) : null,
    available: m.available === false ? 0 : 1, unavailable_reason: m.unavailableReason ?? null, availability_changed_by: m.availabilityChangedBy ?? null, availability_changed_at: m.availabilityChangedAt ?? null,
    info_review: J(m.infoReview ?? { status: 'verified' }), active: m.active === false ? 0 : 1, version: m.version ?? 1, updated_at: m.updatedAt ?? null, updated_by: m.updatedBy ?? null, last_change: m.lastChange ?? null,
  },
  components: m.components.map((c, i) => ({ position: i, dish_id: c.dish, factor: c.factor ?? 1 })),
});
const mealFromRows = ({ row: r, components }) => ({
  id: r.id, name: r.name, category: r.category, cuisine: r.cuisine ?? undefined, description: r.description, portions: P(r.portions, undefined) ?? undefined, art: P(r.art, undefined) ?? undefined,
  available: Boolean(r.available), unavailableReason: r.unavailable_reason ?? null, availabilityChangedBy: r.availability_changed_by ?? null, availabilityChangedAt: r.availability_changed_at ?? null,
  infoReview: P(r.info_review, { status: 'verified' }), active: Boolean(r.active), version: r.version, updatedAt: r.updated_at ?? undefined, updatedBy: r.updated_by ?? undefined,
  lastChange: r.last_change ?? undefined, components: components.map((c) => ({ dish: c.dish_id, factor: c.factor })),
});

// Round trips used to store records in the snapshot exactly as they will be read back.
const normalPatient = (p, id) => patientFromRows(patientToRows(p, id));
const normalEntry = (e, id, createdAt) => {
  const rows = entryToRows(e, id, createdAt);
  return entryFromRows({ row: rows.row, offers: rows.offers, changes: rows.changes, events: rows.events });
};
const normalIngredient = (i) => ingredientFromRow(ingredientToRow(i, 0));
const normalDish = (d) => dishFromRows(dishToRows(d, 0));
const normalMeal = (m) => mealFromRows(mealToRows(m, 0));

// ------------------------------------------------------------------ schema and reference data
const referenceRows = () => {
  const params = (r) => { const { id, kind, title, logic, sources, status, version, reviewedBy, reviewedOn, clinicalValidation, ...rest } = r; return rest; };
  const rule = (r, type, kind, parameters) => ({ id: r.id, rule_type: type, kind, title: r.title, logic: r.logic, parameters, sources: J(r.sources), status: r.status, version: r.version, reviewed_by: r.reviewedBy, reviewed_on: r.reviewedOn, clinical_validation: r.clinicalValidation });
  return {
    MedicalConditions: CONDITIONS.map((c) => ({ id: c.id, label: c.label })),
    DietCategories: DIET_CATEGORIES.map((d) => ({ id: d.id, code: d.code, label: d.label, plain_label: d.plain ?? null, description: d.description, rule_ids: J(d.rules), defaults: J(d.defaults ?? {}), requires: J(d.requires ?? []), support: d.support ?? null, status: d.status ?? 'active' })),
    LocalProduction: Object.entries(LOCAL_PRODUCTION).map(([k, v]) => ({ commodity: k, label: v.label, self_sufficiency_pct: v.selfSufficiency, year: v.year, sources: J(v.sources) })),
    SfctDishes: Object.entries(SFCT_LIBRARY).map(([id, e]) => ({ id, name: e.name, name_ar: e.nameAr ?? null, region: e.region, recipe_page: e.recipePage ?? null, table_page: e.tablePage ?? null, yield: e.yield ?? null, ingredients: J(e.ingredients), per_100g: J(e.per100g), full_recipe: J(e.fullRecipe) })),
    MedicalDietaryRules: [
      ...MEDICAL_RULES.map((r) => rule(r, 'medical', r.kind, J(params(r)))),
      ...SAFETY_RULES.map((r) => rule(r, 'safety', r.outcome, '{}')),
      ...INTAKE_FLAG_RULES.map((r) => rule(r, 'intake-flag', r.outcome, J({ window: r.window, days: r.days, min: r.min }))),
    ],
  };
};
const REFERENCE_KEYS = { MedicalConditions: ['id'], DietCategories: ['id'], LocalProduction: ['commodity'], SfctDishes: ['id'], MedicalDietaryRules: ['id'] };

/**
 * Create the tables when missing and keep the read-only reference data in sync
 * with the code (only rewritten when it changed). Run under the start-up lock.
 */
export async function ensureSchema(client) {
  await client.query(SCHEMA);
  await client.query(`INSERT INTO Meta (key, value) VALUES ('schema_version', $1), ('catalog_version', '1') ON CONFLICT (key) DO NOTHING`, [String(SCHEMA_VERSION)]);
  const ref = referenceRows();
  const hash = createHash('sha256').update(JSON.stringify(ref)).digest('hex');
  const { rows } = await client.query(`SELECT value FROM Meta WHERE key = 'reference_hash'`);
  if (rows[0]?.value === hash) return;
  for (const [table, list] of Object.entries(ref)) await insertRows(client, table, Object.keys(list[0]), list, REFERENCE_KEYS[table]);
  await client.query(`INSERT INTO Meta (key, value) VALUES ('reference_hash', $1) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`, [hash]);
}

/** INSERT rows in chunks; with conflict key columns, existing rows are updated instead. */
async function insertRows(client, table, cols, rows, conflict = null) {
  if (!rows.length) return;
  const per = Math.max(1, Math.floor(30000 / cols.length));
  const quoted = cols.map((c) => `"${c}"`).join(',');
  const update = conflict
    ? ` ON CONFLICT (${conflict.map((c) => `"${c}"`).join(',')}) DO UPDATE SET ${cols.filter((c) => !conflict.includes(c)).map((c) => `"${c}" = EXCLUDED."${c}"`).join(', ')}`
    : '';
  for (let i = 0; i < rows.length; i += per) {
    const params = [];
    const values = rows.slice(i, i + per).map((r) => `(${cols.map((c) => { params.push(r[c] === undefined ? null : r[c]); return `$${params.length}`; }).join(',')})`).join(',');
    await client.query(`INSERT INTO ${table} (${quoted}) VALUES ${values}${update}`, params);
  }
}

// ------------------------------------------------------------------ loading a snapshot
const iso = (col) => `to_char(${col} AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`;
const agg = (expr, from, order) => `(SELECT coalesce(json_agg(${expr} ORDER BY ${order}), '[]'::json) FROM ${from})`;

const HOSPITAL_SQL = `
  'users', ${agg(`json_build_object('id', u.id, 'username', u.username, 'displayUsername', u."displayUsername", 'email', u.email, 'name', u.name, 'role', u.role, 'status', u.status,
    'requestedRole', u."requestedRole", 'requestNote', u."requestNote", 'decidedBy', u."decidedBy", 'decidedAt', u."decidedAt", 'decisionNote', u."decisionNote",
    'patientId', u."patientId", 'isDemo', u."isDemo", 'createdAt', ${iso('u."createdAt"')}, 'updatedAt', ${iso('u."updatedAt"')})`, '"user" u', 'u."createdAt", u.id')},
  'patients', ${agg(`json_build_object('row', row_to_json(p),
    'conditions', ${agg('c.condition_id', 'PatientConditions c WHERE c.patient_id = p.id', 'c.position')},
    'order', (SELECT row_to_json(o) FROM DietOrders o WHERE o.patient_id = p.id),
    'categories', ${agg('c.category_id', 'DietOrderCategories c WHERE c.patient_id = p.id', 'c.position')},
    'allergies', ${agg('row_to_json(a)', 'PatientAllergies a WHERE a.patient_id = p.id', 'a.position')},
    'exclusions', ${agg('e.ingredient_id', 'MedicalExclusions e WHERE e.patient_id = p.id', 'e.position')},
    'prefs', ${agg('row_to_json(f)', 'FoodPreferences f WHERE f.patient_id = p.id', 'f.position')})`, 'Patients p', 'p.id')},
  'entries', ${agg(`json_build_object('row', row_to_json(s),
    'offers', ${agg('row_to_json(o)', 'MealOffers o WHERE o.schedule_id = s.id', 'o.position')},
    'changes', ${agg('row_to_json(c)', 'ScheduleChanges c WHERE c.schedule_id = s.id', 'c.position')},
    'events', ${agg('row_to_json(v)', 'ScheduleEvents v WHERE v.schedule_id = s.id', 'v.position')})`, 'MealSchedule s', 's.id')},
  'intake', ${agg('row_to_json(i)', 'MealIntake i', 'i.id')},
  'requests', ${agg('row_to_json(r)', 'PatientRequests r', 'r.id')},
  'audit', ${agg(`json_build_object('id', a.id, 'at', a.at, 'actor_id', a.actor_id, 'actor_role', a.actor_role, 'actor_name', a.actor_name, 'patient_id', a.patient_id, 'action', a.action, 'detail', a.detail)`,
    `(SELECT x.*, row_number() OVER (PARTITION BY x.patient_id, split_part(x.action, '.', 1) ORDER BY x.id DESC) AS rn FROM AuditLog x) a WHERE a.rn <= ${AUDIT_WINDOW}`, 'a.id')},
  'maxIds', json_build_object('patients', (SELECT coalesce(max(id), 0) FROM Patients), 'entries', (SELECT coalesce(max(id), 0) FROM MealSchedule),
    'intake', (SELECT coalesce(max(id), 0) FROM MealIntake), 'requests', (SELECT coalesce(max(id), 0) FROM PatientRequests), 'audit', (SELECT coalesce(max(id), 0) FROM AuditLog)),`;
// Public pages need only the menu catalogue.
const NO_HOSPITAL_SQL = `'users', '[]'::json, 'patients', '[]'::json, 'entries', '[]'::json, 'intake', '[]'::json, 'requests', '[]'::json, 'audit', '[]'::json,
  'maxIds', json_build_object('patients', 0, 'entries', 0, 'intake', 0, 'requests', 0, 'audit', 0),`;
const snapshotSql = (hospital) => `SELECT json_build_object(${hospital ? HOSPITAL_SQL : NO_HOSPITAL_SQL}
  'catalogVersion', (SELECT value FROM Meta WHERE key = 'catalog_version'),
  'catalog', CASE WHEN (SELECT value FROM Meta WHERE key = 'catalog_version') IS DISTINCT FROM $1::text THEN json_build_object(
    'ingredients', ${agg('row_to_json(i)', 'Ingredients i', 'i.seq')},
    'dishes', ${agg(`json_build_object('row', row_to_json(d), 'lines', ${agg('row_to_json(l)', 'DishIngredients l WHERE l.dish_id = d.id', 'l.position')})`, 'Dishes d', 'd.seq')},
    'meals', ${agg(`json_build_object('row', row_to_json(m), 'components', ${agg('row_to_json(c)', 'MealComponents c WHERE c.meal_id = m.id', 'c.position')})`, 'Meals m', 'm.seq')},
    'cycle', ${agg('row_to_json(c)', 'MenuCycle c', 'c.cycle_day, c.period, c.position')},
    'dates', ${agg('row_to_json(d)', 'MenuDates d', 'd.date, d.period')}) END
) AS snapshot`;
const SNAPSHOT_SQL = snapshotSql(true);
const CATALOG_SQL = snapshotSql(false);

/** The menu catalogue in snapshot form: maps keep the catalogue order; seqs keep each item's stored position. */
function catalogFromRows(c) {
  const cycle = Array.from({ length: 7 }, () => ({}));
  for (const r of c.cycle) (cycle[r.cycle_day][r.period] ??= []).push(r.meal_id);
  const dates = {};
  for (const r of c.dates) (dates[r.date] ??= {})[r.period] = P(r.meal_ids, []);
  return {
    ingredients: new Map(c.ingredients.map((r) => [r.id, ingredientFromRow(r)])),
    dishes: new Map(c.dishes.map((d) => [d.row.id, dishFromRows(d)])),
    meals: new Map(c.meals.map((m) => [m.row.id, mealFromRows(m)])),
    seqs: {
      ingredients: new Map(c.ingredients.map((r) => [r.id, r.seq])),
      dishes: new Map(c.dishes.map((d) => [d.row.id, d.row.seq])),
      meals: new Map(c.meals.map((m) => [m.row.id, m.row.seq])),
    },
    menu: { cycle, dates },
  };
}

/**
 * Load a snapshot. `catalogCache` ({ version, catalog }) is reused when the stored
 * catalogue version has not changed; the returned snapshot carries the cache to keep.
 * With hospital: false only the menu catalogue is loaded (for public pages).
 */
export async function loadSnapshot(db, catalogCache = null, { hospital = true } = {}) {
  const { rows } = await db.query(hospital ? SNAPSHOT_SQL : CATALOG_SQL, [catalogCache?.version ?? null]);
  const s = rows[0].snapshot;
  const catalog = s.catalog ? { version: s.catalogVersion, catalog: catalogFromRows(s.catalog) } : catalogCache;
  if (!catalog) throw new Error('The menu catalogue could not be loaded: the database schema is not initialised.');
  return {
    hospital,
    users: new Map(s.users.map((u) => [String(u.id), userFromRow(u)])),
    patients: new Map(s.patients.map((p) => [String(p.row.id), patientFromRows(p)])),
    entries: new Map(s.entries.map((e) => [String(e.row.id), entryFromRows(e)])),
    intake: new Map(s.intake.map((r) => [String(r.id), intakeFromRow(r)])),
    requests: new Map(s.requests.map((r) => [String(r.id), requestFromRow(r)])),
    audit: new Map(s.audit.map((r) => [String(r.id), auditFromRow(r)])),
    maxIds: s.maxIds,
    catalogCache: catalog,
  };
}

// ------------------------------------------------------------------ the snapshot repository
/**
 * Repository over a loaded snapshot, implementing the interface used by
 * domain/service.js. Lists keep the order the domain expects (for example
 * schedule entries by date, patient and meal period). Reads return copies.
 * With readOnly, any write throws.
 */
export function createSnapshotRepo(snapshot, { readOnly = false } = {}) {
  const s = {
    users: new Map(snapshot.users), patients: new Map(snapshot.patients), entries: new Map(snapshot.entries),
    intake: new Map(snapshot.intake), requests: new Map(snapshot.requests), audit: new Map(snapshot.audit),
  };
  const maxIds = { ...snapshot.maxIds };
  const nextId = (table) => String(++maxIds[table]);
  const base = snapshot.catalogCache.catalog;
  let cat = base;
  let catalogReplaced = false;
  const effects = [];
  const guard = () => { if (readOnly) throw new Error('This request was opened read-only, but the operation tried to change data.'); };
  /** Copy-on-write: the cached catalogue is shared between requests and never changed in place. */
  const writableCatalog = () => {
    if (cat === base) {
      cat = {
        ingredients: new Map(base.ingredients), dishes: new Map(base.dishes), meals: new Map(base.meals),
        seqs: { ingredients: new Map(base.seqs.ingredients), dishes: new Map(base.seqs.dishes), meals: new Map(base.seqs.meals) },
        menu: clone(base.menu),
      };
    }
    return cat;
  };
  const seqFor = (kind, id) => {
    const seqs = cat.seqs[kind];
    if (!seqs.has(id)) seqs.set(id, Math.max(0, ...seqs.values()) + 1);
    return seqs.get(id);
  };

  const slot = (patientId, date, period) => (x) => x.patientId === String(patientId) && x.date === date && x.period === period;
  const findEntry = (patientId, date, period) => [...s.entries.values()].find(slot(patientId, date, period)) ?? null;
  const inRange = (date, q) => (!q.date || date === q.date) && (!q.from || date >= q.from) && (!q.to || date <= q.to);
  const byPatient = (q) => (x) => !q.patientId || x.patientId === String(Number(q.patientId));
  const users = () => [...s.users.values()];

  function setUser(id, u) { s.users.set(id, u); }

  const repo = {
    kind: 'postgres',
    /** Identifies the cached catalogue this snapshot reads (a server may share a built catalogue per version). */
    catalogKey: base,
    // ---- users (better-auth "user" table; passwords and sessions are managed by better-auth)
    getUserById: (id) => clone(s.users.get(String(id)) ?? null),
    getUserByEmail: (email) => clone(users().find((u) => u.email === String(email).toLowerCase()) ?? null),
    getUserByUsername: (username) => clone(users().find((u) => String(u.username ?? '').toLowerCase() === String(username).toLowerCase()) ?? null),
    updateUser(id, f) {
      guard();
      const u = s.users.get(String(id));
      if (!u) return null;
      const next = { ...u };
      for (const k of Object.keys(USER_FIELDS)) if (k in f) next[k] = k === 'patientId' ? (f[k] == null ? null : String(f[k])) : f[k] ?? null;
      if (!('updatedAt' in f)) next.updatedAt = new Date().toISOString();
      setUser(u.id, next);
      return clone(next);
    },
    listUsers: () => clone(users().sort((a, b) => cmp(a.createdAt, b.createdAt) || cmp(a.id, b.id))),
    listUsersByPatient: (patientId) => clone(users().filter((u) => u.patientId === String(patientId)).sort((a, b) => cmp(a.createdAt, b.createdAt))),
    countActiveAdmins: () => users().filter((u) => u.role === 'admin' && u.status === 'active').length,
    /** Sign a user out everywhere (deactivation, role change). */
    deleteUserSessions: (userId) => { guard(); effects.push({ type: 'deleteSessions', userId: String(userId) }); },

    // ---- patients
    listPatients: () => clone([...s.patients.values()].sort((a, b) => Number(a.id) - Number(b.id))),
    getPatient: (id) => clone(s.patients.get(String(Number(id))) ?? null),
    getPatientByDemoId: (demoId) => clone([...s.patients.values()].find((p) => p.demoId === demoId) ?? null),
    getPatientByLinkCode: (code) => clone([...s.patients.values()].find((p) => p.linkCode != null && p.linkCode === code) ?? null),
    createPatient(p) {
      guard();
      const id = nextId('patients');
      s.patients.set(id, normalPatient(p, id));
      return clone(s.patients.get(id));
    },
    updatePatient(id, p) {
      guard();
      const key = String(Number(id));
      if (!s.patients.has(key)) return null;
      s.patients.set(key, normalPatient(p, key));
      return clone(s.patients.get(key));
    },
    deletePatient(id) {
      guard();
      const key = String(Number(id));
      s.patients.delete(key);
      for (const bucket of ['entries', 'intake', 'requests', 'audit']) for (const [k, x] of s[bucket]) if (x.patientId === key) s[bucket].delete(k);
    },

    // ---- editable menu catalogue
    getCatalogData: () => clone({ ingredients: [...cat.ingredients.values()], dishes: [...cat.dishes.values()], meals: [...cat.meals.values()] }),
    saveIngredient(i) { guard(); const c = writableCatalog(); seqFor('ingredients', i.id); c.ingredients.set(i.id, normalIngredient(i)); return i; },
    saveDish(d) { guard(); const c = writableCatalog(); seqFor('dishes', d.id); c.dishes.set(d.id, normalDish(d)); return d; },
    saveMeal(m) { guard(); const c = writableCatalog(); seqFor('meals', m.id); c.meals.set(m.id, normalMeal(m)); return m; },
    getMenu: () => clone(cat.menu),
    saveMenuCycle(day, period, ids) {
      guard();
      const c = writableCatalog();
      if (ids.length) c.menu.cycle[day][period] = [...ids]; else delete c.menu.cycle[day][period];
    },
    saveMenuDate(date, period, ids) {
      guard();
      const d = writableCatalog().menu.dates;
      if (ids == null) { if (d[date]) { delete d[date][period]; if (!Object.keys(d[date]).length) delete d[date]; } }
      else d[date] = { ...(d[date] ?? {}), [period]: [...ids] };
    },
    replaceCatalog({ ingredients, dishes, meals, menu }) {
      guard();
      const cycle = Array.from({ length: 7 }, () => ({}));
      menu.cycle.forEach((day, d) => { for (const [period, ids] of Object.entries(day)) if (ids.length) cycle[d][period] = [...ids]; });
      const dates = {};
      for (const [date, per] of Object.entries(menu.dates ?? {})) for (const [period, ids] of Object.entries(per)) (dates[date] ??= {})[period] = [...ids];
      const order = (list) => new Map(list.map((x, i) => [x.id, i + 1]));
      cat = {
        ingredients: new Map(ingredients.map((i) => [i.id, normalIngredient(i)])),
        dishes: new Map(dishes.map((d) => [d.id, normalDish(d)])),
        meals: new Map(meals.map((m) => [m.id, normalMeal(m)])),
        seqs: { ingredients: order(ingredients), dishes: order(dishes), meals: order(meals) },
        menu: { cycle, dates },
      };
      catalogReplaced = true;
    },

    // ---- meal schedule
    listEntries(q = {}) {
      let rows = [...s.entries.values()].filter((e) => byPatient(q)(e) && inRange(e.date, q))
        .sort((a, b) => cmp(a.date, b.date) || Number(a.patientId) - Number(b.patientId) || cmp(a.period, b.period));
      if (q.mealId) rows = rows.filter((e) => e.selectedMealId === q.mealId || e.offers.some((o) => o.mealId === q.mealId));
      return clone(rows);
    },
    getEntry: (patientId, date, period) => clone(findEntry(String(Number(patientId)), date, period)),
    getEntryById: (id) => clone(s.entries.get(String(Number(id))) ?? null),
    saveEntry(e) {
      guard();
      const pid = String(Number(e.patientId));
      const existing = findEntry(pid, e.date, e.period);
      const id = existing?.id ?? nextId('entries');
      const createdAt = existing?.createdAt ?? e.createdAt ?? new Date().toISOString();
      s.entries.set(id, normalEntry({ ...e, patientId: pid }, id, createdAt));
      return clone(s.entries.get(id));
    },
    deleteEntry(patientId, date, period) {
      guard();
      const e = findEntry(String(Number(patientId)), date, period);
      if (e) s.entries.delete(e.id);
    },

    // ---- intake and feedback
    listIntake(q = {}) {
      return clone([...s.intake.values()].filter((r) => byPatient(q)(r) && inRange(r.date, q))
        .sort((a, b) => cmp(a.date, b.date) || cmp(a.period, b.period) || cmp(a.source, b.source) || Number(a.id) - Number(b.id)));
    },
    saveIntake(r) {
      guard();
      const pid = String(Number(r.patientId));
      const existing = [...s.intake.values()].find((x) => slot(pid, r.date, r.period)(x) && x.source === r.source);
      const id = existing?.id ?? nextId('intake');
      s.intake.set(id, intakeFromRow(intakeToRow({ ...r, patientId: pid }, id)));
      return clone(s.intake.get(id));
    },

    // ---- requests
    listRequests(q = {}) {
      return clone([...s.requests.values()].filter((r) => byPatient(q)(r) && (!q.status || r.status === q.status)).sort((a, b) => Number(a.id) - Number(b.id)));
    },
    getRequest: (id) => clone(s.requests.get(String(Number(id))) ?? null),
    addRequest(r) {
      guard();
      const id = nextId('requests');
      s.requests.set(id, requestFromRow(requestToRow(r, id)));
      return clone(s.requests.get(id));
    },
    updateRequest(id, f) {
      guard();
      const key = String(Number(id));
      const r = s.requests.get(key);
      if (!r) return null;
      // As before: only the fields given (not null) change.
      const next = { ...r, status: f.status ?? r.status, response: f.response ?? r.response, resolvedBy: f.resolvedBy ?? r.resolvedBy, resolvedAt: f.resolvedAt ?? r.resolvedAt };
      s.requests.set(key, requestFromRow(requestToRow(next, key)));
      return clone(s.requests.get(key));
    },

    // ---- audit log
    addAudit(a) {
      guard();
      const id = nextId('audit');
      s.audit.set(id, auditFromRow(auditToRow(a, id)));
    },
    listAudit({ patientId = null, scope = null, limit = 50 } = {}) {
      const rows = [...s.audit.values()]
        .filter((a) => (patientId ? a.patientId === String(Number(patientId)) : true) && (!patientId && scope ? a.action.toLowerCase().startsWith(String(scope).toLowerCase()) : true))
        .sort((a, b) => Number(b.id) - Number(a.id));
      return clone(rows.slice(0, Math.min(limit, AUDIT_WINDOW)));
    },

    clearHospitalData() {
      guard();
      for (const u of users()) if (u.patientId != null) setUser(u.id, { ...u, patientId: null });
      for (const bucket of ['patients', 'entries', 'intake', 'requests', 'audit']) s[bucket].clear();
      // The snapshot holds only recent audit rows, so the tables are emptied in full when saved.
      effects.push({ type: 'clearHospital' });
    },

    /** What changed compared with the loaded snapshot (used by saveChanges). */
    _changes: () => ({ snapshot, s, cat, base, catalogReplaced, effects, maxIds }),
  };
  if (snapshot.hospital === false) {
    // A catalogue-only snapshot: reaching hospital data is a programming error, not an empty hospital.
    for (const name of Object.keys(repo)) {
      if (/User|Admins|Patient|Entr|Intake|Request|Audit|clearHospital/.test(name)) repo[name] = () => { throw new Error(`${name}: this request loaded only the menu catalogue.`); };
    }
  }
  return repo;
}

// ------------------------------------------------------------------ writing changes back
const PATIENT_COLS = ['id', 'demo_id', 'preferred_name', 'age_range', 'ward', 'bed', 'status', 'admitted_on', 'discharged_on', 'discharged_by', 'discharge_note', 'allergy_status', 'other_condition_text', 'medical_notes', 'appetite', 'preferred_portion', 'link_code', 'link_code_expires_at', 'created_at', 'updated_at', 'updated_by'];
const ENTRY_COLS = ['id', 'patient_id', 'date', 'period', 'status', 'hold_from', 'selected_meal_id', 'meal_name', 'meal_version', 'portion', 'selected_by', 'selected_by_role', 'selected_at', 'confirmed_by', 'confirmed_by_role', 'confirmed_at', 'confirm_mode', 'prepared_by', 'prepared_at', 'delivered_by', 'delivered_by_role', 'delivered_at', 'cancelled_reason', 'replaces', 'created_at', 'updated_at'];
const cols = (row) => Object.keys(row);

/** Keys whose record differs from the loaded snapshot (records are replaced, never changed in place). */
function diff(before, after) {
  const changed = [];
  for (const [k, v] of after) {
    const old = before.get(k);
    if (old !== v && (old === undefined || JSON.stringify(old) !== JSON.stringify(v))) changed.push(k);
  }
  const removed = [...before.keys()].filter((k) => !after.has(k));
  return { changed, removed };
}

/** Write what changed in a snapshot repository, in dependency order. Call inside the write transaction. */
export async function saveChanges(client, repo) {
  const { snapshot, s, cat, base, catalogReplaced, effects } = repo._changes();
  const d = Object.fromEntries(['users', 'patients', 'entries', 'intake', 'requests', 'audit'].map((k) => [k, diff(snapshot[k], s[k])]));
  const ids = (keys) => keys.map(Number);

  // Accounts: only the CareBite fields that changed; better-auth owns everything else.
  for (const id of d.users.changed) {
    const before = snapshot.users.get(id);
    const u = s.users.get(id);
    const keys = Object.keys(USER_FIELDS).filter((k) => (before?.[k] ?? null) !== (u[k] ?? null));
    if (!keys.length) continue;
    await client.query(`UPDATE "user" SET ${keys.map((k, i) => `"${USER_FIELDS[k]}" = $${i + 1}`).join(', ')} WHERE id = $${keys.length + 1}`, [...keys.map((k) => u[k] ?? null), id]);
  }

  if (effects.some((e) => e.type === 'clearHospital')) {
    for (const t of ['AuditLog', 'PatientRequests', 'MealIntake', 'MealSchedule', 'Patients']) await client.query(`DELETE FROM ${t}`);
  }

  // Removed records, dependants first (deleting a patient also cascades in the database).
  if (d.audit.removed.length) await client.query('DELETE FROM AuditLog WHERE id = ANY($1)', [ids(d.audit.removed)]);
  if (d.requests.removed.length) await client.query('DELETE FROM PatientRequests WHERE id = ANY($1)', [ids(d.requests.removed)]);
  if (d.intake.removed.length) await client.query('DELETE FROM MealIntake WHERE id = ANY($1)', [ids(d.intake.removed)]);
  if (d.entries.removed.length) await client.query('DELETE FROM MealSchedule WHERE id = ANY($1)', [ids(d.entries.removed)]);
  if (d.patients.removed.length) await client.query('DELETE FROM Patients WHERE id = ANY($1)', [ids(d.patients.removed)]);

  // Patients and their profile tables.
  if (d.patients.changed.length) {
    const rows = d.patients.changed.map((k) => patientToRows(s.patients.get(k), k));
    await insertRows(client, 'Patients', PATIENT_COLS, rows.map((r) => r.row), ['id']);
    const pids = ids(d.patients.changed);
    for (const t of ['PatientConditions', 'DietOrderCategories', 'PatientAllergies', 'MedicalExclusions', 'FoodPreferences', 'DietOrders']) await client.query(`DELETE FROM ${t} WHERE patient_id = ANY($1)`, [pids]);
    const each = (fn) => rows.flatMap((r) => fn(r).map((x, i) => ({ patient_id: r.row.id, position: i, ...x })));
    await insertRows(client, 'DietOrders', ['patient_id', ...cols(rows[0].order)], rows.map((r) => ({ patient_id: r.row.id, ...r.order })));
    await insertRows(client, 'PatientConditions', ['patient_id', 'position', 'condition_id'], each((r) => r.conditions.map((condition_id) => ({ condition_id }))));
    await insertRows(client, 'DietOrderCategories', ['patient_id', 'position', 'category_id'], each((r) => r.categories.map((category_id) => ({ category_id }))));
    await insertRows(client, 'PatientAllergies', ['patient_id', 'position', 'reaction_type', 'coding', 'code', 'ingredient_id', 'free_text'], each((r) => r.allergies));
    await insertRows(client, 'MedicalExclusions', ['patient_id', 'position', 'ingredient_id'], each((r) => r.exclusions.map((ingredient_id) => ({ ingredient_id }))));
    await insertRows(client, 'FoodPreferences', ['patient_id', 'position', 'kind', 'value'], each((r) => r.prefs));
  }

  // Meal schedule entries and their offers, changes and history.
  if (d.entries.changed.length) {
    const rows = d.entries.changed.map((k) => { const e = s.entries.get(k); return entryToRows(e, k, e.createdAt); });
    await insertRows(client, 'MealSchedule', ENTRY_COLS, rows.map((r) => r.row), ['id']);
    const sids = ids(d.entries.changed);
    for (const t of ['MealOffers', 'ScheduleChanges', 'ScheduleEvents']) await client.query(`DELETE FROM ${t} WHERE schedule_id = ANY($1)`, [sids]);
    const each = (key) => rows.flatMap((r) => r[key].map((x) => ({ schedule_id: r.row.id, ...x })));
    const offers = each('offers');
    const changes = each('changes');
    const events = each('events');
    if (offers.length) await insertRows(client, 'MealOffers', cols(offers[0]), offers);
    if (changes.length) await insertRows(client, 'ScheduleChanges', cols(changes[0]), changes);
    if (events.length) await insertRows(client, 'ScheduleEvents', cols(events[0]), events);
  }

  const flat = async (table, key, toRow) => {
    if (!d[key].changed.length) return;
    const rows = d[key].changed.map((k) => toRow(s[key].get(k), k));
    await insertRows(client, table, cols(rows[0]), rows, ['id']);
  };
  await flat('MealIntake', 'intake', intakeToRow);
  await flat('PatientRequests', 'requests', requestToRow);
  await flat('AuditLog', 'audit', auditToRow);

  // Menu catalogue.
  let catalogChanged = false;
  if (catalogReplaced) {
    catalogChanged = true;
    for (const t of ['MenuDates', 'MenuCycle', 'MealComponents', 'Meals', 'DishIngredients', 'Dishes', 'Ingredients']) await client.query(`DELETE FROM ${t}`);
    await writeCatalogItems(client, cat, [...cat.ingredients.keys()], [...cat.dishes.keys()], [...cat.meals.keys()]);
    await writeMenu(client, cat.menu, null);
  } else if (cat !== base) {
    const ing = diff(base.ingredients, cat.ingredients).changed;
    const dish = diff(base.dishes, cat.dishes).changed;
    const meal = diff(base.meals, cat.meals).changed;
    const menuChanged = JSON.stringify(base.menu) !== JSON.stringify(cat.menu);
    catalogChanged = Boolean(ing.length || dish.length || meal.length || menuChanged);
    if (dish.length) await client.query('DELETE FROM DishIngredients WHERE dish_id = ANY($1)', [dish]);
    if (meal.length) await client.query('DELETE FROM MealComponents WHERE meal_id = ANY($1)', [meal]);
    await writeCatalogItems(client, cat, ing, dish, meal, true);
    if (menuChanged) await writeMenu(client, cat.menu, base.menu);
  }
  if (catalogChanged) await client.query(`UPDATE Meta SET value = (value::int + 1)::text WHERE key = 'catalog_version'`);

  for (const e of effects) if (e.type === 'deleteSessions') await client.query('DELETE FROM "session" WHERE "userId" = $1', [e.userId]);
  return { catalogChanged };
}

async function writeCatalogItems(client, cat, ingIds, dishIds, mealIds, upsert = false) {
  const conflict = upsert ? ['id'] : null;
  const ing = ingIds.map((id) => ingredientToRow(cat.ingredients.get(id), cat.seqs.ingredients.get(id)));
  if (ing.length) await insertRows(client, 'Ingredients', cols(ing[0]), ing, conflict);
  const dishes = dishIds.map((id) => dishToRows(cat.dishes.get(id), cat.seqs.dishes.get(id)));
  if (dishes.length) {
    await insertRows(client, 'Dishes', cols(dishes[0].row), dishes.map((x) => x.row), conflict);
    const lines = dishes.flatMap((x) => x.lines.map((l) => ({ dish_id: x.row.id, ...l })));
    if (lines.length) await insertRows(client, 'DishIngredients', cols(lines[0]), lines);
  }
  const meals = mealIds.map((id) => mealToRows(cat.meals.get(id), cat.seqs.meals.get(id)));
  if (meals.length) {
    await insertRows(client, 'Meals', cols(meals[0].row), meals.map((x) => x.row), conflict);
    const comps = meals.flatMap((x) => x.components.map((c) => ({ meal_id: x.row.id, ...c })));
    if (comps.length) await insertRows(client, 'MealComponents', cols(comps[0]), comps);
  }
}

/** Rewrite the menu cycle days and dated menus that differ from `before` (all of them when before is null). */
async function writeMenu(client, menu, before) {
  const cycleRows = [];
  for (let day = 0; day < 7; day += 1) {
    const periods = new Set([...Object.keys(menu.cycle[day] ?? {}), ...Object.keys(before?.cycle[day] ?? {})]);
    for (const period of periods) {
      const ids = menu.cycle[day]?.[period] ?? [];
      if (before && JSON.stringify(before.cycle[day]?.[period] ?? []) === JSON.stringify(ids)) continue;
      if (before) await client.query('DELETE FROM MenuCycle WHERE cycle_day = $1 AND period = $2', [day, period]);
      ids.forEach((meal_id, position) => cycleRows.push({ cycle_day: day, period, position, meal_id }));
    }
  }
  if (cycleRows.length) await insertRows(client, 'MenuCycle', cols(cycleRows[0]), cycleRows);
  const dateRows = [];
  const dates = new Set([...Object.keys(menu.dates ?? {}), ...Object.keys(before?.dates ?? {})]);
  for (const date of dates) {
    const periods = new Set([...Object.keys(menu.dates[date] ?? {}), ...Object.keys(before?.dates[date] ?? {})]);
    for (const period of periods) {
      const ids = menu.dates[date]?.[period];
      if (before && JSON.stringify(before.dates[date]?.[period]) === JSON.stringify(ids)) continue;
      if (before) await client.query('DELETE FROM MenuDates WHERE date = $1 AND period = $2', [date, period]);
      if (ids) dateRows.push({ date, period, meal_ids: J(ids) });
    }
  }
  if (dateRows.length) await insertRows(client, 'MenuDates', cols(dateRows[0]), dateRows);
}

// ------------------------------------------------------------------ the store
/**
 * Snapshot store over a pg Pool (or anything with query() and connect()).
 * read() returns a read-only repository; write(fn) runs fn(repo) in one
 * transaction under the write lock and saves what changed.
 */
export function createPgStore(pool) {
  let catalogCache = null;
  const keep = (snap) => { if (snap.catalogCache?.version != null) catalogCache = snap.catalogCache; };
  return {
    pool,
    async read({ hospital = true } = {}) {
      const snap = await loadSnapshot(pool, catalogCache, { hospital });
      keep(snap);
      return createSnapshotRepo(snap, { readOnly: true });
    },
    async write(fn) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query('SELECT pg_advisory_xact_lock($1)', [WRITE_LOCK]);
        const snap = await loadSnapshot(client, catalogCache);
        keep(snap);
        const repo = createSnapshotRepo(snap);
        const result = await fn(repo);
        const { catalogChanged } = await saveChanges(client, repo);
        await client.query('COMMIT');
        if (catalogChanged) catalogCache = null; // reload the new version on the next request
        return result;
      } catch (err) {
        await client.query('ROLLBACK').catch(() => {});
        throw err;
      } finally {
        client.release();
      }
    },
  };
}

/** Run fn while holding the start-up lock, so only one server instance creates tables and seeds data at a time. */
export async function withInitLock(pool, fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock($1)', [INIT_LOCK]);
    return await fn();
  } finally {
    await client.query('COMMIT').catch(() => {});
    client.release();
  }
}
