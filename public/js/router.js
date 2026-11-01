// Hash router and the render loop: picks the view, keeps focus across re-renders, sets the page title and language.
import { api } from './api.js';
import { focusKey } from './overlays.js';
import { S } from './state.js';
import { $, $$, esc, ic, initials, ls, TYPE_ICON } from './util.js';
import { loadEvents, viewEvents } from './views/events.js';
import { viewHelper } from './views/helper.js';
import { viewHost } from './views/host.js';
import { viewLanding } from './views/landing.js';
import { viewWizard, wizDefault } from './views/wizard.js';

export function parse() {
  const p = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  if (!p.length) return { name: 'landing' };
  if (p[0] === 'new') return { name: 'new' };
  if (p[0] === 'events') return { name: 'events' };
  if (p[0] === 'e' && p[1])
    return { name: 'host', id: p[1], view: ['orbit', 'budget', 'timeline', 'family'].includes(p[2]) ? p[2] : 'orbit' };
  if (p[0] === 'h' && p[1])
    return { name: 'helper', token: p[1], tab: ['today', 'steps', 'vendors', 'ask'].includes(p[2]) ? p[2] : 'today' };
  return { name: 'landing' };
}
export async function route() {
  S.route = parse();
  const r = S.route;
  if (r.name === 'host' && (!S.ev || S.ev.id !== r.id)) {
    S.ev = null;
    S.vendors = {};
    S.vgen++;
    S.sel = null;
    S.ptab = 'plan';
    S.prevRing = {};
    render();
    try {
      S.ev = (await api(`/api/events/${r.id}`)).event;
      S.introFor = r.id;
    } catch (e) {
      return renderError(e, 'host');
    }
  }
  if (r.name === 'helper' && (S.htoken !== r.token || !S.h)) {
    S.h = null;
    S.htoken = r.token;
    S.vendors = {};
    S.vgen++;
    S.prevRing = {};
    render();
    try {
      S.h = await api('/api/h/me', { helper: r.token });
      S.lang = ls.get('utsav-lang-' + S.h.me.id, S.h.me.lang || 'en');
    } catch (e) {
      return renderError(e, 'helper');
    }
  }
  if (r.name === 'new' && !S.w) {
    S.w = wizDefault();
    S.wstep = 0;
  }
  render();
}

