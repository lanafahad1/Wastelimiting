// Account endpoints shared by the Node server and the browser demo backend.
// Each backend supplies password hashing and applies the session result
// (an HttpOnly cookie on the server, browser storage in demo mode).
//
// Account types:
//   patient — needs a one-time link code from the nutrition team; the account
//             then reaches only that patient's own profile and meals.
//   staff   — a request for staff access. The account has no role and no access
//             until an admin approves it and assigns the role.
//             Choosing a job when asking does not grant anything. In a real
//             deployment staff accounts come from the hospital's identity system
//             after identity checks; CareBite does not verify identity.

import { validateAccount, isEmailIdentifier } from './routes.js';
import { ServiceError } from './service.js';
import { ROLES, ASSIGNABLE_STAFF_ROLES, ACCOUNT_STATUS, label } from './constants.js';
import { clean } from './patient.js';


export function publicUser(u, repo) {
  if (!u) return null;
  const patient = u.patientId ? repo.getPatient(u.patientId) : null;
  return {
    id: u.id, username: u.username, name: u.name, email: u.email, role: u.role ?? null, roleLabel: u.role ? label(ROLES, u.role) : 'Staff access requested',
    status: u.status ?? 'active', statusLabel: label(ACCOUNT_STATUS, u.status ?? 'active'), requestedRole: u.requestedRole ?? null, decisionNote: u.decisionNote ?? '',
    patientId: patient ? patient.id : null, patientDemoId: patient?.demoId ?? null, isDemo: Boolean(u.isDemo), createdAt: u.createdAt,
  };
}

/**
 * @param {object} o
 * @param {(pw: string) => string|Promise<string>} o.hashPassword
 * @param {(pw: string, user: object) => boolean|Promise<boolean>} o.verifyPassword  checks a user's password
 * @param {() => void} o.resetDemo  rebuilds the demonstration hospital
 */
