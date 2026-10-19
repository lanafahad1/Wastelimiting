// The connected scenarios CareBite must support, run against the shared
// service with an in-memory repository and the synthetic demonstration hospital.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createMemoryRepo } from '../domain/memory-repo.js';
import { createService } from '../domain/service.js';
import { seedCatalog, seedHospitalDemo, DEMO_ACCOUNTS } from '../domain/demo-data.js';
import { recommend } from '../domain/engine.js';
import { menuFor } from '../domain/menu.js';
import { addDays } from '../domain/dates.js';

let repo; let service; let ids; let today;
const actor = (role, name, extra = {}) => ({ id: `${role}-1`, role, name, status: 'active', ...extra });
const admin = actor('admin', 'Test Admin');
const staff = actor('staff', 'Test Staff');
const asPatient = (demoId) => actor('patient', demoId, { patientId: ids[demoId] });

beforeEach(() => {
  repo = createMemoryRepo();
  seedCatalog(repo, new Date().toISOString());
  service = createService({ repo });
  today = service.today();
  ids = seedHospitalDemo({ repo, service, today });
});

const tomorrow = () => addDays(today, 1);
const eligibleOn = (demoId, period, date) => recommend({ ...repo.getPatient(ids[demoId]), reportedAllergies: [] }, service.catalog(), { mealIds: menuFor(service.menu(), date)[period], period }).eligible.map((e) => e.mealId);
/** A fresh admitted patient with a regular diet, so menu screening has eligible meals. */
function freshPatient(demoId = 'CB-2001', over = {}) {
  const r = service.createPatient(admin, { demoId, preferredName: 'Test', ageRange: '30-44', ward: '3A', bed: '20', conditions: { selected: ['none'] }, dietOrder: { categories: ['regular'], portionsPermitted: ['small', 'regular', 'large'] }, allergies: { status: 'nka' }, preferences: {}, ...over });
  ids[demoId] = r.patient.id;
  return r.patient;
}

test('1. a patient updates preferences, chooses an offered meal and sees the nutrition team confirm it', () => {
  const p = freshPatient();
  const me = asPatient('CB-2001');
  service.updatePatientSection(me, p.id, 'preferences', { cuisines: ['Saudi'], favorites: ['chicken'], dislikes: ['eggplant'], preferredPortion: 'regular' });
  assert.deepEqual(repo.getPatient(p.id).preferences.dislikes, ['eggplant']);
  const date = tomorrow();
  const options = eligibleOn('CB-2001', 'lunch', date).slice(0, 3);
  service.offerOptions(staff, p.id, { date, period: 'lunch', items: options });
  let day = service.getMyMeals(me, p.id, { date });
  assert.equal(day.periods.find((x) => x.period === 'lunch').message, 'Choose your lunch.');
  const sel = service.selectMeal(me, p.id, { date, period: 'lunch', mealId: options[0] });
  assert.equal(sel.entry.status, 'selected');
  day = service.getMyMeals(me, p.id, { date });
  assert.equal(day.periods.find((x) => x.period === 'lunch').message, 'Your choice has been sent to the nutrition team.');
  const conf = service.confirmMeal(staff, p.id, { date, period: 'lunch' });
  assert.equal(conf.entry.status, 'confirmed');
  assert.equal(conf.entry.confirmMode, 'patient-choice');
  assert.equal(conf.entry.confirmedBy, 'Test Staff');
  day = service.getMyMeals(me, p.id, { date });
  assert.equal(day.periods.find((x) => x.period === 'lunch').message, 'Your meal is confirmed.');
});

test('staff can confirm directly, and who confirmed is recorded', () => {
  const p = freshPatient();
  const mealId = eligibleOn('CB-2001', 'dinner', tomorrow())[0];
  const r = service.confirmMeal(staff, p.id, { date: tomorrow(), period: 'dinner', mealId });
  assert.equal(r.entry.confirmMode, 'direct');
  assert.equal(r.entry.history.at(-1).by, 'Test Staff');
});

