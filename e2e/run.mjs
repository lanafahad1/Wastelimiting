// Cross-role end-to-end test for CareBite (run against a freshly seeded server):
//   npm run reset-db && npm run build && npm start    (in one terminal)
//   npm run test:e2e                                   (in another)
// Options: BASE_URL (default http://localhost:3000), CHROMIUM (browser path).
// Covers the connected scenarios from the project brief plus RBAC and security checks.
import { chromium } from 'playwright';

const base = process.env.BASE_URL ?? 'http://localhost:3000';
const PASSWORD = 'CareBite#2026';
const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
const results = [];
const pageErrors = [];
const ok = (cond, msg) => { results.push([Boolean(cond), msg]); console.log(cond ? 'PASS' : 'FAIL', msg); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const today = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);

const states = {};
/** Sign in once per user (better-auth API), reuse the session cookie for every page. */
async function session(username, width = 390) {
  if (!states[username]) {
    const ctx = await browser.newContext();
    for (let i = 0; i < 6; i++) {
      const r = await ctx.request.post(`${base}/api/auth/sign-in/username`, { data: { username, password: PASSWORD }, headers: { Origin: base } });
      if (r.ok()) break;
      if (r.status() === 429) { await sleep(15000); continue; }
      throw new Error(`login ${username}: ${r.status()}`);
    }
    states[username] = await ctx.storageState();
    await ctx.close();
  }
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, storageState: states[username] });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => pageErrors.push(`[${username}] ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) pageErrors.push(`[${username}] ${m.text().slice(0, 200)}`); });
  return page;
}
const api = (page, method, path, body) => page.request.fetch(`${base}${path}`, {
  method, headers: { 'X-CareBite-Request': '1', Origin: base, ...(body ? { 'Content-Type': 'application/json' } : {}) }, data: body ? JSON.stringify(body) : undefined,
});
const json = async (page, path) => (await api(page, 'GET', path)).json();
/** Wait for a toast whose text matches (toasts stack, so match by text rather than position). */
const seeToast = (page, re) => page.locator('.t-toast', { hasText: re }).first().waitFor({ timeout: 8000 }).then(() => true, () => false);
const dialog = (page) => page.locator('[role=dialog]').last();

// ---------------------------------------------------------------- 1. choose → confirm
const noura = await session('noura.1001');
await noura.goto(`${base}/my-meals`);
await noura.waitForLoadState('networkidle');
ok(/^(Choose your|Your )/.test((await noura.locator('main').textContent()).match(/(Choose your \w+\.|Your [^.]+\.)/)?.[0] ?? ''), 'patient sees a plain next-meal message');
ok(!(await noura.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)), 'My Meals has no horizontal scroll at 390 px');
let choose = noura.locator('button:visible', { hasText: /^Choose this meal$/ }).first();
if (!(await choose.count())) {
  await noura.locator('section[id^=mp-] button[aria-expanded=false]').first().click();
  choose = noura.locator('button:visible', { hasText: /^Choose this meal$/ }).first();
}
const chosenPeriod = (await choose.evaluate((b) => b.closest('section[id^=mp-]')?.id ?? '')).replace('mp-', '');
await choose.click();
await noura.waitForTimeout(1200);
ok((await noura.locator(`#mp-${chosenPeriod}`).textContent()).includes('Your choice has been sent to the nutrition team.'), `patient choice recorded (${chosenPeriod})`);

const my = await json(noura, '/api/patients/1/my-meals');
const sel = my.periods.find((p) => p.entry?.status === 'selected' && p.period === chosenPeriod) ?? my.periods.find((p) => p.entry?.status === 'selected');
const staff = await session('staff.demo', 1300);
await staff.goto(`${base}/patients/1?date=${my.date}`);
await staff.locator(`#period-${sel.period} button`, { hasText: /^Confirm / }).first().click();
await dialog(staff).getByRole('button', { name: 'Confirm meal' }).click();
ok(await seeToast(staff, /confirmed/i), 'staff confirmed the patient’s choice with one primary action');
const after = await json(noura, `/api/patients/1/my-meals?date=${my.date}`);
ok(after.periods.find((p) => p.period === sel.period)?.entry?.status === 'confirmed', 'status is Confirmed by nutrition team');

// ---------------------------------------------------------------- 3. alternative request → response
await noura.goto(`${base}/my-meals`);
await noura.getByRole('button', { name: /Ask for a different meal/ }).first().click();
await dialog(noura).locator('textarea').fill('Could I have something with more vegetables? (e2e)');
await dialog(noura).getByRole('button', { name: /Send to the nutrition team/ }).click();
await dialog(noura).getByText(/Pending/).first().waitFor({ timeout: 6000 }).catch(() => {});
ok(await dialog(noura).getByText(/Pending/).count() > 0, 'request confirmation shows Pending');
await staff.goto(`${base}/requests`);
const card = staff.locator('article, li, section').filter({ hasText: 'more vegetables? (e2e)' }).last();
await card.getByRole('button', { name: 'Respond' }).click();
await dialog(staff).locator('textarea').fill('We added a vegetable option for you.');
await dialog(staff).getByRole('button', { name: /Send response/ }).click();
await staff.waitForTimeout(1000);
await noura.goto(`${base}/my-requests`);
ok((await noura.locator('main').textContent()).includes('We added a vegetable option for you.'), 'patient sees the team’s response (Resolved)');

// ---------------------------------------------------------------- 4. reported allergy → review → recheck
await noura.goto(`${base}/my-profile`);
ok((await noura.locator('main').textContent()).includes('You can update your food preferences and appetite. Changes to your prescribed diet or allergies must be reviewed by your nutrition team.'), 'exact My Food Profile notice');
await noura.goto(`${base}/my-profile?report=1`);
await dialog(noura).locator('#cl-alg').selectOption('sesame');
await dialog(noura).locator('textarea').fill('I was told to avoid sesame. (e2e)');
await dialog(noura).getByRole('button', { name: /Send to my nutrition team/ }).click();
await noura.waitForTimeout(1200);
const reqs = await json(staff, '/api/requests');
ok(reqs.requests.some((r) => r.report?.allergen === 'sesame' && r.patient?.demoId === 'CB-1001'), 'nutrition team sees the sesame report');
const admin = await session('admin.demo', 1300);
const p1 = (await json(admin, '/api/patients/1')).patient;
const upd = await api(admin, 'PATCH', '/api/patients/1/sections/clinical', { ...p1, allergies: { ...p1.allergies, status: 'recorded', confirmed: [...new Set([...p1.allergies.confirmed, 'sesame'])] } });
ok(upd.ok(), 'admin recorded the reviewed allergy (clinical edit is admin only)');
const staffClinical = await api(staff, 'PATCH', '/api/patients/1/sections/clinical', p1);
ok(staffClinical.status() === 403, 'staff cannot change clinical information (403)');

// ---------------------------------------------------------------- 5. unavailable after confirmation → hold → replacement
const k = await json(staff, `/api/kitchen?date=${today}`);
const pidOf = Object.fromEntries((await json(staff, '/api/patients')).patients.map((x) => [x.demoId, x.id]));
// A confirmed tray whose patient has another eligible meal for that period (so a replacement exists).
let tray = null;
for (const t of k.trays.filter((x) => x.status === 'confirmed' && x.demoId !== 'CB-1001')) {
  const day = await json(staff, `/api/patients/${pidOf[t.demoId]}/day?date=${today}`);
  const per = day.periods.find((x) => x.period === t.period);
  if ((per?.screening?.eligible ?? []).some((m) => m.id !== t.mealId)) { tray = t; break; }
}
if (tray) {
  await admin.goto(`${base}/menu/manage`);
  await admin.getByRole('button', { name: new RegExp(`^Mark unavailable\\s*:\\s*${tray.meal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`) }).first().click();
  await dialog(admin).locator('#av-r').fill('Out of stock today (e2e)');
  await dialog(admin).getByRole('button', { name: /^Mark unavailable$/ }).click();
  ok(await seeToast(admin, /unavailable/i), 'meal marked unavailable from Menu Management');
  const pid = (await json(staff, '/api/patients')).patients.find((x) => x.demoId === tray.demoId).id;
  const held = await json(staff, `/api/patients/${pid}/day?date=${today}`);
  ok(held.periods.find((x) => x.period === tray.period)?.entry?.status === 'on-hold', 'the confirmed order is on hold and blocked from preparation');
  ok((await api(staff, 'POST', `/api/entries/${tray.entryId}/progress`, { to: 'prepared' })).status() === 409, 'a held order cannot be marked prepared');
  await admin.goto(`${base}/patients/${pid}?date=${today}`);
  await admin.locator(`#period-${tray.period}`).getByRole('button', { name: /Review flagged meal/ }).click();
  await dialog(admin).getByRole('button', { name: /Replace with another meal/ }).click();
  await admin.waitForTimeout(500);
  const note = dialog(admin).locator('textarea').first();
  if (await note.count()) await note.fill('Reviewed replacement after the menu change (e2e).').catch(() => {});
  await dialog(admin).getByRole('button', { name: /Confirm meal|Replace and confirm/ }).click();
  ok(await seeToast(admin, /confirmed/i), 'admin confirmed a replacement for the held meal');
  const k2 = await json(staff, `/api/kitchen?date=${today}`);
  ok(k2.alerts.length > 0, 'kitchen sees a change alert to acknowledge');
  ok(!k2.trays.some((t) => t.entryId === tray.entryId && t.meal === tray.meal), 'the kitchen never gets both the old and the new meal');
} else ok(false, 'a confirmed tray exists for the unavailability test');

// ---------------------------------------------------------------- 2. kitchen prepared → delivered
await staff.goto(`${base}/kitchen?date=${today}`);
const prep = staff.getByRole('button', { name: /^Mark prepared/ }).first();
if (await prep.count()) {
  await prep.click();
  await staff.waitForTimeout(800);
  const deliver = staff.getByRole('button', { name: /^Mark delivered/ }).first();
  await deliver.click();
  ok(await seeToast(staff, /Marked delivered/i), 'kitchen marked a tray prepared, then delivered');
} else ok(false, 'a confirmed tray exists today for the kitchen test');

// ---------------------------------------------------------------- 6. discharge → leaves kitchen lists, history kept
await staff.goto(`${base}/patients/2?tab=profile`);
await staff.getByRole('button', { name: 'Record discharge' }).first().click();
await dialog(staff).getByRole('button', { name: 'Record discharge' }).click();
await staff.waitForTimeout(1000);
const k3 = await json(staff, `/api/kitchen?date=${today}`);
ok(!k3.trays.some((t) => t.demoId === 'CB-1002'), 'discharged patient is not on the kitchen trays');
await staff.goto(`${base}/patients?include=discharged`);
ok((await staff.locator('main').textContent()).includes('CB-1002'), 'discharged patient is listed under Discharged with history kept');

// ---------------------------------------------------------------- 7. admin approves staff access
await admin.goto(`${base}/staff-access`);
await admin.getByRole('button', { name: /Approve and assign a role/ }).first().click();
const role = dialog(admin).locator('select');
if (await role.count()) await role.selectOption('staff');
await dialog(admin).getByRole('button', { name: /^Approve$/ }).click();
await admin.waitForTimeout(1000);
const staffList = await json(admin, '/api/admin/staff');
ok(staffList.staff.some((u) => u.username === 'layla.applicant' && u.role === 'staff' && u.status === 'active'), 'admin approved the pending staff request');

// ---------------------------------------------------------------- 8. RBAC
const statusOf = async (page, path) => (await page.request.get(`${base}${path}`, { maxRedirects: 0 })).status();
ok(await statusOf(staff, '/staff-access') === 403, 'staff: Staff Access is 403');
ok(await statusOf(staff, '/patients/new') === 403, 'staff: New patient profile is 403');
ok(await statusOf(noura, '/patients') === 403 && await statusOf(noura, '/kitchen') === 403, 'patient: staff pages are 403');
ok((await api(noura, 'GET', '/api/patients/2')).status() === 403, 'patient cannot read another patient (API 403)');
const anon = await browser.newContext();
ok([307, 308].includes((await anon.request.get(`${base}/patients`, { maxRedirects: 0 })).status()), 'signed-out visitors are redirected to log in');

// ---------------------------------------------------------------- 9. security
const home = await anon.request.get(`${base}/`);
const csp = home.headers()['content-security-policy'] ?? '';
ok(/script-src 'self' 'nonce-[^']+' 'strict-dynamic'/.test(csp) && /frame-ancestors 'none'/.test(csp), 'strict CSP with a per-request nonce');
ok(home.headers()['x-frame-options'] === 'DENY' && home.headers()['x-content-type-options'] === 'nosniff', 'security headers present');
const login = await anon.request.post(`${base}/api/auth/sign-in/username`, { data: { username: 'khalid.1004', password: PASSWORD }, headers: { Origin: base } });
const loginBody = await login.text();
ok(login.ok() && !/"token"/.test(loginBody), 'sign-in response carries no session token (HttpOnly cookie only)');
const cookie = login.headers()['set-cookie'] ?? '';
ok(/HttpOnly/i.test(cookie) && /SameSite=Lax/i.test(cookie), 'session cookie is HttpOnly and SameSite=Lax');
ok((await anon.request.post(`${base}/api/auth/sign-in/username`, { data: { username: 'khalid.1004', password: PASSWORD }, headers: { Origin: 'https://evil.example' } })).status() === 403, 'cross-site sign-in is rejected');
ok((await anon.request.post(`${base}/api/patients/1/discharge`, { data: {}, headers: { Origin: base } })).status() === 403, 'API mutation without the CSRF header is rejected');
const esc = await anon.request.post(`${base}/api/auth/sign-up/email`, { data: { accountType: 'staff', email: `e2e${Date.now()}@test.local`, password: 'a long passphrase', name: 'E2E', username: `e2e${Date.now() % 100000}`, requestedRole: 'staff', requestNote: 'x', role: 'admin' }, headers: { Origin: base } });
ok(esc.status() >= 400 && /not allowed/i.test(await esc.text()), 'sign-up cannot set a role (privilege escalation blocked)');
const weak = await anon.request.post(`${base}/api/auth/sign-up/email`, { data: { accountType: 'staff', email: `w${Date.now()}@test.local`, password: 'short', name: 'W', username: `w${Date.now() % 100000}`, requestedRole: 'staff', requestNote: 'x' }, headers: { Origin: base } });
ok(weak.status() === 422 && /at least 8/.test(await weak.text()), 'passwords shorter than 8 characters are refused');

// ---------------------------------------------------------------- 10. pages at phone width: no overflow, no errors
const sweep = { 'noura.1001': ['/my-meals', '/my-meals?view=week', '/my-requests', '/my-profile', '/settings'], 'staff.demo': ['/patients', '/patients/1', '/patients/1?tab=profile', '/patients/1?tab=intake', '/dashboard', '/requests', '/schedule', '/kitchen', '/menu/manage'], 'admin.demo': ['/patients/new', '/staff-access', '/menu/manage?tab=sfct'] };
for (const [user, paths] of Object.entries(sweep)) {
  const pg = await session(user, 390);
  for (const p of paths) {
    await pg.goto(`${base}${p}`);
    await pg.waitForLoadState('networkidle');
    ok(!(await pg.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)), `390 px, no horizontal scroll: ${p} (${user})`);
  }
}
const pub = await anon.newPage();
for (const p of ['/', '/how-it-works', '/menu', '/meal/kabsa-lunch-tray', '/about', '/diets', '/sources', '/contact', '/privacy', '/disclaimer', '/login', '/register']) {
  await pub.goto(`${base}${p}`);
  ok((await pub.locator('h1').count()) === 1, `one h1: ${p}`);
}
ok(pageErrors.length === 0, `no page or console errors${pageErrors.length ? `: ${pageErrors.slice(0, 5).join(' | ')}` : ''}`);

const failed = results.filter(([c]) => !c);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
await browser.close();
process.exit(failed.length ? 1 : 0);
