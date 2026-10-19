import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DISHES } from '../data/dishes.js';
import { MEALS } from '../data/meals.js';
import { INGREDIENT_LOOKUP } from '../data/ingredients.js';
import { SFCT_LIBRARY } from '../data/sfct-dishes.js';
import { buildCatalog } from '../domain/catalog.js';
import { sfctConsistencyIssue } from '../domain/nutrition.js';
import { evaluateMeal, recommend, dietCompatibility } from '../domain/engine.js';
import { normalizeNewPatient, normalizeSection } from '../domain/patient.js';
import { mealOutcomes } from '../domain/indicators.js';

const catalog = buildCatalog({ dishes: DISHES, meals: MEALS, ingredients: INGREDIENT_LOOKUP, sfct: SFCT_LIBRARY });

function patient(over = {}) {
  const base = {
    demoId: 'CB-0001', ageRange: '45-59', ward: '3A', bed: '1',
    conditions: { selected: ['none'] },
    dietOrder: { categories: ['regular'], portionsPermitted: ['small', 'regular', 'large'] },
    allergies: { status: 'nka' },
    preferences: {},
  };
  const merged = { ...base };
  for (const [k, v] of Object.entries(over)) merged[k] = v && typeof v === 'object' && !Array.isArray(v) ? { ...(base[k] ?? {}), ...v } : v;
  const { value, errors } = normalizeNewPatient(merged);
  assert.deepEqual(errors, {}, 'test patient should be valid');
  return value;
}
const ev = (mealId, p, period = 'lunch', extra = {}) => evaluateMeal({ ...catalog.byId[mealId], ...extra }, p, { catalog, period });

test('the SFCT library holds the transcribed SFDA dish tables', () => {
  assert.equal(Object.keys(SFCT_LIBRARY).length, 130);
  const k = SFCT_LIBRARY['chicken-kabsa'];
  assert.equal(k.name, 'Chicken Kabsa');
  assert.equal(k.region, 'Al-Baha');
  assert.equal(k.per100g.kcal, 187);
  assert.equal(k.per100g.sodium, 666);
  assert.equal(k.per100g.totalCarbs, 26);
  assert.ok(k.nameAr.includes('كبسة'));
});

test('dish nutrition = SFCT per 100 g × portion weight; nothing estimated for dishes without an SFCT link', () => {
  const kabsa = catalog.byId['chicken-kabsa'];
  assert.equal(kabsa.type, 'single');
  assert.equal(kabsa.nutrition.perServing.kcal, Math.round(187 * 3.5));
  assert.equal(kabsa.nutrition.perServing.sodium, Math.round(666 * 3.5));
  assert.equal(kabsa.nutrition.source, 'SFDA-SFCT');
  const soup = catalog.byId['red-lentil-soup'];
  assert.equal(soup.nutrition.available, false);
  assert.equal(soup.nutrition.perServing.kcal, null);
});

test('a complete meal sums its components; a component without SFCT values makes totals partial, never estimated', () => {
  const tray = catalog.byId['kabsa-lunch-tray'];
  assert.equal(tray.type, 'complete');
  assert.deepEqual(tray.components.map((c) => c.dishId), ['chicken-kabsa', 'purslane-stew']);
  const expected = catalog.dishes['chicken-kabsa'].nutrition.perPortion.kcal + catalog.dishes['purslane-stew'].nutrition.perPortion.kcal;
  assert.equal(tray.nutrition.perServing.kcal, expected);
  assert.equal(tray.nutrition.allAvailable, true);
  const partial = catalog.byId['bukhari-lunch-tray'];
  assert.equal(partial.nutrition.perServing.kcal, null, 'no complete total');
  assert.equal(partial.nutrition.partial.kcal, catalog.dishes['bukhari-chicken'].nutrition.perPortion.kcal);
  assert.ok(partial.nutrition.missing.sodium.some((m) => m.startsWith('Fresh Garden Salad')));
});

test('real SFCT sodium excludes kabsa for a sodium-restricted diet; partial totals send meals to review', () => {
  const p = patient({ dietOrder: { categories: ['low-sodium'], portionsPermitted: ['small', 'regular'] } });
  const kabsa = ev('chicken-kabsa', p);
  assert.equal(kabsa.status, 'excluded');
  assert.ok(kabsa.exclusions.some((x) => x.ruleId === 'DIET-NA'));
  const bukhari = ev('bukhari-lunch-tray', p);
  assert.equal(bukhari.status, 'review');
  assert.ok(bukhari.reviewReasons.some((r) => r.ruleId === 'DATA-REQUIRED' && /Fresh Garden Salad/.test(r.message)));
});