test('2. kitchen staff mark the meal prepared and delivered; delivered is not eaten', () => {
  const p = freshPatient();
  const mealId = eligibleOn('CB-2001', 'lunch', today)[0];
  const { entry } = service.confirmMeal(staff, p.id, { date: today, period: 'lunch', mealId });
  assert.throws(() => service.progressEntry(asPatient('CB-2001'), entry.id, { to: 'prepared' }), /Only staff/);
  assert.throws(() => service.progressEntry(staff, entry.id, { to: 'delivered' }), /prepared before/);
  assert.throws(() => service.recordIntake(staff, p.id, { date: today, period: 'lunch', accepted: true, amount: 'all' }), /delivered/);
  service.progressEntry(staff, entry.id, { to: 'prepared' });
  assert.equal(service.getMyMeals(asPatient('CB-2001'), p.id, {}).periods.find((x) => x.period === 'lunch').message, 'Your meal is being prepared.');
  service.progressEntry(staff, entry.id, { to: 'delivered' });
  const view = service.getMyMeals(asPatient('CB-2001'), p.id, {});
  assert.equal(view.periods.find((x) => x.period === 'lunch').message, 'Your meal has been delivered.');
  assert.ok(view.todo.some((t) => t.kind === 'feedback' && t.period === 'lunch'), 'patient is asked how it was');
  assert.equal(service.getPatient(staff, p.id).intake.length, 0, 'delivery records no intake');
  const k = service.getKitchenSummary(staff, { date: today, period: 'lunch' });
  assert.equal(k.trays.find((t) => t.entryId === entry.id).status, 'delivered');
});

test('3. a patient submits an alternative-meal request and sees the response; statuses match on both sides', () => {
  const me = asPatient('CB-1004');
  const r = service.createRequest(me, ids['CB-1004'], { type: 'alternative', date: today, period: 'dinner', message: 'Something without olives please.' });
  assert.equal(r.request.statusLabel, 'Pending');
  assert.ok(service.listRequests(staff).requests.some((x) => x.id === r.request.id && x.statusLabel === 'Pending'));
  service.resolveRequest(staff, r.request.id, { status: 'resolved', response: 'We have offered two new options.' });
  const mine = service.listPatientRequests(me, ids['CB-1004']).requests.find((x) => x.id === r.request.id);
  assert.equal(mine.statusLabel, 'Resolved');
  assert.equal(mine.response, 'We have offered two new options.');
  assert.equal(service.listRequests(staff, { status: 'all' }).requests.find((x) => x.id === r.request.id).status, 'resolved');
});

test('4. a reported allergy change reaches the nutrition team and affected meals are rechecked', () => {
  const p = freshPatient();
  // The first day in the planning window whose snack menu has a sesame meal (hummus with tahini).
  const date = [1, 2, 3, 4, 5, 6].map((n) => addDays(today, n)).find((d) => menuFor(service.menu(), d).snack.includes('hummus-veggie-sticks'));
  const sesameMeal = 'hummus-veggie-sticks';
  assert.ok(date, 'hummus is on the snack menu within the week');
  service.confirmMeal(staff, p.id, { date, period: 'snack', mealId: sesameMeal });
  const me = asPatient('CB-2001');
  assert.throws(() => service.updatePatientSection(me, p.id, 'clinical', { ...repo.getPatient(p.id) }), /reviewed by your nutrition team/);
  const rep = service.createRequest(me, p.id, { type: 'clinical-change', reportKind: 'new-allergy', allergen: 'sesame', message: 'I was told to avoid sesame.' });
  assert.equal(rep.request.clinical, true);
  assert.ok(rep.recheck.some((x) => x.hold), 'the confirmed sesame meal is put on hold as a precaution');
  assert.equal(repo.getPatient(p.id).allergies.confirmed.length, 0, 'the report does not change the record');
  const flags = service.listPatients(staff).patients.find((x) => x.id === p.id).flags.map((f) => f.code);
  assert.ok(flags.includes('hold') && flags.includes('requests'));
  const k = service.getKitchenSummary(staff, { date });
  assert.ok(k.alerts.some((a) => a.outcome === 'hold'), 'kitchen alerted');
  assert.throws(() => service.resolveRequest(staff, rep.request.id, { response: 'ok' }), /admin/);
  // The admin confirms the allergy on the record: the meal is now excluded and stays held until replaced.
  const cur = repo.getPatient(p.id);
  const upd = service.updatePatientSection(admin, p.id, 'clinical', { ...cur, allergies: { ...cur.allergies, status: 'recorded', confirmed: ['sesame'] } });
  assert.ok(upd.changes.includes('Allergy added: sesame'));
  service.resolveRequest(admin, rep.request.id, { status: 'resolved', response: 'Sesame allergy added after review.' });
  const entry = repo.getEntry(p.id, date, 'snack');
  assert.equal(entry.status, 'on-hold');
  assert.throws(() => service.resolveEntry(admin, p.id, { date, period: 'snack', action: 'keep', note: 'x' }), /conflicts/);
  const replacement = eligibleOn('CB-2001', 'snack', date).find((m) => m !== sesameMeal);
  const conf = service.confirmMeal(staff, p.id, { date, period: 'snack', mealId: replacement });
  assert.equal(conf.entry.status, 'confirmed');
  assert.equal(conf.entry.replaces.mealId, sesameMeal);
  assert.ok(repo.getEntry(p.id, date, 'snack').changes.every((c) => c.reviewed), 'changes recorded as reviewed');
});

