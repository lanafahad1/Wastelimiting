// Synthetic demonstration data for the fictional CareBite hospital. Every
// patient, staff member and record here is invented. Identifiers use the
// CB-#### demonstration format and are not medical record numbers.

import { normalizeNewPatient } from './patient.js';
import { recommend } from './engine.js';
import { menuFor } from './menu.js';
import { addDays } from './dates.js';
import { PERIOD_IDS, portionFactor, label, PERIODS } from './constants.js';
import { INGREDIENTS } from '../data/ingredients.js';
import { DISHES } from '../data/dishes.js';
import { MEALS } from '../data/meals.js';
import { MENU_CYCLE } from '../data/menu.js';

export const DEMO_PASSWORD = 'CareBite#2026';
const DEFAULT_REVIEW_NOTE = 'Reviewed by the admin against the diet order: no added salt, portion as suggested.';

// Demonstration access only. These shared accounts let reviewers see each role.
// Real hospital staff would be issued accounts through the hospital's identity
// system after identity checks; CareBite does not verify anyone's identity.
export const DEMO_ACCOUNTS = [
  { username: 'admin.demo', email: 'admin@carebite.test', name: 'Demo Admin', role: 'admin', summary: 'Controls everything: staff access, diet orders and allergies, meals that need review, menu verification, plus every staff task.' },
  { username: 'staff.demo', email: 'staff@carebite.test', name: 'Demo Staff Member', role: 'staff', summary: 'Runs meal service: offers and confirms eligible meals, prepares and delivers trays, records intake, maintains the menu, answers requests.' },
  { username: 'noura.1001', email: 'noura@carebite.test', name: 'Noura', role: 'patient', patientDemoId: 'CB-1001', summary: 'Patient account linked to CB-1001: choose meals, give feedback, ask for help.' },
  { username: 'khalid.1004', email: 'khalid@carebite.test', name: 'Khalid', role: 'patient', patientDemoId: 'CB-1004', summary: 'Patient account linked to CB-1004 (peanut and tree nut allergies).' },
];

const ALL = ['small', 'regular', 'large'];
const SR = ['small', 'regular'];

