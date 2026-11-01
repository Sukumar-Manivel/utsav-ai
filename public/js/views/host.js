// Host views: the family orbit (desktop stage and phone layout), task panel, vendors, budget, timeline and family.
import { api } from '../api.js';
import { stepHint, T } from '../i18n.js';
import { avatar, logo, planet, ring } from '../router.js';
import { S } from '../state.js';
import {
  $$,
  dateOf,
  DAY,
  daysLeft,
  esc,
  fmtD,
  fmtLong,
  ic,
  inr,
  inrShort,
  nextIdx,
  pct,
  PILL_ICON,
  readyOf,
  RING_COL,
  status,
  STATUS_WORD,
  TYPE_ICON,
  TYPE_LABEL,
} from '../util.js';
import { hxVendors } from './helper.js';

export const SLOTS = [
  { x: 237, y: 84, w: 280, s: -1 },
  { x: 198, y: 213, w: 262, s: -1 },
  { x: 237, y: 340, w: 280, s: -1 },
  { x: 925, y: 84, w: 280, s: 1 },
  { x: 982, y: 213, w: 262, s: 1 },
  { x: 925, y: 340, w: 280, s: 1 },
];
export const lead = (ev, c) => (c.lead && ev.helpers[c.lead] ? { id: c.lead, ...ev.helpers[c.lead] } : null);
export function selCat() {
  const ev = S.ev;
  if (!S.sel || !ev.cats.find((c) => c.id === S.sel)) S.sel = (ev.cats.find((c) => c.id === 'food') || ev.cats[0]).id;
  return ev.cats.find((c) => c.id === S.sel);
}
export function viewHost() {
  const ev = S.ev,
    v = S.route.view;
  selCat();
  if (S.isM) return mobileHost(ev, v);
  const intro = S.introFor === ev.id;
  if (intro) S.introFor = null;
  return `<div class="stage-wrap" id="sw"><div class="stage ${intro ? 'intro' : ''}" id="stage">
    ${hostHeader(ev)}
    <p class="tag-poem t-poem">People<br>Plans<br>Possibilities<br>All in one orbit.</p><span class="rule t-rule1"></span>
    <nav class="rail" aria-label="Views">${['orbit', 'budget', 'timeline', 'family'].map((x) => `<a href="#/e/${ev.id}/${x}" ${v === x ? 'aria-current="page"' : ''}>${x[0].toUpperCase() + x.slice(1)}</a>`).join('')}</nav>
    <p class="tag-caps t-caps">Different<br>people<br>brighter<br>events</p><span class="rule t-rule2"></span>
    <p class="tag-script t-script">Good<br>&nbsp;People<br>&nbsp;&nbsp;Great<br>&nbsp;&nbsp;&nbsp;Events</p>
    <p class="tag-caps t-foot">Events<br>bring<br>us closer</p>
    ${v === 'orbit' ? orbit(ev) : `<section class="panel vpanel" aria-label="${v}">${v === 'budget' ? budgetView(ev) : v === 'timeline' ? timelineView(ev) : familyView(ev)}</section>`}
  </div></div>`;
}
export function hostHeader(ev) {
  const host =
    ev.host ||
    (S.fbUser ? { name: (S.fbUser.displayName || 'Host').split(' ')[0], avatar: S.fbUser.photoURL } : { name: 'Host' });
  return `<header class="hdr">${logo()}
   <div class="hpill">
     <a class="ev" href="#/events" title="Switch celebration">${ic(TYPE_ICON[ev.type] || 'spark')}<span>${esc(TYPE_LABEL[ev.type] || 'Event')}</span>${ic('chev')}</a>
     <span class="sep"></span><span style="color:#CFC2EE">${ic('people')}</span><span class="kv"><small>Guests</small><b class="num">${ev.guests}</b></span>
     <span class="sep"></span><span class="c-gold">${ic('coins')}</span><span class="kv"><small>Budget</small><b class="num">${inrShort(ev.budget)}</b></span>
     <button class="ask" data-act="copilot">${ic('spark')}Ask Utsav<span class="wv" aria-hidden="true">${[6, 12, 16, 9, 14, 7, 11].map((h, i) => `<i style="height:${h}px;animation-delay:${i * 0.13}s"></i>`).join('')}</span></button>
   </div>
   <button class="who" data-act="menu" aria-expanded="${S.menu}">${avatar(host, 44)}<span><b>${esc(host.name)}</b><small>Host</small></span>${ic('chev')}</button>
   ${S.menu ? hostMenu() : ''}</header>`;
}
export function hostMenu() {
  return `<div class="menu" role="menu">
    <a href="#/events" role="menuitem">${ic('home')}My celebrations</a>
    <a href="#/new" role="menuitem">${ic('plus')}New plan</a>
    <button data-act="summary" role="menuitem">${ic('share')}Share summary</button>
    <button data-act="addhelper" role="menuitem">${ic('people')}Add helper</button>
    ${S.cfg.firebase ? (S.fbUser ? `<button data-act="signout" role="menuitem">${ic('x')}Sign out</button>` : `<button data-act="signin" role="menuitem">${ic('google')}Sign in with Google</button>`) : ''}
  </div>`;
}
export function linkPath(sl) {
  const y = sl.y + 41,
    sx = sl.s < 0 ? sl.x + sl.w : sl.x,
    cx = 720,
    cy = 256,
    r = 134;
  const a = Math.atan2(y - cy, sx - cx),
    ex = cx + Math.cos(a) * r,
    ey = cy + Math.sin(a) * r,
    mx = (sx + ex) / 2;
  return `M${sx} ${y} C ${mx.toFixed(1)} ${y}, ${mx.toFixed(1)} ${ey.toFixed(1)}, ${ex.toFixed(1)} ${ey.toFixed(1)}`;
}
export function orbit(ev) {
  const sel = selCat(),
    cats = ev.cats.slice(0, 6),
    ready = readyOf(ev.cats);
  const paths = cats.map((c, i) => linkPath(SLOTS[i]));
  return `<h1 class="sr">${esc(ev.title)}: family orbit</h1><span class="orbit-ring1" aria-hidden="true"></span><span class="orbit-ring2" aria-hidden="true"></span>
  <svg class="links" width="1440" height="810" viewBox="0 0 1440 810" aria-hidden="true">${paths.map((d) => `<path d="${d}" fill="none" stroke="rgba(246,200,150,.55)" stroke-width="1.2" stroke-dasharray="1 5" stroke-linecap="round"/>`).join('')}</svg>
  ${paths.map((d, i) => `<span class="bead" style="offset-path:path('${d}');offset-distance:38%;width:9px;height:9px;margin:-4.5px 0 0 -4.5px"></span><span class="bead" style="offset-path:path('${d}');offset-distance:72%;width:7px;height:7px;margin:-3.5px 0 0 -3.5px"></span><span class="bead run" style="offset-path:path('${d}');width:6px;height:6px;margin:-3px 0 0 -3px;animation-delay:${(i * 0.55).toFixed(2)}s"></span>`).join('')}
  <div class="planet-in">${planet(ev, 262, ready)}</div>
  ${cats.map((c, i) => node(ev, c, i, sel)).join('')}
  ${taskPanel(ev, sel)}`;
}
export function node(ev, c, i, sel) {
  const sl = SLOTS[i],
    on = c.id === sel.id,
    p = pct(c),
    st = status(c),
    L = lead(ev, c),
    n = nextIdx(c);
  const next = n < 0 ? 'All steps done' : c.steps[n].t;
  return `<div class="node" style="left:${sl.x}px;top:${sl.y}px;width:${sl.w}px;animation-delay:${(i * 0.9).toFixed(1)}s"><div class="in" style="animation-delay:${(0.35 + i * 0.12).toFixed(2)}s">
   <button class="cap ${on ? 'on' : ''}" data-act="sel" data-cat="${c.id}" aria-pressed="${on}">
     <svg class="cico" aria-hidden="true"><use href="#i-${c.icon}"/></svg>
     ${avatar(L, 50)}
     <span class="meta"><b style="${c.name.length > 10 ? 'font-size:18px' : ''}">${esc(c.name)}</b><small>${L ? esc(L.name) : 'No helper yet'}</small><small class="st-${st}">Due ${fmtD(c.due)}<span class="sr">, ${STATUS_WORD[st]}</span></small></span>
     <span class="ring">${ring('n' + c.id, p, RING_COL[st], 46)}<span>${p}%<span class="sr"> done</span></span></span>
   </button>
   <div class="pillrow" style="animation-delay:${(0.7 + i * 0.12).toFixed(2)}s">${L ? `<span class="pill">${ic(PILL_ICON[c.id] || 'doc')}${esc(next)}</span>` : `<button class="pill" data-act="assign" data-cat="${c.id}">${ic('plus')}Assign a helper</button>`}</div>
  </div></div>`;
}
export function taskPanel(ev, c) {
  const L = lead(ev, c),
    p = pct(c),
    tabs = ['plan', 'vendors', 'notes', 'files'],
    ti = tabs.indexOf(S.ptab);
  const from = S.prevTab * 104;
  S.prevTab = ti;
  return `<section class="panel tpanel" aria-label="${esc(c.name)} tasks"><span class="grab" aria-hidden="true"></span>
   <div class="thead"><svg class="big" aria-hidden="true"><use href="#i-${c.icon}"/></svg>
     <div class="tt"><b>${esc(c.name)}</b><small>${L ? `Led by <button data-act="helper" data-h="${L.id}">${esc(L.name)}</button>` : `<button data-act="assign" data-cat="${c.id}">Assign a helper</button>`}  ·  Due ${fmtD(c.due)}  ·  ${p}% complete</small></div>
     <div class="tabs" role="tablist">${tabs.map((t) => `<button role="tab" data-act="ptab" data-t="${t}" aria-selected="${S.ptab === t}">${t[0].toUpperCase() + t.slice(1)}</button>`).join('')}<span class="ind" style="left:${from}px" data-left="${ti * 104}px"></span></div>
     <button class="btn btn-ghost askcat" data-act="askcat">${ic('spark')}Ask Utsav about ${esc(c.name)}${ic('right')}</button>
   </div>
   <div class="tbody" style="top:92px;bottom:12px">${panelTab(ev, c)}</div></section>`;
}
export function panelTab(ev, c, mobile = false) {
  if (S.ptab === 'vendors') return vendorsTab(ev, c);
  if (S.ptab === 'notes') return notesTab(ev, c);
  if (S.ptab === 'files') return filesTab(ev, c);
  const n = nextIdx(c),
    nx = n < 0 ? null : c.steps[n];
  const vd = S.vendors[c.id];
  const steps = `<p class="colh">Guided Steps</p><p class="cols">Zero guesswork. Just progress.</p><ol class="steps">${c.steps.map((s, i) => `<li><button class="step ${s.done ? 'done' : i === n ? 'cur' : ''}" data-act="step" data-cat="${c.id}" data-i="${i}" aria-pressed="${s.done}"><span class="dot">${s.done ? ic('check') : i + 1}</span><span class="stx">${esc(s.t)}${s.fn ? `<em class="fn">${esc(s.fn)}</em>` : ''}</span></button></li>`).join('')}</ol>`;
  const vend = `<div style="display:flex;justify-content:space-between;align-items:baseline;gap:10px"><p class="colh">Vendor Shortlist</p><button style="display:inline-flex;align-items:center;gap:4px;font-size:13px;color:#F0A27B" data-act="ptab" data-t="vendors">See more${ic('chev')}</button></div>
    <p class="cols">AI-curated. You decide. <span data-vsrc="${c.id}">${vd?.source === 'sample' ? '<span class="sample-tag">Examples</span>' : vd?.source === 'places' ? '<span class="sample-tag">From Google Maps</span>' : ''}</span></p>
    <div class="vgrid" data-vgrid="${c.id}" data-n="3">${vendorCards(c, 3, 'host')}</div>`;
  const next = `<p class="colh fs-20">Next Action</p>
    ${
      nx
        ? `<div class="nx">${ic('doc')}<div><b>${esc(nx.t)}</b><small>${esc(stepHint(nx.t))}</small></div></div>
    <button class="btn btn-coral cta" data-act="marknext" data-cat="${c.id}">Mark as Complete</button>`
        : `<div class="nx">${ic('check')}<div><b>Everything here is done</b><small>The family can see it on the orbit.</small></div></div>`
    }
    <p class="colh fs-17 mt-6">Resources</p>
    <button class="res" style="height:26px" data-act="res" data-r="check" data-cat="${c.id}">${ic('doc')}${esc(c.name)} planning checklist</button>
    <button class="res" style="height:26px" data-act="res" data-r="flags" data-cat="${c.id}">${ic('doc')}Red flags to watch</button>
    <button class="res" style="height:26px" data-act="res" data-r="script" data-cat="${c.id}">${ic('doc')}Questions to ask vendors</button>`;
  if (mobile)
    return `<div class="mstack"><section>${steps}</section><section>${vend}</section><section>${next}</section></div>`;
  return `<div class="tcols"><section class="c-steps scroll">${steps}</section><section class="c-vend">${vend}</section><section class="c-next scroll">${next}</section></div>`;
}
export function vendorCards(c, n, who) {
  const vd = S.vendors[c.id];
  if (!vd) {
    loadVendors(c.id, who);
    return [0, 1, 2]
      .slice(0, n)
      .map(
        () =>
          `<div class="vcard"><div class="vimg skel" style="border-radius:0"></div><div class="vb"><span class="skel" style="height:14px;width:70%"></span><span class="skel" style="height:10px;width:50%;margin-top:8px"></span><span class="skel" style="height:26px;width:60%;margin:10px auto 0;border-radius:99px"></span></div></div>`,
      )
      .join('');
  }
  if (vd.error)
    return `<p class="lede" style="grid-column:1/-1">${esc(vd.error)} <button class="btn btn-ghost btn-sm" data-act="reloadv" data-cat="${c.id}">Try again</button></p>`;
  const short = (who === 'host' ? c.shortlist : S.h?.mine.find((m) => m.id === c.id)?.shortlist) || [];
  return vd.vendors
    .slice(0, n)
    .map(
      (
        v,
        i,
      ) => `<article class="vcard"><div class="vimg"><img src="${esc(v.img)}" alt="" loading="lazy">${i === 0 ? '<span class="tm">Top Match</span>' : ''}${short.some((s) => s.id === v.id) ? `<span class="saved" title="Shortlisted">${ic('saved')}</span>` : ''}</div>
    <div class="vb"><b>${esc(v.name)}</b><small>${esc(v.tag || (v.address || '').split(',')[0])}${v.price ? `  ·  ${esc(v.price)}` : ''}</small>
    <span class="rt">${v.rating ? `${ic('star')}${v.rating} <span class="c-muted">(${v.reviews} reviews)</span>` : '<span class="c-muted">New on Google</span>'}</span>
    <button class="view" data-act="vendor" data-cat="${c.id}" data-i="${i}">${who === 'helper' ? T[S.lang].viewBtn : 'View'}</button></div></article>`,
    )
    .join('');
}
export const vLoading = new Set();
export function loadVendors(catId, who) {
  if (vLoading.has(catId) || S.vendors[catId]) return;
  vLoading.add(catId);
  const gen = S.vgen;
  (async () => {
    let d;
    try {
      d =
        who === 'helper'
          ? await api(`/api/h/vendors?cat=${catId}`, { helper: S.htoken })
          : await api(`/api/events/${S.ev.id}/vendors?cat=${catId}`);
    } catch (e) {
      d = { error: e.message, vendors: [] };
    }
    vLoading.delete(catId);
    if (gen !== S.vgen) return;
    S.vendors[catId] = d;
    refreshVendors(catId, who);
  })();
}
export function refreshVendors(catId, who) {
  const grids = $$(`[data-vgrid="${catId}"]`);
  if (!grids.length) return;
  const c = (who === 'helper' ? S.h.mine : S.ev.cats).find((x) => x.id === catId);
  grids.forEach((g) => {
    g.innerHTML = g.dataset.style === 'hx' ? hxVendors(c) : vendorCards(c, +g.dataset.n, who);
  });
  const vd = S.vendors[catId];
  $$(`[data-vsrc="${catId}"]`).forEach((el) => {
    el.innerHTML =
      vd?.source === 'places'
        ? '<span class="sample-tag">From Google Maps</span>'
        : vd?.source === 'sample'
          ? '<span class="sample-tag">Examples</span>'
          : '';
  });
}
export function vendorsTab(ev, c) {
  const vd = S.vendors[c.id];
  return `<div class="scroll"><p class="cols" style="margin-top:0">${vd?.source === 'places' ? `Real businesses from Google Maps near ${esc(ev.city)}, ranked by Gemini for ${ev.guests} guests and a ${inr(c.cap)} cap.` : `Examples while live search is off. ${esc(vd?.note || '')}`} Prices are AI estimates. Confirm with the vendor.</p>
   <div class="vrow" data-vgrid="${c.id}" data-n="5">${vendorCards(c, 5, 'host')}</div></div>`;
}
export function notesTab(ev, c) {
  const helpers = Object.entries(ev.helpers).filter(([, h]) => !h.revoked);
  return `<div class="scroll"><div style="display:grid;grid-template-columns:minmax(0,1.6fr) minmax(0,1fr);gap:22px">
   <div class="field"><label for="n-${c.id}">Notes for ${esc(c.name.toLowerCase())}</label><textarea class="input" id="n-${c.id}" data-notes="${c.id}" placeholder="Menu decided, tasting on Sunday…">${esc(c.notes)}</textarea></div>
   <div style="display:grid;gap:14px;align-content:start">
     <div class="field"><label for="q-${c.id}">Best quote so far (₹)</label><input class="input num" id="q-${c.id}" inputmode="numeric" data-quote="${c.id}" value="${c.quote || ''}" placeholder="e.g. 85000"><span class="label">Cap ${inr(c.cap)}${c.quote ? ` · ${c.quote > c.cap ? 'over' : 'within'} cap` : ''}</span></div>
     <div class="field"><label for="a-${c.id}">Who leads this</label><select class="input" id="a-${c.id}" data-assign="${c.id}"><option value="">No helper yet</option>${helpers.map(([id, h]) => `<option value="${id}" ${c.lead === id ? 'selected' : ''}>${esc(h.name)}</option>`).join('')}</select></div>
     <button class="btn btn-ghost btn-sm" data-act="addhelper" data-cat="${c.id}">${ic('plus')}Add someone new</button>
   </div></div></div>`;
}
export function filesTab(ev, c) {
  return `<div class="scroll"><p class="cols" style="margin-top:0">Shortlisted vendors and saved quotes for ${esc(c.name.toLowerCase())}. Helpers add to this from their phone.</p>
   ${c.quote ? `<div class="tl-row"><span class="check" aria-pressed="true">${ic('check')}</span><span class="what"><b>Best quote ${inr(c.quote)}</b><small>Cap ${inr(c.cap)}</small></span></div>` : ''}
   ${
     c.shortlist.length
       ? c.shortlist
           .map(
             (v) =>
               `<div class="tl-row"><span class="c-gold">${ic('saved')}</span><span class="what"><b>${esc(v.name)}</b><small>${v.rating ? `Rated ${v.rating}` : ''}${v.phone ? ` · ${esc(v.phone)}` : ''}</small></span>${v.maps ? `<a class="btn btn-ghost btn-sm" href="${esc(v.maps)}" target="_blank" rel="noopener">${ic('pin')}Maps</a>` : ''}</div>`,
           )
           .join('')
       : `<div class="empty p-16"><p>Nothing shortlisted yet. Open a vendor and tap Shortlist.</p></div>`
   }</div>`;
}