test('a held meal cannot be confirmed, prepared or delivered until reviewed', () => {
  const p = freshPatient();
  const mealId = eligibleOn('CB-2001', 'lunch', today)[0];
  const { entry } = service.confirmMeal(staff, p.id, { date: today, period: 'lunch', mealId });
  service.setAvailability(staff, mealId, { available: false, reason: 'Out of stock today' });
  assert.equal(repo.getEntryById(entry.id).status, 'on-hold');
  assert.throws(() => service.progressEntry(staff, entry.id, { to: 'prepared' }), /on hold/);
  assert.throws(() => service.selectMeal(asPatient('CB-2001'), p.id, { date: today, period: 'lunch', mealId }), /on hold/);
});

test('5. a meal becomes unavailable after selection and the team arranges a replacement; the kitchen never gets both', () => {
  const p = freshPatient();
  const [first, second] = eligibleOn('CB-2001', 'lunch', today);
  const { entry } = service.confirmMeal(staff, p.id, { date: today, period: 'lunch', mealId: first });
  service.progressEntry(staff, entry.id, { to: 'prepared' });
  const r = service.setAvailability(staff, first, { available: false, reason: 'Ran out' });
  assert.ok(r.recheck.some((x) => x.hold));
  let k = service.getKitchenSummary(staff, { date: today });
  assert.ok(k.held.some((h) => h.entryId === entry.id), 'listed as do-not-prepare');
  assert.ok(!k.trays.some((t) => t.entryId === entry.id), 'not on the tray list');
  assert.ok(k.alerts.some((a) => a.entryId === entry.id && /STOP/.test(a.instruction)));
  service.confirmMeal(staff, p.id, { date: today, period: 'lunch', mealId: second });
  k = service.getKitchenSummary(staff, { date: today });
  const trays = k.trays.filter((t) => t.entryId === entry.id);
  assert.equal(trays.length, 1, 'one active order only');
  assert.equal(trays[0].mealId, second);
  assert.equal(trays[0].replaces.status, 'prepared');
  const alert = k.alerts.find((a) => a.entryId === entry.id);
  assert.match(alert.instruction, /do not deliver/);
  service.ackChange(staff, entry.id, alert.changeId);
  assert.ok(!service.getKitchenSummary(staff, { date: today }).alerts.some((a) => a.changeId === alert.changeId));
  assert.ok(repo.getEntryById(entry.id).history.some((h) => h.action === 'held') && repo.getEntryById(entry.id).history.some((h) => h.action === 'prepared'), 'history kept');
});