// ---------------------------------------------------------------- render
export function render() {
  document.body.classList.toggle('m', S.isM);
  document.body.classList.toggle('hxb', S.route.name === 'helper');
  const r = S.route;
  const app = $('#app');
  let html = '';
  if (r.name === 'landing') html = viewLanding();
  else if (r.name === 'new') html = viewWizard();
  else if (r.name === 'events') {
    html = viewEvents();
  } else if (r.name === 'host') html = S.ev ? viewHost() : viewLoading();
  else if (r.name === 'helper') html = S.h ? viewHelper() : viewLoading();
  const keep = focusKey(document.activeElement);
  app.innerHTML = html;
  document.documentElement.lang = r.name === 'helper' && S.lang === 'ta' ? 'ta' : 'en';
  document.title = pageTitle(r);
  if (keep && !S.overlayOpen) $(keep)?.focus({ preventScroll: true });
  afterRender();
}
export function pageTitle(r) {
  const ev = S.ev?.title,
    name = { landing: 'Plan together, celebrate together', new: 'New plan', events: 'My celebrations' }[r.name];
  if (name) return `Utsav AI · ${name}`;
  if (r.name === 'host') return `${ev || 'Plan'} · ${r.view[0].toUpperCase()}${r.view.slice(1)} · Utsav AI`;
  if (r.name === 'helper')
    return `${S.h?.me?.name ? S.h.me.name + ' · ' : ''}${r.tab[0].toUpperCase()}${r.tab.slice(1)} · Utsav AI`;
  return 'Utsav AI';
}
export function afterRender() {
  fitStage();
  // animate rings / bars / tab indicator from their previous values to the new ones
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      $$('[data-off]').forEach((el) => {
        el.style.strokeDashoffset = el.dataset.off;
      });
      $$('[data-w]').forEach((el) => {
        el.style.width = el.dataset.w;
      });
      $$('[data-left]').forEach((el) => {
        el.style.left = el.dataset.left;
      });
    }),
  );
  if (S.route.name === 'events' && !S.evList) loadEvents();
  const chat = $('.chat');
  if (chat) chat.scrollTop = chat.scrollHeight;
  if (S.route.name === 'helper') {
    const k = S.route.tab;
    if (S.lastHTab !== k) {
      S.lastHTab = k;
      window.scrollTo(0, 0);
    }
    if (k === 'ask') window.scrollTo(0, document.body.scrollHeight);
  }
  const sel = S.route.name === 'host' ? S.sel : S.hsel;
  if (sel) {
    const c = $(`[data-mcard="${sel}"]`);
    if (c) {
      const p = c.parentElement;
      p.scrollTo({
        left: c.getBoundingClientRect().left - p.getBoundingClientRect().left + p.scrollLeft - 16,
        behavior: 'smooth',
      });
    }
  }
}
export function fitStage() {
  const st = $('#stage'),
    wrap = $('#sw');
  if (!st || !wrap) return;
  const s = Math.max(0.7, Math.min(1.3, innerWidth / 1440, Math.max(innerHeight, 640) / 810));
  st.style.transform = `translateX(-50%) scale(${s})`;
  wrap.style.height = 810 * s + 'px';
}
export function viewLoading() {
  return `<div class="page" style="display:grid;place-items:center;min-height:80vh"><div class="tc">
    <div class="planet" style="width:160px;height:160px;margin:0 auto"></div>
    <p class="lede mt-22">Lighting up your plan…</p></div></div>`;
}
export function renderError(e, kind) {
  const inactive = e.code === 'LINK_INACTIVE' || (kind === 'helper' && e.status === 401);
  $('#app').innerHTML = `<div class="page"><div class="top">${logo()}</div>
   <div class="panel err" style="max-width:560px;margin:80px auto 0">
    <h1 class="h-serif fs-34">${inactive ? 'This link is no longer active' : e.status === 404 ? 'We could not find that plan' : e.status === 403 ? 'This plan belongs to someone else' : 'Something went wrong'}</h1>
    <p class="lede mt-10">${inactive ? 'Ask the host to send you a new link on WhatsApp.' : esc(e.message)}</p>
    <div style="display:flex;gap:10px;justify-content:center;margin-top:20px;flex-wrap:wrap">
      ${inactive ? '' : '<button class="btn btn-coral" data-act="retry">Try again</button>'}
      <a class="btn btn-ghost" href="#/">Go to home</a></div></div></div>`;
}
export const logo = (sub = 'A more<br>memorable<br>tomorrow') =>
  `<a class="logo" href="#/"><b>Utsav</b><span class="sr"> AI home:</span><span class="bar"></span><small>${sub}</small></a>`;