// ---------- budget / timeline / family (shared desktop + mobile)
export const PALETTE = ['#E9C28A', '#EE7F63', '#86D3B5', '#C79BE0', '#7FA8E0', '#F2B8A0', '#D9A46A', '#9BE0C3'];
export function budgetView(ev) {
  const planned = ev.cats.reduce((a, c) => a + c.cap, 0),
    buffer = ev.budget - planned,
    quotes = ev.cats.reduce((a, c) => a + (c.quote || 0), 0);
  const R = 96,
    C = 2 * Math.PI * R;
  let acc = 0;
  const segs = ev.cats
    .map((c, i) => ({ v: c.cap, col: PALETTE[i % 8] }))
    .concat(buffer > 0 ? [{ v: buffer, col: 'rgba(244,232,216,.3)' }] : []);
  const sum = segs.reduce((a, s) => a + s.v, 0) || 1;
  const donut = segs
    .map((s) => {
      const len = (s.v / sum) * C;
      const el = `<circle cx="120" cy="120" r="${R}" fill="none" stroke="${s.col}" stroke-width="26" stroke-dasharray="${Math.max(len - 2.5, 0).toFixed(1)} ${C.toFixed(1)}" stroke-dashoffset="${(-acc).toFixed(1)}" transform="rotate(-90 120 120)"/>`;
      acc += len;
      return el;
    })
    .join('');
  const bufPct = (buffer / ev.budget) * 100,
    over = buffer < 0,
    low = !over && bufPct < 9.5;
  return `<div class="vhead"><div><h1 class="h-serif">Budget</h1><p>Every rupee has a home. 10% stays aside for surprises.</p></div>
   <button class="toggle" role="switch" aria-checked="${ev.hideBudget}" data-act="hide"><span class="knob"></span>Hide full budget from helpers</button></div>
   <div class="scroll"><div class="budget">
    <div><div class="donut"><svg width="240" height="240" viewBox="0 0 240 240" role="img" aria-label="Budget split across ${ev.cats.length} categories and buffer">${donut}</svg><div class="mid"><div><b class="num">${inrShort(ev.budget)}</b><small>total budget</small></div></div></div>
     <p class="legend-note">Helpers see only their own cap${ev.hideBudget ? '' : ' (you have turned this off, so helpers can see the total)'}.</p></div>
    <div><div class="btotals"><div><small>Planned</small><b class="num">${inr(planned)}</b></div><div><small>Quotes saved</small><b class="num">${inr(quotes)}</b></div><div><small>Buffer</small><b class="num">${inr(buffer)}</b></div></div>
     ${ev.cats
       .map((c, i) => {
         const L = lead(ev, c);
         const qp = c.cap ? Math.min(100, Math.round(((c.quote || 0) / c.cap) * 100)) : 0;
         return `<div class="brow"><span class="sw" style="background:${PALETTE[i % 8]}"></span>
      <div class="nm"><b>${esc(c.name)}</b><small>${L ? esc(L.name) : 'No helper yet'} · ${c.quote ? `quote ${inr(c.quote)}` : 'no quote yet'}</small></div>
      <div class="barcell"><div class="bar" title="Quote as a share of the cap"><i style="width:0;background:${c.quote > c.cap ? 'var(--rose)' : PALETTE[i % 8]}" data-w="${qp}%"></i></div></div>
      <label class="money"><span class="sr">${esc(c.name)} cap in rupees</span><input class="input num" inputmode="numeric" data-cap="${c.id}" value="${c.cap}"></label></div>`;
       })
       .join('')}
     <div class="note ${over || low ? 'bad' : 'ok'}">${ic(over || low ? 'alert' : 'check')}${over ? `Over budget by ${inr(-buffer)}. Lower a category or raise the total with Ask Utsav.` : low ? `Buffer is ${bufPct.toFixed(1)}%. Keep about 10% for surprises.` : `Within budget. ${inr(buffer)} (${bufPct.toFixed(0)}%) is kept aside.`}</div>
    </div></div></div>`;
}
export function stepRows(ev) {
  const rows = [];
  ev.cats.forEach((c) =>
    c.steps.forEach((s, i) => {
      const back = (c.steps.length - 1 - i) * 3;
      const d = s.by || new Date(dateOf(c.due).getTime() - back * DAY).toLocaleDateString('en-CA');
      rows.push({ c, s, i, d });
    }),
  );
  return rows.sort((a, b) => (a.d < b.d ? -1 : a.d > b.d ? 1 : 0));
}
export function fnStrip(ev) {
  const fs = ev.functions || [];
  if (!fs.length) return '';
  return `<div class="tl-group"><h2>Functions<span>${esc(ev.tradition && ev.tradition.id !== 'custom' ? ev.tradition.name : 'Your own mix')}</span></h2>
    <div class="fnstrip" role="region" aria-label="Functions" tabindex="0">${fs
      .map(
        (f) =>
          `<div class="fncard ${f.main ? 'main' : ''} ${daysLeft(f.date) < 0 ? 'past' : ''}"><span class="fdate"><b>${dateOf(f.date).getDate()}</b>${dateOf(f.date).toLocaleDateString('en-IN', { month: 'short' })}</span><span><b>${esc(f.name)}</b><small>${f.when ? esc(f.when) + ' · ' : ''}${
            f.cats
              .map((id) => esc(ev.cats.find((c) => c.id === id)?.name || ''))
              .filter(Boolean)
              .join(', ') || 'Whole family'
          }</small></span>${f.main ? '<em>Main</em>' : ''}</div>`,
      )
      .join('')}</div></div>`;
}
export function timelineView(ev) {
  const rows = stepRows(ev);
  const g = [
    ['Overdue', (r) => !r.s.done && daysLeft(r.d) < 0],
    ['This week', (r) => !r.s.done && daysLeft(r.d) >= 0 && daysLeft(r.d) <= 7],
    ['Next week', (r) => !r.s.done && daysLeft(r.d) > 7 && daysLeft(r.d) <= 14],
    ['Later', (r) => !r.s.done && daysLeft(r.d) > 14],
    ['Done', (r) => r.s.done],
  ];
  return `<div class="vhead"><div><h1 class="h-serif">Timeline</h1><p>Every step finishes before ${fmtLong(ev.date)}. Tick a step to update the orbit.</p></div><span class="pill">${ic('cal')}${daysLeft(ev.date)} days to go</span></div>
   <div class="scroll">${fnStrip(ev)}${g
     .map(([name, f]) => {
       const rs = rows.filter(f);
       if (!rs.length) return '';
       return `<div class="tl-group"><h2>${name}<span>${rs.length} ${rs.length === 1 ? 'step' : 'steps'}</span></h2>
    ${rs
      .map((r) => {
        const L = lead(ev, r.c);
        return `<div class="tl-row ${r.s.done ? 'is-done' : ''}"><button class="check" data-act="step" data-cat="${r.c.id}" data-i="${r.i}" aria-pressed="${r.s.done}" aria-label="${r.s.done ? 'Mark not done' : 'Mark done'}: ${esc(r.s.t)}">${r.s.done ? ic('check') : ''}</button>
     <span class="what"><b>${esc(r.s.t)}</b><small>${esc(r.c.name)}${r.s.fn ? ` · for ${esc(r.s.fn)}` : ''} · ${L ? esc(L.name) : 'No helper yet'}</small></span><span class="when ${!r.s.done && daysLeft(r.d) < 0 ? 'st-late' : ''}">${fmtD(r.d)}</span>${avatar(L, 32)}</div>`;
      })
      .join('')}</div>`;
     })
     .join('')}</div>`;
}
export function familyView(ev) {
  const hs = Object.entries(ev.helpers);
  const unassigned = ev.cats.filter((c) => !c.lead || ev.helpers[c.lead]?.revoked);
  const r = readyOf(ev.cats);
  return `<div class="vhead"><div style="display:flex;align-items:center;gap:18px"><span style="position:relative;width:76px;height:76px;display:grid;place-items:center">${ring('fam', r, '#86D3B5', 76, 6)}<b style="position:absolute;font:600 22px var(--serif)">${r}%</b></span>
    <div><h1 class="h-serif">Family</h1><p>Each person leads one part. They see the team, but change only their own.</p></div></div>
    <div class="flex gap-10 wrap"><button class="btn btn-ghost btn-sm" data-act="summary">${ic('share')}Share summary</button><button class="btn btn-gold btn-sm" data-act="addhelper">${ic('plus')}Add helper</button></div></div>
   <div class="scroll">
    ${
      hs.length
        ? `<div class="fam-grid">${hs
            .map(([id, h]) => {
              const mine = ev.cats.filter((c) => c.lead === id);
              const p = mine.length ? Math.round(mine.reduce((a, c) => a + pct(c), 0) / mine.length) : 0;
              const st = mine[0] ? status({ ...mine[0], pct: p }) : 'ok';
              return `<article class="hcard"><div class="top">${avatar(h, 54)}<div class="flex-1 min-w-0"><b>${esc(h.name)}</b><small>${esc(h.rel || 'Family')} · guide in ${h.lang === 'ta' ? 'Tamil' : 'English'}</small></div>${mine.length ? `<span class="status st-${st}">${STATUS_WORD[st]}</span>` : ''}</div>
       <div style="display:flex;justify-content:space-between;font-size:14px"><span>${mine.length ? mine.map((c) => esc(c.name)).join(', ') : '<span class="c-muted">No category yet</span>'}</span><b class="num">${p}%</b></div>
       <div class="pbar"><i style="width:0" data-w="${p}%"></i></div>
       ${h.revoked ? `<p class="label">Link removed. Create a new one to let ${esc(h.name)} back in.</p>` : ''}
       <div class="acts">${h.revoked ? `<button class="btn btn-gold btn-sm" data-act="newlink" data-h="${id}">${ic('plus')}Create new link</button>` : `<button class="btn btn-teal btn-sm" data-act="wa" data-h="${id}">${ic('chat')}Share on WhatsApp</button><button class="btn btn-ghost btn-sm" data-act="copylink" data-h="${id}">${ic('copy')}Copy link</button><button class="btn btn-ghost btn-sm" data-act="openview" data-h="${id}">${ic('eye')}Their view</button><button class="btn btn-ghost btn-sm btn-icon" data-act="revoke" data-h="${id}" aria-label="Remove ${esc(h.name)}'s link">${ic('x')}</button>`}</div></article>`;
            })
            .join('')}</div>`
        : `<div class="panel empty"><h2>No helpers yet</h2><p>Add a relative, give them a category and send their link on WhatsApp. They can start without signing up.</p><button class="btn btn-gold" data-act="addhelper">${ic('plus')}Add helper</button></div>`
    }
    ${unassigned.length ? `<div class="unassigned"><span class="label">Needs a helper:</span>${unassigned.map((c) => `<button class="chip" data-act="assign" data-cat="${c.id}">${ic(c.icon)}${esc(c.name)}</button>`).join('')}</div>` : ''}
    <div class="tl-group mt-22"><h2>Recent activity</h2>${
      ev.activity
        .slice(-6)
        .reverse()
        .map((a) => `<div class="feed">${ic('spark')}${esc(a.t)}</div>`)
        .join('') || '<p class="lede">Updates from helpers show up here.</p>'
    }</div>
   </div>`;
}

