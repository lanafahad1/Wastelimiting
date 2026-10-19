// CareBite service layer for hospital nutrition. All business and safety rules
// live here and are shared by the Node server (SQLite repository) and the
// clearly labelled browser demo mode (localStorage repository). Every
// permission and screening check runs here, never only in the UI.
//
// Actors are signed-in users: { id, role, name, patientId, status }. Roles:
//   admin      — controls everything: staff access and roles, clinical sections, review items,
//                clinical requests, menu verification, record deletion, plus every staff task
//   staff      — daily meal service: preferences, appetite, admission status, offers, confirmations,
//                preparation and delivery, intake, menu maintenance, non-clinical requests
//   patient    — their own profile, approved options, selections, feedback and requests
// A staff account waiting for approval has no role and can do nothing here.
//
// This file holds the shared context and the patient record, admission,
// intake, request, dashboard and reference functions. The meal workflow is in
// workflow.js and menu management in menu-admin.js.

import { recommend, evaluateMeal, dietCompatibility, ENGINE_VERSION } from './engine.js';
import { buildCatalog, mealSummary } from './catalog.js';
import { normalizeSection, normalizeNewPatient, patientReviewReasons, TEXTURE_LEVELS, LIMIT_FIELDS, clean } from './patient.js';
import { can, PERMISSIONS, SECTION_PERMISSION, rolesWith } from './rbac.js';
import {
  ROLES, ASSIGNABLE_STAFF_ROLES, ACCOUNT_STATUS, PERIODS, PERIOD_IDS, PORTIONS, APPETITE, INTAKE_AMOUNTS, REFUSAL_REASONS, REQUEST_TYPES, REQUEST_STATUS, REPORT_KINDS,
  ALLERGENS, INTOLERANCES, CONDITIONS, WARDS, AGE_RANGES, ALLERGY_STATUS, CUISINES, ENTRY_STATUS, WORKFLOW_STEPS, CHANGE_CAUSES, ADMISSION_STATUS,
  DISH_KINDS, INGREDIENT_FLAGS, INGREDIENT_GROUPS, SERVICE_TIMES, label,
} from './constants.js';
import { SOURCES, MEDICAL_RULES, SAFETY_RULES, INTAKE_FLAG_RULES, DIET_CATEGORIES, ACTIVE_DIET_CATEGORIES, DIET_SUPPORT, RULESET_VERSION, RULESET_REVIEW, MEAL_SHARE, dietCategory } from './rules.js';
import { menuFor } from './menu.js';
import { todayIso, addDays, isValidIso } from './dates.js';
import { mealOutcomes, intakeFlags, intakeTrends, reasonCounts, byMealTime, OUTCOME_RULE } from './indicators.js';
import { LOCAL_PRODUCTION, LOCAL_PRODUCTION_SOURCES } from '../data/local-production.js';
import { SFCT_LIBRARY, SFCT_META } from '../data/sfct-dishes.js';
import { createWorkflow } from './workflow.js';
import { createMenuAdmin } from './menu-admin.js';

export class ServiceError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const INTAKE_DAYS = 14;
const LINK_CODE_HOURS = 72;
export { ENTRY_STATUS };

