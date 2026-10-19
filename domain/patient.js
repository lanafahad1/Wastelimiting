// Patient nutrition profile: structure, validation by section, and the
// patient-level flags that send a case to admin review. Runs in the
// browser for immediate feedback and on the server, which is authoritative.

import {
  AGE_RANGES, WARDS, CONDITIONS, ALLERGENS, ALLERGY_STATUS, INTOLERANCES, CUISINES, PORTIONS, APPETITE,
} from './constants.js';
import { DIET_CATEGORIES, dietCategory } from './rules.js';
import { INGREDIENT_LOOKUP } from '../data/ingredients.js';

const ids = (list) => new Set(list.map((x) => x.id));
const SETS = {
  age: ids(AGE_RANGES), ward: ids(WARDS), conditions: ids(CONDITIONS), allergens: ids(ALLERGENS), allergyStatus: ids(ALLERGY_STATUS),
  intolerances: ids(INTOLERANCES), diets: ids(DIET_CATEGORIES), portions: ids(PORTIONS), appetite: ids(APPETITE),
  cuisines: new Set(CUISINES),
};

export const TEXTURE_LEVELS = [
  { id: '3', label: 'IDDSI Level 3 · Liquidised' },
  { id: '4', label: 'IDDSI Level 4 · Pureed' },
  { id: '5', label: 'IDDSI Level 5 · Minced & Moist' },
  { id: '6', label: 'IDDSI Level 6 · Soft & Bite-Sized' },
  { id: '7EC', label: 'IDDSI Level 7 · Easy to Chew' },
];

export const LIMIT_FIELDS = [
  { key: 'sodiumMgPerDay', label: 'Sodium', unit: 'mg per day', min: 500, max: 5000, hint: 'Leave blank for the MOH and SFDA default of 2,000 mg (5 g of salt) a day.' },
  { key: 'potassiumMgPerDay', label: 'Potassium', unit: 'mg per day', min: 1000, max: 6000, hint: 'Required for renal diets. Set by the admin for the stage of kidney disease.' },
  { key: 'phosphorusMgPerDay', label: 'Phosphorus', unit: 'mg per day', min: 400, max: 2500, hint: 'Required for renal diets. Set by the admin for the stage of kidney disease.' },
  { key: 'carbsGPerMeal', label: 'Carbohydrate', unit: 'g per meal', min: 10, max: 150, hint: 'Required for consistent-carbohydrate diets. Set by the admin; snacks get one-third.' },
];


const GROUP_SYNONYMS = {
  peanut: 'peanut', peanuts: 'peanut', groundnut: 'peanut', groundnuts: 'peanut',
  'tree nut': 'tree_nut', 'tree nuts': 'tree_nut', nuts: 'tree_nut', nut: 'tree_nut', cashew: 'tree_nut', cashews: 'tree_nut',
  pistachio: 'tree_nut', pistachios: 'tree_nut', hazelnut: 'tree_nut', hazelnuts: 'tree_nut', pecan: 'tree_nut', pecans: 'tree_nut',
  milk: 'milk', dairy: 'milk', egg: 'egg', eggs: 'egg', soy: 'soy', soya: 'soy', soybean: 'soy', soybeans: 'soy',
  wheat: 'gluten', gluten: 'gluten', barley: 'gluten', rye: 'gluten', 'cereals containing gluten': 'gluten',
  fish: 'fish', shellfish: 'shellfish', crustacean: 'shellfish', crustaceans: 'shellfish', prawn: 'shellfish', prawns: 'shellfish',
  crab: 'shellfish', lobster: 'shellfish',
  mollusc: 'mollusc', molluscs: 'mollusc', mollusk: 'mollusc', mollusks: 'mollusc', squid: 'mollusc', octopus: 'mollusc',
  mussel: 'mollusc', mussels: 'mollusc', clam: 'mollusc', clams: 'mollusc', oyster: 'mollusc', oysters: 'mollusc', scallop: 'mollusc', scallops: 'mollusc',
  sesame: 'sesame', celery: 'celery', celeriac: 'celery', mustard: 'mustard', lupin: 'lupin', lupine: 'lupin',
  sulphite: 'sulphites', sulphites: 'sulphites', sulfite: 'sulphites', sulfites: 'sulphites', 'sulphur dioxide': 'sulphites', 'sulfur dioxide': 'sulphites',
};