// ---------- mobile host
export function mobileHost(ev, v) {
  const sel = selCat(),
    ready = readyOf(ev.cats);
  let body = '';
  if (v === 'orbit') {
    const cats = ev.cats.slice(0, 6);
    body = `<h1 class="sr">${esc(ev.title)}: family orbit</h1><p class="tag-poem" style="font-size:22px;margin:6px 0 0">People, plans, possibilities.<br>All in one orbit.</p>
    <div class="morbit"><span class="track"></span>${planet(ev, Math.min(innerWidth * 0.46, 190), ready)}
     ${cats
       .map((c, i) => {
         const a = -Math.PI / 2 + (i * Math.PI) / 3;
         const st = status(c);
         return `<div class="bub" style="left:${50 + Math.cos(a) * 41}%;top:${50 + Math.sin(a) * 41}%"><button class="${c.id === sel.id ? 'on' : ''}" data-act="sel" data-cat="${c.id}" aria-label="${esc(c.name)} ${pct(c)}%">${ring('mb' + c.id, pct(c), RING_COL[st], 66, 3).replace('<svg', '<svg class="r"')}${ic(c.icon)}</button><small>${esc(c.name)} ${pct(c)}%</small></div>`;
       })
       .join('')}
    </div>
    <div class="mcards">${cats
      .map((c) => {
        const L = lead(ev, c),
          st = status(c);
        return `<button class="cap ${c.id === sel.id ? 'on' : ''}" data-act="sel" data-cat="${c.id}" data-mcard="${c.id}"><svg class="cico" aria-hidden="true"><use href="#i-${c.icon}"/></svg>${avatar(L, 46)}<span class="meta"><b>${esc(c.name)}</b><small>${L ? esc(L.name) : 'No helper yet'}</small><small class="st-${st}">Due ${fmtD(c.due)}</small></span><span class="ring">${ring('mc' + c.id, pct(c), RING_COL[st], 46)}<span>${pct(c)}%</span></span></button>`;
      })
      .join('')}</div>
    <section class="panel mpanel"><div class="mtitle"><svg class="ico" aria-hidden="true"><use href="#i-${sel.icon}"/></svg><div><b>${esc(sel.name)}</b><small>${lead(ev, sel) ? `Led by ${esc(lead(ev, sel).name)}` : `<button style="color:var(--gold-hi);text-decoration:underline" data-act="assign" data-cat="${sel.id}">Assign a helper</button>`} · Due ${fmtD(sel.due)} · ${pct(sel)}%</small></div></div>
     <div class="tabs" role="tablist">${['plan', 'vendors', 'notes', 'files'].map((t) => `<button role="tab" data-act="ptab" data-t="${t}" aria-selected="${S.ptab === t}">${t[0].toUpperCase() + t.slice(1)}</button>`).join('')}</div>
     <button class="btn btn-ghost btn-sm mt-6" data-act="askcat">${ic('spark')}Ask Utsav about ${esc(sel.name)}</button>
     ${S.ptab === 'plan' ? panelTab(ev, sel, true) : `<div class="mt-14">${panelTab(ev, sel)}</div>`}</section>
    <p class="tag-script" style="text-align:center;margin:30px 0 0;transform:rotate(-5deg)">Good people, great events</p>`;
  } else
    body = `<section class="panel mview">${v === 'budget' ? budgetView(ev) : v === 'timeline' ? timelineView(ev) : familyView(ev)}</section>`;
  return `<div class="mhost"><header class="mhdr"><a class="logo" href="#/"><b>Utsav</b></a><span class="grow"><a class="ev no-underline" href="#/events">${esc(ev.title)}</a><small>${fmtD(ev.date)} · ${ev.guests} guests · ${inrShort(ev.budget)}</small></span>
    <button class="btn btn-ghost btn-icon" data-act="menu" aria-label="Menu">${ic('chev')}</button>${S.menu ? hostMenu().replace('class="menu"', 'class="menu" style="top:64px;right:12px"') : ''}</header>
   <div class="mbody">${body}</div>
   <nav class="bnav" aria-label="Views">${[
     ['orbit', 'Orbit', 'orbit'],
     ['budget', 'Budget', 'wallet'],
     ['timeline', 'Timeline', 'cal'],
     ['family', 'Family', 'people'],
   ]
     .map(([k, n, i]) => `<a href="#/e/${ev.id}/${k}" ${v === k ? 'aria-current="page"' : ''}>${ic(i)}${n}</a>`)
     .join('')}<button data-act="copilot">${ic('spark')}Ask</button></nav></div>`;
}
