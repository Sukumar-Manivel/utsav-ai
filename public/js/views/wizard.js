// New-plan wizard: event type and tradition, place and date, guests and budget, functions, review.
import { api } from '../api.js';
import { closeOverlay, showLamp, toast } from '../overlays.js';
import { logo } from '../router.js';
import { S } from '../state.js';
import { daysLeft, esc, fmtLong, ic, inr, todayISO, TYPE_ICON, TYPE_LABEL } from '../util.js';
import { allFunctions, getTradition, TRADITIONS } from '../../traditions.js';

export function relDay(d) {
  return d === 0
    ? 'Main day'
    : d < 0
      ? `${-d} day${d === -1 ? '' : 's'} before`
      : `${d} day${d === 1 ? '' : 's'} after`;
}
export function wizDefault(type = 'wedding', trad) {
  const t = getTradition(type, trad);
  return {
    type,
    tradition: t.id,
    sub: '',
    title: '',
    own: '',
    city: 'Coimbatore',
    date: todayISO(60),
    guests: type === 'wedding' ? 300 : 80,
    budget: type === 'wedding' ? 1200000 : 300000,
    funcs: t.funcs.map((f) => f.name),
    food: ['Pure veg'],
    vibe: 'Traditional',
  };
}
export function viewWizard() {
  const w = S.w,
    st = S.wstep;
  const heads = [
    'What are we celebrating?',
    'Where and when?',
    'How many guests, and what budget?',
    'Functions, food and feel',
    'Ready to light the lamp',
  ];
  const trad = getTradition(w.type, w.tradition),
    tradName = trad.id === 'custom' ? 'Mixed' : trad.name;
  let body = '';
  if (st === 0)
    body = `<div class="types">${Object.keys(TYPE_LABEL)
      .map(
        (k) =>
          `<button class="type" data-act="wtype" data-v="${k}" aria-pressed="${w.type === k}">${ic(TYPE_ICON[k])}<b>${TYPE_LABEL[k]}</b><small>${k === 'wedding' ? 'Muhurtham to reception' : k === 'birthday' ? 'First to sixtieth' : 'Festivals and gatherings'}</small></button>`,
      )
      .join('')}</div>
    <div class="field"><span class="label">${w.type === 'wedding' ? 'Which tradition? Every family does it differently.' : w.type === 'birthday' ? 'What kind of birthday?' : 'What kind of event?'}</span>
      <div class="trads">${TRADITIONS[w.type].map((t) => `<button type="button" class="trad" data-act="wtrad" data-v="${t.id}" aria-pressed="${w.tradition === t.id}"><b>${esc(t.name)}</b><small>${esc(t.note)}</small></button>`).join('')}</div></div>
    <div class="field"><label for="w-title">Name it (optional)</label><input class="input" id="w-title" data-w="title" maxlength="80" value="${esc(w.title)}" placeholder="${w.type === 'wedding' ? "Kavitha & Arvind's wedding" : w.type === 'birthday' ? "Amma's 60th birthday" : 'Pongal on our street'}"></div>`;
  if (st === 1)
    body = `<div class="field"><label for="w-city">City</label><input class="input" id="w-city" data-w="city" value="${esc(w.city)}" autocomplete="address-level2"></div>
    <div class="field"><label for="w-date">Event date</label><input class="input" id="w-date" type="date" data-w="date" value="${w.date}" min="${todayISO(3)}"></div>
    <p class="lede fs-14">For a muhurtham, check the date with your family priest before you book the hall.</p>`;
  if (st === 2)
    body = `<div class="field range"><label for="w-guests">Guests</label><span class="val num" id="v-guests">${w.guests}</span><input id="w-guests" type="range" min="20" max="1500" step="10" value="${w.guests}" data-w="guests"></div>
    <div class="field range"><label for="w-budget">Total budget</label><span class="val num" id="v-budget">${inr(w.budget)}</span><input id="w-budget" type="range" min="50000" max="5000000" step="10000" value="${w.budget}" data-w="budget"><span class="label">10% is kept aside for surprises.</span></div>`;
  if (st === 3) {
    const known = allFunctions(w.type, w.tradition),
      byName = Object.fromEntries(known.map((f) => [f.name, f]));
    const chosen = w.funcs.map((n) => byName[n] || { name: n, d: 0, when: '', own: true }).sort((a, b) => a.d - b.d);
    const more = known.filter((f) => !w.funcs.includes(f.name));
    body = `<div class="field"><span class="label">Your functions, in order. Tap × to remove one.</span>
      <ol class="fnlist">${chosen.map((f) => `<li class="${f.main ? 'main' : ''}"><span class="fd">${relDay(f.d)}${f.when ? ` · ${esc(f.when)}` : ''}</span><b>${esc(f.name)}</b>${f.main ? '<em>Main</em>' : f.own ? '<em>Your own</em>' : ''}<button type="button" class="fx" data-act="wchip" data-k="funcs" data-v="${esc(f.name)}" aria-label="Remove ${esc(f.name)}">${ic('x')}</button></li>`).join('') || '<li class="empty">No functions yet. Add one below.</li>'}</ol></div>
    ${more.length ? `<div class="field"><span class="label">Add from other traditions</span><div class="chips">${more.map((f) => `<button type="button" class="chip" data-act="wchip" data-k="funcs" data-v="${esc(f.name)}" aria-pressed="false">${ic('plus')}${esc(f.name)}</button>`).join('')}</div></div>` : ''}
    <div class="field"><label for="w-own">Something else your family does?</label><div class="ownrow"><input class="input" id="w-own" data-w="own" maxlength="40" value="${esc(w.own)}" placeholder="${w.type === 'wedding' ? 'e.g. Mappillai azhaippu' : 'e.g. Family pooja'}"><button type="button" class="btn btn-ghost" data-act="wown">${ic('plus')}Add</button></div></div>
    <div class="field"><span class="label">Food</span><div class="chips">${['Pure veg', 'Veg and non-veg', 'Jain', 'Elai sappadu (banana leaf)'].map((f) => `<button class="chip" data-act="wchip" data-k="food" data-v="${esc(f)}" aria-pressed="${w.food.includes(f)}">${esc(f)}</button>`).join('')}</div></div>
    <div class="field"><span class="label">Feel</span><div class="chips">${['Traditional', 'Grand', 'Simple and warm', 'Modern'].map((f) => `<button class="chip" data-act="wvibe" data-v="${f}" aria-pressed="${w.vibe === f}">${f}</button>`).join('')}</div></div>`;
  }
  if (st === 4)
    body = `<p class="lede">Utsav AI will write your budget split, timeline, guided steps and ideas. You can change anything later.</p>
    <div class="grid gap-10">${[
      ['Event', w.title || `${tradName} ${TYPE_LABEL[w.type].toLowerCase()}`],
      ['Tradition', tradName],
      ['Where', w.city],
      ['When', fmtLong(w.date)],
      ['Guests', w.guests],
      ['Budget', inr(w.budget)],
      ['Functions', w.funcs.join(', ') || '—'],
      ['Food', w.food.join(', ') || '—'],
    ]
      .map(([k, v]) => `<div class="srow"><span>${k}</span><b>${esc(v)}</b></div>`)
      .join('')}</div>`;
  return `<div class="page"><header class="topbar">${logo()}<a class="btn btn-ghost btn-sm" href="#/events">My events</a></header>
  <section class="wiz">
    <form class="panel wiz-main" data-form="wiz" novalidate>
      <div><div class="wsteps" aria-hidden="true">${[0, 1, 2, 3, 4].map((i) => `<i class="${i <= st ? 'on' : ''}"></i>`).join('')}</div>
      <p class="label" style="margin:14px 0 0">Step ${st + 1} of 5</p><h1 class="h-serif" style="font-size:clamp(30px,3.6vw,42px);margin-top:6px">${heads[st]}</h1></div>
      ${body}
      <p class="note bad" id="w-err" hidden></p>
      <div class="wnav"><button type="button" class="btn btn-ghost" data-act="${st ? 'wback' : 'home'}">${ic('back')}Back</button>
      ${st < 4 ? `<button class="btn btn-gold" type="submit">Next${ic('right')}</button>` : `<button class="btn btn-coral" type="submit">${ic('spark')}Create my plan</button>`}</div>
    </form>
    <aside class="panel wsum"><p class="label">Your plan so far</p><h2 class="h-serif fs-28">${esc(w.title || TYPE_LABEL[w.type])}</h2>
      <div class="srow"><span>Tradition</span><b>${esc(tradName)}</b></div><div class="srow"><span>Functions</span><b>${w.funcs.length}</b></div><div class="srow"><span>City</span><b id="s-city">${esc(w.city)}</b></div>
      <div class="srow"><span>Date</span><b id="s-date">${fmtLong(w.date)}</b></div><div class="srow"><span>Guests</span><b class="num" id="s-guests">${w.guests}</b></div>
      <div class="srow"><span>Budget</span><b class="num" id="s-budget">${inr(w.budget)}</b></div><div class="srow"><span>Per guest</span><b class="num" id="s-per">${inr(w.budget / w.guests)}</b></div>
      <p class="lede fs-13">${S.cfg.ai ? 'Gemini writes the plan. The server checks every rupee adds up.' : 'Plans use Utsav’s built-in templates on this server.'}</p></aside>
  </section></div>`;
}
export function wizValid() {
  const w = S.w;
  if (S.wstep === 3 && !w.funcs.length) return 'Add at least one function.';
  if (S.wstep === 1) {
    if (!w.city.trim()) return 'Enter a city.';
    if (!w.date || daysLeft(w.date) < 3) return 'Pick a date at least 3 days from today.';
  }
  return null;
}
export async function createPlan() {
  showLamp('Lighting the lamp…', S.cfg.ai ? 'Gemini is writing your plan' : 'Building your plan');
  try {
    const r = await api('/api/plan', { method: 'POST', body: S.w });
    await new Promise((res) => setTimeout(res, 900));
    S.w = null;
    S.ev = null;
    closeOverlay();
    location.hash = `#/e/${r.id}/orbit`;
    toast('Your plan is ready. Tap a category to begin.');
  } catch (e) {
    closeOverlay();
    toast(e.message, true);
  }
}