// [profile input, behaviour used to generate the synthetic intake history]
const PATIENTS = [
  [{ demoId: 'CB-1001', preferredName: 'Noura', ageRange: '45-59', ward: '3C', bed: '12', admittedDaysAgo: 6,
    conditions: { selected: ['t2d', 'hypertension'] },
    dietOrder: { categories: ['consistent-carb', 'low-sodium'], carbsGPerMeal: 60, portionsPermitted: SR, notes: '' },
    allergies: { status: 'nka' },
    preferences: { cuisines: ['Saudi', 'Middle Eastern'], favorites: ['chicken-breast', 'dates'], dislikes: ['eggplant'], preferredPortion: 'regular' },
    appetite: { level: 'good' } },
  { eat: ['all', 'most', 'all', 'most'], refuse: 0, sat: [4, 5] }],

  [{ demoId: 'CB-1002', preferredName: 'Fahad', ageRange: '60-74', ward: '4B', bed: '03', admittedDaysAgo: 6,
    conditions: { selected: ['hypertension', 'cholesterol'] },
    dietOrder: { categories: ['heart-healthy'], portionsPermitted: ALL, notes: 'Prefers meals served hot.' },
    allergies: { status: 'recorded', confirmed: ['shellfish'] },
    preferences: { cuisines: ['Saudi'], favorites: ['white-rice', 'chicken-breast'], dislikes: ['tofu'], preferredPortion: 'regular' },
    appetite: { level: 'fair' } },
  { eat: ['most', 'some', 'most', 'all'], refuse: 0.15, recentRefusals: 2, reasons: ['taste', 'not-preferred'], sat: [2, 4] }],

  [{ demoId: 'CB-1003', preferredName: 'Mona', ageRange: '60-74', ward: '5C', bed: '07', admittedDaysAgo: 6,
    conditions: { selected: ['kidney', 'hypertension'] },
    dietOrder: { categories: ['renal'], potassiumMgPerDay: 2400, phosphorusMgPerDay: 800, portionsPermitted: SR, notes: 'Fluid restriction managed by the ward.' },
    allergies: { status: 'nka' },
    preferences: { cuisines: ['Saudi', 'Mediterranean'], favorites: ['white-rice'], dislikes: ['mushrooms'], preferredPortion: 'regular' },
    appetite: { level: 'poor' } },
  { eat: ['some', 'none', 'some', 'most'], refuse: 0.1, reasons: ['low-appetite', 'nausea'], sat: [3, 4] }],

  [{ demoId: 'CB-1004', preferredName: 'Khalid', ageRange: '30-44', ward: '2A', bed: '15', admittedDaysAgo: 4,
    conditions: { selected: ['surgery'] },
    dietOrder: { categories: ['high-protein'], portionsPermitted: ALL, notes: '' },
    allergies: { status: 'recorded', confirmed: ['peanut', 'tree_nut'] },
    preferences: { cuisines: ['Saudi', 'American'], favorites: ['chicken-breast', 'egg'], dislikes: ['olives'], preferredPortion: 'large' },
    appetite: { level: 'good' } },
  { eat: ['all', 'all', 'most', 'all'], refuse: 0, reasons: ['portion-too-small'], sat: [4, 5] }],

  [{ demoId: 'CB-1005', preferredName: 'Sara', ageRange: '18-29', ward: '3A', bed: '04', admittedDaysAgo: 5,
    conditions: { selected: ['coeliac'] },
    dietOrder: { categories: ['gluten-free'], portionsPermitted: ALL, notes: '' },
    allergies: { status: 'recorded', confirmed: ['egg'] },
    intolerances: { selected: ['lactose'] },
    preferences: { cuisines: ['Mediterranean', 'Saudi'], favorites: ['salmon', 'avocado'], dislikes: ['kidney-beans'], preferredPortion: 'regular' },
    appetite: { level: 'good' } },
  { eat: ['most', 'all', 'most', 'some'], refuse: 0.05, reasons: ['temperature'], sat: [3, 5] }],

  [{ demoId: 'CB-1006', preferredName: 'Abdullah', ageRange: '75+', ward: '6A', bed: '02', admittedDaysAgo: 6,
    conditions: { selected: ['dysphagia'] },
    dietOrder: { categories: ['texture-modified', 'high-protein'], textureLevel: '5', portionsPermitted: SR, notes: 'Upright for meals; supervised feeding.' },
    allergies: { status: 'nka' },
    preferences: { cuisines: ['Saudi'], favorites: ['dates'], dislikes: [], preferredPortion: 'regular' },
    appetite: { level: 'poor' } },
  { eat: ['some', 'most', 'some', 'some'], refuse: 0.1, reasons: ['low-appetite'], sat: [3, 4], reviewNote: 'Prepared minced and moist (IDDSI Level 5); sauces served separately.' }],

  [{ demoId: 'CB-1007', preferredName: 'Huda', ageRange: '30-44', ward: '3A', bed: '09', admittedDaysAgo: 0,
    conditions: { selected: ['none'] },
    dietOrder: { categories: ['regular'], portionsPermitted: ALL, notes: '' },
    allergies: { status: 'unknown' },
    preferences: { cuisines: ['Saudi', 'Italian'], favorites: [], dislikes: [], preferredPortion: 'regular' },
    appetite: { level: 'good' } },
  null],

  [{ demoId: 'CB-1008', preferredName: 'Faisal', ageRange: '45-59', ward: '2A', bed: '11', admittedDaysAgo: 1,
    conditions: { selected: ['surgery'] },
    dietOrder: { categories: ['regular'], npo: true, portionsPermitted: ALL, notes: 'Nothing by mouth from midnight before surgery.' },
    allergies: { status: 'nka' },
    preferences: { cuisines: ['Saudi'], favorites: [], dislikes: [], preferredPortion: 'regular' },
    appetite: { level: 'fair' } },
  null],

  [{ demoId: 'CB-1009', preferredName: 'Reem', ageRange: '30-44', ward: '3C', bed: '05', admittedDaysAgo: 3,
    conditions: { selected: ['t1d'] },
    dietOrder: { categories: ['consistent-carb', 'vegetarian'], carbsGPerMeal: 45, portionsPermitted: SR, notes: '' },
    allergies: { status: 'recorded', confirmed: ['milk'] },
    preferences: { cuisines: ['Middle Eastern', 'Asian'], favorites: ['chickpeas'], dislikes: [], preferredPortion: 'regular' },
    appetite: { level: 'good' } },
  { eat: ['all', 'most', 'all', 'most'], refuse: 0, sat: [4, 5], addAllergyToday: 'sesame' }],

  [{ demoId: 'CB-1010', preferredName: 'Majed', ageRange: '45-59', ward: '4B', bed: '08', admittedDaysAgo: 5,
    conditions: { selected: ['hypertension'] },
    dietOrder: { categories: ['low-sodium'], portionsPermitted: ALL, notes: '' },
    allergies: { status: 'nka' },
    preferences: { cuisines: ['Saudi'], favorites: ['chicken'], dislikes: [], preferredPortion: 'regular' },
    appetite: { level: 'good' } },
  { eat: ['all', 'most', 'all'], refuse: 0, sat: [4, 5], dischargedDaysAgo: 1 }],
];