test('6. a discharged patient leaves future kitchen lists while historical records remain', () => {
  const pid = ids['CB-1003'];
  const before = service.getPatient(staff, pid);
  assert.ok(service.getKitchenSummary(staff, { date: today }).trays.some((t) => t.demoId === 'CB-1003'));
  const r = service.dischargePatient(staff, pid, { note: 'Discharged home' });
  assert.ok(r.cancelled.length > 0);
  assert.ok(!service.getKitchenSummary(staff, { date: today }).trays.some((t) => t.demoId === 'CB-1003'));
  assert.ok(!service.getSchedule(staff, { date: today }).rows.some((x) => x.demoId === 'CB-1003'));
  assert.ok(!service.listPatients(staff).patients.some((x) => x.id === pid));
  assert.ok(service.listPatients(staff, { include: 'discharged' }).patients.some((x) => x.id === pid));
  const after = service.getPatient(staff, pid);
  assert.equal(after.intake.length, before.intake.length, 'intake history kept');
  assert.ok(repo.listEntries({ patientId: pid }).some((e) => e.status === 'delivered'), 'delivered meals kept');
  assert.throws(() => service.offerOptions(staff, pid, { date: today, period: 'dinner', items: ['red-lentil-soup'] }), /discharged/);
  assert.ok(repo.getPatient(pid), 'discharge is not deletion');
  service.readmitPatient(staff, pid, { ward: '5C', bed: '07' });
  assert.equal(repo.getPatient(pid).status, 'admitted');
});

test('7. patient and staff feedback for the same meal do not inflate dashboard counts', () => {
  const p = freshPatient();
  const mealId = eligibleOn('CB-2001', 'lunch', today)[0];
  const { entry } = service.confirmMeal(staff, p.id, { date: today, period: 'lunch', mealId });
  service.progressEntry(staff, entry.id, { to: 'prepared' });
  service.progressEntry(staff, entry.id, { to: 'delivered' });
  const before = service.getDashboard(staff).week;
  service.recordIntake(asPatient('CB-2001'), p.id, { date: today, period: 'lunch', accepted: true, amount: 'all', satisfaction: 4 });
  const mid = service.getDashboard(staff).week;
  service.recordIntake(staff, p.id, { date: today, period: 'lunch', accepted: true, amount: 'most', measuredWasteG: 60 });
  const after = service.getDashboard(staff).week;
  assert.equal(mid.recorded, before.recorded + 1);
  assert.equal(after.recorded, mid.recorded, 'the staff record of the same meal is not a second meal');
  assert.equal(after.records, mid.records + 1, 'both records are kept');
  const o = service.getPatient(staff, p.id).intake[0];
  assert.equal(o.amount, 'most');
  assert.equal(o.satisfaction, 4);
  assert.equal(o.measuredWasteG, 60);
  assert.throws(() => service.recordIntake(asPatient('CB-2001'), p.id, { date: today, period: 'lunch', accepted: true, amount: 'all', measuredWasteG: 10 }), /attention/);
});

test('8. each role reaches only its own information and actions', () => {
  const noura = asPatient('CB-1001');
  assert.throws(() => service.getPatient(noura, ids['CB-1004']), /only see your own/);
  assert.throws(() => service.getKitchenSummary(noura), /permission/);
  assert.throws(() => service.listPatients(noura), /permission/);
  // Staff run meal service but cannot change clinical information, approve review items, verify the menu or manage access.
  assert.ok(service.listPatients(staff).patients.length > 0);
  assert.ok(service.getKitchenSummary(staff, { date: today }));
  assert.throws(() => service.updatePatientSection(staff, ids['CB-1001'], 'clinical', repo.getPatient(ids['CB-1001'])), /Only an admin/);
  assert.throws(() => service.verifyMeal(staff, 'jareesh', { note: 'x' }), /Only an admin/);
  assert.throws(() => service.listStaff(staff), /Only an admin/);
  assert.throws(() => service.deletePatient(staff, ids['CB-1001'], { confirmDemoId: 'CB-1001' }), /Only an admin/);
  // The admin controls everything: patients, clinical edits, menu verification and staff access.
  assert.ok(service.listPatients(admin).patients.length > 0);
  assert.ok(service.listStaff(admin));
  assert.throws(() => service.verifyMeal(admin, 'jareesh', { note: 'Checked' }), /already verified/, 'admins reach menu verification');
  const pending = actor(null, 'Applicant', { status: 'pending' });
  assert.throws(() => service.getSchedule(pending), /not active/);
  const own = service.getPatient(noura, ids['CB-1001']);
  assert.equal(own.audit.length, 0);
  assert.equal(own.patient.dietOrder.notes, '');
});

