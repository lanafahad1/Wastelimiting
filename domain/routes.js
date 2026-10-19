// API route table shared by the Node server and the browser demo backend.
// Authentication endpoints are implemented separately by each backend
// because they deal with cookies (server) or local demo accounts (browser).

import { ServiceError } from './service.js';

export function createApiRoutes(service) {
  const r = (method, path, handler, opts = {}) => ({ method, path, handler, ...opts });
  return [
    r('GET', '/api/reference', () => service.getReference(), { public: true }),
    r('GET', '/api/menu', ({ query }) => service.getMenu({ date: query.date || undefined, period: query.period || null, q: query.q ?? '', diet: query.diet || null, type: query.type || null }), { public: true }),
    r('GET', '/api/meals/:id', ({ params, query, user }) => service.getMealDetail(user, params.id, { patientId: query.patient || null, date: query.date || undefined, period: query.period || null }), { public: true }),

    r('GET', '/api/dashboard', ({ user, query }) => service.getDashboard(user, { date: query.date || undefined })),
    r('GET', '/api/patients', ({ user, query }) => service.listPatients(user, { date: query.date || undefined, ward: query.ward || null, include: query.include || 'admitted' })),
    r('POST', '/api/patients', ({ user, body }) => service.createPatient(user, body)),
    r('GET', '/api/patients/:id', ({ user, params }) => service.getPatient(user, params.id)),
    r('DELETE', '/api/patients/:id', ({ user, params, body }) => service.deletePatient(user, params.id, body)),
    r('PATCH', '/api/patients/:id/sections/:section', ({ user, params, body }) => service.updatePatientSection(user, params.id, params.section, body)),
    r('POST', '/api/patients/:id/discharge', ({ user, params, body }) => service.dischargePatient(user, params.id, body)),
    r('POST', '/api/patients/:id/readmit', ({ user, params, body }) => service.readmitPatient(user, params.id, body)),
    r('POST', '/api/patients/:id/link-code', ({ user, params }) => service.createLinkCode(user, params.id)),
    r('DELETE', '/api/patients/:id/accounts', ({ user, params }) => service.unlinkAccounts(user, params.id)),
    r('GET', '/api/patients/:id/day', ({ user, params, query }) => service.getDayPlan(user, params.id, { date: query.date || undefined })),
    r('GET', '/api/patients/:id/my-meals', ({ user, params, query }) => service.getMyMeals(user, params.id, { date: query.date || undefined, week: query.week || null })),
    r('GET', '/api/patients/:id/schedule', ({ user, params, query }) => service.getPatientSchedule(user, params.id, { from: query.from || undefined, days: query.days })),
    r('POST', '/api/patients/:id/offers', ({ user, params, body }) => service.offerOptions(user, params.id, body)),
    r('POST', '/api/patients/:id/auto-schedule', ({ user, params, body }) => service.autoSchedule(user, params.id, body)),
    r('POST', '/api/patients/:id/select', ({ user, params, body }) => service.selectMeal(user, params.id, body)),
    r('POST', '/api/patients/:id/confirm', ({ user, params, body }) => service.confirmMeal(user, params.id, body)),
    r('POST', '/api/patients/:id/cancel', ({ user, params, body }) => service.cancelMeal(user, params.id, body)),
    r('POST', '/api/patients/:id/review', ({ user, params, body }) => service.resolveEntry(user, params.id, body)),
    r('POST', '/api/patients/:id/intake', ({ user, params, body }) => service.recordIntake(user, params.id, body)),
    r('GET', '/api/patients/:id/requests', ({ user, params }) => service.listPatientRequests(user, params.id)),
    r('POST', '/api/patients/:id/requests', ({ user, params, body }) => service.createRequest(user, params.id, body)),

    r('GET', '/api/requests', ({ user, query }) => service.listRequests(user, { status: query.status ?? 'open' })),
    r('PATCH', '/api/requests/:id', ({ user, params, body }) => service.resolveRequest(user, params.id, body)),
    r('GET', '/api/schedule', ({ user, query }) => service.getSchedule(user, { date: query.date || undefined, ward: query.ward || null })),
    r('GET', '/api/kitchen', ({ user, query }) => service.getKitchenSummary(user, { date: query.date || undefined, period: query.period || null })),
    r('POST', '/api/entries/:id/progress', ({ user, params, body }) => service.progressEntry(user, params.id, body)),
    r('POST', '/api/entries/:id/undo', ({ user, params }) => service.undoProgress(user, params.id)),
    r('POST', '/api/entries/:id/changes/:change/ack', ({ user, params }) => service.ackChange(user, params.id, params.change)),

    r('GET', '/api/manage/catalog', ({ user }) => service.getManageCatalog(user)),
    r('POST', '/api/manage/ingredients', ({ user, body }) => service.saveIngredient(user, body)),
    r('POST', '/api/manage/dishes', ({ user, body }) => service.saveDish(user, body)),
    r('POST', '/api/manage/meals', ({ user, body }) => service.saveMeal(user, body)),
    r('POST', '/api/manage/meals/:id/availability', ({ user, params, body }) => service.setAvailability(user, params.id, body)),
    r('POST', '/api/manage/meals/:id/verify', ({ user, params, body }) => service.verifyMeal(user, params.id, body)),
    r('GET', '/api/manage/menu', ({ user, query }) => service.getMenuPlan(user, { from: query.from || undefined })),
    r('POST', '/api/manage/menu', ({ user, body }) => service.setMenu(user, body)),

    r('GET', '/api/admin/staff', ({ user }) => service.listStaff(user)),
    r('POST', '/api/admin/staff/:id', ({ user, params, body }) => service.decideStaff(user, params.id, body)),
  ];
}

