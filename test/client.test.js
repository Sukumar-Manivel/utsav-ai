// Browser-side helpers and data tables, tested in Node (they are plain ES modules).
import test from 'node:test';
import assert from 'node:assert/strict';
import { esc, inr, inrShort, pct, readyOf, status, nextIdx, initials, todayISO } from '../public/js/util.js';
import { T, FLAGS, CAT_TA, stepHint } from '../public/js/i18n.js';
import { TRADITIONS, getTradition, allFunctions } from '../public/traditions.js';
import { CAT_LIB } from '../lib/plan.js';

test('esc() neutralises HTML so user text can never inject markup', () => {
  assert.equal(esc('<img src=x onerror="alert(1)">'), '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
  assert.equal(esc("O'Brien & co"), 'O&#39;Brien &amp; co');
  assert.equal(esc(null), '');
});

test('rupees use Indian digit grouping', () => {
  assert.equal(inr(1200000), '₹12,00,000');
  assert.equal(inrShort(1500000), '₹15 L');
  assert.equal(inrShort(25000000), '₹2.5 Cr');
  assert.equal(inrShort(90000), '₹90,000');
});

test('progress and status maths', () => {
  const c = { steps: [{ done: true }, { done: false }, { done: true }, { done: false }], due: todayISO(3) };
  assert.equal(pct(c), 50);
  assert.equal(nextIdx(c), 1);
  assert.equal(status(c), 'soon');
  assert.equal(status({ ...c, due: todayISO(-1) }), 'late');
  assert.equal(status({ ...c, due: todayISO(30) }), 'ok');
  assert.equal(status({ steps: [{ done: true }], due: todayISO(-5) }), 'done');
  assert.equal(readyOf([c, { steps: [{ done: true }, { done: true }] }]), 67);
  assert.equal(initials('Uncle Ravi Kumar'), 'RK');
});

test('English and Tamil text cover the same keys', () => {
  assert.deepEqual(Object.keys(T.en).sort(), Object.keys(T.ta).sort());
  for (const [id, f] of Object.entries(FLAGS)) assert.equal(f.en.length, f.ta.length, `flags for ${id}`);
  for (const id of Object.keys(CAT_LIB)) assert.ok(CAT_TA[id], `Tamil name for ${id}`);
  assert.match(stepHint('Confirm and book'), /advance/);
});

test('every tradition is well formed', () => {
  for (const [type, list] of Object.entries(TRADITIONS)) {
    assert.ok(list.some((t) => t.id === 'custom'), `${type} offers a custom mix`);
    for (const t of list) {
      assert.equal(new Set(t.cats).size, 6, `${type}/${t.id} has six distinct categories`);
      t.cats.forEach((c) => assert.ok(CAT_LIB[c], `${type}/${t.id} category ${c} exists`));
      assert.ok(t.funcs.filter((f) => f.main).length <= 1, `${type}/${t.id} has at most one main ceremony`);
      for (const f of t.funcs) f.needs.forEach((n) => assert.ok(CAT_LIB[n.c], `${f.name} needs a known category`));
    }
  }
  assert.equal(getTradition('wedding', 'nope').id, 'tamil');
  const all = allFunctions('wedding', 'north');
  assert.equal(all[0].name, 'Roka', 'the chosen tradition comes first');
  assert.equal(new Set(all.map((f) => f.name)).size, all.length, 'no duplicate function names');
});
