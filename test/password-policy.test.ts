import { test } from 'node:test';
import assert from 'node:assert/strict';
import { passwordProblem, USERNAME_RE } from '../lib/password-policy.ts';

test('minimum 8 characters is the only composition rule', () => {
  assert.match(passwordProblem('short') ?? '', /at least 8/);
  assert.equal(passwordProblem('abcdefgh!'), null, 'no digit or case requirement');
  assert.equal(passwordProblem('a long passphrase with spaces'), null);
  assert.match(passwordProblem('x'.repeat(129)) ?? '', /at most 128/);
});

test('common and context passwords are refused', () => {
  assert.match(passwordProblem('password123') ?? '', /too common/);
  assert.match(passwordProblem('aaaaaaaaaa') ?? '', /too common/);
  assert.match(passwordProblem('nurse.one', { username: 'nurse.one' }) ?? '', /username or email/);
  assert.match(passwordProblem('layla.applicant', { email: 'layla.applicant@carebite.test' }) ?? '', /username or email/);
});

test('usernames follow the documented rule', () => {
  assert.ok(USERNAME_RE.test('staff.demo'));
  assert.ok(!USERNAME_RE.test('1abc'));
  assert.ok(!USERNAME_RE.test('ab'));
  assert.ok(!USERNAME_RE.test('has space'));
});