export function createService({ repo, sfct = SFCT_LIBRARY, now = () => new Date(), randomCode = defaultRandomCode }) {
  const today = () => todayIso(now());
  const stamp = () => now().toISOString();
  let seq = 0;
  const uid = (prefix) => `${prefix}-${now().getTime().toString(36)}-${(seq++).toString(36)}`;

  // ------------------------------------------------------------ errors and permissions
  const deny = (message = 'You do not have permission to do this.') => { throw new ServiceError(403, 'forbidden', message); };
  const invalid = (message, errors) => { throw new ServiceError(422, 'validation_failed', message, errors ? { errors } : undefined); };
  const conflict = (code, message, details) => { throw new ServiceError(409, code, message, details); };
  /** RBAC: every operation names the permission it needs (see rbac.js). */
  const requirePermission = (actor, permission, message) => {
    if (!actor) throw new ServiceError(401, 'unauthenticated', 'Please log in to continue.');
    if (actor.status && actor.status !== 'active') deny('Your account is not active. An admin must approve it first.');
    if (!can(actor.role, permission)) deny(message);
  };

  // ------------------------------------------------------------ catalogue state
  const state = { catalog: null, menu: null, compat: new Map() };
  function reloadCatalog() {
    const data = repo.getCatalogData();
    state.catalog = buildCatalog({ dishes: data.dishes, meals: data.meals, ingredients: Object.fromEntries(data.ingredients.map((i) => [i.id, i])), sfct });
    state.menu = repo.getMenu();
    state.compat = new Map();
    return state.catalog;
  }
  const catalog = () => state.catalog ?? reloadCatalog();
  const menu = () => { if (!state.menu) reloadCatalog(); return state.menu; };
  const compatibilityFor = (mealId) => {
    if (!state.compat.has(mealId)) state.compat.set(mealId, dietCompatibility(catalog().byId[mealId], catalog()));
    return state.compat.get(mealId);
  };

  // ------------------------------------------------------------ shared helpers
  function getPatientOr404(id) {
    const p = repo.getPatient(String(id));
    if (!p) throw new ServiceError(404, 'patient_not_found', 'That patient record does not exist.');
    return p;
  }
  /** Patients may only reach their own record; kitchen and admin staff never reach profiles. */
  function accessPatient(actor, id) {
    requirePermission(actor, 'patient:read');
    if (actor.role === 'patient' && String(actor.patientId) !== String(id)) deny('You can only see your own meals and profile.');
    return getPatientOr404(id);
  }
  const assertAdmitted = (p, what = 'Meals') => {
    if (p.status === 'discharged') conflict('discharged', `${p.demoId} was discharged${p.dischargedOn ? ` on ${p.dischargedOn}` : ''}. ${what} can no longer be planned. Readmit the patient first if they are back on the ward.`);
  };
  function getMealOr404(mealId) {
    const meal = catalog().byId[mealId];
    if (!meal) throw new ServiceError(404, 'meal_not_found', 'That meal is not on the hospital menu.');
    return meal;
  }
  function assertPeriod(period) { if (!PERIOD_IDS.includes(period)) invalid('Choose breakfast, lunch, dinner or snack.'); }
  function assertDate(date, { from, to, what = 'This date' } = {}) {
    if (!isValidIso(date)) invalid('Dates must be written as YYYY-MM-DD.');
    if (from && date < from) conflict('date_out_of_range', `${what} is too far in the past.`);
    if (to && date > to) conflict('date_out_of_range', `${what} is too far ahead.`);
  }
  const SCHEDULE_DAYS = 7;
  const scheduleWindow = () => ({ from: today(), to: addDays(today(), SCHEDULE_DAYS - 1) });
  const audit = (actor, patientId, action, detail) => repo.addAudit({
    at: stamp(), actorId: actor?.id ?? null, actorRole: actor?.role ?? 'system', actorName: actor?.name ?? 'CareBite', patientId: patientId ?? null, action, detail,
  });
  const outcomesOf = (patientId) => mealOutcomes(repo.listIntake({ patientId }));
  const menuIds = (date, period) => menuFor(menu(), date)[period];
  const onMenu = (date, period, mealId) => menuIds(date, period).includes(mealId);

  /** Open patient reports of a possible allergy to a coded SFDA allergen (precaution until reviewed). */
  function reportedAllergies(patientId) {
    return repo.listRequests({ patientId, status: 'open' })
      .filter((r) => r.type === 'clinical-change' && r.report?.kind === 'new-allergy' && r.report?.allergen)
      .map((r) => ({ group: r.report.allergen, label: label(ALLERGENS, r.report.allergen).toLowerCase(), date: r.createdAt.slice(0, 10), requestId: r.id }));
  }
  /** The patient record as screened: the recorded profile plus open allergy reports. */
  const forScreening = (p) => ({ ...p, reportedAllergies: reportedAllergies(p.id) });
  const screen = (p, date, period, outcomes = outcomesOf(p.id)) => recommend(forScreening(p), catalog(), { mealIds: menuIds(date, period), period, intake: outcomes });
  const evaluate = (p, mealId, period, outcomes = outcomesOf(p.id)) => evaluateMeal(getMealOr404(mealId), forScreening(p), { catalog: catalog(), period, intake: outcomes });

  const dietCodes = (p) => (p.dietOrder.npo ? ['NPO'] : p.dietOrder.categories.map((c) => dietCategory(c)?.code ?? c));
  const dietPlain = (p) => (p.dietOrder.npo ? ['Nothing by mouth'] : p.dietOrder.categories.map((c) => dietCategory(c)?.plain ?? c));
  const ingName = (i) => catalog().ingredients[i]?.name ?? i;
  const allergyLabels = (p) => [
    ...p.allergies.confirmed.map((g) => label(ALLERGENS, g)),
    ...p.allergies.ingredients.map(ingName),
    ...p.allergies.uncoded.map((t) => `${t} (not coded)`),
  ];
  const intoleranceLabels = (p) => [
    ...p.intolerances.selected.map((i) => label(INTOLERANCES, i)),
    ...p.intolerances.ingredients.map(ingName),
    ...p.intolerances.uncoded.map((t) => `${t} (not coded)`),
  ];
  function brief(p) {
    return {
      id: p.id, demoId: p.demoId, preferredName: p.preferredName, ward: p.ward, wardLabel: label(WARDS, p.ward), bed: p.bed, ageRange: p.ageRange,
      status: p.status, admittedOn: p.admittedOn ?? null, dischargedOn: p.dischargedOn ?? null,
      dietCodes: dietCodes(p), dietLabels: dietPlain(p), npo: p.dietOrder.npo,
      textureLevel: p.dietOrder.textureLevel ? TEXTURE_LEVELS.find((t) => t.id === p.dietOrder.textureLevel)?.label : null,
      allergyStatus: p.allergies.status, allergies: allergyLabels(p), intolerances: intoleranceLabels(p), appetite: p.appetite.level,
      reportedAllergies: reportedAllergies(p.id).map((r) => r.label),
    };
  }
  function patientView(p, actor) {
    const linked = repo.listUsersByPatient(p.id).map((u) => ({ username: u.username, createdAt: u.createdAt }));
    const view = { ...p, brief: brief(p), reviewReasons: patientReviewReasons(forScreening(p)), linkedAccounts: linked };
    if (actor.role === 'patient') {
      // Staff notes are written for the care team and kitchen; the patient sees their diet, allergies and preferences.
      view.dietOrder = { ...p.dietOrder, notes: '' };
      view.restrictions = { ...p.restrictions, medicalNotes: '' };
      view.reviewReasons = [];
      view.dischargeNote = '';
      delete view.linkCode;
      delete view.linkCodeExpiresAt;
    } else {
      view.linkCodeActive = Boolean(p.linkCode && p.linkCodeExpiresAt > stamp());
      delete view.linkCode;
    }
    return view;
  }
  const withMeal = (mealId) => (catalog().byId[mealId] ? mealSummary(catalog().byId[mealId]) : null);
  const requestView = (r) => ({
    ...r, typeLabel: label(REQUEST_TYPES, r.type), statusLabel: label(REQUEST_STATUS, r.status),
    reportLabel: r.report?.kind ? label(REPORT_KINDS, r.report.kind) : null, allergenLabel: r.report?.allergen ? label(ALLERGENS, r.report.allergen) : null,
  });

  const ctx = {
    repo, now, today, stamp, uid, sfct, ServiceError, deny, invalid, conflict, requirePermission, catalog, menu, reloadCatalog, compatibilityFor,
    getPatientOr404, accessPatient, assertAdmitted, getMealOr404, assertPeriod, assertDate, scheduleWindow, audit, outcomesOf, onMenu, menuIds,
    forScreening, screen, evaluate, dietCodes, dietPlain, allergyLabels, intoleranceLabels, brief, withMeal, requestView, reportedAllergies,
  };
  const workflow = createWorkflow(ctx);
  const menuAdmin = createMenuAdmin(ctx, workflow);

  // ------------------------------------------------------------ patients
  function listPatients(actor, { date = today(), ward = null, include = 'admitted' } = {}) {
    requirePermission(actor, 'patient:list');
    assertDate(date);
    const rows = repo.listPatients()
      .filter((p) => include === 'all' || (include === 'discharged' ? p.status === 'discharged' : p.status === 'admitted'))
      .filter((p) => !ward || p.ward === ward)
      .map((p) => {
        const outcomes = outcomesOf(p.id);
        const entries = repo.listEntries({ patientId: p.id, date });
        const discharged = p.status === 'discharged';
        const periods = PERIODS.map(({ id }) => {
          const entry = entries.find((e) => e.period === id) ?? null;
          if (discharged) return { period: id, status: 'discharged', entryStatus: entry?.status ?? null, meal: entry?.mealName ?? null };
          if (p.dietOrder.npo) return { period: id, status: 'npo', entryStatus: entry?.status ?? null };
          const s = screen(p, date, id, outcomes);
          return {
            period: id, entryStatus: entry?.status ?? null, meal: entry?.mealName ?? null,
            eligible: s.counts.eligible, review: s.counts.review, excluded: s.counts.excluded, noSuitable: s.noSuitable, reviewOnly: s.reviewOnly,
          };
        });
        const reviewReasons = patientReviewReasons(forScreening(p));
        const flags = [];
        const settled = (x) => ['confirmed', 'prepared', 'delivered'].includes(x.entryStatus);
        if (!discharged) {
          const reviewItems = reviewReasons.filter((r) => r.severity === 'review');
          if (reviewItems.length) flags.push({ code: 'review', label: 'Needs admin review', text: reviewItems.map((r) => r.text).join(' ') });
          const noOptions = periods.filter((x) => x.noSuitable && !settled(x));
          if (noOptions.length) flags.push({ code: 'no-options', label: 'No suitable options', text: `No meal on the menu passes screening for ${noOptions.map((x) => label(PERIODS, x.period).toLowerCase()).join(', ')}.` });
          const reviewOnly = periods.filter((x) => x.reviewOnly && !settled(x));
          if (reviewOnly.length && !reviewItems.length) flags.push({ code: 'review', label: 'Needs admin review', text: `Options for ${reviewOnly.map((x) => label(PERIODS, x.period).toLowerCase()).join(', ')} need admin review.` });
          const changes = workflow.openChanges({ patientId: p.id });
          const holds = changes.filter((c) => c.entryStatus === 'on-hold');
          if (holds.length) flags.push({ code: 'hold', label: `${holds.length} meal${holds.length > 1 ? 's' : ''} on hold`, text: holds.map((c) => `${label(PERIODS, c.period)} ${c.date}: ${c.change}`).join(' · ') });
          const unreviewed = changes.filter((c) => c.entryStatus !== 'on-hold');
          if (unreviewed.length) flags.push({ code: 'changes', label: 'Changes to review', text: unreviewed.map((c) => `${label(PERIODS, c.period)} ${c.date}: ${c.change}`).join(' · ') });
          for (const f of intakeFlags(outcomes, today())) flags.push({ code: f.code === 'INTAKE-REFUSAL' ? 'refusal' : 'low-intake', label: f.title, text: f.text });
          if (p.dietOrder.npo) flags.push({ code: 'npo', label: 'Nothing by mouth', text: 'Nothing by mouth (NPO): no meals are offered.' });
        }
        const openRequests = repo.listRequests({ patientId: p.id, status: 'open' });
        if (openRequests.length) flags.push({ code: 'requests', label: `${openRequests.length} pending request${openRequests.length > 1 ? 's' : ''}`, text: openRequests.map((r) => label(REQUEST_TYPES, r.type)).join(', ') });
        return { ...brief(p), periods, flags, reviewReasons, openRequests: openRequests.length };
      });
    const SEVERITY = { hold: 50, 'no-options': 40, review: 20, changes: 15, refusal: 10, 'low-intake': 10, requests: 1 };
    const weight = (r) => r.flags.reduce((sum, f) => sum + (SEVERITY[f.code] ?? 0), 0);
    rows.sort((a, b) => weight(b) - weight(a) || a.ward.localeCompare(b.ward) || a.bed.localeCompare(b.bed, 'en', { numeric: true }));
    const count = (codes) => rows.filter((r) => r.flags.some((f) => codes.includes(f.code))).length;
    const all = repo.listPatients();
    return {
      date, include, patients: rows,
      counts: {
        all: rows.length,
        attention: count(['hold', 'no-options', 'review', 'changes', 'refusal', 'low-intake']),
        review: count(['review']), noOptions: count(['no-options']), hold: count(['hold', 'changes']), intake: count(['refusal', 'low-intake']), requests: count(['requests']),
      },
      admitted: all.filter((p) => p.status === 'admitted').length,
      discharged: all.filter((p) => p.status === 'discharged').length,
    };
  }

  function getPatient(actor, id) {
    const p = accessPatient(actor, id);
    const outcomes = outcomesOf(p.id);
    const records = repo.listIntake({ patientId: p.id });
    const requests = repo.listRequests({ patientId: p.id }).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(requestView);
    const staffView = actor.role !== 'patient';
    return {
      patient: patientView(p, actor),
      intakeFlags: staffView ? intakeFlags(outcomes, today()) : [],
      // One row per meal, with the patient's report and the staff observation side by side.
      intake: outcomes.slice(-28).reverse().map((o) => ({
        ...o, mealName: o.mealName ?? catalog().byId[o.mealId]?.name ?? o.mealId,
        staffRecord: staffView ? o.staffRecord : o.staffRecord && { source: 'staff', recordedByRole: o.staffRecord.recordedByRole },
      })),
      intakeRecordCount: records.length,
      outcomeRule: OUTCOME_RULE,
      requests,
      changes: staffView ? workflow.changeLog({ patientId: p.id }) : [],
      audit: staffView ? repo.listAudit({ patientId: p.id, limit: 40 }) : [],
    };
  }

  function createPatient(actor, input = {}) {
    requirePermission(actor, 'patient:create', 'Only an admin can create a patient nutrition profile.');
    const { value, errors, warnings, valid } = normalizeNewPatient(input, catalog().ingredients);
    if (!valid) invalid('Some fields need attention.', errors);
    if (repo.getPatientByDemoId(value.demoId)) invalid('Some fields need attention.', { demoId: 'A patient with this demonstration identifier already exists.' });
    const at = stamp();
    const created = repo.createPatient({ ...value, status: 'admitted', admittedOn: today(), createdAt: at, updatedAt: at, updatedBy: actor.name });
    audit(actor, created.id, 'patient.create', `Created the nutrition profile for ${created.demoId} and admitted the patient.`);
    return { patient: patientView(created, actor), warnings };
  }

  const SECTION_LABELS = { details: 'patient details', clinical: 'diet order, allergies and restrictions', preferences: 'food preferences', appetite: 'appetite' };

  /** Plain-language list of what changed in the clinical section (recorded in the audit log and on affected meals). */
  function clinicalDiff(before, after) {
    const out = [];
    const cat = (c) => dietCategory(c)?.label ?? c;
    const diff = (a, b) => ({ added: b.filter((x) => !a.includes(x)), removed: a.filter((x) => !b.includes(x)) });
    const al = (g) => label(ALLERGENS, g).toLowerCase();
    const il = (x) => (INTOLERANCES.some((i) => i.id === x) ? label(INTOLERANCES, x) : ingName(x));
    const d = diff(before.dietOrder.categories, after.dietOrder.categories);
    if (d.added.length) out.push(`Diet added: ${d.added.map(cat).join(', ')}`);
    if (d.removed.length) out.push(`Diet removed: ${d.removed.map(cat).join(', ')}`);
    if (before.dietOrder.npo !== after.dietOrder.npo) out.push(after.dietOrder.npo ? 'Changed to nothing by mouth (NPO)' : 'Nothing by mouth (NPO) lifted');
    if ((before.dietOrder.textureLevel || '') !== (after.dietOrder.textureLevel || '')) out.push(`Texture level: ${after.dietOrder.textureLevel ? TEXTURE_LEVELS.find((t) => t.id === after.dietOrder.textureLevel)?.label : 'none'}`);
    for (const f of LIMIT_FIELDS) if ((before.dietOrder[f.key] ?? null) !== (after.dietOrder[f.key] ?? null)) out.push(`${f.label} limit: ${after.dietOrder[f.key] ?? 'not set'}${after.dietOrder[f.key] != null ? ` ${f.unit}` : ''}`);
    const pd = diff(before.dietOrder.portionsPermitted, after.dietOrder.portionsPermitted);
    if (pd.added.length || pd.removed.length) out.push(`Permitted portions: ${after.dietOrder.portionsPermitted.join(', ')}`);
    const a = diff(before.allergies.confirmed, after.allergies.confirmed);
    if (a.added.length) out.push(`Allergy added: ${a.added.map(al).join(', ')}`);
    if (a.removed.length) out.push(`Allergy removed: ${a.removed.map(al).join(', ')}`);
    const ai = diff(before.allergies.ingredients, after.allergies.ingredients);
    if (ai.added.length) out.push(`Ingredient allergy added: ${ai.added.map(ingName).join(', ')}`);
    if (ai.removed.length) out.push(`Ingredient allergy removed: ${ai.removed.map(ingName).join(', ')}`);
    if (before.allergies.status !== after.allergies.status) out.push(`Allergy status: ${label(ALLERGY_STATUS, after.allergies.status).toLowerCase()}`);
    const au = diff(before.allergies.uncoded, after.allergies.uncoded);
    if (au.added.length) out.push(`Uncoded allergy noted: ${au.added.join(', ')}`);
    const it = diff([...before.intolerances.selected, ...before.intolerances.ingredients], [...after.intolerances.selected, ...after.intolerances.ingredients]);
    if (it.added.length) out.push(`Intolerance added: ${it.added.map(il).join(', ')}`);
    if (it.removed.length) out.push(`Intolerance removed: ${it.removed.map(il).join(', ')}`);
    const ex = diff(before.restrictions.medicalExclusions, after.restrictions.medicalExclusions);
    if (ex.added.length) out.push(`Excluded by the care team: ${ex.added.map(ingName).join(', ')}`);
    if (ex.removed.length) out.push(`Exclusion removed: ${ex.removed.map(ingName).join(', ')}`);
    return out;
  }

  function updatePatientSection(actor, id, section, input = {}) {
    if (!SECTION_PERMISSION[section]) throw new ServiceError(404, 'not_found', 'Unknown profile section.');
    const p = accessPatient(actor, id);
    if (!can(actor.role, SECTION_PERMISSION[section])) {
      if (section === 'clinical') deny(actor.role === 'patient'
        ? 'Changes to your prescribed diet or allergies must be reviewed by your nutrition team. Use “Report a change” to send them a request.'
        : 'Only an admin can change the diet order, allergies and medical restrictions.');
      deny();
    }
    if (p.status === 'discharged' && actor.role === 'patient') conflict('discharged', 'You have been discharged, so your food profile can no longer be changed here.');
    const { value, errors, warnings, valid } = normalizeSection(section, input, p, catalog().ingredients);
    if (!valid) invalid('Some fields need attention.', errors);
    if (section === 'details' && value.demoId !== p.demoId && repo.getPatientByDemoId(value.demoId)) invalid('Some fields need attention.', { demoId: 'Another patient already uses this identifier.' });
    const updated = repo.updatePatient(p.id, { ...p, ...value, updatedAt: stamp(), updatedBy: actor.name });
    const changes = section === 'clinical' ? clinicalDiff(p, updated) : [];
    audit(actor, p.id, `patient.update.${section}`, `Updated ${SECTION_LABELS[section]}${actor.role === 'patient' ? ' (by the patient)' : ''}${changes.length ? `: ${changes.join('; ')}` : ''}.`);
    let recheck = [];
    if (section === 'clinical' && changes.length && updated.status === 'admitted') {
      recheck = workflow.recheckPatient(actor, updated, { cause: updated.dietOrder.npo && !p.dietOrder.npo ? 'npo' : 'diet-change', change: changes.join('; ') });
    }
    return { patient: patientView(updated, actor), warnings, changes, recheck };
  }

  // ------------------------------------------------------------ admission status
  function dischargePatient(actor, id, input = {}) {
    requirePermission(actor, 'patient:admission', 'Only the nutrition team can record a discharge.');
    const p = getPatientOr404(id);
    if (p.status === 'discharged') conflict('already_discharged', `${p.demoId} is already recorded as discharged.`);
    const note = clean(input.note, 200);
    const date = today();
    const updated = repo.updatePatient(p.id, { ...p, status: 'discharged', dischargedOn: date, dischargedBy: actor.name, dischargeNote: note, linkCode: null, linkCodeExpiresAt: null, updatedAt: stamp(), updatedBy: actor.name });
    const cancelled = workflow.cancelUpcoming(actor, updated, { cause: 'discharge', reason: `Patient discharged on ${date}${note ? ` (${note})` : ''}.` });
    let closed = 0;
    for (const r of repo.listRequests({ patientId: p.id, status: 'open' })) {
      repo.updateRequest(r.id, { status: 'resolved', response: `Closed because you were discharged on ${date}.`, resolvedBy: actor.name, resolvedAt: stamp() });
      closed += 1;
    }
    audit(actor, p.id, 'patient.discharge', `Recorded discharge on ${date}${note ? ` (${note})` : ''}. ${cancelled.length} upcoming meal period${cancelled.length === 1 ? ' was' : 's were'} cancelled${closed ? `; ${closed} pending request${closed === 1 ? '' : 's'} closed` : ''}. Past meals, intake and requests are kept.`);
    return { patient: patientView(updated, actor), cancelled, closedRequests: closed };
  }

  function readmitPatient(actor, id, input = {}) {
    requirePermission(actor, 'patient:admission', 'Only the nutrition team can record an admission.');
    const p = getPatientOr404(id);
    if (p.status === 'admitted') conflict('already_admitted', `${p.demoId} is already admitted.`);
    const ward = WARDS.some((w) => w.id === input.ward) ? input.ward : p.ward;
    const bed = clean(input.bed ?? p.bed, 8).toUpperCase();
    if (!/^[A-Z0-9-]{1,8}$/.test(bed)) invalid('Some fields need attention.', { bed: 'Enter the bed or room, for example 12 or 4B-07.' });
    const updated = repo.updatePatient(p.id, { ...p, status: 'admitted', admittedOn: today(), ward, bed, dischargedOn: null, dischargedBy: null, dischargeNote: '', updatedAt: stamp(), updatedBy: actor.name });
    audit(actor, p.id, 'patient.admit', `Readmitted to ${label(WARDS, ward)}, bed ${bed}. An admin should review the diet order and allergies before meals are planned.`);
    return { patient: patientView(updated, actor) };
  }

  /** Permanently delete a demonstration record. Separate from discharge and from account deletion. */
  function deletePatient(actor, id, input = {}) {
    requirePermission(actor, 'patient:delete', 'Only an admin can delete a patient record.');
    const p = getPatientOr404(id);
    if (String(input.confirmDemoId ?? '').trim().toUpperCase() !== p.demoId) invalid(`Type ${p.demoId} to confirm the permanent deletion.`, { confirmDemoId: `Type ${p.demoId} exactly.` });
    for (const u of repo.listUsersByPatient(p.id)) repo.updateUser(u.id, { patientId: null });
    repo.deletePatient(p.id);
    audit(actor, null, 'patient.delete', `Permanently deleted the record ${p.demoId} with its meals, intake records and requests.`);
    return { deleted: true };
  }

  // ------------------------------------------------------------ patient accounts
  function createLinkCode(actor, id) {
    requirePermission(actor, 'patient:link-account');
    const p = getPatientOr404(id);
    assertAdmitted(p, 'Patient accounts');
    const code = randomCode();
    const expiresAt = new Date(now().getTime() + LINK_CODE_HOURS * 3600e3).toISOString();
    repo.updatePatient(p.id, { ...p, linkCode: code, linkCodeExpiresAt: expiresAt });
    audit(actor, p.id, 'link.create', 'Created a one-time code for the patient to link a personal account.');
    return { code, expiresAt, hours: LINK_CODE_HOURS };
  }
  /** Find the patient a link code belongs to (used during registration). */
  function checkLinkCode(code) {
    const c = String(code ?? '').trim().toUpperCase();
    const p = c ? repo.getPatientByLinkCode(c) : null;
    if (!p || p.linkCodeExpiresAt < stamp() || p.status !== 'admitted') return null;
    return p;
  }
  function redeemLinkCode(user, code) {
    const p = checkLinkCode(code);
    if (!p) throw new ServiceError(422, 'invalid_link_code', 'This link code is not valid or has expired. Ask the nutrition team for a new code.', { errors: { linkCode: 'This code is not valid or has expired.' } });
    if (repo.listUsersByPatient(p.id).length) conflict('already_linked', 'This patient profile already has a personal account. Ask the nutrition team for help.', { errors: { linkCode: 'This profile already has a personal account.' } });
    repo.updatePatient(p.id, { ...p, linkCode: null, linkCodeExpiresAt: null });
    repo.updateUser(user.id, { patientId: p.id });
    audit({ ...user, role: 'patient' }, p.id, 'link.redeem', `Personal account @${user.username} linked to this profile.`);
    return p;
  }
  /**
   * Registration with a link code: check and consume the code in one step, so it
   * cannot be used twice even if two sign-ups arrive at once. Returns the patient.
   */
  function claimLinkCode(code) {
    const p = checkLinkCode(code);
    if (!p) throw new ServiceError(422, 'invalid_link_code', 'This link code is not valid or has expired. Ask the nutrition team for a new code.', { errors: { linkCode: 'This code is not valid or has expired.' } });
    if (repo.listUsersByPatient(p.id).length) conflict('already_linked', 'This patient profile already has a personal account. Ask the nutrition team for help.', { errors: { linkCode: 'This profile already has an account.' } });
    repo.updatePatient(p.id, { ...p, linkCode: null, linkCodeExpiresAt: null });
    return p;
  }
  /** Audit entry once the new account exists. */
  function recordAccountLink(user, patientId) {
    audit({ ...user, role: 'patient' }, patientId, 'link.redeem', `Personal account @${user.username} linked to this profile.`);
  }
  function unlinkAccounts(actor, id) {
    requirePermission(actor, 'patient:link-account');
    const p = getPatientOr404(id);
    const users = repo.listUsersByPatient(p.id);
    for (const u of users) repo.updateUser(u.id, { patientId: null });
    audit(actor, p.id, 'link.remove', `Removed the link to ${users.length} personal account${users.length === 1 ? '' : 's'}. The account itself and the hospital record are kept.`);
    return { unlinked: users.length };
  }

  // ------------------------------------------------------------ intake and feedback
  function recordIntake(actor, id, input = {}) {
    const p = accessPatient(actor, id);
    const { date, period } = input;
    assertPeriod(period);
    assertDate(date, { from: addDays(today(), -INTAKE_DAYS + 1), to: today(), what: 'Intake records' });
    const staff = actor.role !== 'patient';
    const entry = repo.getEntry(p.id, date, period);
    if (!entry || entry.status !== 'delivered') {
      conflict('not_delivered', staff
        ? 'Intake can be recorded once the meal has been marked as delivered. Delivery does not mean the meal was eaten, so intake is recorded separately.'
        : 'You can tell us how your meal was once it has been delivered.');
    }
    const errors = {};
    const appetiteBefore = input.appetiteBefore || null;
    if (appetiteBefore != null && !APPETITE.some((a) => a.id === appetiteBefore)) errors.appetiteBefore = 'Choose the appetite before the meal.';
    if (typeof input.accepted !== 'boolean') errors.accepted = staff ? 'Say whether the meal was accepted or refused.' : 'Tell us whether you ate the meal.';
    const amount = input.accepted === false ? 'none' : input.amount;
    if (input.accepted && !INTAKE_AMOUNTS.some((a) => a.id === amount)) errors.amount = 'Choose about how much was eaten.';
    const reasons = [...new Set((Array.isArray(input.reasons) ? input.reasons : []).filter((r) => REFUSAL_REASONS.some((x) => x.id === r)))];
    if (input.accepted === false && !reasons.length) errors.reasons = staff ? 'Choose at least one reason the meal was refused.' : 'Choose at least one reason, so the team can help.';
    const satisfaction = input.satisfaction == null || input.satisfaction === '' ? null : Number(input.satisfaction);
    if (satisfaction != null && !(Number.isInteger(satisfaction) && satisfaction >= 1 && satisfaction <= 5)) errors.satisfaction = 'Satisfaction is a whole number from 1 to 5.';
    let measuredWasteG = input.measuredWasteG == null || input.measuredWasteG === '' ? null : Number(input.measuredWasteG);
    if (measuredWasteG != null) {
      if (!staff) errors.measuredWasteG = 'Measured waste is weighed and recorded by hospital staff.';
      else if (!(Number.isFinite(measuredWasteG) && measuredWasteG >= 0 && measuredWasteG <= 3000)) errors.measuredWasteG = 'Measured waste must be between 0 and 3,000 g.';
      else measuredWasteG = Math.round(measuredWasteG);
    }
    if (Object.keys(errors).length) invalid('Some answers need attention.', errors);
    const source = staff ? 'staff' : 'patient';
    const record = repo.saveIntake({
      patientId: p.id, date, period, source, mealId: entry.selectedMealId, mealName: entry.mealName, portion: entry.portion,
      appetiteBefore, accepted: input.accepted, amount, reasons, satisfaction, comment: clean(input.comment, 300),
      measuredWasteG: staff ? measuredWasteG : null, recordedBy: actor.name, recordedByRole: actor.role, recordedAt: stamp(),
    });
    // The most recent appetite report becomes the current appetite used for portion suggestions.
    let appetiteUpdated = false;
    if (appetiteBefore && date === today() && p.status === 'admitted') {
      const latest = repo.listIntake({ patientId: p.id }).filter((r) => r.appetiteBefore).sort((a, b) => byMealTime(a, b) || a.recordedAt.localeCompare(b.recordedAt)).at(-1);
      if (latest?.date === date && latest.period === period && p.appetite.level !== appetiteBefore) {
        repo.updatePatient(p.id, { ...p, appetite: { level: appetiteBefore }, updatedAt: stamp(), updatedBy: actor.name });
        appetiteUpdated = true;
      }
    }
    const what = input.accepted ? `accepted, ${label(INTAKE_AMOUNTS, amount).toLowerCase()} eaten` : 'refused';
    audit(actor, p.id, 'intake.record', `${staff ? 'Staff observation' : 'Patient report'} for ${period} on ${date}: ${what}${measuredWasteG != null && staff ? `; ${measuredWasteG} g weighed waste` : ''}${appetiteUpdated ? '; current appetite updated' : ''}.`);
    const outcome = outcomesOf(p.id).find((o) => o.date === date && o.period === period);
    return { intake: record, outcome, appetiteUpdated, flags: staff ? intakeFlags(outcomesOf(p.id), today()) : [] };
  }

  // ------------------------------------------------------------ requests
  function createRequest(actor, id, input = {}) {
    const p = accessPatient(actor, id);
    if (p.status === 'discharged') conflict('discharged', actor.role === 'patient' ? 'You have been discharged, so new requests cannot be sent here. Please speak to your care team.' : `${p.demoId} has been discharged.`);
    const type = REQUEST_TYPES.find((t) => t.id === input.type);
    const errors = {};
    if (!type) errors.type = 'Choose what the request is about.';
    const message = clean(input.message, 400);
    if (!message) errors.message = 'Describe what you need in a few words.';
    let date = null;
    let period = null;
    if (input.date || input.period || type?.id === 'alternative') {
      if (!isValidIso(input.date)) errors.date = 'Choose the day.';
      if (!PERIOD_IDS.includes(input.period)) errors.period = 'Choose the meal.';
      date = input.date || null;
      period = input.period || null;
    }
    let report = null;
    if (type?.clinical) {
      const kind = REPORT_KINDS.some((k) => k.id === input.reportKind) ? input.reportKind : null;
      if (!kind) errors.reportKind = 'Choose what has changed.';
      const allergen = input.allergen && ALLERGENS.some((a) => a.id === input.allergen) ? input.allergen : null;
      report = { kind, allergen: ['new-allergy', 'allergy-wrong'].includes(kind) ? allergen : null };
    }
    if (Object.keys(errors).length) invalid('Some answers need attention.', errors);
    const entry = date && period ? repo.getEntry(p.id, date, period) : null;
    const request = repo.addRequest({
      patientId: p.id, type: type.id, clinical: Boolean(type.clinical), message, date, period,
      mealId: entry?.selectedMealId ?? null, mealName: entry?.mealName ?? (entry?.offers?.length ? entry.offers.map((o) => o.mealName).join(', ') : null),
      report, status: 'open', createdBy: actor.name, createdByRole: actor.role, createdAt: stamp(), response: null, resolvedBy: null, resolvedAt: null,
    });
    audit(actor, p.id, 'request.create', `${label(REQUEST_TYPES, type.id)}${report?.allergen ? ` (possible ${label(ALLERGENS, report.allergen).toLowerCase()} allergy)` : ''}${actor.role === 'patient' ? ' (from the patient)' : ''}.`);
    let recheck = [];
    if (report?.kind === 'new-allergy' && report.allergen && p.status === 'admitted') {
      recheck = workflow.recheckPatient(actor, p, { cause: 'allergy-report', change: `Patient reported a possible ${label(ALLERGENS, report.allergen).toLowerCase()} allergy (pending admin review)` });
    }
    return {
      request: requestView(request), recheck,
      note: type.clinical
        ? 'Your report was sent to your nutrition team. An admin will review it before your diet or allergy record changes. If you have symptoms of an allergic reaction, tell your nurse immediately.'
        : 'Your request was sent to the nutrition team. You can follow its status under My Requests.',
    };
  }

  function listRequests(actor, { status = 'open' } = {}) {
    requirePermission(actor, 'request:list');
    const patients = Object.fromEntries(repo.listPatients().map((p) => [p.id, p]));
    const rows = repo.listRequests(status === 'all' ? {} : { status })
      .filter((r) => patients[r.patientId])
      .map((r) => ({ ...requestView(r), patient: brief(patients[r.patientId]) }))
      .sort((a, b) => (a.status === 'open' ? 0 : 1) - (b.status === 'open' ? 0 : 1) || Number(b.clinical) - Number(a.clinical) || a.createdAt.localeCompare(b.createdAt));
    const all = repo.listRequests({}).filter((r) => patients[r.patientId]);
    return { requests: rows, counts: { open: all.filter((r) => r.status === 'open').length, all: all.length } };
  }

  function listPatientRequests(actor, id) {
    const p = accessPatient(actor, id);
    return { requests: repo.listRequests({ patientId: p.id }).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(requestView), discharged: p.status === 'discharged' };
  }

  function resolveRequest(actor, requestId, input = {}) {
    requirePermission(actor, 'request:resolve');
    const r = repo.getRequest(String(requestId));
    if (!r) throw new ServiceError(404, 'request_not_found', 'That request no longer exists.');
    if (r.status !== 'open') conflict('already_resolved', `This request was already ${r.status === 'resolved' ? 'resolved' : 'declined'} by ${r.resolvedBy}.`);
    if (r.clinical && !can(actor.role, 'request:resolve-clinical')) deny('Reports about allergies or the diet order must be reviewed by an admin.');
    const status = input.status === 'declined' ? 'declined' : 'resolved';
    const response = clean(input.response, 400);
    if (!response) invalid('Write a short response for the patient.', { response: 'Write a short response for the patient.' });
    const updated = repo.updateRequest(r.id, { status, response, resolvedBy: actor.name, resolvedAt: stamp() });
    audit(actor, r.patientId, 'request.resolve', `${status === 'resolved' ? 'Resolved' : 'Declined'}: ${label(REQUEST_TYPES, r.type)}.`);
    let released = [];
    if (r.report?.kind === 'new-allergy' && r.report.allergen) {
      const p = getPatientOr404(r.patientId);
      if (p.status === 'admitted') released = workflow.releaseAfterReport(actor, p, r);
    }
    return { request: requestView(updated), released };
  }

  // ------------------------------------------------------------ dashboard
  function getDashboard(actor, { date = today() } = {}) {
    requirePermission(actor, 'dashboard:view');
    assertDate(date);
    const overview = listPatients(actor, { date });
    const admitted = repo.listPatients().filter((p) => p.status === 'admitted');
    const isAdmitted = (pid) => admitted.some((p) => p.id === pid);
    const entries = repo.listEntries({ date }).filter((e) => isAdmitted(e.patientId));
    const fed = admitted.filter((p) => !p.dietOrder.npo);
    const byPeriod = PERIODS.map(({ id, label: l }) => {
      const es = entries.filter((e) => e.period === id);
      const c = (s) => es.filter((e) => e.status === s).length;
      return { period: id, label: l, offered: c('offered'), selected: c('selected'), confirmed: c('confirmed'), prepared: c('prepared'), delivered: c('delivered'), hold: c('on-hold'), cancelled: c('cancelled'), none: Math.max(0, fed.length - es.filter((e) => e.status !== 'cancelled').length) };
    });
    const from = addDays(today(), -6);
    const records = repo.listIntake({ from, to: today() }).filter((r) => isAdmitted(r.patientId));
    const outcomes = mealOutcomes(records);
    const trends = intakeTrends(outcomes, today(), 7);
    const sum = (k) => trends.reduce((s, d) => s + (d[k] ?? 0), 0);
    const recorded = sum('recorded');
    const rated = outcomes.filter((r) => r.satisfaction != null);
    const delivered7 = repo.listEntries({ from, to: today() }).filter((e) => isAdmitted(e.patientId) && e.status === 'delivered').length;
    const requests = repo.listRequests({ status: 'open' }).filter((r) => isAdmitted(r.patientId));
    const changes = workflow.openChanges({}).filter((c) => isAdmitted(c.patientId));
    const awaitingReview = [];
    for (const row of overview.patients) {
      for (const per of row.periods) if (per.reviewOnly && !per.entryStatus) awaitingReview.push({ demoId: row.demoId, id: row.id, period: per.period, review: per.review });
    }
    return {
      date, generatedAt: stamp(),
      counts: overview.counts,
      today: {
        patients: admitted.length, fed: fed.length, npo: admitted.length - fed.length, mealPeriods: fed.length * PERIOD_IDS.length, byPeriod,
        confirmed: byPeriod.reduce((s, p) => s + p.confirmed + p.prepared + p.delivered, 0),
        awaitingChoice: byPeriod.reduce((s, p) => s + p.offered, 0),
        awaitingConfirmation: byPeriod.reduce((s, p) => s + p.selected, 0),
        hold: byPeriod.reduce((s, p) => s + p.hold, 0),
        delivered: byPeriod.reduce((s, p) => s + p.delivered, 0),
        notScheduled: byPeriod.reduce((s, p) => s + p.none, 0),
      },
      changes: changes.slice(0, 30),
      awaitingReview,
      attention: overview.patients.filter((r) => r.flags.some((f) => ['review', 'no-options', 'hold', 'changes'].includes(f.code)))
        .map((r) => ({ id: r.id, demoId: r.demoId, preferredName: r.preferredName, ward: r.ward, bed: r.bed, flags: r.flags.filter((f) => ['review', 'no-options', 'hold', 'changes'].includes(f.code)) })),
      intakeConcerns: overview.patients.filter((r) => r.flags.some((f) => ['refusal', 'low-intake'].includes(f.code)) || r.appetite === 'poor')
        .map((r) => ({ id: r.id, demoId: r.demoId, preferredName: r.preferredName, ward: r.ward, bed: r.bed, appetite: r.appetite, flags: r.flags.filter((f) => ['refusal', 'low-intake'].includes(f.code)) })),
      appetite: APPETITE.map((a) => ({ id: a.id, label: a.label, count: admitted.filter((p) => p.appetite.level === a.id).length })),
      requests: { open: requests.length, clinical: requests.filter((r) => r.clinical).length, byType: REQUEST_TYPES.map((t) => ({ id: t.id, label: t.label, count: requests.filter((r) => r.type === t.id).length })) },
      trends,
      week: {
        from, to: today(),
        recorded, records: records.length, both: sum('both'),
        patientOnly: outcomes.filter((o) => o.sources.length === 1 && o.sources[0] === 'patient').length,
        staffOnly: outcomes.filter((o) => o.sources.length === 1 && o.sources[0] === 'staff').length,
        delivered: delivered7, notRecorded: Math.max(0, delivered7 - recorded),
        acceptanceRate: recorded ? Math.round((sum('accepted') / recorded) * 100) : null,
        satisfaction: rated.length ? Math.round((rated.reduce((s, r) => s + r.satisfaction, 0) / rated.length) * 10) / 10 : null,
        rated: rated.length,
        estimatedLeftoverShare: recorded ? Math.round((1 - outcomes.reduce((s, r) => s + (INTAKE_AMOUNTS.find((a) => a.id === r.amount)?.share ?? 0), 0) / outcomes.length) * 100) : null,
        measuredTrays: sum('measuredTrays'),
        measuredWasteG: sum('measuredTrays') ? sum('measuredWasteG') : null,
        reasons: reasonCounts(outcomes),
      },
      outcomeRule: OUTCOME_RULE,
      notice: 'These are indicators from recorded meals. They show what was recorded, not why it happened, and they do not show that CareBite caused any change.',
    };
  }

  // ------------------------------------------------------------ staff access (administrator)
  const staffView = (u) => ({
    id: u.id, username: u.username, name: u.name, email: u.email, role: u.role ?? null, roleLabel: u.role ? label(ROLES, u.role) : 'No role yet',
    status: u.status ?? 'active', statusLabel: label(ACCOUNT_STATUS, u.status ?? 'active'), requestedRole: u.requestedRole ?? null,
    requestedRoleLabel: u.requestedRole ? label(ROLES, u.requestedRole) : null, requestNote: u.requestNote ?? '', isDemo: Boolean(u.isDemo),
    createdAt: u.createdAt, decidedBy: u.decidedBy ?? null, decidedAt: u.decidedAt ?? null, decisionNote: u.decisionNote ?? '',
  });
  function listStaff(actor) {
    requirePermission(actor, 'staff:manage', 'Only an admin can manage staff access.');
    const users = repo.listUsers().filter((u) => u.role !== 'patient');
    return {
      pending: users.filter((u) => u.status === 'pending').sort((a, b) => (a.createdAt ?? '').localeCompare(b.createdAt ?? '')).map(staffView),
      staff: users.filter((u) => u.status !== 'pending').sort((a, b) => (a.role ?? '').localeCompare(b.role ?? '') || a.username.localeCompare(b.username)).map(staffView),
      roles: ROLES.filter((r) => ASSIGNABLE_STAFF_ROLES.includes(r.id)),
    };
  }
  function decideStaff(actor, userId, input = {}) {
    requirePermission(actor, 'staff:manage', 'Only an admin can manage staff access.');
    const u = repo.getUserById(String(userId));
    if (!u || u.role === 'patient') throw new ServiceError(404, 'user_not_found', 'That staff account does not exist.');
    if (u.id === actor.id) deny('You cannot change your own access.');
    if (u.isDemo) deny('Shared demonstration accounts cannot be changed.');
    const decision = input.decision;
    const note = clean(input.note, 200);
    const save = (fields, action, detail) => {
      const updated = repo.updateUser(u.id, { ...fields, decidedBy: actor.name, decidedAt: stamp(), updatedAt: stamp() });
      audit(actor, null, action, detail);
      return { user: staffView(updated) };
    };
    if (decision === 'approve' || decision === 'role') {
      if (!ASSIGNABLE_STAFF_ROLES.includes(input.role)) invalid('Choose the role to assign.', { role: 'Choose the role to assign.' });
      if (decision === 'role' && u.status !== 'active') conflict('not_active', 'Only active accounts can have their role changed.');
      if (decision === 'approve' && u.status !== 'pending') conflict('not_pending', 'This request has already been decided.');
      return decision === 'approve'
        ? save({ role: input.role, status: 'active', decisionNote: note }, 'staff.approve', `Approved staff access for @${u.username} as ${label(ROLES, input.role)}.`)
        : save({ role: input.role }, 'staff.role', `Changed @${u.username} from ${label(ROLES, u.role)} to ${label(ROLES, input.role)}.`);
    }
    if (decision === 'decline') {
      if (u.status !== 'pending') conflict('not_pending', 'Only pending requests can be declined. Deactivate an active account instead.');
      if (!note) invalid('Give a short reason for declining.', { note: 'Give a short reason for declining.' });
      return save({ status: 'declined', role: null, decisionNote: note }, 'staff.decline', `Declined staff access for @${u.username}.`);
    }
    if (decision === 'deactivate' || decision === 'reactivate') {
      if (decision === 'reactivate' && !u.role) conflict('no_role', 'Approve this request with a role instead.');
      const out = save({ status: decision === 'deactivate' ? 'deactivated' : 'active', decisionNote: note }, `staff.${decision}`, `${decision === 'deactivate' ? 'Deactivated' : 'Reactivated'} @${u.username}.`);
      repo.deleteUserSessions?.(u.id);
      return out;
    }
    return invalid('Unknown decision.');
  }

  // ------------------------------------------------------------ reference and export
  function getReference() {
    return {
      rulesetVersion: RULESET_VERSION, engineVersion: ENGINE_VERSION, review: RULESET_REVIEW, mealShare: MEAL_SHARE,
      dietCategories: DIET_CATEGORIES, activeDietCategories: ACTIVE_DIET_CATEGORIES.map((d) => d.id), dietSupport: DIET_SUPPORT,
      medicalRules: MEDICAL_RULES, safetyRules: SAFETY_RULES, intakeFlagRules: INTAKE_FLAG_RULES, sources: SOURCES,
      localProduction: LOCAL_PRODUCTION, localProductionSources: LOCAL_PRODUCTION_SOURCES,
      sfct: { ...SFCT_META, dishes: Object.keys(sfct).length, linked: Object.values(catalog().dishes).filter((d) => d.nutrition.available).length },
      outcomeRule: OUTCOME_RULE,
      vocab: {
        roles: ROLES, ageRanges: AGE_RANGES, wards: WARDS, conditions: CONDITIONS, allergens: ALLERGENS, allergyStatus: ALLERGY_STATUS, intolerances: INTOLERANCES, cuisines: CUISINES,
        periods: PERIODS, portions: PORTIONS, appetite: APPETITE, intakeAmounts: INTAKE_AMOUNTS, refusalReasons: REFUSAL_REASONS, requestTypes: REQUEST_TYPES, requestStatus: REQUEST_STATUS,
        reportKinds: REPORT_KINDS, textureLevels: TEXTURE_LEVELS, limitFields: LIMIT_FIELDS, entryStatus: ENTRY_STATUS, workflowSteps: WORKFLOW_STEPS, changeCauses: CHANGE_CAUSES,
        admissionStatus: ADMISSION_STATUS, sectionPermissions: Object.fromEntries(Object.entries(SECTION_PERMISSION).map(([k, p]) => [k, rolesWith(p)])), permissions: PERMISSIONS, dishKinds: DISH_KINDS, ingredientFlags: INGREDIENT_FLAGS, ingredientGroups: INGREDIENT_GROUPS, serviceTimes: SERVICE_TIMES,
      },
      ingredients: Object.values(catalog().ingredients).map((i) => ({ id: i.id, name: i.name, allergens: i.allergens ?? [] })).sort((a, b) => a.name.localeCompare(b.name)),
      menuSize: catalog().list.length,
    };
  }

  function exportData(actor, user) {
    const out = {
      exportedAt: stamp(),
      notice: 'This file contains information stored in CareBite. Keep it private.',
      account: { username: user.username, email: user.email, role: user.role, status: user.status ?? 'active', createdAt: user.createdAt },
    };
    if (actor.role === 'patient' && actor.patientId && repo.getPatient(actor.patientId)) {
      const p = repo.getPatient(actor.patientId);
      out.patientProfile = patientView(p, actor);
      out.mealSchedule = repo.listEntries({ patientId: p.id }).map((e) => ({ date: e.date, period: e.period, status: e.status, meal: e.mealName, portion: e.portion, history: e.history }));
      out.intakeAndFeedback = repo.listIntake({ patientId: p.id }).filter((r) => r.source === 'patient');
      out.requests = repo.listRequests({ patientId: p.id });
    }
    return out;
  }

  return {
    listPatients, getPatient, createPatient, updatePatientSection, deletePatient, dischargePatient, readmitPatient,
    createLinkCode, checkLinkCode, redeemLinkCode, claimLinkCode, recordAccountLink, unlinkAccounts,
    recordIntake, createRequest, listRequests, listPatientRequests, resolveRequest,
    getDashboard, getReference, exportData, listStaff, decideStaff,
    ...workflow.api, ...menuAdmin.api,
    reloadCatalog, catalog, menu, today,
  };
}

/** One-time account link code, e.g. "K7QF-29XM" (no 0/O or 1/I to avoid misreading). */
export function defaultRandomCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = new Uint8Array(8);
  globalThis.crypto.getRandomValues(bytes);
  const chars = [...bytes].map((b) => alphabet[b % alphabet.length]).join('');
  return `${chars.slice(0, 4)}-${chars.slice(4)}`;
}
