// Key-value repository implementing the same interface as the Postgres snapshot
// repository (domain/pg-store.js). Used by unit tests (backed by an in-memory
// object). It is NOT a secure store.

const EMPTY = () => ({
  seq: 1, users: {}, patients: {}, entries: [], intake: [], requests: [], audit: [],
  catalog: { ingredients: {}, dishes: {}, meals: {}, menu: { cycle: Array.from({ length: 7 }, () => ({})), dates: {} } },
});

export function createMemoryRepo(storage = null, key = 'carebite-hospital-demo-v5') {
  let db;
  try { db = storage ? JSON.parse(storage.getItem(key) || 'null') : null; } catch { db = null; }
  db = { ...EMPTY(), ...(db ?? {}) };
  const persist = () => { if (storage) { try { storage.setItem(key, JSON.stringify(db)); } catch { /* storage full or blocked */ } } };
  const id = () => String(db.seq++);
  const clone = (x) => (x == null ? x : JSON.parse(JSON.stringify(x)));
  const inRange = (date, { date: d, from, to }) => (!d || date === d) && (!from || date >= from) && (!to || date <= to);
  const slot = (patientId, date, period) => (x) => x.patientId === String(patientId) && x.date === date && x.period === period;

  return {
    kind: 'memory',
    // ---- users
    createUser(u) { const rec = { id: id(), role: 'patient', status: 'active', patientId: null, isDemo: false, ...u }; db.users[rec.id] = rec; persist(); return clone(rec); },
    getUserById(userId) { return clone(db.users[userId] ?? null); },
    getUserByEmail(email) { return clone(Object.values(db.users).find((u) => u.email === email) ?? null); },
    getUserByUsername(username) { const k = String(username).toLowerCase(); return clone(Object.values(db.users).find((u) => String(u.username ?? '').toLowerCase() === k) ?? null); },
    updateUser(userId, fields) { Object.assign(db.users[userId], clone(fields)); persist(); return clone(db.users[userId]); },
    deleteUser(userId) { delete db.users[userId]; persist(); },
    listUsers() { return clone(Object.values(db.users)); },
    listUsersByPatient(patientId) { return clone(Object.values(db.users).filter((u) => u.patientId != null && String(u.patientId) === String(patientId))); },
    countActiveAdmins() { return Object.values(db.users).filter((u) => u.role === 'admin' && u.status === 'active').length; },
    deleteUserSessions() { /* sessions are managed by better-auth */ },
    // ---- patients
    listPatients() { return clone(Object.values(db.patients)); },
    getPatient(patientId) { return clone(db.patients[patientId] ?? null); },
    getPatientByDemoId(demoId) { return clone(Object.values(db.patients).find((p) => p.demoId === demoId) ?? null); },
    getPatientByLinkCode(code) { return clone(Object.values(db.patients).find((p) => p.linkCode && p.linkCode === code) ?? null); },
    createPatient(rec) { const p = { linkCode: null, linkCodeExpiresAt: null, ...clone(rec), id: id() }; db.patients[p.id] = p; persist(); return clone(p); },
    updatePatient(patientId, rec) { db.patients[patientId] = { ...clone(rec), id: String(patientId) }; persist(); return clone(db.patients[patientId]); },
    deletePatient(patientId) {
      const pid = String(patientId);
      delete db.patients[pid];
      for (const bucket of ['entries', 'intake', 'requests']) db[bucket] = db[bucket].filter((x) => x.patientId !== pid);
      persist();
    },
    // ---- editable menu catalogue
    getCatalogData() {
      const c = db.catalog;
      return clone({ ingredients: Object.values(c.ingredients), dishes: Object.values(c.dishes), meals: Object.values(c.meals) });
    },
    saveIngredient(ing) { db.catalog.ingredients[ing.id] = clone(ing); persist(); return clone(ing); },
    saveDish(dish) { db.catalog.dishes[dish.id] = clone(dish); persist(); return clone(dish); },
    saveMeal(meal) { db.catalog.meals[meal.id] = clone(meal); persist(); return clone(meal); },
    getMenu() { return clone(db.catalog.menu); },
    saveMenuCycle(day, period, mealIds) { db.catalog.menu.cycle[day][period] = [...mealIds]; persist(); },
    saveMenuDate(date, period, mealIds) {
      const d = db.catalog.menu.dates;
      if (mealIds == null) { if (d[date]) { delete d[date][period]; if (!Object.keys(d[date]).length) delete d[date]; } }
      else d[date] = { ...(d[date] ?? {}), [period]: [...mealIds] };
      persist();
    },
    replaceCatalog({ ingredients, dishes, meals, menu }) {
      db.catalog = {
        ingredients: Object.fromEntries(ingredients.map((i) => [i.id, clone(i)])),
        dishes: Object.fromEntries(dishes.map((d) => [d.id, clone(d)])),
        meals: Object.fromEntries(meals.map((m) => [m.id, clone(m)])),
        menu: clone(menu),
      };
      persist();
    },
    // ---- meal schedule
    listEntries(q = {}) {
      return clone(db.entries.filter((e) => (!q.patientId || e.patientId === String(q.patientId)) && inRange(e.date, q)
        && (!q.mealId || e.selectedMealId === q.mealId || e.offers.some((o) => o.mealId === q.mealId))));
    },
    getEntry(patientId, date, period) { return clone(db.entries.find(slot(patientId, date, period)) ?? null); },
    getEntryById(entryId) { return clone(db.entries.find((e) => e.id === String(entryId)) ?? null); },
    saveEntry(entry) {
      const rec = { ...clone(entry), patientId: String(entry.patientId) };
      const i = db.entries.findIndex(slot(rec.patientId, rec.date, rec.period));
      if (i >= 0) db.entries[i] = { ...rec, id: db.entries[i].id }; else db.entries.push({ ...rec, id: id() });
      persist();
      return clone(db.entries.find(slot(rec.patientId, rec.date, rec.period)));
    },
    deleteEntry(patientId, date, period) { db.entries = db.entries.filter((e) => !slot(patientId, date, period)(e)); persist(); },
    // ---- intake and feedback: one record per meal per source (patient or staff)
    listIntake(q = {}) { return clone(db.intake.filter((r) => (!q.patientId || r.patientId === String(q.patientId)) && inRange(r.date, q))); },
    saveIntake(rec) {
      const r = { ...clone(rec), patientId: String(rec.patientId) };
      const same = (x) => slot(r.patientId, r.date, r.period)(x) && x.source === r.source;
      const i = db.intake.findIndex(same);
      if (i >= 0) db.intake[i] = { ...r, id: db.intake[i].id }; else db.intake.push({ ...r, id: id() });
      persist();
      return clone(db.intake.find(same));
    },
    // ---- requests
    listRequests(q = {}) { return clone(db.requests.filter((r) => (!q.patientId || r.patientId === String(q.patientId)) && (!q.status || r.status === q.status))); },
    getRequest(requestId) { return clone(db.requests.find((r) => r.id === String(requestId)) ?? null); },
    addRequest(rec) { const r = { ...clone(rec), patientId: String(rec.patientId), id: id() }; db.requests.push(r); persist(); return clone(r); },
    updateRequest(requestId, fields) { const r = db.requests.find((x) => x.id === String(requestId)); Object.assign(r, clone(fields)); persist(); return clone(r); },
    // ---- audit log
    addAudit(rec) { db.audit.push({ ...clone(rec), patientId: rec.patientId == null ? null : String(rec.patientId), id: id() }); if (db.audit.length > 3000) db.audit = db.audit.slice(-3000); persist(); },
    listAudit({ patientId = null, scope = null, limit = 50 } = {}) {
      return clone(db.audit.filter((a) => (!patientId || a.patientId === String(patientId)) && (!scope || a.action.startsWith(scope))).slice(-limit).reverse());
    },
    // ---- demo helpers
    clearHospitalData() {
      db.patients = {}; db.entries = []; db.intake = []; db.requests = []; db.audit = [];
      for (const u of Object.values(db.users)) u.patientId = null;
      persist();
    },
    _reset() { db = EMPTY(); persist(); },
  };
}
