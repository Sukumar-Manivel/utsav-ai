import test from 'node:test';
import assert from 'node:assert/strict';
import {
  splitBudget, buildPlan, validateInput, samplePlan, applyOp, OpError, redactForHelper,
  applyCopilotChanges, ruleCopilot, todayISO, addDaysISO, catPct, readyPct, newId,
} from '../lib/plan.js';

test('budget caps plus 10% buffer add up to the total exactly', () => {
  for (const total of [300000, 1200000, 87650, 5000000]) {
    const caps = splitBudget(total, [0.3, 0.1, 0.2, 0.25, 0.15]);
    assert.equal(caps.reduce((a, b) => a + b, 0), Math.round(total * 0.9));
  }
});

test('built plans keep every due date before the event and after today', () => {
  const { value } = validateInput({ type: 'wedding', guests: 300, budget: 1200000, date: todayISO(40), city: 'Coimbatore' });
  const plan = buildPlan(value);
  assert.equal(plan.cats.length, 6);
  for (const c of plan.cats) {
    assert.ok(c.due <= plan.date, `${c.id} due after event`);
    assert.ok(c.due >= todayISO(1), `${c.id} due in the past`);
  }
  assert.equal(plan.cats.reduce((a, c) => a + c.cap, 0), 1080000);
});

test('input validation rejects past dates and silly budgets', () => {
  const { errors } = validateInput({ type: 'birthday', guests: 5, budget: 100, date: todayISO(-1), city: '' });
  assert.equal(errors.length, 4);
});

test('helper can update only their own task', () => {
  const ev = samplePlan();
  applyOp(ev, { type: 'toggleStep', cat: 'food', i: 4 }, { kind: 'helper', helperId: 'sana' });
  assert.equal(ev.cats.find((c) => c.id === 'food').steps[4].done, true);
  assert.throws(() => applyOp(ev, { type: 'toggleStep', cat: 'venue', i: 4 }, { kind: 'helper', helperId: 'sana' }), (e) => e instanceof OpError && e.status === 403);
  assert.throws(() => applyOp(ev, { type: 'setCap', cat: 'food', amount: 1 }, { kind: 'helper', helperId: 'sana' }), (e) => e.status === 403);
});

test('helper view hides the full budget and other helpers’ notes and quotes', () => {
  const ev = samplePlan();
  ev.cats.find((c) => c.id === 'venue').notes = 'secret';
  const v = redactForHelper(ev, 'sana');
  assert.equal(v.event.budget, null);
  assert.equal(v.mine.length, 1);
  assert.equal(v.mine[0].id, 'food');
  assert.ok(v.team.every((t) => !('notes' in t) && !('quote' in t) && !('cap' in t)));
  ev.hideBudget = false;
  assert.equal(redactForHelper(ev, 'sana').event.budget, 300000);
});

test('co-pilot budget cut keeps the buffer and moves dates together', () => {
  const ev = samplePlan();
  const r = ruleCopilot(ev, 'Cut budget by 15%');
  const { next } = applyCopilotChanges(ev, r.changes);
  assert.equal(next.budget, 255000);
  assert.equal(next.cats.reduce((a, c) => a + c.cap, 0), 229500);
  const target = addDaysISO(ev.date, 10);
  const { next: moved } = applyCopilotChanges(ev, { date: target });
  assert.equal(moved.date, target);
  assert.equal(moved.cats[0].due, addDaysISO(ev.cats[0].due, 10));
});

test('progress maths', () => {
  const ev = samplePlan();
  assert.equal(catPct(ev.cats.find((c) => c.id === 'venue')), 80);
  assert.ok(readyPct(ev) > 0 && readyPct(ev) < 100);
});

test('tradition shapes categories, functions and tagged tasks', () => {
  const date = todayISO(60);
  const { value } = validateInput({ type: 'wedding', tradition: 'north', city: 'Delhi', date, guests: 300, budget: 1500000, funcs: ['Haldi', 'Mehendi', 'Sangeet', 'Pheras', 'Grah Pravesh'] });
  const ev = buildPlan(value);
  assert.deepEqual(ev.cats.map((c) => c.id), ['venue', 'entertainment', 'photos', 'food', 'decor', 'guests']);
  assert.equal(ev.cats.reduce((a, c) => a + c.cap, 0), 1350000);
  assert.deepEqual(ev.functions.map((f) => f.name), ['Haldi', 'Mehendi', 'Sangeet', 'Pheras', 'Grah Pravesh']);
  assert.equal(ev.functions.find((f) => f.name === 'Pheras').date, date);
  assert.ok(ev.functions.find((f) => f.name === 'Pheras').main);
  const ent = ev.cats.find((c) => c.id === 'entertainment');
  const sangeet = ent.steps.find((s) => s.fn === 'Sangeet');
  assert.ok(sangeet && sangeet.by < date, 'sangeet task is due before the sangeet');
  assert.ok(ev.cats.find((c) => c.id === 'decor').steps.some((s) => s.fn === 'Grah Pravesh'), 'own function gets a task');
});

test('unknown tradition falls back to the first one for the type', () => {
  const { value } = validateInput({ type: 'birthday', tradition: 'nope', city: 'Chennai', date: todayISO(20), guests: 50, budget: 100000, funcs: [] });
  assert.equal(value.tradition, 'milestone');
});

test('ids and helper tokens always have the requested length', () => {
  for (let i = 0; i < 2000; i++) {
    assert.match(newId(32), /^[A-Za-z0-9]{32}$/);
    assert.match(newId(10), /^[A-Za-z0-9]{10}$/);
  }
});