const strList = (v) => (Array.isArray(v) ? v : v == null || v === '' ? [] : [v]).map((x) => String(x).trim()).filter(Boolean);
const pick = (v, set) => [...new Set(strList(v).filter((x) => set.has(x)))];
export const clean = (s, max = 200) => String(s ?? '').replace(/[\u0000-\u001f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);

/** Try to code free text as an allergen group or as ingredient ids. */
export function codeFreeText(text, table = INGREDIENT_LOOKUP) {
  const t = clean(text, 60).toLowerCase();
  if (t.length < 3) return { group: null, ingredients: [] };
  if (GROUP_SYNONYMS[t]) return { group: GROUP_SYNONYMS[t], ingredients: [] };
  const stem = t.replace(/(es|s)$/, '');
  const ingredients = Object.values(table).filter((i) => {
    const name = i.name.toLowerCase();
    return name.includes(t) || name.includes(stem) || i.id.includes(stem);
  }).map((i) => i.id);
  return { group: null, ingredients };
}

export function emptyPatient() {
  return {
    demoId: '', preferredName: '', ageRange: null, ward: null, bed: '', status: 'admitted', admittedOn: null, dischargedOn: null, dischargedBy: null, dischargeNote: '',
    conditions: { selected: [], otherText: '' },
    dietOrder: { categories: ['regular'], npo: false, textureLevel: '', portionsPermitted: ['small', 'regular', 'large'], notes: '' },
    allergies: { status: 'unknown', confirmed: [], ingredients: [], uncoded: [] },
    intolerances: { selected: [], ingredients: [], uncoded: [] },
    restrictions: { medicalExclusions: [], medicalNotes: '' },
    preferences: { cuisines: [], favorites: [], dislikes: [], preferredPortion: 'regular' },
    appetite: { level: 'good' },
  };
}

function normalizeDetails(input, errors) {
  const d = {
    demoId: clean(input.demoId, 12).toUpperCase(),
    preferredName: clean(input.preferredName, 30),
    ageRange: SETS.age.has(input.ageRange) ? input.ageRange : null,
    ward: SETS.ward.has(input.ward) ? input.ward : null,
    bed: clean(input.bed, 8).toUpperCase(),
  };
  // Admission status is changed only through the admit/discharge actions, never through this form.
  if (!/^CB-\d{4}$/.test(d.demoId)) errors.demoId = 'Use a demonstration identifier in the form CB-1234. Never enter a real medical record number.';
  if (!d.ageRange) errors.ageRange = 'Choose an age range.';
  if (!d.ward) errors.ward = 'Choose the ward.';
  if (!/^[A-Z0-9-]{1,8}$/.test(d.bed)) errors.bed = 'Enter the bed or room, for example 12 or 4B-07.';
  return d;
}

function normalizeClinical(input, errors, warnings, patient = null, table = INGREDIENT_LOOKUP) {
  const known = new Set(Object.keys(table));
  const c = input.conditions ?? {};
  const conditions = { selected: pick(c.selected, SETS.conditions), otherText: clean(c.otherText, 120) };
  if (!conditions.selected.length) errors['conditions.selected'] = 'Select at least one option, or “No diet-related condition recorded”.';
  if (conditions.selected.includes('none') && conditions.selected.length > 1) errors['conditions.selected'] = '“No diet-related condition recorded” cannot be combined with other conditions.';
  if (conditions.selected.includes('other') && !conditions.otherText) errors['conditions.otherText'] = 'Name the other condition.';
  if (!conditions.selected.includes('other')) conditions.otherText = '';

  const o = input.dietOrder ?? {};
  const dietOrder = {
    categories: pick(o.categories, SETS.diets),
    npo: o.npo === true,
    textureLevel: TEXTURE_LEVELS.some((t) => t.id === o.textureLevel) ? o.textureLevel : '',
    portionsPermitted: pick(o.portionsPermitted, SETS.portions),
    notes: clean(o.notes, 300),
  };
  for (const f of LIMIT_FIELDS) {
    const raw = o[f.key];
    if (raw === undefined || raw === null || raw === '') continue;
    const n = Number(raw);
    if (!Number.isFinite(n) || n < f.min || n > f.max) errors[`dietOrder.${f.key}`] = `${f.label} must be between ${f.min} and ${f.max} ${f.unit}.`;
    else dietOrder[f.key] = Math.round(n);
  }
  if (!dietOrder.categories.length) errors['dietOrder.categories'] = 'Choose at least one diet category. Use “Regular diet” if no therapeutic diet is prescribed.';
  const retiredNew = dietOrder.categories.filter((c) => dietCategory(c)?.status === 'retired' && !patient?.dietOrder?.categories?.includes(c));
  if (retiredNew.length) errors['dietOrder.categories'] = `${retiredNew.map((c) => dietCategory(c).label).join(', ')} is no longer offered. ${dietCategory(retiredNew[0]).retiredReason}`;
  const therapeutic = ['consistent-carb', 'low-sodium', 'heart-healthy', 'renal', 'high-protein', 'texture-modified'];
  if (dietOrder.categories.includes('regular') && dietOrder.categories.some((c) => therapeutic.includes(c))) {
    errors['dietOrder.categories'] = '“Regular diet” cannot be combined with a therapeutic diet. Remove one of them.';
  }
  if (dietOrder.categories.includes('texture-modified') && !dietOrder.textureLevel) errors['dietOrder.textureLevel'] = 'Choose the IDDSI texture level.';
  if (!dietOrder.categories.includes('texture-modified')) dietOrder.textureLevel = '';
  if (!dietOrder.portionsPermitted.length) errors['dietOrder.portionsPermitted'] = 'Permit at least one portion size.';
  if (dietOrder.categories.includes('renal') && (dietOrder.potassiumMgPerDay == null || dietOrder.phosphorusMgPerDay == null)) {
    warnings.push('The renal diet has no potassium or phosphorus limit yet. Meals will need admin review until both are entered.');
  }
  if (dietOrder.categories.includes('consistent-carb') && dietOrder.carbsGPerMeal == null) {
    warnings.push('The consistent-carbohydrate diet has no carbohydrate amount per meal yet. Meals will need admin review until it is entered.');
  }

  const a = input.allergies ?? {};
  const allergies = { status: SETS.allergyStatus.has(a.status) ? a.status : 'unknown', confirmed: pick(a.confirmed, SETS.allergens), ingredients: pick(a.ingredients, known), uncoded: [] };
  for (const text of strList(a.uncoded).map((t) => clean(t, 60))) {
    const coded = codeFreeText(text, table);
    if (coded.group) { if (!allergies.confirmed.includes(coded.group)) allergies.confirmed.push(coded.group); }
    else if (coded.ingredients.length) allergies.ingredients.push(...coded.ingredients.filter((i) => !allergies.ingredients.includes(i)));
    else allergies.uncoded.push(text);
  }
  const anyAllergy = allergies.confirmed.length + allergies.ingredients.length + allergies.uncoded.length > 0;
  if (anyAllergy) allergies.status = 'recorded';
  else if (allergies.status === 'recorded') errors['allergies.status'] = 'Add the allergies, or choose “No known food allergies” or “Not yet assessed”.';

  const it = input.intolerances ?? {};
  const intolerances = { selected: pick(it.selected, SETS.intolerances), ingredients: pick(it.ingredients, known), uncoded: [] };
  for (const text of strList(it.uncoded).map((t) => clean(t, 60))) {
    const coded = codeFreeText(text, table);
    if (coded.ingredients.length) intolerances.ingredients.push(...coded.ingredients.filter((i) => !intolerances.ingredients.includes(i)));
    else intolerances.uncoded.push(text);
  }

  const r = input.restrictions ?? {};
  const restrictions = { medicalExclusions: pick(r.medicalExclusions, known), medicalNotes: clean(r.medicalNotes, 300) };
  return { conditions, dietOrder, allergies, intolerances, restrictions };
}

function normalizePreferences(input, patient, errors, warnings, table = INGREDIENT_LOOKUP) {
  const known = new Set(Object.keys(table));
  const p = input.preferences ?? input;
  const prefs = {
    cuisines: pick(p.cuisines, SETS.cuisines),
    favorites: pick(p.favorites, known),
    dislikes: pick(p.dislikes, known),
    preferredPortion: SETS.portions.has(p.preferredPortion) ? p.preferredPortion : 'regular',
  };
  if (prefs.favorites.some((f) => prefs.dislikes.includes(f))) {
    warnings.push('Some foods were marked as both favourite and disliked; they are treated as disliked.');
    prefs.favorites = prefs.favorites.filter((f) => !prefs.dislikes.includes(f));
  }
  const permitted = patient?.dietOrder?.portionsPermitted ?? ['small', 'regular', 'large'];
  if (!permitted.includes(prefs.preferredPortion)) {
    warnings.push(`The diet order does not permit a ${prefs.preferredPortion} portion. The nearest permitted portion will be offered instead.`);
  }
  if (patient) {
    for (const fav of prefs.favorites) {
      const ing = table[fav];
      const conflict = (ing.allergens ?? []).some((g) => patient.allergies.confirmed.includes(g)) || patient.allergies.ingredients.includes(fav) || patient.restrictions.medicalExclusions.includes(fav);
      if (conflict) warnings.push(`${ing.name} conflicts with a recorded allergy or restriction, so it will always be excluded even though it is a favourite.`);
    }
  }
  return prefs;
}

/**
 * Validate one section of a patient profile. Returns { value, errors, warnings, valid }.
 * `patient` is the current record (needed to check preferences against the diet order).
 */
export function normalizeSection(section, input = {}, patient = null, table = INGREDIENT_LOOKUP) {
  const errors = {};
  const warnings = [];
  let value;
  if (section === 'details') value = normalizeDetails(input, errors);
  else if (section === 'clinical') value = normalizeClinical(input, errors, warnings, patient, table);
  else if (section === 'preferences') value = { preferences: normalizePreferences(input, patient, errors, warnings, table) };
  else if (section === 'appetite') {
    const level = input.level ?? input.appetite?.level;
    if (!SETS.appetite.has(level)) errors.level = 'Choose the current appetite.';
    value = { appetite: { level } };
  } else throw new Error(`Unknown section ${section}`);
  return { value, errors, warnings, valid: Object.keys(errors).length === 0 };
}

/** Validate a complete new patient record (details + clinical + preferences). */
export function normalizeNewPatient(input = {}, table = INGREDIENT_LOOKUP) {
  const d = normalizeSection('details', input, null, table);
  const c = normalizeSection('clinical', input, null, table);
  const draft = { ...emptyPatient(), ...d.value, ...c.value };
  const p = normalizeSection('preferences', input.preferences ?? {}, draft, table);
  const errors = { ...d.errors, ...c.errors, ...p.errors };
  return { value: { ...draft, ...p.value, appetite: { level: SETS.appetite.has(input.appetite?.level) ? input.appetite.level : 'good' } }, errors, warnings: [...c.warnings, ...p.warnings], valid: !Object.keys(errors).length };
}

/** Patient-level situations that need the nutrition team or an admin. */
export function patientReviewReasons(patient) {
  const out = [];
  const o = patient.dietOrder;
  const cats = o.categories;
  if (patient.status === 'discharged') out.push({ code: 'discharged', severity: 'info', text: `Discharged${patient.dischargedOn ? ` on ${patient.dischargedOn}` : ''}. No meals are planned; past records are kept read-only.` });
  for (const r of patient.reportedAllergies ?? []) out.push({ code: 'reported-allergy', severity: 'review', text: `The patient reported a possible ${r.label ?? r.group} allergy${r.date ? ` on ${r.date}` : ''}. Meals containing it need admin review until the report is resolved.` });
  if (o.npo) out.push({ code: 'npo', severity: 'info', text: 'Nothing by mouth (NPO): no meals are offered or sent to the kitchen.' });
  if (patient.allergies.status === 'unknown') out.push({ code: 'allergy-unknown', severity: 'review', text: 'Food allergies have not been assessed. Every meal needs admin review.' });
  if (patient.allergies.uncoded.length) out.push({ code: 'uncoded-allergy', severity: 'review', text: `Allergy recorded as free text (${patient.allergies.uncoded.join(', ')}) cannot be screened automatically.` });
  if (patient.intolerances.uncoded.length) out.push({ code: 'uncoded-intolerance', severity: 'review', text: `Intolerance recorded as free text (${patient.intolerances.uncoded.join(', ')}) cannot be screened automatically.` });
  if (cats.includes('texture-modified')) out.push({ code: 'texture', severity: 'review', text: `Texture-modified diet (${TEXTURE_LEVELS.find((t) => t.id === o.textureLevel)?.label ?? 'level not set'}): menu items need admin review and kitchen preparation at this level.` });
  if (cats.includes('renal') && (o.potassiumMgPerDay == null || o.phosphorusMgPerDay == null)) out.push({ code: 'renal-params', severity: 'review', text: 'Renal diet without potassium and phosphorus limits.' });
  if (cats.includes('consistent-carb') && o.carbsGPerMeal == null) out.push({ code: 'carb-params', severity: 'review', text: 'Consistent-carbohydrate diet without a carbohydrate amount per meal.' });
  if (patient.restrictions.medicalNotes) out.push({ code: 'medical-notes', severity: 'info', text: 'Other medical restrictions are recorded as notes and are not screened automatically.' });
  // Consistency checks between recorded conditions and the diet order (prompts, not decisions).
  const sel = patient.conditions.selected;
  const check = (conds, diets, text) => { if (conds.some((c) => sel.includes(c)) && !diets.some((d) => cats.includes(d))) out.push({ code: 'consistency', severity: 'check', text }); };
  check(['t1d', 't2d'], ['consistent-carb'], 'Diabetes is recorded but the diet order has no consistent-carbohydrate category. Confirm this is intended.');
  check(['kidney'], ['renal'], 'Kidney disease is recorded but the diet order has no renal category. Confirm this is intended.');
  check(['hypertension'], ['low-sodium', 'heart-healthy', 'renal'], 'Hypertension is recorded but the diet order has no sodium restriction. Confirm this is intended.');
  check(['coeliac'], ['gluten-free'], 'Coeliac disease is recorded but the diet order is not gluten-free. Confirm this is intended.');
  check(['dysphagia'], ['texture-modified'], 'Swallowing difficulty is recorded but no texture-modified diet is ordered. Confirm this is intended.');
  return out;
}