export function avatar(person, size = 44, extra = '') {
  if (!person)
    return `<span class="avatar ini" style="width:${size}px;height:${size}px;background:rgba(255,255,255,.06);color:var(--gold);box-shadow:inset 0 0 0 1.5px rgba(233,194,138,.5)" aria-hidden="true">${ic('plus')}</span>`;
  return person.avatar
    ? `<img class="avatar ${extra}" src="${esc(person.avatar)}" alt="" style="width:${size}px;height:${size}px">`
    : `<span class="avatar ini ${extra}" style="width:${size}px;height:${size}px;font-size:${Math.round(size * 0.36)}px" aria-hidden="true">${esc(initials(person.name))}</span>`;
}
export function ring(key, p, col, size = 50, sw = 3.5) {
  const r = (size - sw) / 2 - 0.5,
    C = 2 * Math.PI * r,
    to = C * (1 - p / 100);
  const from = S.prevRing[key] ?? C;
  S.prevRing[key] = to;
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="rgba(255,255,255,.14)" stroke-width="${sw}"/><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${col}" stroke-width="${sw}" stroke-linecap="round" stroke-dasharray="${C.toFixed(1)}" style="stroke-dashoffset:${from.toFixed(1)};transition:stroke-dashoffset 1.1s var(--ease);filter:drop-shadow(0 0 4px ${col})" data-off="${to.toFixed(1)}" transform="rotate(-90 ${size / 2} ${size / 2})"/></svg>`;
}
export function arc(key, p, w = 120) {
  const len = Math.PI * 50,
    to = len * (1 - p / 100),
    from = S.prevRing[key] ?? len;
  S.prevRing[key] = to;
  return `<svg width="${w}" height="${w * 0.567}" viewBox="0 0 120 68" role="img" aria-label="${p} percent event ready" style="display:block;margin:4px auto 0">
  <defs><linearGradient id="arcg" x1="0" x2="1"><stop offset="0" stop-color="#7FD3B2"/><stop offset=".7" stop-color="#E9D38A"/><stop offset="1" stop-color="#F2C98A"/></linearGradient></defs>
  <path d="M10 58 A50 50 0 0 1 110 58" fill="none" stroke="rgba(255,255,255,.15)" stroke-width="5" stroke-linecap="round"/>
  <path d="M10 58 A50 50 0 0 1 110 58" fill="none" stroke="url(#arcg)" stroke-width="5" stroke-linecap="round" stroke-dasharray="${len.toFixed(1)}" style="stroke-dashoffset:${from.toFixed(1)};transition:stroke-dashoffset 1.4s var(--ease)" data-off="${to.toFixed(1)}"/>
  <text x="60" y="48" text-anchor="middle" fill="#FFF3E4" font-family="Cormorant Garamond, Georgia, serif" font-weight="600" font-size="28">${p}%</text>
  <text x="60" y="64" text-anchor="middle" fill="#D9CBB9" font-family="Jost, sans-serif" font-size="10">Event Ready</text></svg>`;
}
export function heroOf(ev) {
  return ev.hero || null;
}
export function dialArt(type) {
  const petals = Array.from(
    { length: 16 },
    (_, i) => `<path d="M100 26 C108 44 108 56 100 66 C92 56 92 44 100 26Z" transform="rotate(${i * 22.5} 100 100)"/>`,
  ).join('');
  const ticks = Array.from(
    { length: 48 },
    (_, i) => `<line x1="100" y1="8" x2="100" y2="${i % 4 ? 13 : 18}" transform="rotate(${i * 7.5} 100 100)"/>`,
  ).join('');
  return `<svg class="dial" viewBox="0 0 200 200" aria-hidden="true"><defs><radialGradient id="dg" cx="50%" cy="42%" r="62%"><stop offset="0" stop-color="#5A3A4E"/><stop offset=".65" stop-color="#2E1E2E"/><stop offset="1" stop-color="#1A1220"/></radialGradient></defs>
    <rect width="200" height="200" fill="url(#dg)"/><g fill="none" stroke="#E9C28A" stroke-width=".8" opacity=".55">${ticks}<circle cx="100" cy="100" r="88"/><circle cx="100" cy="100" r="76" stroke-dasharray="2 4"/></g>
    <g fill="none" stroke="#E9C28A" stroke-width="1" opacity=".75">${petals}<circle cx="100" cy="100" r="34"/></g>
    <use href="#i-${TYPE_ICON[type] || 'spark'}" x="84" y="84" width="32" height="32" style="color:#F4D9A8"/></svg>`;
}
export function planet(ev, size, ready, opts = {}) {
  const t = ev.title || '';
  const fs = Math.round(size * (t.length > 34 ? 0.074 : t.length > 22 ? 0.088 : 0.103));
  return `<div class="planet" style="width:${size}px;height:${size}px">
    ${heroOf(ev) ? `<img src="${esc(heroOf(ev))}" alt="">` : dialArt(ev.type)}
    <span class="shade"></span>
    <div class="txt" style="top:${Math.round(size * 0.44)}px"><h2 style="font-size:${fs}px">${esc(t)}</h2><p class="tg">${esc(ev.tagline || 'A brighter day ahead')}</p>${opts.noArc ? '' : arc('ready', ready, Math.round(size * 0.46))}</div></div>`;
}