export function createAccountApi({ repo, service, hashPassword, verifyPassword, demoAccounts, demoPassword, resetDemo, now = () => new Date() }) {
  const fail = (status, code, message, extra) => { throw new ServiceError(status, code, message, extra); };
  const findByIdentifier = (id) => {
    const v = String(id ?? '').trim();
    if (!v) return null;
    return isEmailIdentifier(v) ? repo.getUserByEmail(v.toLowerCase()) : repo.getUserByUsername(v);
  };
  const out = (user, extra = {}) => ({ user: publicUser(user, repo), ...extra });

  async function register(body = {}) {
    const { username, email, errors } = validateAccount(body, { require: ['username', 'email', 'password', 'confirmPassword'] });
    const type = body.accountType === 'staff' ? 'staff' : 'patient';
    let patient = null;
    const name = clean(body.name, 40);
    if (type === 'patient') {
      patient = service.checkLinkCode(body.linkCode);
      if (!String(body.linkCode ?? '').trim()) errors.linkCode = 'Enter the link code the nutrition team gave you.';
      else if (!patient) errors.linkCode = 'This code is not valid or has expired. Ask the nutrition team for a new code.';
      else if (repo.listUsersByPatient(patient.id).length) errors.linkCode = 'This patient profile already has a personal account.';
    } else {
      if (!name) errors.name = 'Enter your name as the admin will know it.';
      if (!ASSIGNABLE_STAFF_ROLES.includes(body.requestedRole)) errors.requestedRole = 'Choose the job you are asking access for.';
      if (!clean(body.requestNote, 200)) errors.requestNote = 'Tell the admin your department or job title.';
    }
    if (!errors.username && repo.getUserByUsername(username)) errors.username = 'This username is already taken. Please choose another.';
    if (!errors.email && repo.getUserByEmail(email)) errors.email = 'An account with this email already exists. Try logging in instead.';
    if (Object.keys(errors).length) {
      const taken = errors.username?.includes('taken') || errors.email?.includes('already exists');
      fail(taken ? 409 : 422, taken ? 'account_exists' : 'validation_failed', 'Please check the highlighted fields.', { errors });
    }
    const at = now().toISOString();
    const created = type === 'patient'
      ? repo.createUser({ username, email, name: name || patient.preferredName || username, role: 'patient', status: 'active', patientId: null, passwordHash: await hashPassword(String(body.password)), isDemo: false, createdAt: at, updatedAt: at })
      : repo.createUser({ username, email, name, role: null, status: 'pending', requestedRole: body.requestedRole, requestNote: clean(body.requestNote, 200), patientId: null, passwordHash: await hashPassword(String(body.password)), isDemo: false, createdAt: at, updatedAt: at });
    if (patient) service.redeemLinkCode(created, body.linkCode);
    else repo.addAudit({ at, actorId: created.id, actorRole: 'system', actorName: name, patientId: null, action: 'staff.request', detail: `@${username} asked for staff access as ${label(ROLES, body.requestedRole)}.` });
    return { status: 201, body: out(repo.getUserById(created.id), type === 'staff' ? { pending: true } : {}), session: { start: created.id } };
  }

  async function login(body = {}, { limiter, clientKey = '' } = {}) {
    const identifier = String(body.identifier ?? body.username ?? body.email ?? '').trim();
    if (!identifier || !body.password) {
      fail(422, 'validation_failed', 'Enter your username or email and your password.', { errors: { ...(identifier ? {} : { identifier: 'Enter your username or email.' }), ...(body.password ? {} : { password: 'Enter your password.' }) } });
    }
    const key = `${clientKey}|${identifier.toLowerCase()}`;
    if (limiter && !limiter.check(key)) fail(429, 'rate_limited', 'Too many login attempts. Please wait 15 minutes and try again.');
    const found = findByIdentifier(identifier);
    if (!found || !(await verifyPassword(String(body.password), found))) fail(401, 'invalid_credentials', 'The username, email or password is incorrect.');
    limiter?.reset(key);
    if (found.status === 'deactivated') fail(403, 'account_deactivated', 'This account has been deactivated by an admin.');
    return { status: 200, body: out(found), session: { start: found.id } };
  }

  function demoLogin(body = {}) {
    const account = demoAccounts.find((a) => a.username === body.username);
    const found = account && repo.getUserByUsername(account.username);
    if (!found?.isDemo) fail(404, 'not_found', 'Demo account not found.');
    return { status: 200, body: out(found), session: { start: found.id } };
  }

  async function account(method, path, body, user, { otherSessionsEnd } = {}) {
    if (!user) fail(401, 'unauthenticated', 'Please log in to continue.');
    if (method === 'PATCH' && path === '/api/account') {
      const { username, email, errors } = validateAccount({ username: body.username ?? user.username, email: body.email ?? user.email });
      const name = body.name === undefined ? user.name : clean(body.name, 40);
      if (!name) errors.name = 'Enter the name to show in CareBite.';
      if (Object.keys(errors).length) fail(422, 'validation_failed', 'Please check the highlighted fields.', { errors });
      if (user.isDemo && (email !== user.email || username !== user.username)) fail(403, 'demo_account', 'The username and email of a shared demo account cannot be changed.');
      const byName = repo.getUserByUsername(username);
      if (byName && byName.id !== user.id) fail(409, 'account_exists', 'That username is already taken.', { errors: { username: 'This username is already taken.' } });
      const byEmail = repo.getUserByEmail(email);
      if (byEmail && byEmail.id !== user.id) fail(409, 'account_exists', 'That email is used by another account.', { errors: { email: 'This email is used by another account.' } });
      return { status: 200, body: out(repo.updateUser(user.id, { username, email, name, updatedAt: now().toISOString() })) };
    }
    if (method === 'POST' && path === '/api/account/password') {
      if (user.isDemo) fail(403, 'demo_account', 'The password of a shared demo account cannot be changed.');
      if (!(await verifyPassword(String(body.currentPassword ?? ''), user))) fail(401, 'invalid_credentials', 'Your current password is incorrect.', { errors: { currentPassword: 'Incorrect password.' } });
      const { errors } = validateAccount({ password: body.newPassword, confirmPassword: body.confirmPassword ?? body.newPassword });
      if (errors.password) fail(422, 'validation_failed', errors.password, { errors: { newPassword: errors.password } });
      if (errors.confirmPassword) fail(422, 'validation_failed', errors.confirmPassword, { errors: { confirmPassword: errors.confirmPassword } });
      repo.updateUser(user.id, { passwordHash: await hashPassword(String(body.newPassword)), updatedAt: now().toISOString() });
      otherSessionsEnd?.();
      return { status: 200, body: { ok: true, message: 'Password updated. Other sessions were signed out.' } };
    }
    if (method === 'POST' && path === '/api/account/link') {
      if (user.role !== 'patient') fail(403, 'forbidden', 'Only patient accounts can be linked to a patient profile.');
      if (user.patientId && repo.getPatient(user.patientId)) fail(409, 'already_linked', 'This account is already linked to a patient profile.');
      service.redeemLinkCode(user, body.linkCode);
      return { status: 200, body: out(repo.getUserById(user.id)) };
    }
    if (method === 'GET' && path === '/api/account/export') {
      return { status: 200, body: service.exportData(user, user), headers: { 'Content-Disposition': 'attachment; filename="carebite-my-data.json"' } };
    }
    if (method === 'POST' && path === '/api/account/reset-demo') {
      if (!(user.isDemo && user.role === 'admin')) fail(403, 'forbidden', 'Only the demo admin account can reset the demonstration hospital.');
      resetDemo();
      return { status: 200, body: { ok: true, message: 'The demonstration hospital was reset to its starting state.' } };
    }
    if (method === 'DELETE' && path === '/api/account') {
      if (user.isDemo) fail(403, 'demo_account', 'Shared demo accounts cannot be deleted.');
      if (!(await verifyPassword(String(body?.password ?? ''), user))) fail(401, 'invalid_credentials', 'Password is incorrect.', { errors: { password: 'Incorrect password.' } });
      repo.deleteUser(user.id);
      return {
        status: 200, session: { end: true },
        body: { deleted: true, message: user.role === 'patient' ? 'Your personal account was deleted. Your hospital nutrition record is kept by the hospital nutrition team.' : 'Your account was deleted.' },
      };
    }
    return null;
  }

  return {
    register, login, demoLogin, account,
    demoList: () => ({
      password: demoPassword,
      accounts: demoAccounts.map(({ username, email, name, role, summary, patientDemoId }) => ({ username, email, name, role, roleLabel: label(ROLES, role), summary, patientDemoId: patientDemoId ?? null })),
    }),
  };
}
