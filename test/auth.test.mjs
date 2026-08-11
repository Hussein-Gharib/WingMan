import { test } from 'node:test';
import assert from 'node:assert/strict';

// verifyPassword reads ADMIN_PASSWORD at call time.
process.env.ADMIN_PASSWORD = 'correct-horse-battery';
process.env.SESSION_SECRET = 'test-secret-please-change-0123456789abcdef';

const { verifyPassword, createSessionToken, verifySessionToken, SESSION_COOKIE } =
  await import('../lib/auth.js');

test('verifyPassword accepts the exact password', () => {
  assert.equal(verifyPassword('correct-horse-battery'), true);
});

test('verifyPassword rejects a wrong password', () => {
  assert.equal(verifyPassword('wrong'), false);
});

test('verifyPassword rejects empty input', () => {
  assert.equal(verifyPassword(''), false);
  assert.equal(verifyPassword(undefined), false);
});

test('verifyPassword rejects a near-miss (length differs)', () => {
  assert.equal(verifyPassword('correct-horse-batter'), false);
});

test('session token round-trips and carries admin role', async () => {
  const token = await createSessionToken();
  const payload = await verifySessionToken(token);
  assert.ok(payload);
  assert.equal(payload.role, 'admin');
});

test('a tampered token is rejected', async () => {
  const token = await createSessionToken();
  const tampered = token.slice(0, -3) + 'aaa';
  assert.equal(await verifySessionToken(tampered), null);
});

test('a token signed with a different secret is rejected', async () => {
  // getSecretKey() reads SESSION_SECRET at call time, so swapping it makes the
  // existing token's signature invalid.
  const token = await createSessionToken();
  process.env.SESSION_SECRET = 'a-completely-different-secret-value-9876';
  assert.equal(await verifySessionToken(token), null);
  process.env.SESSION_SECRET = 'test-secret-please-change-0123456789abcdef';
});

test('empty/undefined token is rejected', async () => {
  assert.equal(await verifySessionToken(undefined), null);
  assert.equal(await verifySessionToken(''), null);
});

test('cookie name is stable', () => {
  assert.equal(SESSION_COOKIE, 'wm_session');
});
