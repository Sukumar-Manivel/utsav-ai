// Unit tests for the HTTP helpers, identity checks and the in-memory store.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createAuth } from '../lib/auth.js';
import { fail, rateLimit, securityHeaders, wrap } from '../lib/http.js';
import { OpError, sha256 } from '../lib/plan.js';
import { deleteToken, getEvent, getToken, listEvents, saveEvent, setToken, storeMode } from '../lib/store.js';

function fakeRes() {
  const res = { statusCode: 200, headers: {}, body: null };
  res.status = (s) => ((res.statusCode = s), res);
  res.json = (b) => ((res.body = b), res);
  res.setHeader = (k, v) => (res.headers[k.toLowerCase()] = v);
  return res;
}
const fakeReq = (headers = {}, extra = {}) => ({
  get: (h) => headers[h.toLowerCase()],
  ip: '1.2.3.4',
  path: '/api/x',
  ...extra,
});

test('fail() sends the one error shape the browser understands', () => {
  const res = fail(fakeRes(), 404, 'NOT_FOUND', 'Nope');
  assert.equal(res.statusCode, 404);
  assert.deepEqual(res.body, { error: { code: 'NOT_FOUND', message: 'Nope' } });
});

test('wrap() turns permission errors into 403 and hides crashes behind a plain 500', async (t) => {
  t.mock.method(console, 'error', () => {});
  const r1 = fakeRes();
  await wrap(async () => {
    throw new OpError(403, 'FORBIDDEN_TASK', 'Not yours');
  })({}, r1);
  assert.equal(r1.statusCode, 403);
  const r2 = fakeRes();
  await wrap(async () => {
    throw new Error('db password is hunter2');
  })({}, r2);
  assert.equal(r2.statusCode, 500);
  assert.ok(!JSON.stringify(r2.body).includes('hunter2'), 'internal details never leak');
});

test('rate limits are per route and per IP', () => {
  const a = rateLimit(2),
    b = rateLimit(2);
  const run = (mw) => {
    const res = fakeRes();
    let passed = false;
    mw(fakeReq(), res, () => (passed = true));
    return passed ? 200 : res.statusCode;
  };
  assert.deepEqual([run(a), run(a), run(a)], [200, 200, 429]);
  assert.equal(run(b), 200, 'another route has its own allowance');
});

test('security headers include a content security policy', () => {
  const res = fakeRes();
  securityHeaders(fakeReq({}, { secure: true, path: '/api/health' }), res, () => {});
  assert.match(res.headers['content-security-policy'], /default-src 'self'/);
  assert.match(res.headers['content-security-policy'], /frame-ancestors 'none'/);
  assert.equal(res.headers['strict-transport-security'].startsWith('max-age='), true);
  assert.equal(res.headers['cache-control'], 'no-store');
});

test('host identity: browser key is hashed, Google token adds a second identity', async () => {
  const auth = createAuth({
    verifyIdToken: async (t) => (t === 'good' ? { uid: 'u1', name: 'Riya Sharma' } : Promise.reject(new Error('bad'))),
  });
  const key = 'f'.repeat(48);
  const req = fakeReq({ 'x-host-key': key, authorization: 'Bearer good' });
  const actor = await auth.hostActor(req);
  assert.deepEqual(actor.ids, ['g:u1', 'k:' + sha256(key)]);
  assert.equal(req.user.name, 'Riya Sharma');
  assert.deepEqual(
    (await auth.hostActor(fakeReq({ authorization: 'Bearer forged' })))?.ids,
    undefined,
    'a forged token is no identity',
  );
  assert.equal(await auth.hostActor(fakeReq({ 'x-host-key': 'short' })), null);
});

test('memory store keeps plans, owners and link hashes', async () => {
  assert.equal(storeMode(), 'memory');
  await saveEvent({ id: 'event001', owners: ['k:a'], title: 'Test' });
  assert.ok((await getEvent('event001')).updatedAt > 0);
  assert.deepEqual(
    (await listEvents(['k:a'])).map((e) => e.id),
    ['event001'],
  );
  assert.deepEqual(await listEvents(['k:other']), []);
  await setToken('h1', { eventId: 'event001', helperId: 'x' });
  assert.deepEqual(await getToken('h1'), { eventId: 'event001', helperId: 'x' });
  await deleteToken('h1');
  assert.equal(await getToken('h1'), null);
  assert.equal(await getEvent('missing01'), null);
  assert.equal(await getEvent('../admin'), null, 'odd ids are rejected before any lookup');
});
