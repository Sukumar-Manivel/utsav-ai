import test from 'node:test';
import assert from 'node:assert/strict';
import { __test } from '../lib/ai.js';

test('Gemini calls skip a model whose quota is used up and use the next one', async (t) => {
  t.mock.method(console, 'warn', () => {}); // expected failures are logged; keep test output clean
  const calls = [];
  __test.setClient({
    models: {
      generateContent: async ({ model }) => {
        calls.push(model);
        if (model === 'gemini-2.5-flash')
          throw new Error(
            '{"error":{"code":429,"message":"Quota exceeded. Please retry in 1h55m41.6s.","status":"RESOURCE_EXHAUSTED"}}',
          );
        if (model === 'gemini-3.7-flash')
          throw new Error('{"error":{"code":503,"message":"high demand","status":"UNAVAILABLE"}}');
        return { text: `ok from ${model}` };
      },
    },
  });
  assert.equal(await __test.askText('hi'), 'ok from gemini-3.6-flash');
  calls.length = 0;
  assert.equal(await __test.askText('again'), 'ok from gemini-3.6-flash');
  assert.ok(!calls.includes('gemini-2.5-flash'), 'model with used-up quota is skipped');
});

// ---- Gemini drafts and Google Places vendors, with the network replaced by fakes ----
import { aiPlan, findVendors, sampleVendors } from '../lib/ai.js';
import { buildPlan, validateInput, todayISO } from '../lib/plan.js';

const jsonClient = (reply) => ({ models: { generateContent: async () => ({ text: JSON.stringify(reply) }) } });
const input = validateInput({
  type: 'wedding',
  tradition: 'tamil',
  city: 'Madurai',
  date: todayISO(60),
  guests: 400,
  budget: 1500000,
  funcs: ['Muhurtham'],
}).value;

test('a Gemini plan draft is used, but the server still owns the maths', async () => {
  __test.setClient(
    jsonClient({
      title: 'Meena & Karthik',
      tagline: 'Two families, one day',
      categories: ['venue', 'music', 'photos', 'food', 'decor', 'guests'].map((id) => ({
        id,
        share: id === 'food' ? 0.4 : 0.12,
        steps: ['One', 'Two', 'Three', 'Four'],
      })),
      ideas: [
        { title: 'Kolam', text: 'A rice-flour kolam at the gate.' },
        { title: 'Jasmine', text: 'Jasmine strings.' },
        { title: 'Coffee', text: 'Filter coffee counter.' },
      ],
    }),
  );
  const draft = await aiPlan(input);
  assert.equal(draft.title, 'Meena & Karthik');
  const ev = buildPlan(input, draft);
  assert.equal(
    ev.cats.reduce((a, c) => a + c.cap, 0),
    1350000,
    'caps still equal 90% of the budget',
  );
  assert.ok(
    ev.cats.find((c) => c.id === 'food').cap > ev.cats.find((c) => c.id === 'decor').cap,
    'AI shares are respected',
  );
  assert.ok(ev.aiMade);
});

test('a broken Gemini reply falls back to templates instead of failing', async (t) => {
  t.mock.method(console, 'warn', () => {});
  __test.setClient({ models: { generateContent: async () => ({ text: 'not json' }) } });
  assert.equal(await aiPlan(input), null);
  assert.ok(buildPlan(input, null).cats.every((c) => c.steps.length >= 5));
});

test('example vendors are labelled and priced from the cap', () => {
  const ev = buildPlan(input, null);
  const food = ev.cats.find((c) => c.id === 'food');
  const list = sampleVendors(food, ev);
  assert.ok(list.length >= 3 && list.every((v) => v.sample === true));
  assert.match(list[0].estimate, /\/ plate$/);
});

test('real vendors: Gemini can only rank places Google returned', async (t) => {
  const ev = { ...buildPlan(input, null), id: 'ev1' };
  const food = ev.cats.find((c) => c.id === 'food');
  process.env.PLACES_API_KEY = 'test-key';
  t.after(() => delete process.env.PLACES_API_KEY);
  const places = [
    {
      id: 'p1',
      displayName: { text: 'Annapoorna Caterers' },
      rating: 4.6,
      userRatingCount: 320,
      formattedAddress: 'Anna Nagar, Madurai, Tamil Nadu',
      nationalPhoneNumber: '0452 123 4567',
      photos: [{ name: 'places/p1/photos/a1' }],
    },
    {
      id: 'p2',
      displayName: { text: 'Sree Mess' },
      rating: 4.2,
      userRatingCount: 80,
      formattedAddress: 'KK Nagar, Madurai, Tamil Nadu',
    },
  ];
  const fetchMock = t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({ places })));
  __test.setClient(
    jsonClient({
      picks: [
        { id: 'p2', why: 'Simple veg meals within the cap.', estimate: '₹250–₹300 / plate' },
        { id: 'invented', why: 'Not real' },
      ],
    }),
  );
  const out = await findVendors(food, ev);
  assert.equal(out.source, 'places');
  assert.deepEqual(
    out.vendors.map((v) => v.id),
    ['p2'],
    'the made-up id is dropped',
  );
  assert.equal(out.vendors[0].estimate, '₹250–₹300 / plate');
  assert.match(String(fetchMock.mock.calls[0].arguments[0]), /places:searchText/);
  assert.ok(!JSON.stringify(out).includes('test-key'), 'the Places key never appears in the response');

  // second call within 6 hours is served from the cache
  await findVendors(food, ev);
  assert.equal(fetchMock.mock.callCount(), 1);
});

test('when Places fails the app shows labelled examples with a note', async (t) => {
  t.mock.method(console, 'warn', () => {});
  const ev = { ...buildPlan(input, null), id: 'ev2' };
  process.env.PLACES_API_KEY = 'test-key';
  t.after(() => delete process.env.PLACES_API_KEY);
  t.mock.method(globalThis, 'fetch', async () => new Response('denied', { status: 403 }));
  const out = await findVendors(
    ev.cats.find((c) => c.id === 'venue'),
    ev,
  );
  assert.equal(out.source, 'sample');
  assert.match(out.note, /unavailable/);
});