test('staff access is approved by an administrator; demo accounts cannot be changed', () => {
  const u = repo.createUser({ username: 'new.staff', email: 'n@x.test', name: 'New Staff', role: null, status: 'pending', requestedRole: 'admin', passwordHash: 'x' });
  assert.equal(service.listStaff(admin).pending.length >= 1, true);
  const r = service.decideStaff(admin, u.id, { decision: 'approve', role: 'staff' });
  assert.equal(r.user.role, 'staff', 'the admin decides the role, not the request');
  assert.throws(() => service.decideStaff(admin, u.id, { decision: 'role', role: 'dietitian' }), /Choose the role/);
  assert.equal(r.user.status, 'active');
  const demo = repo.listUsers().find((x) => x.isDemo);
  if (demo) assert.throws(() => service.decideStaff(admin, demo.id, { decision: 'deactivate' }), /demonstration/);
  assert.ok(DEMO_ACCOUNTS.some((a) => a.role === 'admin'));
});

test('menu changes by the kitchen need admin verification and re-screen upcoming orders', () => {
  const p = freshPatient();
  const date = tomorrow();
  const mealId = eligibleOn('CB-2001', 'lunch', date).find((m) => service.catalog().byId[m].type === 'single');
  service.confirmMeal(staff, p.id, { date, period: 'lunch', mealId });
  const dish = repo.getCatalogData().dishes.find((d) => d.id === service.catalog().byId[mealId].components[0].dishId);
  const r = service.saveDish(staff, { ...dish, nutritionSource: dish.nutrition.source, sfctId: dish.nutrition.sfctId, ingredients: [...dish.ingredients, { ing: 'sesame-seeds', g: 2 }] });
  assert.ok(r.affectedMeals >= 1);
  assert.equal(service.catalog().byId[mealId].infoReview.status, 'pending');
  assert.equal(repo.getEntry(p.id, date, 'lunch').status, 'on-hold', 'the confirmed order now needs review');
  service.verifyMeal(admin, mealId, { note: 'Checked: sesame garnish added.' });
  assert.equal(service.catalog().byId[mealId].infoReview.status, 'verified');
  const kept = service.resolveEntry(staff, p.id, { date, period: 'lunch', action: 'keep' });
  assert.equal(kept.entry.status, 'confirmed');
});

test('no suitable options: requirements are never relaxed', () => {
  const p = freshPatient('CB-2002', { allergies: { status: 'recorded', confirmed: ['gluten', 'milk', 'egg', 'fish', 'sesame', 'soy', 'tree_nut', 'peanut', 'mustard', 'celery'] } });
  const plan = service.getDayPlan(staff, p.id, { date: today });
  for (const per of plan.periods) for (const m of per.screening.eligible) assert.ok(!m.allergens.contains.some((a) => ['gluten', 'milk', 'egg'].includes(a)));
  const auto = service.autoSchedule(staff, p.id, { from: today, days: 1 });
  for (const f of auto.flagged) assert.match(f.reason, /review|not relaxed/);
});

test('the demonstration hospital seeds every workflow state', () => {
  const statuses = new Set(repo.listEntries({}).map((e) => e.status));
  for (const s of ['offered', 'selected', 'confirmed', 'prepared', 'delivered', 'on-hold', 'cancelled']) assert.ok(statuses.has(s), s);
  assert.equal(repo.getPatient(ids['CB-1010']).status, 'discharged');
  const both = service.getDashboard(staff).week.both;
  assert.ok(both > 0, 'some meals have both a patient and a staff record');
});
