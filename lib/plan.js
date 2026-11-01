// Plan domain logic shared by the API: category library, plan building and
// normalization, progress maths, permissions and helper redaction.
import crypto from 'node:crypto';
import { TRADITIONS, getTradition, allFunctions } from '../public/traditions.js';
export { TRADITIONS };

export const DAY = 86400000;

export function todayISO(offsetDays = 0) {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}
export function daysBetween(fromISO, toISO) {
  return Math.round((Date.parse(toISO) - Date.parse(fromISO)) / DAY);
}
export function addDaysISO(iso, n) {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
export const roundTo = (n, step) => Math.round(n / step) * step;
export const newId = (n = 10) => crypto.randomBytes(16).toString('base64url').replace(/[-_]/g, '').slice(0, n);
export const sha256 = (s) => crypto.createHash('sha256').update(String(s)).digest('hex');

// ---------- category library ----------
export const CAT_LIB = {
  venue: {
    name: 'Venue', icon: 'venue',
    steps: ['Shortlist 3 venues near you', 'Check capacity and parking', 'Visit and compare', 'Confirm the date in writing', 'Pay advance and get a receipt'],
    days: [40, 34, 28, 22, 18],
    query: { wedding: 'marriage halls', birthday: 'party halls', community: 'community halls' },
  },
  food: {
    name: 'Food', icon: 'food',
    steps: ['Define cuisine & style', 'Set per-plate budget', 'Review vendor shortlist', 'Schedule tastings', 'Confirm and book'],
    days: [30, 26, 20, 16, 12],
    query: { wedding: 'wedding caterers', birthday: 'party caterers', community: 'caterers for events' },
  },
  decor: {
    name: 'Decor', icon: 'decor',
    steps: ['Pick a theme and colours', 'Compare 3 decorators', 'Approve the moodboard', 'Confirm flowers and lights', 'Share setup timing with the venue'],
    days: [32, 26, 20, 12, 5],
    query: { wedding: 'wedding decorators', birthday: 'birthday party decorators', community: 'event decorators' },
  },
  guests: {
    name: 'Guests', icon: 'guests',
    steps: ['Draft the guest list', 'Collect phone numbers', 'Send remaining invites', 'Track RSVPs', 'Choose return gifts'],
    days: [36, 30, 22, 10, 7],
    query: { wedding: 'wedding invitation printers', birthday: 'return gift shops', community: 'printing press' },
  },
  transport: {
    name: 'Transport', icon: 'transport',
    steps: ['Count guests needing rides', 'Pick vehicle types', 'Compare operators', 'Book return shuttles', 'Share pickup times'],
    days: [24, 20, 16, 10, 3],
    query: { wedding: 'tempo traveller rental', birthday: 'tempo traveller rental', community: 'bus rental' },
  },
  entertainment: {
    name: 'Entertainment', icon: 'entertainment',
    steps: ['Pick the vibe', 'Shortlist performers', 'Finalize lineup', 'Book sound and lights', 'Share the run of show'],
    days: [30, 24, 18, 12, 4],
    query: { wedding: 'live music band for events', birthday: 'DJ for parties', community: 'cultural troupe for events' },
  },
  photos: {
    name: 'Photos', icon: 'photos',
    steps: ['List must-have family shots', 'Compare 3 photographers', 'Check full sample albums', 'Book the team', 'Share the shot list'],
    days: [40, 34, 28, 24, 5],
    query: { wedding: 'wedding photographers', birthday: 'event photographers', community: 'event photographers' },
  },
  music: {
    name: 'Music', icon: 'music',
    steps: ['Decide music for each function', 'Shortlist 2 troupes', 'Confirm timings with the priest', 'Book sound system', 'Share the playlist'],
    days: [34, 28, 20, 14, 4],
    query: { wedding: 'nadaswaram troupe', birthday: 'live band', community: 'nadaswaram troupe' },
  },
};

export const TYPE_CATS = {
  wedding: [['venue', 0.26], ['music', 0.06], ['photos', 0.10], ['food', 0.30], ['decor', 0.12], ['guests', 0.06]],
  birthday: [['venue', 0.30], ['guests', 0.07], ['transport', 0.04], ['food', 0.33], ['decor', 0.15], ['entertainment', 0.11]],
  community: [['venue', 0.20], ['transport', 0.08], ['guests', 0.07], ['food', 0.35], ['decor', 0.15], ['entertainment', 0.15]],
};

// default budget weight for any category, used when a tradition picks a category the type table does not list
const SHARE = { venue: 0.25, food: 0.30, decor: 0.12, photos: 0.10, guests: 0.06, music: 0.06, entertainment: 0.09, transport: 0.05 };
const FALLBACK_CAT = { music: ['entertainment', 'decor'], entertainment: ['music', 'decor'], transport: ['guests', 'venue'], photos: ['decor'], guests: ['venue'], decor: ['venue'], food: ['venue'], venue: ['decor'] };
export const TYPE_LABEL = { wedding: 'Wedding', birthday: 'Birthday', community: 'Community event' };

const IDEAS = {
  wedding: [['Theme', 'Temple gold and marigold: warm brass, banana stem entrance, jasmine strings.'], ['Menu', 'Elai sappadu with paal payasam and a filter coffee counter.'], ['Decor', 'Brass kuthuvilakku along the aisle, kolam at the entrance, marigold torans.'], ['Entertainment', 'Nadaswaram at the muhurtham, light Carnatic music at the reception.'], ['Return gifts', 'Small brass lamps or thamboolam bags with coconut and betel.'], ['Family moment', 'A photo wall of old family wedding pictures.']],
  birthday: [['Theme', 'Golden hour garden: fairy lights, lanterns and warm candles.'], ['Menu', 'Live dosa counter, mini starters and a dessert table.'], ['Decor', 'A photo timeline of the birthday person and a balloon arch in two colours.'], ['Entertainment', 'Acoustic set for dinner, then a DJ for the last hour.'], ['Return gifts', 'Potted plants or personalised mugs.'], ['Family moment', 'Each guest writes a wish card for a memory box.']],
  community: [['Theme', 'Harvest colours: sugarcane, turmeric yellow, mango leaf torans.'], ['Menu', 'Annadhanam with sakkarai pongal, sambar rice and curd rice.'], ['Decor', 'Kolam contest at the entrance and oil lamps along the paths.'], ['Entertainment', 'Kolattam, a silambam demo and a school dance.'], ['Return gifts', 'Prasadam packets or saplings.'], ['Volunteers', 'Colour-coded badges for food, parking and stage teams.']],
};

// ---------- progress ----------
export function catPct(c) {
  if (!c.steps.length) return 0;
  return Math.round((c.steps.filter((s) => s.done).length / c.steps.length) * 100);
}
export function readyPct(ev) {
  let d = 0, t = 0;
  for (const c of ev.cats) { t += c.steps.length; d += c.steps.filter((s) => s.done).length; }
  return t ? Math.round((d / t) * 100) : 0;
}
export function catStatus(c, today = todayISO()) {
  const p = catPct(c);
  if (p === 100) return 'done';
  const left = daysBetween(today, c.due);
  if (left < 0) return 'late';
  if (left <= 7) return 'soon';
  return 'ok';
}

// ---------- budget ----------
// Splits 90% of the total across categories in multiples of 1,000 so the
// caps plus the 10% buffer always add up to the total exactly.
export function splitBudget(total, shares) {
  const usable = Math.round(total * 0.9);
  const sum = shares.reduce((a, s) => a + s, 0) || 1;
  const caps = shares.map((s) => roundTo((usable * s) / sum, 1000));
  const diff = usable - caps.reduce((a, b) => a + b, 0);
  const big = caps.indexOf(Math.max(...caps));
  caps[big] += diff;
  return caps;
}

// ---------- build / normalize ----------
export function validateInput(inp) {
  const errors = [];
  const type = ['wedding', 'birthday', 'community'].includes(inp?.type) ? inp.type : null;
  if (!type) errors.push('Pick an event type.');
  const guests = Math.round(Number(inp?.guests));
  if (!(guests >= 10 && guests <= 5000)) errors.push('Guests must be between 10 and 5,000.');
  const budget = Math.round(Number(inp?.budget));
  if (!(budget >= 20000 && budget <= 50000000)) errors.push('Budget must be between ₹20,000 and ₹5 crore.');
  const date = /^\d{4}-\d{2}-\d{2}$/.test(inp?.date || '') ? inp.date : null;
  if (!date || daysBetween(todayISO(), date) < 3) errors.push('Pick a date at least 3 days from today.');
  const city = String(inp?.city || '').trim().slice(0, 60);
  if (!city) errors.push('Enter a city.');
  const clean = (arr) => (Array.isArray(arr) ? [...new Set(arr.map((x) => String(x).trim().slice(0, 40)).filter(Boolean))].slice(0, 10) : []);
  const trad = type ? getTradition(type, inp?.tradition) : null;
  return {
    errors,
    value: {
      type, guests, budget, date, city,
      title: String(inp?.title || '').trim().slice(0, 80),
      sub: String(inp?.sub || '').trim().slice(0, 60),
      tradition: trad?.id || null, funcs: clean(inp?.funcs), food: clean(inp?.food),
      vibe: String(inp?.vibe || '').slice(0, 40),
    },
  };
}

// Turns the chosen function names into dated functions with the categories they need.
export function buildFunctions(type, tradId, names, date, catIds) {
  const known = allFunctions(type, tradId);
  const pick = (c) => (catIds.includes(c) ? c : (FALLBACK_CAT[c] || []).find((x) => catIds.includes(x)) || catIds[0]);
  return names.map((name, i) => {
    const def = known.find((f) => f.name.toLowerCase() === name.toLowerCase());
    const f = def || { id: 'own' + i, name, d: 0, when: '', needs: [{ c: 'decor', t: `Plan the ${name.toLowerCase()} setup` }] };
    let at = addDaysISO(date, f.d);
    if (at < todayISO(1)) at = todayISO(1);
    const needs = f.needs.map((n) => ({ c: pick(n.c), t: n.t }));
    return { id: f.id, name: def ? def.name : name, date: at, when: f.when || '', main: !!f.main, cats: [...new Set(needs.map((n) => n.c))], needs, d: f.d };
  }).sort((x, y) => x.d - y.d);
}

export function buildPlan(input, ai = null) {
  const lead = daysBetween(todayISO(), input.date);
  const trad = getTradition(input.type, input.tradition);
  const typeShare = Object.fromEntries(TYPE_CATS[input.type]);
  const ids = trad?.cats || TYPE_CATS[input.type].map(([id]) => id);
  const aiCats = Object.fromEntries((ai?.categories || []).map((c) => [c.id, c]));
  const shares = ids.map((id) => {
    const w = Number(aiCats[id]?.share);
    return w > 0 && w < 1 ? w : typeShare[id] || SHARE[id] || 0.08;
  });
  const caps = splitBudget(input.budget, shares);
  const functions = buildFunctions(input.type, trad?.id, input.funcs, input.date, ids);
  const scale = Math.min(1, Math.max(0.15, (lead - 1) / 45));
  const cats = ids.map((id, i) => {
    const lib = CAT_LIB[id];
    const aiSteps = Array.isArray(aiCats[id]?.steps) ? aiCats[id].steps.map((s) => String(s).slice(0, 70)).filter(Boolean) : [];
    const base = (aiSteps.length >= 4 ? aiSteps.slice(0, 5) : lib.steps).map((t) => ({ t, done: false }));
    // tasks that the chosen functions add to this category, due the day before that function
    const extra = [];
    for (const f of functions) for (const n of f.needs) {
      if (n.c !== id || extra.length >= 4) continue;
      const by = addDaysISO(f.date, -1);
      extra.push({ t: n.t.slice(0, 70), done: false, fn: f.name, by: by < todayISO(1) ? todayISO(1) : by });
    }
    const steps = [...base.slice(0, -1), ...extra, base[base.length - 1]];
    const due = addDaysISO(input.date, -Math.max(1, Math.round(lib.days[lib.days.length - 1] * scale)));
    return {
      id, name: lib.name, icon: lib.icon, cap: caps[i], lead: null,
      due: due < todayISO(1) ? todayISO(1) : due,
      steps, notes: '', quote: 0, shortlist: [],
    };
  });
  const ideas = Array.isArray(ai?.ideas) && ai.ideas.length >= 3
    ? ai.ideas.slice(0, 6).map((x) => ({ title: String(x.title || '').slice(0, 30), text: String(x.text || '').slice(0, 200) }))
    : IDEAS[input.type].map(([title, text]) => ({ title, text }));
  const sub = input.sub || (trad && trad.id !== 'custom' ? `${trad.name}${input.type === 'wedding' ? ' wedding' : ''}` : TYPE_LABEL[input.type]);
  return {
    v: 2,
    title: input.title || ai?.title || `${sub} in ${input.city}`,
    tagline: String(ai?.tagline || 'A brighter day ahead').slice(0, 40),
    type: input.type, sub, city: input.city,
    tradition: trad ? { id: trad.id, name: trad.name } : null, q: trad?.q || {},
    date: input.date, guests: input.guests, budget: input.budget,
    funcs: functions.map((f) => f.name), functions: functions.map(({ needs, d, ...f }) => f),
    food: input.food, vibe: input.vibe,
    hero: null, cats, helpers: {}, ideas, hideBudget: true,
    activity: [], aiMade: !!ai,
  };
}

export function samplePlan() {
  const date = todayISO(21);
  const caps = { venue: 80000, guests: 18000, transport: 12000, food: 90000, decor: 40000, entertainment: 30000 };
  const done = { venue: 4, guests: 3, transport: 2, food: 2, decor: 3, entertainment: 2 };
  const lead = { venue: 'aarav', guests: 'meera', transport: 'kabir', food: 'sana', decor: 'ishaan', entertainment: 'tara' };
  const due = { venue: -11, guests: -9, transport: -3, food: -7, decor: -5, entertainment: -1 };
  const order = ['venue', 'guests', 'transport', 'food', 'decor', 'entertainment'];
  const cats = order.map((id) => ({
    id, name: CAT_LIB[id].name, icon: CAT_LIB[id].icon, cap: caps[id], lead: lead[id],
    due: addDaysISO(date, due[id]),
    steps: CAT_LIB[id].steps.map((t, i) => ({ t, done: i < done[id] })),
    notes: '', quote: 0, shortlist: [],
  }));
  cats.find((c) => c.id === 'venue').quote = 76000;
  cats.find((c) => c.id === 'decor').quote = 36000;
  cats.find((c) => c.id === 'guests').quote = 9500;
  const H = (name, rel, lang, avatar) => ({ name, rel, lang, avatar, tokenHash: null, revoked: false });
  return {
    v: 1, sample: true,
    title: "Riya's 30th Birthday", tagline: 'A brighter you ahead',
    type: 'birthday', sub: 'Milestone birthday', city: 'Coimbatore',
    date, guests: 60, budget: 300000,
    funcs: ['Cake cutting', 'Dinner', 'Music night'], food: ['Veg and non-veg'], vibe: 'Golden hour garden',
    tradition: { id: 'milestone', name: 'Milestone birthday' }, q: {},
    functions: buildFunctions('birthday', 'milestone', ['Cake cutting', 'Dinner', 'Music night'], date, order).map(({ needs, d, ...f }) => f),
    hero: '/assets/portrait.jpg',
    host: { name: 'Riya', avatar: '/assets/av-riya.jpg' },
    cats,
    helpers: {
      aarav: H('Aarav', 'Brother', 'en', '/assets/av-aarav.jpg'),
      meera: H('Meera', 'Cousin', 'ta', '/assets/av-meera.jpg'),
      kabir: H('Kabir', 'Friend', 'en', '/assets/av-kabir.jpg'),
      sana: H('Sana', 'Best friend', 'en', '/assets/av-sana.jpg'),
      ishaan: H('Ishaan', 'Cousin', 'ta', '/assets/av-ishaan.jpg'),
      tara: H('Tara', 'Friend', 'en', '/assets/av-tara.jpg'),
    },
    ideas: IDEAS.birthday.map(([title, text]) => ({ title, text })),
    hideBudget: true,
    activity: [
      { t: 'Aarav confirmed the date with the venue', at: Date.now() - 86400000 },
      { t: 'Ishaan approved the moodboard', at: Date.now() - 3600000 * 5 },
    ],
  };
}

// ---------- permissions ----------
export function isOwner(ev, actor) {
  return !!actor && actor.kind === 'host' && actor.ids.some((id) => ev.owners.includes(id));
}
export function helperCanEdit(ev, helperId, catId) {
  const c = ev.cats.find((x) => x.id === catId);
  return !!c && c.lead === helperId && !ev.helpers[helperId]?.revoked;
}

export function redactForHelper(ev, helperId) {
  const me = ev.helpers[helperId];
  const today = todayISO();
  return {
    event: {
      id: ev.id, title: ev.title, tagline: ev.tagline, type: ev.type, sub: ev.sub, city: ev.city,
      date: ev.date, guests: ev.guests, hero: ev.hero, host: ev.host || null,
      budget: ev.hideBudget ? null : ev.budget, ready: readyPct(ev),
      tradition: ev.tradition || null, functions: ev.functions || [],
    },
    me: { id: helperId, name: me.name, rel: me.rel, lang: me.lang, avatar: me.avatar || null },
    mine: ev.cats.filter((c) => c.lead === helperId),
    team: ev.cats.filter((c) => c.lead !== helperId).map((c) => ({
      id: c.id, name: c.name, icon: c.icon, due: c.due, pct: catPct(c), status: catStatus(c, today),
      lead: c.lead ? { name: ev.helpers[c.lead]?.name, avatar: ev.helpers[c.lead]?.avatar || null } : null,
    })),
    activity: ev.activity.slice(-6).reverse(),
  };
}

export function publicHostView(ev) {
  const { owners, ...rest } = ev;
  const helpers = Object.fromEntries(Object.entries(ev.helpers).map(([id, h]) => {
    const { tokenHash, ...hh } = h;
    return [id, { ...hh, hasLink: !!tokenHash && !h.revoked }];
  }));
  return { ...rest, helpers, ready: readyPct(ev) };
}

// ---------- operations ----------
export class OpError extends Error {
  constructor(status, code, message) { super(message); this.status = status; this.code = code; }
}

function log(ev, t) {
  ev.activity.push({ t, at: Date.now() });
  if (ev.activity.length > 40) ev.activity = ev.activity.slice(-40);
}

// Applies one change. `actor` is {kind:'host'} or {kind:'helper', helperId}.
export function applyOp(ev, op, actor) {
  const cat = op.cat ? ev.cats.find((c) => c.id === op.cat) : null;
  if (op.cat && !cat) throw new OpError(404, 'NOT_FOUND', 'That category does not exist.');
  const helperOnly = actor.kind === 'helper';
  if (helperOnly && !['toggleStep', 'setNotes', 'setQuote', 'shortlist'].includes(op.type)) {
    throw new OpError(403, 'FORBIDDEN', 'Helpers can only update their own task.');
  }
  if (helperOnly && !helperCanEdit(ev, actor.helperId, op.cat)) {
    throw new OpError(403, 'FORBIDDEN_TASK', 'You can only update tasks assigned to you.');
  }
  const who = helperOnly ? ev.helpers[actor.helperId].name : (ev.host?.name || 'Host');
  switch (op.type) {
    case 'toggleStep': {
      const s = cat.steps[op.i];
      if (!s) throw new OpError(404, 'NOT_FOUND', 'That step does not exist.');
      s.done = typeof op.done === 'boolean' ? op.done : !s.done;
      if (s.done) log(ev, `${who} finished “${s.t}”`);
      break;
    }
    case 'setNotes': cat.notes = String(op.text || '').slice(0, 2000); break;
    case 'setQuote': {
      const q = Math.max(0, Math.round(Number(op.amount) || 0));
      cat.quote = q;
      if (q) log(ev, `${who} saved a ${cat.name.toLowerCase()} quote`);
      break;
    }
    case 'shortlist': {
      const v = op.vendor || {};
      const key = String(v.id || v.name || '').slice(0, 120);
      if (!key) throw new OpError(422, 'VALIDATION_FAILED', 'Missing vendor.');
      const i = cat.shortlist.findIndex((x) => x.id === key);
      if (i >= 0) cat.shortlist.splice(i, 1);
      else {
        cat.shortlist.push({ id: key, name: String(v.name || '').slice(0, 80), rating: Number(v.rating) || null, phone: String(v.phone || '').slice(0, 30), maps: String(v.maps || '').slice(0, 300) });
        log(ev, `${who} shortlisted ${String(v.name || 'a vendor').slice(0, 60)}`);
      }
      break;
    }
    case 'setCap': {
      cat.cap = Math.max(0, Math.round(Number(op.amount) || 0));
      break;
    }
    case 'hideBudget': ev.hideBudget = !!op.value; break;
    case 'assign': {
      if (op.helper && !ev.helpers[op.helper]) throw new OpError(404, 'NOT_FOUND', 'Unknown helper.');
      cat.lead = op.helper || null;
      break;
    }
    case 'addStep': {
      const t = String(op.text || '').trim().slice(0, 70);
      if (!t) throw new OpError(422, 'VALIDATION_FAILED', 'Step text is empty.');
      cat.steps.push({ t, done: false });
      break;
    }
    default: throw new OpError(422, 'VALIDATION_FAILED', 'Unknown operation.');
  }
  return ev;
}

// ---------- co-pilot ----------
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

// Deterministic fallback when Gemini is not available.
export function ruleCopilot(ev, message) {
  const m = message.toLowerCase();
  const pct = m.match(/(cut|reduce|lower|trim|decrease)[^\d]*(\d{1,2})\s*%/);
  if (pct) return { reply: `Cutting the budget by ${pct[2]}% across every category, keeping the 10% buffer.`, changes: { budgetPct: -Number(pct[2]) } };
  const up = m.match(/(raise|increase|add)[^\d]*(\d{1,2})\s*%/);
  if (up) return { reply: `Raising the budget by ${up[2]}% across every category.`, changes: { budgetPct: Number(up[2]) } };
  const dm = m.match(/(\d{1,2})\s*(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*/);
  if (dm && /(move|shift|change|date|postpone|prepone)/.test(m)) {
    const mi = MONTHS.indexOf(dm[2]);
    const now = new Date();
    let y = now.getUTCFullYear();
    let d = new Date(Date.UTC(y, mi, Number(dm[1])));
    if (d < now) d = new Date(Date.UTC(y + 1, mi, Number(dm[1])));
    return { reply: 'Moving the event and shifting every due date by the same number of days.', changes: { date: d.toISOString().slice(0, 10) } };
  }
  const fn = m.match(/add (?:a |an )?([a-z ]{3,30}?)(?: function| ceremony| event|$)/);
  if (fn) {
    const name = fn[1].trim().replace(/\b\w/g, (x) => x.toUpperCase());
    return { reply: `Adding ${name} and a step to plan it under Decor.`, changes: { addFunction: name, addSteps: [{ cat: ev.cats.find((c) => c.id === 'decor') ? 'decor' : ev.cats[0].id, text: `Plan the ${name.toLowerCase()} setup` }] } };
  }
  return { reply: 'I can cut or raise the budget by a percentage, move the date, or add a function. Try “Cut budget by 15%”.', changes: null };
}

export function applyCopilotChanges(ev, ch) {
  const next = structuredClone(ev);
  const diff = [];
  if (!ch) return { next, diff };
  if (Number.isFinite(ch.budgetPct) && ch.budgetPct !== 0) {
    const f = 1 + Math.max(-60, Math.min(100, ch.budgetPct)) / 100;
    const nb = roundTo(ev.budget * f, 1000);
    diff.push({ label: 'Total budget', from: ev.budget, to: nb, money: true });
    const caps = splitBudget(nb, ev.cats.map((c) => c.cap || 1));
    next.budget = nb;
    next.cats.forEach((c, i) => { diff.push({ label: c.name, from: c.cap, to: caps[i], money: true }); c.cap = caps[i]; });
  }
  if (Number.isFinite(ch.budget) && ch.budget > 0 && !ch.budgetPct) {
    const nb = roundTo(ch.budget, 1000);
    const caps = splitBudget(nb, ev.cats.map((c) => c.cap || 1));
    diff.push({ label: 'Total budget', from: ev.budget, to: nb, money: true });
    next.budget = nb;
    next.cats.forEach((c, i) => { diff.push({ label: c.name, from: c.cap, to: caps[i], money: true }); c.cap = caps[i]; });
  }
  if (ch.date && /^\d{4}-\d{2}-\d{2}$/.test(ch.date) && daysBetween(todayISO(), ch.date) >= 3) {
    const shift = daysBetween(ev.date, ch.date);
    diff.push({ label: 'Event date', from: ev.date, to: ch.date, date: true });
    next.date = ch.date;
    const clamp = (d) => (d < todayISO(1) ? todayISO(1) : d);
    next.cats.forEach((c) => { c.due = clamp(addDaysISO(c.due, shift)); c.steps.forEach((s) => { if (s.by) s.by = clamp(addDaysISO(s.by, shift)); }); });
    (next.functions || []).forEach((f) => { f.date = clamp(addDaysISO(f.date, shift)); });
  }
  if (ch.addFunction) {
    const f = String(ch.addFunction).slice(0, 40);
    if (!next.funcs.includes(f)) {
      next.funcs.push(f);
      const cat = next.cats.find((c) => c.id === 'decor') ? 'decor' : next.cats[0].id;
      (next.functions = next.functions || []).push({ id: 'own' + next.functions.length, name: f, date: next.date, when: '', main: false, cats: [cat] });
      diff.push({ label: 'Function added', to: f });
    }
  }
  for (const s of (Array.isArray(ch.addSteps) ? ch.addSteps.slice(0, 4) : [])) {
    const c = next.cats.find((x) => x.id === s.cat);
    const t = String(s.text || '').slice(0, 70);
    if (c && t) { c.steps.push({ t, done: false, ...(ch.addFunction ? { fn: String(ch.addFunction).slice(0, 40) } : {}) }); diff.push({ label: `${c.name} step`, to: t }); }
  }
  return { next, diff };
}

// ---------- canned helper answers (used when Gemini is not available) ----------
export function cannedAnswer(cat, question, ev) {
  const q = question.toLowerCase();
  const perGuest = ev.guests ? Math.round(cat.cap / ev.guests / 10) * 10 : 0;
  if (/advance/.test(q)) return 'Keep the advance at 20 to 30% and pay the rest after the event. Always get a receipt and the full quote on WhatsApp.';
  if (/price|cost|fair|per plate|per leaf|rate/.test(q)) {
    return cat.id === 'food'
      ? `Your food cap works out to about ₹${perGuest.toLocaleString('en-IN')} per guest. Ask each caterer for a per-plate price for the same menu, and check if water, serving staff and cleanup are included.`
      : `Your cap for ${cat.name.toLowerCase()} is ₹${cat.cap.toLocaleString('en-IN')}. Get 3 written quotes for the same scope and compare what each one includes.`;
  }
  if (/compare|quote/.test(q)) return 'Put the quotes side by side for the same scope. Check travel, overtime and staff charges, and how much advance each asks for.';
  return `Start with the next step: “${(cat.steps.find((s) => !s.done) || cat.steps[cat.steps.length - 1]).t}”. Keep within ₹${cat.cap.toLocaleString('en-IN')} and get every quote in writing.`;
}
