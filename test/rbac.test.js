import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PERMISSIONS, ROLE_IDS, can, permissionsFor, SECTION_PERMISSION } from '../domain/rbac.js';

test('three roles only', () => {
  assert.deepEqual(ROLE_IDS, ['admin', 'staff', 'patient']);
  for (const roles of Object.values(PERMISSIONS)) for (const r of roles) assert.ok(ROLE_IDS.includes(r));
});

test('admin holds every permission (controls everything)', () => {
  assert.deepEqual(permissionsFor('admin').sort(), Object.keys(PERMISSIONS).sort());
});

test('staff run meal service but cannot make clinical decisions or manage access', () => {
  for (const p of ['patient:list', 'meal:offer', 'meal:confirm', 'kitchen:progress', 'menu:edit', 'intake:record', 'request:resolve', 'patient:admission']) assert.ok(can('staff', p), p);
  for (const p of ['patient:edit-clinical', 'meal:approve-review', 'menu:verify', 'staff:manage', 'patient:delete', 'patient:create', 'request:resolve-clinical', 'demo:reset']) assert.ok(!can('staff', p), p);
});

test('patients reach only patient-facing permissions', () => {
  assert.deepEqual(permissionsFor('patient').sort(), ['intake:record', 'meal:choose', 'patient:edit-appetite', 'patient:edit-preferences', 'patient:read', 'request:create'].sort());
  assert.ok(!can('patient', SECTION_PERMISSION.clinical));
});

test('no role, unknown roles and unknown permissions are denied', () => {
  assert.equal(can(null, 'patient:read'), false);
  assert.equal(can('dietitian', 'patient:list'), false);
  assert.throws(() => can('admin', 'nope:nothing'), /Unknown permission/);
});