/** Match a request against a route table. Returns { route, params } or null. */
export function matchRoute(routes, method, pathname) {
  for (const route of routes) {
    if (route.method !== method) continue;
    const a = route.path.split('/');
    const b = pathname.replace(/\/+$/, '').split('/');
    if (a.length !== b.length) continue;
    const params = {};
    let ok = true;
    for (let i = 0; i < a.length; i++) {
      if (a[i].startsWith(':')) {
        try { params[a[i].slice(1)] = decodeURIComponent(b[i]); } catch { ok = false; break; }
      } else if (a[i] !== b[i]) { ok = false; break; }
    }
    if (ok) return { route, params };
  }
  return null;
}

export function errorBody(err) {
  // Duck-typed as well, so errors from a different module copy (dev reloads) keep their status.
  if (err instanceof ServiceError || (err && Number.isInteger(err.status) && typeof err.code === 'string' && err.status < 600)) return { status: err.status, body: { error: { code: err.code, message: err.message, ...(err.details ?? {}) } } };
  return { status: 500, body: { error: { code: 'server_error', message: 'Something went wrong on our side. Please try again.' } } };
}

export const PASSWORD_RULE = 'Use at least 8 characters, including a letter and a number.';
export const USERNAME_RULE = '3–20 characters: letters, numbers, dots or underscores, starting with a letter.';
const USERNAME_RE = /^[A-Za-z][A-Za-z0-9._]{2,19}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validate account fields. Only the fields present in `input` are checked,
 * unless listed in `require`. Returns cleaned values and field-level errors.
 */
export function validateAccount(input, { require = [] } = {}) {
  const errors = {};
  const has = (k) => input[k] !== undefined || require.includes(k);
  const username = String(input.username ?? '').trim();
  const email = String(input.email ?? '').trim().toLowerCase().slice(0, 120);
  if (has('username')) {
    if (!username) errors.username = 'Please choose a username.';
    else if (!USERNAME_RE.test(username)) errors.username = `Usernames use ${USERNAME_RULE.charAt(0).toLowerCase()}${USERNAME_RULE.slice(1)}`;
  }
  if (has('email')) {
    if (!email) errors.email = 'Please enter your email address.';
    else if (!EMAIL_RE.test(email)) errors.email = 'Please enter a valid email address, for example name@example.com.';
  }
  if (has('password')) {
    const pw = String(input.password ?? '');
    if (!pw) errors.password = 'Please choose a password.';
    else if (!(pw.length >= 8 && /[A-Za-z]/.test(pw) && /\d/.test(pw))) errors.password = PASSWORD_RULE;
    else if (pw.length > 128) errors.password = 'Passwords can be at most 128 characters.';
  }
  if (has('confirmPassword') && String(input.confirmPassword ?? '') !== String(input.password ?? '')) {
    errors.confirmPassword = 'The two passwords do not match.';
  }
  return { username, email, errors };
}

/** A login identifier is an email when it contains "@", otherwise a username. */
export const isEmailIdentifier = (id) => String(id ?? '').includes('@');