test('allergies are screened across every component and name the dish', () => {
  const p = patient({ allergies: { status: 'recorded', confirmed: ['milk'] } });
  const tray = ev('kabsa-lunch-tray', p);
  assert.equal(tray.status, 'excluded');
  assert.ok(tray.exclusions.some((x) => /Purslane Stew/.test(x.message)), 'mentions the component with ghee');
  assert.equal(ev('jareesh', p).status, 'excluded');
});

test('preferences never bring back an excluded meal', () => {
  const p = patient({ allergies: { status: 'recorded', confirmed: ['sesame'] }, preferences: { favorites: ['tahini', 'chickpeas'], cuisines: ['Middle Eastern'] } });
  const r = ev('hummus-veggie-sticks', p, 'snack');
  assert.equal(r.status, 'excluded');
  assert.equal(r.score, null);
});

test('a patient-reported allergy awaiting review sends matching meals to review, not exclusion', () => {
  const p = { ...patient(), reportedAllergies: [{ group: 'sesame', date: '2026-10-19' }] };
  const r = ev('hummus-veggie-sticks', p, 'snack');
  assert.equal(r.status, 'review');
  assert.ok(r.reviewReasons.some((x) => x.ruleId === 'ALG-REPORTED'));
  assert.equal(ev('red-lentil-soup', p).status, 'eligible');
});

test('unverified menu information needs admin review; unavailable meals are not screened', () => {
  const r = ev('red-lentil-soup', patient(), 'lunch', { infoReview: { status: 'pending', changedBy: 'Kitchen' } });
  assert.equal(r.status, 'review');
  assert.ok(r.reviewReasons.some((x) => x.ruleId === 'MENU-INFO-REVIEW'));
  const cat2 = { ...catalog, byId: { ...catalog.byId, 'red-lentil-soup': { ...catalog.byId['red-lentil-soup'], available: false } } };
  const res = recommend(patient(), cat2, { mealIds: ['red-lentil-soup', 'jareesh'], period: 'lunch' });
  assert.deepEqual(res.unavailable, ['red-lentil-soup']);
  assert.equal(res.counts.total, 1);
});

test('diabetes diet: no added sugar (MOH) and carbohydrate per meal from the admin', () => {
  const p = patient({ conditions: { selected: ['t2d'] }, dietOrder: { categories: ['consistent-carb'], carbsGPerMeal: 60, portionsPermitted: ['small', 'regular'] } });
  const balaleet = ev('balaleet', p, 'breakfast');
  assert.equal(balaleet.status, 'excluded');
  assert.ok(balaleet.exclusions.some((x) => x.ruleId === 'DIET-NOSUGAR'));
  const noCarbs = patient({ dietOrder: { categories: ['consistent-carb'], portionsPermitted: ['regular'] } });
  assert.ok(ev('chicken-kabsa', noCarbs).reviewReasons.some((r) => r.ruleId === 'DIET-CHO-PARAMS'));
});

test('retired diet categories cannot be added to a new diet order', () => {
  const { errors } = normalizeSection('clinical', { conditions: { selected: ['none'] }, dietOrder: { categories: ['lactose-free'], portionsPermitted: ['regular'] }, allergies: { status: 'nka' } }, patient());
  assert.match(errors['dietOrder.categories'], /no longer offered/);
  const compat = dietCompatibility(catalog.byId['red-lentil-soup'], catalog);
  assert.ok(!compat.some((c) => c.id === 'vegan' || c.id === 'lactose-free'));
});

test('patient and staff records of one meal combine into a single outcome', () => {
  const base = { patientId: '1', date: '2026-10-18', period: 'lunch', mealId: 'jareesh', portion: 'regular', reasons: [] };
  const out = mealOutcomes([
    { ...base, source: 'patient', accepted: true, amount: 'all', satisfaction: 5, measuredWasteG: null },
    { ...base, source: 'staff', accepted: true, amount: 'most', satisfaction: null, measuredWasteG: 80 },
  ]);
  assert.equal(out.length, 1);
  assert.equal(out[0].amount, 'most', 'staff observation used for amount eaten');
  assert.equal(out[0].satisfaction, 5, 'patient’s own rating used for satisfaction');
  assert.equal(out[0].measuredWasteG, 80);
  assert.deepEqual(out[0].sources, ['patient', 'staff']);
});

test('SFCT tables that are internally inconsistent are flagged, kept as published and cannot be linked', () => {
  const flagged = Object.entries(SFCT_LIBRARY).filter(([, e]) => sfctConsistencyIssue(e)).map(([id]) => id);
  assert.ok(flagged.includes('ruwakah'), 'Ruwakah lists 16 kJ and 477 kcal per 100 g');
  assert.equal(SFCT_LIBRARY.ruwakah.per100g.kcal, 477, 'value kept as published');
  for (const d of DISHES.filter((x) => x.nutrition?.sfctId)) assert.ok(!flagged.includes(d.nutrition.sfctId), `${d.id} uses a consistent table`);
});
