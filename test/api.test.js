// End-to-end API tests: real Express app, in-memory store, no AI keys (fallbacks are used).
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../server.js';
import { todayISO } from '../lib/plan.js';

let server, base;
const HOST = 'a'.repeat(48),
  OTHER = 'b'.repeat(48);
before(async () => {
  server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());

async function call(path, { method = 'GET', body, host, helper } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (host) headers['X-Host-Key'] = host;
  if (helper) headers['X-Helper-Token'] = helper;
  const r = await fetch(base + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, headers: r.headers, json: await r.json().catch(() => null) };
}
const plan = {
  type: 'wedding',
  tradition: 'tamil',
  city: 'Coimbatore',
  date: todayISO(60),
  guests: 300,
  budget: 1200000,
  funcs: ['Nalangu', 'Muhurtham', 'Reception'],
  food: ['Pure veg'],
};

test('health and security headers', async () => {
  const r = await call('/api/health');
  assert.equal(r.status, 200);
  assert.deepEqual(r.json, { ok: true });
  assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(r.headers.get('x-frame-options'), 'DENY');
  assert.equal(r.headers.get('cache-control'), 'no-store');
});

test('unknown API routes return a JSON 404', async () => {
  const r = await call('/api/nope');
  assert.equal(r.status, 404);
  assert.equal(r.json.error.code, 'NOT_FOUND');
});

test('creating a plan needs a host key and valid input', async () => {
  assert.equal((await call('/api/plan', { method: 'POST', body: plan })).status, 401);
  const bad = await call('/api/plan', { method: 'POST', host: HOST, body: { ...plan, guests: 2, city: '' } });
  assert.equal(bad.status, 422);
  assert.equal(bad.json.error.code, 'VALIDATION_FAILED');
});

test('full host and helper flow with role-based access', async () => {
  const made = await call('/api/plan', { method: 'POST', host: HOST, body: plan });
  assert.equal(made.status, 200);
  const id = made.json.id;

  const mine = await call(`/api/events/${id}`, { host: HOST });
  assert.equal(mine.status, 200);
  const ev = mine.json.event;
  assert.equal(ev.tradition.id, 'tamil');
  assert.deepEqual(
    ev.functions.map((f) => f.name),
    ['Nalangu', 'Muhurtham', 'Reception'],
  );
  assert.equal(
    ev.cats.reduce((a, c) => a + c.cap, 0),
    1080000,
    'caps are 90% of the budget',
  );
  assert.ok(!('owners' in ev), 'owner ids are never sent to the browser');

  assert.equal((await call(`/api/events/${id}`, { host: OTHER })).status, 403, 'another browser cannot open the plan');

  const add = await call(`/api/events/${id}/helpers`, {
    method: 'POST',
    host: HOST,
    body: { name: 'Sana', rel: 'Cousin', lang: 'ta', cat: 'food' },
  });
  assert.equal(add.status, 200);
  const token = add.json.token;
  assert.match(token, /^[A-Za-z0-9]{32}$/);
  assert.ok(!JSON.stringify(add.json.event).includes(token), 'the raw token is not stored on the event');

  const me = await call('/api/h/me', { helper: token });
  assert.equal(me.status, 200);
  assert.equal(me.json.event.budget, null, 'full budget is hidden from helpers');
  assert.deepEqual(
    me.json.mine.map((c) => c.id),
    ['food'],
  );
  assert.ok(
    me.json.team.every((t) => !('cap' in t) && !('notes' in t)),
    'team view has no caps or notes',
  );

  const own = await call('/api/h/op', {
    method: 'POST',
    helper: token,
    body: { type: 'toggleStep', cat: 'food', i: 0, done: true },
  });
  assert.equal(own.status, 200);
  assert.equal(own.json.mine[0].steps[0].done, true);

  const other = await call('/api/h/op', {
    method: 'POST',
    helper: token,
    body: { type: 'toggleStep', cat: 'venue', i: 0, done: true },
  });
  assert.equal(other.status, 403, 'a helper cannot edit another task');
  const hostOnly = await call('/api/h/op', {
    method: 'POST',
    helper: token,
    body: { type: 'setCap', cat: 'food', amount: 1 },
  });
  assert.equal(hostOnly.status, 403, 'a helper cannot change budget caps');

  const hid = add.json.helperId;
  assert.equal((await call(`/api/events/${id}/helpers/${hid}`, { method: 'DELETE', host: HOST })).status, 200);
  const gone = await call('/api/h/me', { helper: token });
  assert.equal(gone.status, 401, 'a removed link stops working');
  assert.equal(gone.json.error.code, 'LINK_INACTIVE');
});

test('helper chat falls back to a safe answer without AI', async () => {
  const id = (await call('/api/plan', { method: 'POST', host: HOST, body: plan })).json.id;
  const token = (
    await call(`/api/events/${id}/helpers`, { method: 'POST', host: HOST, body: { name: 'Ravi', cat: 'venue' } })
  ).json.token;
  const r = await call('/api/h/ask', {
    method: 'POST',
    helper: token,
    body: { cat: 'venue', message: 'What is a fair price?' },
  });
  assert.equal(r.status, 200);
  assert.ok(r.json.reply.length > 20);
});

test('malformed helper tokens are rejected before any lookup', async () => {
  const r = await call('/api/h/me', { helper: 'bad token!' });
  assert.equal(r.status, 401);
  assert.equal(r.json.error.code, 'UNAUTHENTICATED');
});

test('sample plan, my events list and host-only ops', async () => {
  const KEY = 'c'.repeat(48);
  const id = (await call('/api/events/sample', { method: 'POST', host: KEY })).json.id;
  const list = await call('/api/events', { host: KEY });
  assert.ok(list.json.events.some((e) => e.id === id && e.ready > 0));
  assert.deepEqual((await call('/api/events')).json, { events: [] }, 'no key, no events');

  const cap = await call(`/api/events/${id}/op`, {
    method: 'POST',
    host: KEY,
    body: { type: 'setCap', cat: 'food', amount: 95000 },
  });
  assert.equal(cap.status, 200);
  assert.equal(cap.json.event.cats.find((c) => c.id === 'food').cap, 95000);
  const bad = await call(`/api/events/${id}/op`, { method: 'POST', host: KEY, body: { type: 'dropTable' } });
  assert.equal(bad.status >= 400 && bad.status < 500, true, 'unknown operations are refused');
});

test('co-pilot previews a change and applies it only when asked', async () => {
  const KEY = 'd'.repeat(48);
  const id = (await call('/api/plan', { method: 'POST', host: KEY, body: plan })).json.id;
  const preview = await call(`/api/events/${id}/copilot`, {
    method: 'POST',
    host: KEY,
    body: { message: 'Cut budget by 10%' },
  });
  assert.equal(preview.status, 200);
  assert.equal(preview.json.changes.budgetPct, -10);
  assert.equal(
    (await call(`/api/events/${id}`, { host: KEY })).json.event.budget,
    1200000,
    'nothing changes before apply',
  );
  const applied = await call(`/api/events/${id}/copilot/apply`, {
    method: 'POST',
    host: KEY,
    body: { changes: preview.json.changes },
  });
  assert.equal(applied.status, 200);
  assert.equal(applied.json.event.budget, 1080000);
  assert.equal(
    applied.json.event.cats.reduce((a, c) => a + c.cap, 0),
    972000,
    'caps still equal 90% of the new budget',
  );
  assert.equal(
    (await call(`/api/events/${id}/copilot`, { method: 'POST', host: KEY, body: { message: '   ' } })).status,
    422,
  );
});

test('vendors come back labelled when live search is off', async () => {
  const KEY = 'e'.repeat(48);
  const id = (await call('/api/plan', { method: 'POST', host: KEY, body: plan })).json.id;
  const r = await call(`/api/events/${id}/vendors?cat=food`, { host: KEY });
  assert.equal(r.status, 200);
  assert.equal(r.json.source, 'sample');
  assert.ok(r.json.vendors.length >= 3 && r.json.vendors.every((v) => v.sample && v.name && v.estimate));
  assert.equal((await call(`/api/events/${id}/vendors?cat=nope`, { host: KEY })).status, 404);
});