/** A staff access request waiting for the admin (not a shared demo account, so it can be approved). */
export const DEMO_PENDING_STAFF = { username: 'layla.applicant', email: 'layla.applicant@carebite.test', name: 'Layla (applicant)', requestedRole: 'staff', requestNote: 'Clinical nutrition technician, Ward 3A. Starting next week.' };

/** Replace the editable menu catalogue with the starting catalogue (verified by the demo admin). */
export function seedCatalog(repo, at) {
  const verified = { status: 'verified', by: 'Demo Admin', at, note: 'Starting menu checked for the demonstration: ingredients, SFDA allergens and SFCT links.' };
  repo.replaceCatalog({
    ingredients: INGREDIENTS.map((i) => ({ ...i })),
    dishes: DISHES.map((d) => ({ ...d, version: 1, updatedAt: at, updatedBy: 'CareBite seed' })),
    meals: MEALS.map((m) => ({ ...m, available: true, active: true, infoReview: verified, version: 1, updatedAt: at, updatedBy: 'CareBite seed' })),
    menu: { cycle: MENU_CYCLE.map((d) => ({ ...d })), dates: {} },
  });
}

/** Small deterministic pseudo-random generator, so the demo looks the same every time. */
function rng(seed) {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Create the demonstration hospital: patients, up to 6 days of delivered meals
 * with intake and feedback (some recorded by the patient, some by staff, some
 * by both), today's meals at every workflow stage, a discharged patient,
 * change alerts and pending requests. `service` must be a service instance on
 * the same repo (used for today's actions, so every rule applies).
 */
export function seedHospitalDemo({ repo, service, today }) {
  const catalog = service.catalog();
  const menu = service.menu();
  const staff = { id: null, role: 'staff', name: 'Demo Staff Member', status: 'active' };
  const admin = { id: null, role: 'admin', name: 'Demo Admin', status: 'active' };
  const at = (date, h, m = 0) => `${date}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00.000Z`;
  const ids = {};
  const ev = (when, by, role, action, status, pick, portion, note = null) => ({ at: when, by, role, action, status, mealId: pick.mealId, mealName: catalog.byId[pick.mealId].name, portion, note });

  for (const [input, behaviour] of PATIENTS) {
    const { admittedDaysAgo, ...rest } = input;
    const { value, valid, errors } = normalizeNewPatient(rest, catalog.ingredients);
    if (!valid) throw new Error(`Invalid demo patient ${input.demoId}: ${JSON.stringify(errors)}`);
    const admittedOn = addDays(today, -admittedDaysAgo);
    const p = repo.createPatient({ ...value, status: 'admitted', admittedOn, createdAt: at(admittedOn, 7), updatedAt: at(admittedOn, 7), updatedBy: 'Demo Admin' });
    ids[p.demoId] = p.id;
    repo.addAudit({ at: at(admittedOn, 7), actorId: null, actorRole: 'admin', actorName: 'Demo Admin', patientId: p.id, action: 'patient.create', detail: `Created the nutrition profile for ${p.demoId} and admitted the patient.` });
    if (!behaviour) continue;

    // ---- past days: delivered meals with intake records
    const lastDay = behaviour.dischargedDaysAgo ?? 1;
    for (let d = Math.min(admittedDaysAgo, 6); d >= lastDay; d--) {
      const date = addDays(today, -d);
      for (const period of PERIOD_IDS) {
        const rand = rng(`${p.demoId}|${d}|${period}`);
        if (period === 'snack' && rand() < 0.4) continue;
        const outcomes = repo.listIntake({ patientId: p.id }).map((r) => ({ ...r }));
        const result = recommend({ ...p, reportedAllergies: [] }, catalog, { mealIds: menuFor(menu, date)[period], period, intake: outcomes });
        const pool = result.eligible.length ? result.eligible : result.review;
        if (!pool.length) continue;
        const reviewed = !result.eligible.length;
        const offered = pool.slice(0, 3);
        const pick = offered[Math.floor(rand() * offered.length)];
        const portion = pick.portion.suggested;
        const byPatient = rand() < 0.55;
        const prev = addDays(date, -1);
        const serveH = { breakfast: 7, lunch: 12, dinner: 18, snack: 20 }[period];
        const chooser = byPatient ? { by: p.preferredName, role: 'patient' } : { by: staff.name, role: 'staff' };
        const confirmer = reviewed ? admin : staff;
        repo.saveEntry({
          patientId: p.id, date, period, status: 'delivered', holdFrom: null,
          offers: offered.map((e) => ({ mealId: e.mealId, mealName: catalog.byId[e.mealId].name, screenedAs: reviewed ? 'review' : 'eligible', approvedBy: null, approvedByName: confirmer.name, reviewNote: reviewed ? behaviour.reviewNote ?? DEFAULT_REVIEW_NOTE : null, reviewReasons: reviewed ? e.reviewReasons.map((x) => x.message) : [], suggestedPortion: e.portion.suggested, portions: e.portion.eligible.length ? e.portion.eligible : e.portion.permitted })),
          selectedMealId: pick.mealId, mealName: catalog.byId[pick.mealId].name, mealVersion: 1, portion,
          selectedBy: chooser.by, selectedByRole: chooser.role, selectedAt: at(prev, 15),
          confirmedBy: confirmer.name, confirmedByRole: confirmer.role, confirmedAt: at(prev, 17), confirmMode: byPatient ? 'patient-choice' : 'staff-choice',
          preparedBy: staff.name, preparedAt: at(date, serveH - 1, 30), deliveredBy: staff.name, deliveredByRole: 'staff', deliveredAt: at(date, serveH),
          cancelledReason: null, replaces: null, changes: [],
          history: [
            ev(at(prev, 9), confirmer.name, confirmer.role, 'offered', 'offered', pick, null, offered.map((e) => catalog.byId[e.mealId].name).join(', ')),
            ev(at(prev, 15), chooser.by, chooser.role, 'selected', 'selected', pick, portion),
            ev(at(prev, 17), confirmer.name, confirmer.role, 'confirmed', 'confirmed', pick, portion),
            ev(at(date, serveH - 1, 30), staff.name, 'staff', 'prepared', 'prepared', pick, portion),
            ev(at(date, serveH), staff.name, 'staff', 'delivered', 'delivered', pick, portion),
          ],
          createdAt: at(prev, 9), updatedAt: at(date, serveH),
        });
        // Intake and feedback: the patient's own report, a staff observation, or both.
        const refuse = (behaviour.recentRefusals && d <= 2 && period !== 'snack' && rand() < 0.6) || rand() < behaviour.refuse;
        const amount = refuse ? 'none' : behaviour.eat[Math.floor(rand() * behaviour.eat.length)];
        const reasons = refuse ? [behaviour.reasons?.[0] ?? 'not-preferred'] : amount === 'none' || amount === 'some' ? [behaviour.reasons?.[Math.floor(rand() * (behaviour.reasons?.length ?? 1))] ?? 'low-appetite'] : behaviour.reasons?.includes('portion-too-small') && rand() < 0.25 ? ['portion-too-small'] : [];
        const [lo, hi] = behaviour.sat;
        const satisfaction = refuse ? (rand() < 0.5 ? 2 : null) : lo + Math.floor(rand() * (hi - lo + 1));
        const meal = catalog.byId[pick.mealId];
        const weighed = (p.ward === '4B' || p.ward === '5C') && period === 'lunch';
        const share = { none: 0, some: 0.25, most: 0.75, all: 1 }[amount];
        const base = { patientId: p.id, date, period, mealId: pick.mealId, mealName: meal.name, portion, appetiteBefore: p.appetite.level, accepted: !refuse, amount, reasons };
        const patientReports = byPatient || rand() < 0.3;
        const staffObserves = !byPatient || weighed || rand() < 0.35;
        if (patientReports) repo.saveIntake({ ...base, source: 'patient', satisfaction, comment: refuse && reasons.includes('taste') ? 'Too bland for me.' : '', measuredWasteG: null, recordedBy: p.preferredName, recordedByRole: 'patient', recordedAt: at(date, serveH + 1) });
        if (staffObserves) {
          // Staff estimate can differ slightly from the patient's own report; summaries use the staff observation for amount eaten.
          const staffAmount = patientReports && amount === 'most' && rand() < 0.3 ? 'some' : amount;
          repo.saveIntake({
            ...base, source: 'staff', amount: staffAmount, satisfaction: patientReports ? null : satisfaction, comment: '',
            // Weighed plate waste is a separate measurement and need not match the estimated amount.
            measuredWasteG: weighed ? Math.max(0, Math.round(meal.grams * portionFactor(portion) * (1 - share) * (0.8 + rand() * 0.4))) : null,
            recordedBy: staff.name, recordedByRole: 'staff', recordedAt: at(date, serveH + 1, 30),
          });
        }
      }
    }
  }

  // ---- today and tomorrow, through the service so every rule applies
  const P = (demoId) => repo.getPatient(ids[demoId]);
  const tomorrow = addDays(today, 1);
  // Eligible meals are handled by the nutrition team; when every option needs review
  // (for example dishes without SFDA values), the admin approves them with a note.
  const noteFor = (demoId) => PATIENTS.find(([x]) => x.demoId === demoId)?.[1]?.reviewNote ?? DEFAULT_REVIEW_NOTE;
  const screenTop = (demoId, period, date = today, n = 3) => {
    const r = recommend({ ...P(demoId), reportedAllergies: [] }, service.catalog(), { mealIds: menuFor(service.menu(), date)[period], period, intake: [] });
    return r.eligible.length ? { ids: r.eligible.slice(0, n).map((e) => e.mealId), reviewed: false } : { ids: r.review.slice(0, n).map((e) => e.mealId), reviewed: true };
  };
  const offer = (demoId, period, date = today, n = 3) => {
    const t = screenTop(demoId, period, date, n);
    if (t.ids.length) service.offerOptions(t.reviewed ? admin : staff, ids[demoId], { date, period, items: t.ids.map((mealId) => ({ mealId, reviewNote: t.reviewed ? noteFor(demoId) : undefined })) });
    return t.ids;
  };
  const confirm = (demoId, period, date = today, mealId = null) => {
    const t = screenTop(demoId, period, date, 1);
    const target = mealId ?? t.ids[0];
    if (target) service.confirmMeal(t.reviewed || mealId ? admin : staff, ids[demoId], { date, period, mealId: target, reviewNote: noteFor(demoId) });
    return target;
  };
  const asPatient = (demoId) => ({ id: null, role: 'patient', status: 'active', name: P(demoId).preferredName, patientId: ids[demoId] });
  const choose = (demoId, period, date = today, index = 0) => { const m = offer(demoId, period, date); if (m.length) service.selectMeal(asPatient(demoId), ids[demoId], { date, period, mealId: m[Math.min(index, m.length - 1)] }); };
  const progress = (demoId, period, to) => {
    const e = repo.getEntry(ids[demoId], today, period);
    if (!e) return;
    if (['prepared', 'delivered'].includes(to) && e.status === 'confirmed') service.progressEntry(staff, e.id, { to: 'prepared' });
    if (to === 'delivered') service.progressEntry(staff, e.id, { to: 'delivered' });
  };
  const safely = (fn) => { try { fn(); } catch { /* a demo step that does not apply to today's menu is skipped */ } };

  // Majed (CB-1010) was discharged yesterday: past meals stay, nothing upcoming.
  safely(() => {
    const m = P('CB-1010');
    repo.updatePatient(m.id, { ...m, status: 'discharged', dischargedOn: addDays(today, -1), dischargedBy: staff.name, dischargeNote: 'Discharged home.', updatedAt: at(addDays(today, -1), 14), updatedBy: staff.name });
    repo.addAudit({ at: at(addDays(today, -1), 14), actorId: null, actorRole: 'staff', actorName: staff.name, patientId: m.id, action: 'patient.discharge', detail: `Recorded discharge on ${addDays(today, -1)} (Discharged home.). Past meals, intake and requests are kept.` });
  });

  // Noura: breakfast delivered (she and the team both recorded it), lunch chosen by her and awaiting confirmation, dinner offered; tomorrow offered.
  safely(() => { confirm('CB-1001', 'breakfast'); progress('CB-1001', 'breakfast', 'delivered'); });
  safely(() => choose('CB-1001', 'lunch', today, 1));
  safely(() => offer('CB-1001', 'dinner'));
  safely(() => offer('CB-1001', 'snack'));
  for (const period of PERIOD_IDS) safely(() => offer('CB-1001', period, tomorrow));
  // Fahad: breakfast prepared, lunch offered (he asked for something different).
  safely(() => { confirm('CB-1002', 'breakfast'); progress('CB-1002', 'breakfast', 'prepared'); });
  safely(() => offer('CB-1002', 'lunch'));
  // Mona: breakfast delivered, lunch confirmed (small portions), dinner offered.
  safely(() => { confirm('CB-1003', 'breakfast'); progress('CB-1003', 'breakfast', 'delivered'); });
  safely(() => confirm('CB-1003', 'lunch'));
  safely(() => offer('CB-1003', 'dinner', today, 2));
  // Khalid: breakfast confirmed; lunch, dinner and snack offered for him to choose; next two days offered automatically.
  safely(() => confirm('CB-1004', 'breakfast'));
  for (const period of ['lunch', 'dinner', 'snack']) safely(() => offer('CB-1004', period));
  safely(() => service.autoSchedule(staff, ids['CB-1004'], { from: tomorrow, days: 2 }));
  safely(() => service.cancelMeal(staff, ids['CB-1004'], { date: tomorrow, period: 'snack', reason: 'Patient asked to skip the evening snack tomorrow (procedure in the morning).' }));
  // Sara: breakfast confirmed, lunch chosen.
  safely(() => confirm('CB-1005', 'breakfast'));
  safely(() => choose('CB-1005', 'lunch'));
  // Abdullah: breakfast approved by the admin after review; the rest awaits review.
  safely(() => {
    const r = recommend({ ...P('CB-1006'), reportedAllergies: [] }, service.catalog(), { mealIds: menuFor(service.menu(), today).breakfast, period: 'breakfast' }).review[0];
    if (r) service.confirmMeal(admin, ids['CB-1006'], { date: today, period: 'breakfast', mealId: r.mealId, reviewNote: 'Prepared minced and moist (IDDSI Level 5); sauces served separately.' });
  });
  // Reem: breakfast confirmed, lunch offered, tomorrow confirmed (including a hummus snack if on the menu); then a new
  // sesame allergy is recorded, which re-screens her schedule: meals with sesame are withdrawn or put on hold, and the
  // kitchen is alerted about confirmed trays.
  safely(() => confirm('CB-1009', 'breakfast'));
  safely(() => offer('CB-1009', 'lunch'));
  for (const period of PERIOD_IDS) {
    safely(() => {
      const hummus = menuFor(service.menu(), tomorrow)[period].includes('hummus-veggie-sticks') ? 'hummus-veggie-sticks' : null;
      confirm('CB-1009', period, tomorrow, period === 'snack' ? hummus : null);
    });
  }
  safely(() => {
    const reem = P('CB-1009');
    service.updatePatientSection(admin, reem.id, 'clinical', { ...reem, allergies: { ...reem.allergies, confirmed: [...reem.allergies.confirmed, 'sesame'] } });
  });

  // Intake recorded this morning: Noura by herself and by staff (one meal, two records), Mona by staff with a weighed tray.
  safely(() => service.recordIntake(asPatient('CB-1001'), ids['CB-1001'], { date: today, period: 'breakfast', appetiteBefore: 'good', accepted: true, amount: 'all', satisfaction: 5, reasons: [] }));
  safely(() => service.recordIntake(staff, ids['CB-1001'], { date: today, period: 'breakfast', appetiteBefore: 'good', accepted: true, amount: 'most', reasons: [] }));
  safely(() => service.recordIntake(staff, ids['CB-1003'], { date: today, period: 'breakfast', appetiteBefore: 'poor', accepted: true, amount: 'some', satisfaction: 3, reasons: ['low-appetite'], measuredWasteG: 140 }));

  // Pending requests.
  safely(() => service.createRequest(asPatient('CB-1001'), ids['CB-1001'], { type: 'schedule-change', message: 'Could my dinner be brought a little later, after evening prayer?' }));
  safely(() => service.createRequest(asPatient('CB-1002'), ids['CB-1002'], { type: 'alternative', date: today, period: 'lunch', message: 'The lunch options feel too bland. Is there something with more spices?' }));
  safely(() => service.createRequest(asPatient('CB-1004'), ids['CB-1004'], { type: 'clinical-change', reportKind: 'other', message: 'My lips itched after eating kiwi at home last month. Should this be added to my allergies?' }));
  safely(() => service.createRequest(staff, ids['CB-1006'], { type: 'assistance', message: 'Family asks whether they can bring dates from home; please advise on texture.' }));
  // A resolved request, so patients can see a response.
  safely(() => {
    const r = service.createRequest(asPatient('CB-1004'), ids['CB-1004'], { type: 'assistance', message: 'Can I have my meals a bit earlier on the day of my physiotherapy?' });
    service.resolveRequest(staff, r.request.id, { status: 'resolved', response: 'Yes. We have asked the kitchen to bring your lunch 30 minutes earlier on physiotherapy days.' });
  });

  return ids;
}

/** Link demo patient accounts to their demo patient records. */
export function linkDemoAccounts(repo, patientIds) {
  for (const a of DEMO_ACCOUNTS.filter((x) => x.patientDemoId)) {
    const u = repo.getUserByUsername(a.username);
    if (u) repo.updateUser(u.id, { patientId: patientIds[a.patientDemoId] ?? null });
  }
}

export const periodName = (p) => label(PERIODS, p);
