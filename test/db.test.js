import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openDatabase, createSqliteRepo, SCHEMA_VERSION } from '../domain/sqlite-repo.js';
import { seedCatalog } from '../domain/demo-data.js';
import { normalizeNewPatient } from '../domain/patient.js';

test('an older database is replaced by the version 4 schema', () => {
  const dir = mkdtempSync(join(tmpdir(), 'carebite-'));
  const file = join(dir, 'old.db');
  const old = new DatabaseSync(file);
  old.exec('CREATE TABLE Users (id INTEGER PRIMARY KEY, email TEXT); CREATE TABLE SfctDishValues (meal_id TEXT);');
  old.close();
  const db = openDatabase(file);
  assert.equal(db.prepare('PRAGMA user_version').get().user_version, SCHEMA_VERSION);
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map((t) => t.name);
  for (const t of ['Patients', 'Dishes', 'DishIngredients', 'Meals', 'MealComponents', 'MenuCycle', 'MenuDates', 'SfctDishes', 'MealSchedule', 'MealOffers', 'ScheduleChanges', 'ScheduleEvents', 'MealIntake', 'PatientRequests', 'AuditLog']) assert.ok(tables.includes(t), t);
  assert.ok(!tables.includes('SfctDishValues'));
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM SfctDishes').get().n, 130, 'SFDA SFCT library loaded');
  db.close();
  rmSync(dir, { recursive: true, force: true });
});

test('staff menu edits persist across restarts; reference data is re-synced', () => {
  const dir = mkdtempSync(join(tmpdir(), 'carebite-'));
  const file = join(dir, 'menu.db');
  let db = openDatabase(file);
  let repo = createSqliteRepo(db);
  seedCatalog(repo, new Date().toISOString());
  const meal = repo.getCatalogData().meals.find((m) => m.id === 'jareesh');
  repo.saveMeal({ ...meal, available: false, unavailableReason: 'Test', version: 2 });
  repo.saveMenuDate('2030-01-01', 'lunch', ['jareesh']);
  db.close();
  db = openDatabase(file);
  repo = createSqliteRepo(db);
  const again = repo.getCatalogData().meals.find((m) => m.id === 'jareesh');
  assert.equal(again.available, false);
  assert.equal(again.version, 2);
  assert.deepEqual(repo.getMenu().dates['2030-01-01'].lunch, ['jareesh']);
  assert.equal(repo.getCatalogData().dishes.find((d) => d.id === 'chicken-kabsa').nutrition.sfctId, 'chicken-kabsa');
  db.close();
  rmSync(dir, { recursive: true, force: true });
});

test('entries keep offers, change flags and history; intake keeps patient and staff records apart', () => {
  const db = openDatabase(':memory:');
  const repo = createSqliteRepo(db);
  seedCatalog(repo, new Date().toISOString());
  const { value } = normalizeNewPatient({ demoId: 'CB-0009', ageRange: '30-44', ward: '3A', bed: '2', conditions: { selected: ['none'] }, dietOrder: { categories: ['regular'], portionsPermitted: ['regular'] }, allergies: { status: 'nka' } });
  const p = repo.createPatient({ ...value, status: 'admitted', createdAt: 'now', updatedAt: 'now' });
  const saved = repo.saveEntry({
    patientId: p.id, date: '2030-01-01', period: 'lunch', status: 'on-hold', holdFrom: 'confirmed', selectedMealId: 'jareesh', mealName: 'Jareesh with Laban', portion: 'regular',
    offers: [{ mealId: 'jareesh', mealName: 'Jareesh with Laban', screenedAs: 'eligible', portions: ['regular'] }],
    changes: [{ id: 'chg-1', at: 'now', cause: 'diet-change', change: 'Allergy added: milk', details: ['x'], hold: true, kitchenAffected: true, reviewed: false }],
    history: [{ at: 'now', by: 'A', role: 'staff', action: 'confirmed', status: 'confirmed' }, { at: 'now', by: 'CareBite', role: 'system', action: 'held', status: 'on-hold' }],
    replaces: { mealId: 'x', mealName: 'X', portion: 'small', status: 'prepared' },
  });
  const e = repo.getEntryById(saved.id);
  assert.equal(e.holdFrom, 'confirmed');
  assert.equal(e.changes[0].kitchenAffected, true);
  assert.equal(e.history.length, 2);
  assert.equal(e.replaces.status, 'prepared');
  const base = { patientId: p.id, date: '2030-01-01', period: 'lunch', mealId: 'jareesh', portion: 'regular', accepted: true, amount: 'all', reasons: [], recordedBy: 'x', recordedByRole: 'patient', recordedAt: 'now' };
  repo.saveIntake({ ...base, source: 'patient', satisfaction: 5 });
  repo.saveIntake({ ...base, source: 'staff', amount: 'most', measuredWasteG: 40, recordedByRole: 'staff' });
  repo.saveIntake({ ...base, source: 'patient', satisfaction: 4 });
  const rows = repo.listIntake({ patientId: p.id });
  assert.equal(rows.length, 2, 'one record per meal per source');
  assert.equal(rows.find((r) => r.source === 'patient').satisfaction, 4);
  assert.throws(() => db.prepare("INSERT INTO MealIntake (patient_id,date,period,source,meal_id,portion,accepted,amount,measured_waste_g,recorded_by,recorded_by_role,recorded_at) VALUES (?, '2030-01-02','lunch','patient','jareesh','regular',1,'all',10,'x','patient','now')").run(Number(p.id)), /CHECK/, 'patients cannot store weighed waste');
  db.close();
});
