/* Utsav AI — single-page app. Hash routes:
   #/              landing            #/new         plan wizard
   #/events        host's events      #/e/:id/:view host (orbit | budget | timeline | family)
   #/h/:token/:tab helper app (today | steps | vendors | ask)                                  */
import { TRADITIONS, getTradition, allFunctions } from '/traditions.js';

// ---------------------------------------------------------------- utils
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const inr = (n) => '₹' + Math.round(Number(n) || 0).toLocaleString('en-IN');
const inrShort = (n) => n >= 1e7 ? `₹${+(n / 1e7).toFixed(2)} Cr` : n >= 1e5 ? `₹${+(n / 1e5).toFixed(1)} L` : inr(n);
const DAY = 864e5;
const todayISO = (o = 0) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + o); return d.toLocaleDateString('en-CA'); };
const dateOf = (iso) => new Date(iso + 'T00:00:00');
const daysLeft = (iso) => Math.round((dateOf(iso) - dateOf(todayISO())) / DAY);
const fmtD = (iso) => dateOf(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
const fmtLong = (iso) => dateOf(iso).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
const ic = (n, cls = '') => `<svg class="ico ${cls}" aria-hidden="true"><use href="#i-${n}"/></svg>`;
const initials = (n) => String(n || '?').replace(/^(Uncle|Aunt|Chithi|Chithappa|Cousin)\s+/i, '').split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
const ls = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage blocked */ } },
};
const randHex = (n) => [...crypto.getRandomValues(new Uint8Array(n))].map((b) => b.toString(16).padStart(2, '0')).join('');

const TYPE_LABEL = { wedding: 'Wedding', birthday: 'Birthday', community: 'Community event' };
const TYPE_ICON = { wedding: 'rings', birthday: 'cake', community: 'people' };
const PILL_ICON = { venue: 'doc', guests: 'send', transport: 'transport', food: 'doc', decor: 'decor', entertainment: 'entertainment', photos: 'photos', music: 'music' };
const RING_COL = { ok: '#86D3B5', done: '#86D3B5', soon: '#E9C98A', late: '#F0957A' };
const STATUS_WORD = { ok: 'On track', done: 'Done', soon: 'Due soon', late: 'Overdue' };

const pct = (c) => c.steps.length ? Math.round(c.steps.filter((s) => s.done).length / c.steps.length * 100) : 0;
const readyOf = (cats) => { let d = 0, t = 0; cats.forEach((c) => { t += c.steps.length; d += c.steps.filter((s) => s.done).length; }); return t ? Math.round(d / t * 100) : 0; };
const status = (c) => { const p = c.pct ?? pct(c); if (p === 100) return 'done'; const l = daysLeft(c.due); return l < 0 ? 'late' : l <= 7 ? 'soon' : 'ok'; };
const nextIdx = (c) => c.steps.findIndex((s) => !s.done);

// ---------------------------------------------------------------- helper-language text
const CAT_TA = { venue: 'மண்டபம்', food: 'உணவு', decor: 'அலங்காரம்', guests: 'விருந்தினர்', transport: 'போக்குவரத்து', entertainment: 'கேளிக்கை', photos: 'புகைப்படம்', music: 'இசை' };
const FLAGS = {
  venue: { en: ['Extra charge for overtime after the event', 'Generator and cleaning billed separately', 'Deposit refund rules not written'], ta: ['நிகழ்ச்சிக்குப் பின் கூடுதல் நேரக் கட்டணம்', 'ஜெனரேட்டர், சுத்தம் தனியாக வசூல்', 'முன்பணத் திருப்பி விதிகள் எழுத்தில் இல்லை'] },
  food: { en: ['Hidden travel or gas charge', 'More than 30% advance', 'No written per-plate quote'], ta: ['மறைமுக பயண அல்லது எரிவாயு கட்டணம்', '30%-க்கு மேல் முன்பணம்', 'எழுத்துப்பூர்வ தட்டு விலை இல்லை'] },
  decor: { en: ['Fresh flowers not in the quote', 'Setup may start late', 'Power backup for lights unclear'], ta: ['புதிய பூக்கள் விலையில் இல்லை', 'அமைப்பு தாமதமாகத் தொடங்கலாம்', 'விளக்குகளுக்கு மின் காப்பு தெளிவில்லை'] },
  guests: { en: ['Printer delivery date not written', 'Some guests have no address', 'Return gift count not confirmed'], ta: ['அச்சக டெலிவரி தேதி எழுத்தில் இல்லை', 'சில விருந்தினர்களின் முகவரி இல்லை', 'திருப்பி பரிசு எண்ணிக்கை உறுதியாகவில்லை'] },
  transport: { en: ['Waiting charge after free time', 'Late-night surcharge', 'Driver names and numbers missing'], ta: ['இலவச நேரத்திற்குப் பின் காத்திருப்புக் கட்டணம்', 'இரவு நேரக் கூடுதல் கட்டணம்', 'ஓட்டுநர் பெயர், எண் இல்லை'] },
  entertainment: { en: ['Overtime billed per hour', 'Sound system not included', 'Song list not agreed in advance'], ta: ['கூடுதல் நேரத்திற்கு மணிக்குக் கட்டணம்', 'ஒலி அமைப்பு சேர்க்கப்படவில்லை', 'பாடல் பட்டியல் முன்பே முடிவாகவில்லை'] },
  photos: { en: ['Album delivery date not written', 'Raw photos cost extra', 'Drone permission not included'], ta: ['ஆல்பம் தேதி எழுத்தில் இல்லை', 'மூல புகைப்படங்களுக்கு கூடுதல் கட்டணம்', 'ட்ரோன் அனுமதி சேர்க்கப்படவில்லை'] },
  music: { en: ['Travel charge for the troupe', 'Overtime billed per hour', 'Power for the sound system not included'], ta: ['குழுவின் பயணக் கட்டணம்', 'கூடுதல் நேரத்திற்கு மணிக்குக் கட்டணம்', 'ஒலி அமைப்பு மின்சாரம் சேர்க்கப்படவில்லை'] },
};
const T = {
  en: {
    greet: 'Vanakkam', tag: 'Big days happen with small steps', cap: 'Budget cap', left: 'days left', status: 'Status',
    now: 'Do this now', start: 'Start calling', mark: 'Mark as done', steps: 'Your steps', near: (c) => `Top ${c.toLowerCase()} options near you`,
    flags: 'Watch out for these', ask: (c) => `Ask Utsav about ${c.toLowerCase()}`, type: 'Type or speak your question',
    family: 'Family progress', view: 'View only. You can change only your own task.', alldone: 'Your part is complete',
    alldoneP: 'The host can see it on the family orbit. Thank you!', quote: 'Best quote so far (₹)', notes: 'Notes for the host', save: 'Save',
    myTask: 'My task', vendors: 'Vendors', askShort: 'Ask', call: 'Call', viewBtn: 'View', mine: 'Quotes and notes',
    chips: ['What is a fair price?', 'How much advance is okay?', 'How do I compare quotes?'],
    hint: 'Use the call script so every vendor gets the same questions, and ask for the price in writing.',
    words: { ok: 'On track', done: 'Done', soon: 'Due soon', late: 'Overdue' }, aiNote: 'Answers only about your task.',
    qs: (d) => [`Are you free on ${d}?`, 'What exactly is included in the price?', 'Any extra charges: travel, overtime, staff?', 'How much advance do you take?', 'Can you send the full quote on WhatsApp?'],
    script: (e, c) => `Vanakkam, I'm calling about ${e.title} on ${fmtLong(e.date)} in ${e.city}, for about ${e.guests} guests. I'm looking after the ${c.toLowerCase()} arrangements. Are you free on that date? What is included in your price, and are there any extra charges? How much advance do you take? Could you send the full quote on WhatsApp?`,
  },
  ta: {
    greet: 'வணக்கம்', tag: 'சிறிய படிகள், பெரிய நாள்', cap: 'பட்ஜெட் வரம்பு', left: 'நாட்கள் உள்ளன', status: 'நிலை',
    now: 'இப்போது செய்யுங்கள்', start: 'அழைக்கத் தொடங்கு', mark: 'முடிந்தது', steps: 'உங்கள் படிகள்', near: () => 'அருகிலுள்ள சிறந்த விருப்பங்கள்',
    flags: 'இவற்றைக் கவனியுங்கள்', ask: () => 'உத்சவிடம் கேளுங்கள்', type: 'கேள்வியை எழுதுங்கள் அல்லது பேசுங்கள்',
    family: 'குடும்ப முன்னேற்றம்', view: 'பார்வை மட்டும். உங்கள் பணியை மட்டுமே மாற்றலாம்.', alldone: 'உங்கள் பணி முடிந்தது',
    alldoneP: 'குடும்பத்தினர் இதைப் பார்க்கலாம். நன்றி!', quote: 'இதுவரை சிறந்த விலை (₹)', notes: 'உரிமையாளருக்கான குறிப்புகள்', save: 'சேமி',
    myTask: 'என் பணி', vendors: 'விற்பனையாளர்', askShort: 'கேள்', call: 'அழை', viewBtn: 'பார்', mine: 'விலை மற்றும் குறிப்புகள்',
    chips: ['நியாயமான விலை என்ன?', 'எவ்வளவு முன்பணம் சரி?', 'விலைகளை ஒப்பிடுவது எப்படி?'],
    hint: 'ஒவ்வொருவரிடமும் ஒரே கேள்விகளைக் கேட்க அழைப்பு உரையைப் பயன்படுத்துங்கள். விலையை எழுத்தில் வாங்குங்கள்.',
    words: { ok: 'சரியான பாதை', done: 'முடிந்தது', soon: 'விரைவில்', late: 'தாமதம்' }, aiNote: 'உங்கள் பணி பற்றி மட்டும் பதில்.',
    qs: (d) => [`${d} அன்று நீங்கள் கிடைப்பீர்களா?`, 'விலையில் என்னென்ன அடங்கும்?', 'பயணம், கூடுதல் நேரம், பணியாளர் கட்டணம் உண்டா?', 'முன்பணம் எவ்வளவு?', 'முழு விலையை வாட்ஸ்அப்பில் அனுப்ப முடியுமா?'],
    script: (e, c, id) => `வணக்கம், ${fmtLong(e.date)} அன்று ${e.city}-இல் நடக்கும் ${e.title} நிகழ்ச்சிக்காக அழைக்கிறேன். சுமார் ${e.guests} பேர் வருவார்கள். ${CAT_TA[id] || c} ஏற்பாடுகளை நான் பார்த்துக்கொள்கிறேன். அன்று நீங்கள் கிடைப்பீர்களா? விலையில் என்னென்ன அடங்கும், கூடுதல் கட்டணம் ஏதேனும் உண்டா? முன்பணம் எவ்வளவு? முழு விலையை வாட்ஸ்அப்பில் அனுப்ப முடியுமா?`,
  },
};
function stepHint(t) {
  t = t.toLowerCase();
  if (/review|compare|shortlist/.test(t)) return 'Compare menus, reviews and pricing to choose your top 2.';
  if (/book|confirm|pay|advance/.test(t)) return 'Get the full quote on WhatsApp first, then pay a 20–30% advance.';
  if (/send|invite/.test(t)) return 'Send the WhatsApp invite to everyone still on the list.';
  if (/call|quote/.test(t)) return 'Use the call script so every vendor gets the same questions.';
  return 'Tick it off once it is done so the family sees progress.';
}

// ---------------------------------------------------------------- state
const S = {
  cfg: { ai: false, places: false, firebase: null }, fbUser: null,
  hostKey: ls.get('utsav-host-key', null),
  route: { name: 'landing' }, isM: innerWidth < 1100,
  ev: null, sel: null, ptab: 'plan', prevTab: 0, introFor: null, menu: false,
  vendors: {}, vgen: 0,
  h: null, htoken: null, hsel: null, lang: 'en', chat: {}, copilot: [],
  w: null, wstep: 0, overlayOpen: false, prevRing: {},
};
if (!S.hostKey) { S.hostKey = randHex(24); ls.set('utsav-host-key', S.hostKey); }
const tokens = () => ls.get('utsav-tokens', {});
const saveToken = (eid, hid, tok) => { const t = tokens(); (t[eid] = t[eid] || {})[hid] = tok; ls.set('utsav-tokens', t); };
const tokenFor = (eid, hid) => tokens()[eid]?.[hid] || null;

// ---------------------------------------------------------------- api
async function api(path, { method = 'GET', body, helper } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (helper) headers['X-Helper-Token'] = helper;
  else {
    headers['X-Host-Key'] = S.hostKey;
    if (S.fbUser) { try { headers.Authorization = 'Bearer ' + await S.fbUser.getIdToken(); } catch { /* offline */ } }
  }
  let r;
  try { r = await fetch(path, { method, headers, body: body ? JSON.stringify(body) : undefined }); }
  catch { const e = new Error('No connection. Check your internet and try again.'); e.code = 'OFFLINE'; throw e; }
  if (r.status === 204) return null;
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error(j.error?.message || 'Something went wrong. Try again.'); e.code = j.error?.code; e.status = r.status; throw e; }
  return j;
}

// ---------------------------------------------------------------- boot
init();
async function init() {
  starfield();
  try { S.cfg = await api('/api/config'); } catch { /* keep defaults */ }
  addEventListener('hashchange', () => { S.menu = false; closeOverlay(); route(); scrollTo(0, 0); });
  addEventListener('resize', () => { const m = innerWidth < 1100; if (m !== S.isM) { S.isM = m; render(); } else fitStage(); });
  route();
  if (S.cfg.firebase) loadFirebase();
  setInterval(poll, 8000);
}
function starfield() {
  const box = $('#stars'); let h = '';
  for (let i = 0; i < 110; i++) {
    const r = ((i * 7919) % 97) / 97;
    h += `<i style="left:${(i * 37.3) % 100}%;top:${(i * 53.7 + i * i * .7) % 100}%;width:${(.8 + r * 1.9).toFixed(1)}px;height:${(.8 + r * 1.9).toFixed(1)}px;${i % 5 === 0 ? 'background:#FFE1B5;' : ''}box-shadow:0 0 ${(2 + r * 5) | 0}px ${i % 5 === 0 ? '#FFE1B5' : '#EDE9FF'};--d:${(2.4 + r * 4).toFixed(1)}s;--dl:${((i * .31) % 5).toFixed(2)}s"></i>`;
  }
  box.innerHTML = h;
}
async function loadFirebase() {
  const load = (src) => new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
  try {
    await load('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
    await load('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js');
    firebase.initializeApp(S.cfg.firebase);
    firebase.auth().onAuthStateChanged((u) => { const changed = (u?.uid || null) !== (S.fbUser?.uid || null); S.fbUser = u; if (changed && ['landing', 'events'].includes(S.route.name)) render(); });
  } catch { S.cfg.firebase = null; }
}
async function signIn() {
  if (!window.firebase) return toast('Google sign-in is not set up on this server. You can keep planning without it.');
  try { await firebase.auth().signInWithPopup(new firebase.auth.GoogleAuthProvider()); toast('Signed in'); location.hash = '#/events'; }
  catch (e) { if (e.code !== 'auth/popup-closed-by-user') toast('Sign-in did not finish. Try again.'); }
}

// ---------------------------------------------------------------- router
function parse() {
  const p = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  if (!p.length) return { name: 'landing' };
  if (p[0] === 'new') return { name: 'new' };
  if (p[0] === 'events') return { name: 'events' };
  if (p[0] === 'e' && p[1]) return { name: 'host', id: p[1], view: ['orbit', 'budget', 'timeline', 'family'].includes(p[2]) ? p[2] : 'orbit' };
  if (p[0] === 'h' && p[1]) return { name: 'helper', token: p[1], tab: ['today', 'steps', 'vendors', 'ask'].includes(p[2]) ? p[2] : 'today' };
  return { name: 'landing' };
}
async function route() {
  S.route = parse();
  const r = S.route;
  if (r.name === 'host' && (!S.ev || S.ev.id !== r.id)) {
    S.ev = null; S.vendors = {}; S.vgen++; S.sel = null; S.ptab = 'plan'; S.prevRing = {};
    render();
    try { S.ev = (await api(`/api/events/${r.id}`)).event; S.introFor = r.id; }
    catch (e) { return renderError(e, 'host'); }
  }
  if (r.name === 'helper' && (S.htoken !== r.token || !S.h)) {
    S.h = null; S.htoken = r.token; S.vendors = {}; S.vgen++; S.prevRing = {};
    render();
    try { S.h = await api('/api/h/me', { helper: r.token }); S.lang = ls.get('utsav-lang-' + S.h.me.id, S.h.me.lang || 'en'); }
    catch (e) { return renderError(e, 'helper'); }
  }
  if (r.name === 'new' && !S.w) { S.w = wizDefault(); S.wstep = 0; }
  render();
}

// ---------------------------------------------------------------- render
function render() {
  document.body.classList.toggle('m', S.isM);
  document.body.classList.toggle('hxb', S.route.name === 'helper');
  const r = S.route;
  const app = $('#app');
  let html = '';
  if (r.name === 'landing') html = viewLanding();
  else if (r.name === 'new') html = viewWizard();
  else if (r.name === 'events') { html = viewEvents(); }
  else if (r.name === 'host') html = S.ev ? viewHost() : viewLoading();
  else if (r.name === 'helper') html = S.h ? viewHelper() : viewLoading();
  app.innerHTML = html;
  afterRender();
}
function afterRender() {
  fitStage();
  // animate rings / bars / tab indicator from their previous values to the new ones
  requestAnimationFrame(() => requestAnimationFrame(() => {
    $$('[data-off]').forEach((el) => { el.style.strokeDashoffset = el.dataset.off; });
    $$('[data-w]').forEach((el) => { el.style.width = el.dataset.w; });
    $$('[data-left]').forEach((el) => { el.style.left = el.dataset.left; });
  }));
  if (S.route.name === 'events' && !S.evList) loadEvents();
  const chat = $('.chat'); if (chat) chat.scrollTop = chat.scrollHeight;
  if (S.route.name === 'helper') { const k = S.route.tab; if (S.lastHTab !== k) { S.lastHTab = k; window.scrollTo(0, 0); } if (k === 'ask') window.scrollTo(0, document.body.scrollHeight); }
  const sel = S.route.name === 'host' ? S.sel : S.hsel;
  if (sel) { const c = $(`[data-mcard="${sel}"]`); if (c) { const p = c.parentElement; p.scrollTo({ left: c.getBoundingClientRect().left - p.getBoundingClientRect().left + p.scrollLeft - 16, behavior: 'smooth' }); } }
}
function fitStage() {
  const st = $('#stage'), wrap = $('#sw');
  if (!st || !wrap) return;
  const s = Math.max(.7, Math.min(1.3, innerWidth / 1440, Math.max(innerHeight, 640) / 810));
  st.style.transform = `translateX(-50%) scale(${s})`;
  wrap.style.height = 810 * s + 'px';
}
function viewLoading() {
  return `<div class="page" style="display:grid;place-items:center;min-height:80vh"><div style="text-align:center">
    <div class="planet" style="width:160px;height:160px;margin:0 auto"></div>
    <p class="lede" style="margin-top:22px">Lighting up your plan…</p></div></div>`;
}
function renderError(e, kind) {
  const inactive = e.code === 'LINK_INACTIVE' || (kind === 'helper' && e.status === 401);
  $('#app').innerHTML = `<div class="page"><div class="top">${logo()}</div>
   <div class="panel err" style="max-width:560px;margin:80px auto 0">
    <h1 class="h-serif" style="font-size:34px">${inactive ? 'This link is no longer active' : e.status === 404 ? 'We could not find that plan' : e.status === 403 ? 'This plan belongs to someone else' : 'Something went wrong'}</h1>
    <p class="lede" style="margin-top:10px">${inactive ? 'Ask the host to send you a new link on WhatsApp.' : esc(e.message)}</p>
    <div style="display:flex;gap:10px;justify-content:center;margin-top:20px;flex-wrap:wrap">
      ${inactive ? '' : '<button class="btn btn-coral" data-act="retry">Try again</button>'}
      <a class="btn btn-ghost" href="#/">Go to home</a></div></div></div>`;
}
const logo = (sub = 'A more<br>memorable<br>tomorrow') => `<a class="logo" href="#/" aria-label="Utsav AI home"><b>Utsav</b><span class="bar"></span><small>${sub}</small></a>`;
function avatar(person, size = 44, extra = '') {
  if (!person) return `<span class="avatar ini" style="width:${size}px;height:${size}px;background:rgba(255,255,255,.06);color:var(--gold);box-shadow:inset 0 0 0 1.5px rgba(233,194,138,.5)" aria-hidden="true">${ic('plus')}</span>`;
  return person.avatar ? `<img class="avatar ${extra}" src="${esc(person.avatar)}" alt="" style="width:${size}px;height:${size}px">`
    : `<span class="avatar ini ${extra}" style="width:${size}px;height:${size}px;font-size:${Math.round(size * .36)}px" aria-hidden="true">${esc(initials(person.name))}</span>`;
}
function ring(key, p, col, size = 50, sw = 3.5) {
  const r = (size - sw) / 2 - .5, C = 2 * Math.PI * r, to = C * (1 - p / 100);
  const from = S.prevRing[key] ?? C; S.prevRing[key] = to;
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="rgba(255,255,255,.14)" stroke-width="${sw}"/><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${col}" stroke-width="${sw}" stroke-linecap="round" stroke-dasharray="${C.toFixed(1)}" style="stroke-dashoffset:${from.toFixed(1)};transition:stroke-dashoffset 1.1s var(--ease);filter:drop-shadow(0 0 4px ${col})" data-off="${to.toFixed(1)}" transform="rotate(-90 ${size / 2} ${size / 2})"/></svg>`;
}
function arc(key, p, w = 120) {
  const len = Math.PI * 50, to = len * (1 - p / 100), from = S.prevRing[key] ?? len; S.prevRing[key] = to;
  return `<svg width="${w}" height="${w * .567}" viewBox="0 0 120 68" role="img" aria-label="${p} percent event ready" style="display:block;margin:4px auto 0">
  <defs><linearGradient id="arcg" x1="0" x2="1"><stop offset="0" stop-color="#7FD3B2"/><stop offset=".7" stop-color="#E9D38A"/><stop offset="1" stop-color="#F2C98A"/></linearGradient></defs>
  <path d="M10 58 A50 50 0 0 1 110 58" fill="none" stroke="rgba(255,255,255,.15)" stroke-width="5" stroke-linecap="round"/>
  <path d="M10 58 A50 50 0 0 1 110 58" fill="none" stroke="url(#arcg)" stroke-width="5" stroke-linecap="round" stroke-dasharray="${len.toFixed(1)}" style="stroke-dashoffset:${from.toFixed(1)};transition:stroke-dashoffset 1.4s var(--ease)" data-off="${to.toFixed(1)}"/>
  <text x="60" y="48" text-anchor="middle" fill="#FFF3E4" font-family="Cormorant Garamond, Georgia, serif" font-weight="600" font-size="28">${p}%</text>
  <text x="60" y="64" text-anchor="middle" fill="#D9CBB9" font-family="Jost, sans-serif" font-size="10">Event Ready</text></svg>`;
}
function heroOf(ev) { return ev.hero || null; }
function dialArt(type) {
  const petals = Array.from({ length: 16 }, (_, i) => `<path d="M100 26 C108 44 108 56 100 66 C92 56 92 44 100 26Z" transform="rotate(${i * 22.5} 100 100)"/>`).join('');
  const ticks = Array.from({ length: 48 }, (_, i) => `<line x1="100" y1="8" x2="100" y2="${i % 4 ? 13 : 18}" transform="rotate(${i * 7.5} 100 100)"/>`).join('');
  return `<svg class="dial" viewBox="0 0 200 200" aria-hidden="true"><defs><radialGradient id="dg" cx="50%" cy="42%" r="62%"><stop offset="0" stop-color="#5A3A4E"/><stop offset=".65" stop-color="#2E1E2E"/><stop offset="1" stop-color="#1A1220"/></radialGradient></defs>
    <rect width="200" height="200" fill="url(#dg)"/><g fill="none" stroke="#E9C28A" stroke-width=".8" opacity=".55">${ticks}<circle cx="100" cy="100" r="88"/><circle cx="100" cy="100" r="76" stroke-dasharray="2 4"/></g>
    <g fill="none" stroke="#E9C28A" stroke-width="1" opacity=".75">${petals}<circle cx="100" cy="100" r="34"/></g>
    <use href="#i-${TYPE_ICON[type] || 'spark'}" x="84" y="84" width="32" height="32" style="color:#F4D9A8"/></svg>`;
}
function planet(ev, size, ready, opts = {}) {
  const t = ev.title || '';
  const fs = Math.round(size * (t.length > 34 ? .074 : t.length > 22 ? .088 : .103));
  return `<div class="planet" style="width:${size}px;height:${size}px">
    ${heroOf(ev) ? `<img src="${esc(heroOf(ev))}" alt="">` : dialArt(ev.type)}
    <span class="shade"></span>
    <div class="txt" style="top:${Math.round(size * .44)}px"><h2 style="font-size:${fs}px">${esc(t)}</h2><p class="tg">${esc(ev.tagline || 'A brighter day ahead')}</p>${opts.noArc ? '' : arc('ready', ready, Math.round(size * .46))}</div></div>`;
}

// ================================================================= LANDING
function viewLanding() {
  const moons = [['venue', 'Venue'], ['food', 'Food'], ['decor', 'Decor'], ['guests', 'Guests'], ['transport', 'Transport'], ['entertainment', 'Music']];
  const demo = { title: "Riya's 30th Birthday", tagline: 'A brighter you ahead', hero: '/assets/portrait.jpg', type: 'birthday' };
  return `<div class="page">
  <header class="topbar">${logo()}
    <nav style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
      <a class="btn btn-ghost btn-sm" href="#/events">My events</a>
      ${S.cfg.firebase ? (S.fbUser ? `<button class="btn btn-ghost btn-sm" data-act="signout">Sign out</button>` : `<button class="btn btn-ghost btn-sm" data-act="signin">${ic('google')}Continue with Google</button>`) : ''}
    </nav></header>
  <section class="hero">
    <div>
      <h1>Plan it together. Celebrate it together.</h1>
      <p class="lede">Utsav AI turns your wedding, birthday or community event into a full plan in seconds: a rupee budget with 10% kept aside, a timeline and a vendor list. Then it gives each relative their own job, a simple step-by-step guide and real vendors near them.</p>
      <div class="cta-row">
        <button class="btn btn-coral" data-act="sample">${ic('spark')}Try a sample plan</button>
        <a class="btn btn-ghost" href="#/new">Start my plan</a>
      </div>
      <p class="fine">Sample: Riya’s 30th birthday · Coimbatore · 60 guests · ₹3,00,000. No sign-up needed.</p>
    </div>
    <div class="hero-orbit" aria-hidden="true">
      <div class="track">${moons.map(([id, n], i) => { const a = -Math.PI / 2 + i * Math.PI / 3; return `<span style="position:absolute;left:${50 + Math.cos(a) * 50}%;top:${50 + Math.sin(a) * 50}%;transform:translate(-50%,-50%)"><span class="moon glass"><span>${ic(id)}</span>${n}</span></span>`; }).join('')}</div>
      ${planet(demo, S.isM ? 200 : 250, 72)}
    </div>
  </section>
  <section class="journey" aria-label="How it works">
    <div><span class="lampi"><svg viewBox="0 0 40 40"><use href="#i-lamp"/></svg></span><h3>AI makes the plan</h3><p>Tell us the event, city, guests and budget. Gemini builds the budget split, timeline and ideas for your rituals.</p></div>
    <div><span class="lampi"><svg viewBox="0 0 40 40"><use href="#i-lamp"/></svg></span><h3>The family splits the work</h3><p>Give Sana the food and Aarav the venue. Each gets a private WhatsApp link. No app, no sign-up.</p></div>
    <div><span class="lampi"><svg viewBox="0 0 40 40"><use href="#i-lamp"/></svg></span><h3>Every helper gets a coach</h3><p>A next step, a call script in Tamil or English, red flags to avoid and real vendors from Google Maps.</p></div>
  </section>
  <section class="l-tags">
    <p class="tag-poem">People<br>Plans<br>Possibilities<br>All in one orbit.</p>
    <p class="tag-caps" style="text-align:center">Different people<br>brighter events<br>events bring us closer</p>
    <p class="tag-script" style="transform:rotate(-8deg)">Good people,<br>&nbsp;great events</p>
  </section>
  </div>`;
}

// ================================================================= WIZARD
function relDay(d) { return d === 0 ? 'Main day' : d < 0 ? `${-d} day${d === -1 ? '' : 's'} before` : `${d} day${d === 1 ? '' : 's'} after`; }
function wizDefault(type = 'wedding', trad) {
  const t = getTradition(type, trad);
  return { type, tradition: t.id, sub: '', title: '', own: '', city: 'Coimbatore', date: todayISO(60), guests: type === 'wedding' ? 300 : 80, budget: type === 'wedding' ? 1200000 : 300000, funcs: t.funcs.map((f) => f.name), food: ['Pure veg'], vibe: 'Traditional' };
}
function viewWizard() {
  const w = S.w, st = S.wstep;
  const heads = ['What are we celebrating?', 'Where and when?', 'How many guests, and what budget?', 'Functions, food and feel', 'Ready to light the lamp'];
  const trad = getTradition(w.type, w.tradition), tradName = trad.id === 'custom' ? 'Mixed' : trad.name;
  let body = '';
  if (st === 0) body = `<div class="types">${Object.keys(TYPE_LABEL).map((k) => `<button class="type" data-act="wtype" data-v="${k}" aria-pressed="${w.type === k}">${ic(TYPE_ICON[k])}<b>${TYPE_LABEL[k]}</b><small>${k === 'wedding' ? 'Muhurtham to reception' : k === 'birthday' ? 'First to sixtieth' : 'Festivals and gatherings'}</small></button>`).join('')}</div>
    <div class="field"><span class="label">${w.type === 'wedding' ? 'Which tradition? Every family does it differently.' : w.type === 'birthday' ? 'What kind of birthday?' : 'What kind of event?'}</span>
      <div class="trads">${TRADITIONS[w.type].map((t) => `<button type="button" class="trad" data-act="wtrad" data-v="${t.id}" aria-pressed="${w.tradition === t.id}"><b>${esc(t.name)}</b><small>${esc(t.note)}</small></button>`).join('')}</div></div>
    <div class="field"><label for="w-title">Name it (optional)</label><input class="input" id="w-title" data-w="title" maxlength="80" value="${esc(w.title)}" placeholder="${w.type === 'wedding' ? "Kavitha & Arvind's wedding" : w.type === 'birthday' ? "Amma's 60th birthday" : 'Pongal on our street'}"></div>`;
  if (st === 1) body = `<div class="field"><label for="w-city">City</label><input class="input" id="w-city" data-w="city" value="${esc(w.city)}" autocomplete="address-level2"></div>
    <div class="field"><label for="w-date">Event date</label><input class="input" id="w-date" type="date" data-w="date" value="${w.date}" min="${todayISO(3)}"></div>
    <p class="lede" style="font-size:14px">For a muhurtham, check the date with your family priest before you book the hall.</p>`;
  if (st === 2) body = `<div class="field range"><label for="w-guests">Guests</label><span class="val num" id="v-guests">${w.guests}</span><input id="w-guests" type="range" min="20" max="1500" step="10" value="${w.guests}" data-w="guests"></div>
    <div class="field range"><label for="w-budget">Total budget</label><span class="val num" id="v-budget">${inr(w.budget)}</span><input id="w-budget" type="range" min="50000" max="5000000" step="10000" value="${w.budget}" data-w="budget"><span class="label">10% is kept aside for surprises.</span></div>`;
  if (st === 3) {
    const known = allFunctions(w.type, w.tradition), byName = Object.fromEntries(known.map((f) => [f.name, f]));
    const chosen = w.funcs.map((n) => byName[n] || { name: n, d: 0, when: '', own: true }).sort((a, b) => a.d - b.d);
    const more = known.filter((f) => !w.funcs.includes(f.name));
    body = `<div class="field"><span class="label">Your functions, in order. Tap × to remove one.</span>
      <ol class="fnlist">${chosen.map((f) => `<li class="${f.main ? 'main' : ''}"><span class="fd">${relDay(f.d)}${f.when ? ` · ${esc(f.when)}` : ''}</span><b>${esc(f.name)}</b>${f.main ? '<em>Main</em>' : f.own ? '<em>Your own</em>' : ''}<button type="button" class="fx" data-act="wchip" data-k="funcs" data-v="${esc(f.name)}" aria-label="Remove ${esc(f.name)}">${ic('x')}</button></li>`).join('') || '<li class="empty">No functions yet. Add one below.</li>'}</ol></div>
    ${more.length ? `<div class="field"><span class="label">Add from other traditions</span><div class="chips">${more.map((f) => `<button type="button" class="chip" data-act="wchip" data-k="funcs" data-v="${esc(f.name)}" aria-pressed="false">${ic('plus')}${esc(f.name)}</button>`).join('')}</div></div>` : ''}
    <div class="field"><label for="w-own">Something else your family does?</label><div class="ownrow"><input class="input" id="w-own" data-w="own" maxlength="40" value="${esc(w.own)}" placeholder="${w.type === 'wedding' ? 'e.g. Mappillai azhaippu' : 'e.g. Family pooja'}"><button type="button" class="btn btn-ghost" data-act="wown">${ic('plus')}Add</button></div></div>
    <div class="field"><span class="label">Food</span><div class="chips">${['Pure veg', 'Veg and non-veg', 'Jain', 'Elai sappadu (banana leaf)'].map((f) => `<button class="chip" data-act="wchip" data-k="food" data-v="${esc(f)}" aria-pressed="${w.food.includes(f)}">${esc(f)}</button>`).join('')}</div></div>
    <div class="field"><span class="label">Feel</span><div class="chips">${['Traditional', 'Grand', 'Simple and warm', 'Modern'].map((f) => `<button class="chip" data-act="wvibe" data-v="${f}" aria-pressed="${w.vibe === f}">${f}</button>`).join('')}</div></div>`;
  }
  if (st === 4) body = `<p class="lede">Utsav AI will write your budget split, timeline, guided steps and ideas. You can change anything later.</p>
    <div style="display:grid;gap:10px">${[['Event', w.title || `${tradName} ${TYPE_LABEL[w.type].toLowerCase()}`], ['Tradition', tradName], ['Where', w.city], ['When', fmtLong(w.date)], ['Guests', w.guests], ['Budget', inr(w.budget)], ['Functions', w.funcs.join(', ') || '—'], ['Food', w.food.join(', ') || '—']].map(([k, v]) => `<div class="srow"><span>${k}</span><b>${esc(v)}</b></div>`).join('')}</div>`;
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
    <aside class="panel wsum"><p class="label">Your plan so far</p><h2 class="h-serif" style="font-size:28px">${esc(w.title || TYPE_LABEL[w.type])}</h2>
      <div class="srow"><span>Tradition</span><b>${esc(tradName)}</b></div><div class="srow"><span>Functions</span><b>${w.funcs.length}</b></div><div class="srow"><span>City</span><b id="s-city">${esc(w.city)}</b></div>
      <div class="srow"><span>Date</span><b id="s-date">${fmtLong(w.date)}</b></div><div class="srow"><span>Guests</span><b class="num" id="s-guests">${w.guests}</b></div>
      <div class="srow"><span>Budget</span><b class="num" id="s-budget">${inr(w.budget)}</b></div><div class="srow"><span>Per guest</span><b class="num" id="s-per">${inr(w.budget / w.guests)}</b></div>
      <p class="lede" style="font-size:13px">${S.cfg.ai ? 'Gemini writes the plan. The server checks every rupee adds up.' : 'Plans use Utsav’s built-in templates on this server.'}</p></aside>
  </section></div>`;
}
function wizValid() {
  const w = S.w;
  if (S.wstep === 3 && !w.funcs.length) return 'Add at least one function.';
  if (S.wstep === 1) { if (!w.city.trim()) return 'Enter a city.'; if (!w.date || daysLeft(w.date) < 3) return 'Pick a date at least 3 days from today.'; }
  return null;
}
async function createPlan() {
  showLamp('Lighting the lamp…', S.cfg.ai ? 'Gemini is writing your plan' : 'Building your plan');
  try {
    const r = await api('/api/plan', { method: 'POST', body: S.w });
    await new Promise((res) => setTimeout(res, 900));
    S.w = null; S.ev = null; closeOverlay();
    location.hash = `#/e/${r.id}/orbit`;
    toast('Your plan is ready. Tap a category to begin.');
  } catch (e) { closeOverlay(); toast(e.message, true); }
}

// ================================================================= EVENTS
function viewEvents() {
  const list = S.evList;
  return `<div class="page"><header class="topbar">${logo()}
   <nav style="display:flex;gap:10px;flex-wrap:wrap">${S.cfg.firebase && !S.fbUser ? `<button class="btn btn-ghost btn-sm" data-act="signin">${ic('google')}Continue with Google</button>` : ''}<a class="btn btn-gold btn-sm" href="#/new">${ic('plus')}New plan</a></nav></header>
   <h1 class="h-serif" style="font-size:44px;margin-top:36px">Your celebrations</h1>
   <p class="lede">${S.fbUser ? `Signed in as ${esc(S.fbUser.displayName || S.fbUser.email)}.` : 'Plans you made in this browser. Sign in with Google to open them on other devices.'}</p>
   ${!list ? `<div class="evlist">${[0, 1].map(() => '<div class="skel" style="height:92px;border-radius:999px"></div>').join('')}</div>`
    : list.length ? `<div class="evlist">${list.map((e) => `<a class="evcard glass" href="#/e/${e.id}/orbit"><span class="mini"><span class="planet" style="display:block">${e.hero ? `<img src="${esc(e.hero)}" alt="">` : dialArt(e.type)}</span></span><span style="flex:1;min-width:0"><b>${esc(e.title)}</b><small>${fmtLong(e.date)} · ${esc(e.city)}</small></span><span class="ring" style="position:relative;width:50px;height:50px;display:grid;place-items:center">${ring('ev' + e.id, e.ready, '#86D3B5')}<span style="position:absolute;font-size:12px">${e.ready}%</span></span></a>`).join('')}</div>`
    : `<div class="panel empty" style="margin-top:26px;max-width:560px"><h3>No plans yet</h3><p>Start a new plan, or open the sample to see how it works.</p><div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap"><a class="btn btn-coral" href="#/new">Start my plan</a><button class="btn btn-ghost" data-act="sample">Open the sample</button></div></div>`}
  </div>`;
}
async function loadEvents() {
  S.evList = undefined;
  try { S.evList = (await api('/api/events')).events; } catch { S.evList = []; }
  if (S.route.name === 'events') { $('#app').innerHTML = viewEvents(); afterRender(); }
}

// ================================================================= HOST
const SLOTS = [{ x: 237, y: 84, w: 280, s: -1 }, { x: 198, y: 213, w: 262, s: -1 }, { x: 237, y: 340, w: 280, s: -1 }, { x: 925, y: 84, w: 280, s: 1 }, { x: 982, y: 213, w: 262, s: 1 }, { x: 925, y: 340, w: 280, s: 1 }];
const lead = (ev, c) => (c.lead && ev.helpers[c.lead]) ? { id: c.lead, ...ev.helpers[c.lead] } : null;
function selCat() { const ev = S.ev; if (!S.sel || !ev.cats.find((c) => c.id === S.sel)) S.sel = (ev.cats.find((c) => c.id === 'food') || ev.cats[0]).id; return ev.cats.find((c) => c.id === S.sel); }
function viewHost() {
  const ev = S.ev, v = S.route.view;
  selCat();
  if (S.isM) return mobileHost(ev, v);
  const intro = S.introFor === ev.id; if (intro) S.introFor = null;
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
function hostHeader(ev) {
  const host = ev.host || (S.fbUser ? { name: (S.fbUser.displayName || 'Host').split(' ')[0], avatar: S.fbUser.photoURL } : { name: 'Host' });
  return `<header class="hdr">${logo()}
   <div class="hpill">
     <a class="ev" href="#/events" title="Switch celebration">${ic(TYPE_ICON[ev.type] || 'spark')}<span>${esc(TYPE_LABEL[ev.type] || 'Event')}</span>${ic('chev')}</a>
     <span class="sep"></span><span style="color:#CFC2EE">${ic('people')}</span><span class="kv"><small>Guests</small><b class="num">${ev.guests}</b></span>
     <span class="sep"></span><span style="color:var(--gold)">${ic('coins')}</span><span class="kv"><small>Budget</small><b class="num">${inrShort(ev.budget)}</b></span>
     <button class="ask" data-act="copilot">${ic('spark')}Ask Utsav<span class="wv" aria-hidden="true">${[6, 12, 16, 9, 14, 7, 11].map((h, i) => `<i style="height:${h}px;animation-delay:${i * .13}s"></i>`).join('')}</span></button>
   </div>
   <button class="who" data-act="menu" aria-expanded="${S.menu}">${avatar(host, 44)}<span><b>${esc(host.name)}</b><small>Host</small></span>${ic('chev')}</button>
   ${S.menu ? hostMenu() : ''}</header>`;
}
function hostMenu() {
  return `<div class="menu" role="menu">
    <a href="#/events" role="menuitem">${ic('home')}My celebrations</a>
    <a href="#/new" role="menuitem">${ic('plus')}New plan</a>
    <button data-act="summary" role="menuitem">${ic('share')}Share summary</button>
    <button data-act="addhelper" role="menuitem">${ic('people')}Add helper</button>
    ${S.cfg.firebase ? (S.fbUser ? `<button data-act="signout" role="menuitem">${ic('x')}Sign out</button>` : `<button data-act="signin" role="menuitem">${ic('google')}Sign in with Google</button>`) : ''}
  </div>`;
}
function linkPath(sl) {
  const y = sl.y + 41, sx = sl.s < 0 ? sl.x + sl.w : sl.x, cx = 720, cy = 256, r = 134;
  const a = Math.atan2(y - cy, sx - cx), ex = cx + Math.cos(a) * r, ey = cy + Math.sin(a) * r, mx = (sx + ex) / 2;
  return `M${sx} ${y} C ${mx.toFixed(1)} ${y}, ${mx.toFixed(1)} ${ey.toFixed(1)}, ${ex.toFixed(1)} ${ey.toFixed(1)}`;
}
function orbit(ev) {
  const sel = selCat(), cats = ev.cats.slice(0, 6), ready = readyOf(ev.cats);
  const paths = cats.map((c, i) => linkPath(SLOTS[i]));
  return `<span class="orbit-ring1" aria-hidden="true"></span><span class="orbit-ring2" aria-hidden="true"></span>
  <svg class="links" width="1440" height="810" viewBox="0 0 1440 810" aria-hidden="true">${paths.map((d) => `<path d="${d}" fill="none" stroke="rgba(246,200,150,.55)" stroke-width="1.2" stroke-dasharray="1 5" stroke-linecap="round"/>`).join('')}</svg>
  ${paths.map((d, i) => `<span class="bead" style="offset-path:path('${d}');offset-distance:38%;width:9px;height:9px;margin:-4.5px 0 0 -4.5px"></span><span class="bead" style="offset-path:path('${d}');offset-distance:72%;width:7px;height:7px;margin:-3.5px 0 0 -3.5px"></span><span class="bead run" style="offset-path:path('${d}');width:6px;height:6px;margin:-3px 0 0 -3px;animation-delay:${(i * .55).toFixed(2)}s"></span>`).join('')}
  <div class="planet-in">${planet(ev, 262, ready)}</div>
  ${cats.map((c, i) => node(ev, c, i, sel)).join('')}
  ${taskPanel(ev, sel)}`;
}
function node(ev, c, i, sel) {
  const sl = SLOTS[i], on = c.id === sel.id, p = pct(c), st = status(c), L = lead(ev, c), n = nextIdx(c);
  const next = n < 0 ? 'All steps done' : c.steps[n].t;
  return `<div class="node" style="left:${sl.x}px;top:${sl.y}px;width:${sl.w}px;animation-delay:${(i * .9).toFixed(1)}s"><div class="in" style="animation-delay:${(.35 + i * .12).toFixed(2)}s">
   <button class="cap ${on ? 'on' : ''}" data-act="sel" data-cat="${c.id}" aria-pressed="${on}" aria-label="${esc(c.name)}, ${L ? 'led by ' + esc(L.name) : 'no helper yet'}, ${p}% done, ${STATUS_WORD[st]}">
     <svg class="cico" aria-hidden="true"><use href="#i-${c.icon}"/></svg>
     ${avatar(L, 50)}
     <span class="meta"><b style="${c.name.length > 10 ? 'font-size:18px' : ''}">${esc(c.name)}</b><small>${L ? esc(L.name) : 'No helper yet'}</small><small class="st-${st}">Due ${fmtD(c.due)}</small></span>
     <span class="ring">${ring('n' + c.id, p, RING_COL[st], 46)}<span>${p}%</span></span>
   </button>
   <div class="pillrow" style="animation-delay:${(.7 + i * .12).toFixed(2)}s">${L ? `<span class="pill">${ic(PILL_ICON[c.id] || 'doc')}${esc(next)}</span>` : `<button class="pill" data-act="assign" data-cat="${c.id}">${ic('plus')}Assign a helper</button>`}</div>
  </div></div>`;
}
function taskPanel(ev, c) {
  const L = lead(ev, c), p = pct(c), tabs = ['plan', 'vendors', 'notes', 'files'], ti = tabs.indexOf(S.ptab);
  const from = S.prevTab * 104; S.prevTab = ti;
  return `<section class="panel tpanel" aria-label="${esc(c.name)} tasks"><span class="grab" aria-hidden="true"></span>
   <div class="thead"><svg class="big" aria-hidden="true"><use href="#i-${c.icon}"/></svg>
     <div class="tt"><b>${esc(c.name)}</b><small>${L ? `Led by <button data-act="helper" data-h="${L.id}">${esc(L.name)}</button>` : `<button data-act="assign" data-cat="${c.id}">Assign a helper</button>`}  ·  Due ${fmtD(c.due)}  ·  ${p}% complete</small></div>
     <div class="tabs" role="tablist">${tabs.map((t) => `<button role="tab" data-act="ptab" data-t="${t}" aria-selected="${S.ptab === t}">${t[0].toUpperCase() + t.slice(1)}</button>`).join('')}<span class="ind" style="left:${from}px" data-left="${ti * 104}px"></span></div>
     <button class="btn btn-ghost askcat" data-act="askcat">${ic('spark')}Ask Utsav about ${esc(c.name)}${ic('right')}</button>
   </div>
   <div class="tbody" style="top:92px;bottom:12px">${panelTab(ev, c)}</div></section>`;
}
function panelTab(ev, c, mobile = false) {
  if (S.ptab === 'vendors') return vendorsTab(ev, c);
  if (S.ptab === 'notes') return notesTab(ev, c);
  if (S.ptab === 'files') return filesTab(ev, c);
  const n = nextIdx(c), nx = n < 0 ? null : c.steps[n];
  const vd = S.vendors[c.id];
  const steps = `<p class="colh">Guided Steps</p><p class="cols">Zero guesswork. Just progress.</p><ol class="steps">${c.steps.map((s, i) => `<li><button class="step ${s.done ? 'done' : i === n ? 'cur' : ''}" data-act="step" data-cat="${c.id}" data-i="${i}" aria-pressed="${s.done}"><span class="dot">${s.done ? ic('check') : i + 1}</span><span class="stx">${esc(s.t)}${s.fn ? `<em class="fn">${esc(s.fn)}</em>` : ''}</span></button></li>`).join('')}</ol>`;
  const vend = `<div style="display:flex;justify-content:space-between;align-items:baseline;gap:10px"><p class="colh">Vendor Shortlist</p><button style="display:inline-flex;align-items:center;gap:4px;font-size:13px;color:#F0A27B" data-act="ptab" data-t="vendors">See more${ic('chev')}</button></div>
    <p class="cols">AI-curated. You decide. <span data-vsrc="${c.id}">${vd?.source === 'sample' ? '<span class="sample-tag">Examples</span>' : vd?.source === 'places' ? '<span class="sample-tag">From Google Maps</span>' : ''}</span></p>
    <div class="vgrid" data-vgrid="${c.id}" data-n="3">${vendorCards(c, 3, 'host')}</div>`;
  const next = `<p class="colh" style="font-size:20px">Next Action</p>
    ${nx ? `<div class="nx">${ic('doc')}<div><b>${esc(nx.t)}</b><small>${esc(stepHint(nx.t))}</small></div></div>
    <button class="btn btn-coral cta" data-act="marknext" data-cat="${c.id}">Mark as Complete</button>` : `<div class="nx">${ic('check')}<div><b>Everything here is done</b><small>The family can see it on the orbit.</small></div></div>`}
    <p class="colh" style="font-size:17px;margin-top:6px">Resources</p>
    <button class="res" style="height:26px" data-act="res" data-r="check" data-cat="${c.id}">${ic('doc')}${esc(c.name)} planning checklist</button>
    <button class="res" style="height:26px" data-act="res" data-r="flags" data-cat="${c.id}">${ic('doc')}Red flags to watch</button>
    <button class="res" style="height:26px" data-act="res" data-r="script" data-cat="${c.id}">${ic('doc')}Questions to ask vendors</button>`;
  if (mobile) return `<div class="mstack"><section>${steps}</section><section>${vend}</section><section>${next}</section></div>`;
  return `<div class="tcols"><section class="c-steps scroll">${steps}</section><section class="c-vend">${vend}</section><section class="c-next scroll">${next}</section></div>`;
}
function vendorCards(c, n, who) {
  const vd = S.vendors[c.id];
  if (!vd) { loadVendors(c.id, who); return [0, 1, 2].slice(0, n).map(() => `<div class="vcard"><div class="vimg skel" style="border-radius:0"></div><div class="vb"><span class="skel" style="height:14px;width:70%"></span><span class="skel" style="height:10px;width:50%;margin-top:8px"></span><span class="skel" style="height:26px;width:60%;margin:10px auto 0;border-radius:99px"></span></div></div>`).join(''); }
  if (vd.error) return `<p class="lede" style="grid-column:1/-1">${esc(vd.error)} <button class="btn btn-ghost btn-sm" data-act="reloadv" data-cat="${c.id}">Try again</button></p>`;
  const short = (who === 'host' ? c.shortlist : (S.h?.mine.find((m) => m.id === c.id)?.shortlist)) || [];
  return vd.vendors.slice(0, n).map((v, i) => `<article class="vcard"><div class="vimg"><img src="${esc(v.img)}" alt="" loading="lazy">${i === 0 ? '<span class="tm">Top Match</span>' : ''}${short.some((s) => s.id === v.id) ? `<span class="saved" title="Shortlisted">${ic('saved')}</span>` : ''}</div>
    <div class="vb"><b>${esc(v.name)}</b><small>${esc(v.tag || (v.address || '').split(',')[0])}${v.price ? `  ·  ${esc(v.price)}` : ''}</small>
    <span class="rt">${v.rating ? `${ic('star')}${v.rating} <span style="color:var(--muted)">(${v.reviews} reviews)</span>` : '<span style="color:var(--muted)">New on Google</span>'}</span>
    <button class="view" data-act="vendor" data-cat="${c.id}" data-i="${i}">${who === 'helper' ? T[S.lang].viewBtn : 'View'}</button></div></article>`).join('');
}
const vLoading = new Set();
function loadVendors(catId, who) {
  if (vLoading.has(catId) || S.vendors[catId]) return;
  vLoading.add(catId);
  const gen = S.vgen;
  (async () => {
    let d;
    try { d = who === 'helper' ? await api(`/api/h/vendors?cat=${catId}`, { helper: S.htoken }) : await api(`/api/events/${S.ev.id}/vendors?cat=${catId}`); }
    catch (e) { d = { error: e.message, vendors: [] }; }
    vLoading.delete(catId);
    if (gen !== S.vgen) return;
    S.vendors[catId] = d;
    refreshVendors(catId, who);
  })();
}
function refreshVendors(catId, who) {
  const grids = $$(`[data-vgrid="${catId}"]`);
  if (!grids.length) return;
  const c = (who === 'helper' ? S.h.mine : S.ev.cats).find((x) => x.id === catId);
  grids.forEach((g) => { g.innerHTML = g.dataset.style === 'hx' ? hxVendors(c) : vendorCards(c, +g.dataset.n, who); });
  const vd = S.vendors[catId];
  $$(`[data-vsrc="${catId}"]`).forEach((el) => { el.innerHTML = vd?.source === 'places' ? '<span class="sample-tag">From Google Maps</span>' : vd?.source === 'sample' ? '<span class="sample-tag">Examples</span>' : ''; });
}
function vendorsTab(ev, c) {
  const vd = S.vendors[c.id];
  return `<div class="scroll"><p class="cols" style="margin-top:0">${vd?.source === 'places' ? `Real businesses from Google Maps near ${esc(ev.city)}, ranked by Gemini for ${ev.guests} guests and a ${inr(c.cap)} cap.` : `Examples while live search is off. ${esc(vd?.note || '')}`} Prices are AI estimates. Confirm with the vendor.</p>
   <div class="vrow" data-vgrid="${c.id}" data-n="5">${vendorCards(c, 5, 'host')}</div></div>`;
}
function notesTab(ev, c) {
  const helpers = Object.entries(ev.helpers).filter(([, h]) => !h.revoked);
  return `<div class="scroll"><div style="display:grid;grid-template-columns:minmax(0,1.6fr) minmax(0,1fr);gap:22px">
   <div class="field"><label for="n-${c.id}">Notes for ${esc(c.name.toLowerCase())}</label><textarea class="input" id="n-${c.id}" data-notes="${c.id}" placeholder="Menu decided, tasting on Sunday…">${esc(c.notes)}</textarea></div>
   <div style="display:grid;gap:14px;align-content:start">
     <div class="field"><label for="q-${c.id}">Best quote so far (₹)</label><input class="input num" id="q-${c.id}" inputmode="numeric" data-quote="${c.id}" value="${c.quote || ''}" placeholder="e.g. 85000"><span class="label">Cap ${inr(c.cap)}${c.quote ? ` · ${c.quote > c.cap ? 'over' : 'within'} cap` : ''}</span></div>
     <div class="field"><label for="a-${c.id}">Who leads this</label><select class="input" id="a-${c.id}" data-assign="${c.id}"><option value="">No helper yet</option>${helpers.map(([id, h]) => `<option value="${id}" ${c.lead === id ? 'selected' : ''}>${esc(h.name)}</option>`).join('')}</select></div>
     <button class="btn btn-ghost btn-sm" data-act="addhelper" data-cat="${c.id}">${ic('plus')}Add someone new</button>
   </div></div></div>`;
}
function filesTab(ev, c) {
  return `<div class="scroll"><p class="cols" style="margin-top:0">Shortlisted vendors and saved quotes for ${esc(c.name.toLowerCase())}. Helpers add to this from their phone.</p>
   ${c.quote ? `<div class="tl-row"><span class="check" aria-pressed="true">${ic('check')}</span><span class="what"><b>Best quote ${inr(c.quote)}</b><small>Cap ${inr(c.cap)}</small></span></div>` : ''}
   ${c.shortlist.length ? c.shortlist.map((v) => `<div class="tl-row"><span style="color:var(--gold)">${ic('saved')}</span><span class="what"><b>${esc(v.name)}</b><small>${v.rating ? `Rated ${v.rating}` : ''}${v.phone ? ` · ${esc(v.phone)}` : ''}</small></span>${v.maps ? `<a class="btn btn-ghost btn-sm" href="${esc(v.maps)}" target="_blank" rel="noopener">${ic('pin')}Maps</a>` : ''}</div>`).join('')
    : `<div class="empty" style="padding:16px"><p>Nothing shortlisted yet. Open a vendor and tap Shortlist.</p></div>`}</div>`;
}

// ---------- budget / timeline / family (shared desktop + mobile)
const PALETTE = ['#E9C28A', '#EE7F63', '#86D3B5', '#C79BE0', '#7FA8E0', '#F2B8A0', '#D9A46A', '#9BE0C3'];
function budgetView(ev) {
  const planned = ev.cats.reduce((a, c) => a + c.cap, 0), buffer = ev.budget - planned, quotes = ev.cats.reduce((a, c) => a + (c.quote || 0), 0);
  const R = 96, C = 2 * Math.PI * R; let acc = 0;
  const segs = ev.cats.map((c, i) => ({ v: c.cap, col: PALETTE[i % 8] })).concat(buffer > 0 ? [{ v: buffer, col: 'rgba(244,232,216,.3)' }] : []);
  const sum = segs.reduce((a, s) => a + s.v, 0) || 1;
  const donut = segs.map((s) => { const len = s.v / sum * C; const el = `<circle cx="120" cy="120" r="${R}" fill="none" stroke="${s.col}" stroke-width="26" stroke-dasharray="${Math.max(len - 2.5, 0).toFixed(1)} ${C.toFixed(1)}" stroke-dashoffset="${(-acc).toFixed(1)}" transform="rotate(-90 120 120)"/>`; acc += len; return el; }).join('');
  const bufPct = buffer / ev.budget * 100, over = buffer < 0, low = !over && bufPct < 9.5;
  return `<div class="vhead"><div><h1 class="h-serif">Budget</h1><p>Every rupee has a home. 10% stays aside for surprises.</p></div>
   <button class="toggle" role="switch" aria-checked="${ev.hideBudget}" data-act="hide"><span class="knob"></span>Hide full budget from helpers</button></div>
   <div class="scroll"><div class="budget">
    <div><div class="donut"><svg width="240" height="240" viewBox="0 0 240 240" role="img" aria-label="Budget split across ${ev.cats.length} categories and buffer">${donut}</svg><div class="mid"><div><b class="num">${inrShort(ev.budget)}</b><small>total budget</small></div></div></div>
     <p class="legend-note">Helpers see only their own cap${ev.hideBudget ? '' : ' (you have turned this off, so helpers can see the total)'}.</p></div>
    <div><div class="btotals"><div><small>Planned</small><b class="num">${inr(planned)}</b></div><div><small>Quotes saved</small><b class="num">${inr(quotes)}</b></div><div><small>Buffer</small><b class="num">${inr(buffer)}</b></div></div>
     ${ev.cats.map((c, i) => { const L = lead(ev, c); const qp = c.cap ? Math.min(100, Math.round((c.quote || 0) / c.cap * 100)) : 0; return `<div class="brow"><span class="sw" style="background:${PALETTE[i % 8]}"></span>
      <div class="nm"><b>${esc(c.name)}</b><small>${L ? esc(L.name) : 'No helper yet'} · ${c.quote ? `quote ${inr(c.quote)}` : 'no quote yet'}</small></div>
      <div class="barcell"><div class="bar" title="Quote as a share of the cap"><i style="width:0;background:${c.quote > c.cap ? 'var(--rose)' : PALETTE[i % 8]}" data-w="${qp}%"></i></div></div>
      <label class="money"><span class="sr">${esc(c.name)} cap in rupees</span><input class="input num" inputmode="numeric" data-cap="${c.id}" value="${c.cap}"></label></div>`; }).join('')}
     <div class="note ${over || low ? 'bad' : 'ok'}">${ic(over || low ? 'alert' : 'check')}${over ? `Over budget by ${inr(-buffer)}. Lower a category or raise the total with Ask Utsav.` : low ? `Buffer is ${bufPct.toFixed(1)}%. Keep about 10% for surprises.` : `Within budget. ${inr(buffer)} (${bufPct.toFixed(0)}%) is kept aside.`}</div>
    </div></div></div>`;
}
function stepRows(ev) {
  const rows = [];
  ev.cats.forEach((c) => c.steps.forEach((s, i) => {
    const back = (c.steps.length - 1 - i) * 3;
    let d = s.by || new Date(dateOf(c.due).getTime() - back * DAY).toLocaleDateString('en-CA');
    rows.push({ c, s, i, d });
  }));
  return rows.sort((a, b) => (a.d < b.d ? -1 : a.d > b.d ? 1 : 0));
}
function fnStrip(ev) {
  const fs = ev.functions || [];
  if (!fs.length) return '';
  return `<div class="tl-group"><h3>Functions<span>${esc(ev.tradition && ev.tradition.id !== 'custom' ? ev.tradition.name : 'Your own mix')}</span></h3>
    <div class="fnstrip">${fs.map((f) => `<div class="fncard ${f.main ? 'main' : ''} ${daysLeft(f.date) < 0 ? 'past' : ''}"><span class="fdate"><b>${dateOf(f.date).getDate()}</b>${dateOf(f.date).toLocaleDateString('en-IN', { month: 'short' })}</span><span><b>${esc(f.name)}</b><small>${f.when ? esc(f.when) + ' · ' : ''}${f.cats.map((id) => esc(ev.cats.find((c) => c.id === id)?.name || '')).filter(Boolean).join(', ') || 'Whole family'}</small></span>${f.main ? '<em>Main</em>' : ''}</div>`).join('')}</div></div>`;
}
function timelineView(ev) {
  const rows = stepRows(ev);
  const g = [['Overdue', (r) => !r.s.done && daysLeft(r.d) < 0], ['This week', (r) => !r.s.done && daysLeft(r.d) >= 0 && daysLeft(r.d) <= 7], ['Next week', (r) => !r.s.done && daysLeft(r.d) > 7 && daysLeft(r.d) <= 14], ['Later', (r) => !r.s.done && daysLeft(r.d) > 14], ['Done', (r) => r.s.done]];
  return `<div class="vhead"><div><h1 class="h-serif">Timeline</h1><p>Every step finishes before ${fmtLong(ev.date)}. Tick a step to update the orbit.</p></div><span class="pill">${ic('cal')}${daysLeft(ev.date)} days to go</span></div>
   <div class="scroll">${fnStrip(ev)}${g.map(([name, f]) => { const rs = rows.filter(f); if (!rs.length) return ''; return `<div class="tl-group"><h3>${name}<span>${rs.length} ${rs.length === 1 ? 'step' : 'steps'}</span></h3>
    ${rs.map((r) => { const L = lead(ev, r.c); return `<div class="tl-row ${r.s.done ? 'is-done' : ''}"><button class="check" data-act="step" data-cat="${r.c.id}" data-i="${r.i}" aria-pressed="${r.s.done}" aria-label="${r.s.done ? 'Mark not done' : 'Mark done'}: ${esc(r.s.t)}">${r.s.done ? ic('check') : ''}</button>
     <span class="what"><b>${esc(r.s.t)}</b><small>${esc(r.c.name)}${r.s.fn ? ` · for ${esc(r.s.fn)}` : ''} · ${L ? esc(L.name) : 'No helper yet'}</small></span><span class="when ${!r.s.done && daysLeft(r.d) < 0 ? 'st-late' : ''}">${fmtD(r.d)}</span>${avatar(L, 32)}</div>`; }).join('')}</div>`; }).join('')}</div>`;
}
function familyView(ev) {
  const hs = Object.entries(ev.helpers);
  const unassigned = ev.cats.filter((c) => !c.lead || ev.helpers[c.lead]?.revoked);
  const r = readyOf(ev.cats);
  return `<div class="vhead"><div style="display:flex;align-items:center;gap:18px"><span style="position:relative;width:76px;height:76px;display:grid;place-items:center">${ring('fam', r, '#86D3B5', 76, 6)}<b style="position:absolute;font:600 22px var(--serif)">${r}%</b></span>
    <div><h1 class="h-serif">Family</h1><p>Each person leads one part. They see the team, but change only their own.</p></div></div>
    <div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn btn-ghost btn-sm" data-act="summary">${ic('share')}Share summary</button><button class="btn btn-gold btn-sm" data-act="addhelper">${ic('plus')}Add helper</button></div></div>
   <div class="scroll">
    ${hs.length ? `<div class="fam-grid">${hs.map(([id, h]) => { const mine = ev.cats.filter((c) => c.lead === id); const p = mine.length ? Math.round(mine.reduce((a, c) => a + pct(c), 0) / mine.length) : 0; const st = mine[0] ? status({ ...mine[0], pct: p }) : 'ok';
      return `<article class="hcard"><div class="top">${avatar(h, 54)}<div style="flex:1;min-width:0"><b>${esc(h.name)}</b><small>${esc(h.rel || 'Family')} · guide in ${h.lang === 'ta' ? 'Tamil' : 'English'}</small></div>${mine.length ? `<span class="status st-${st}">${STATUS_WORD[st]}</span>` : ''}</div>
       <div style="display:flex;justify-content:space-between;font-size:14px"><span>${mine.length ? mine.map((c) => esc(c.name)).join(', ') : '<span style="color:var(--muted)">No category yet</span>'}</span><b class="num">${p}%</b></div>
       <div class="pbar"><i style="width:0" data-w="${p}%"></i></div>
       ${h.revoked ? `<p class="label">Link removed. Create a new one to let ${esc(h.name)} back in.</p>` : ''}
       <div class="acts">${h.revoked ? `<button class="btn btn-gold btn-sm" data-act="newlink" data-h="${id}">${ic('plus')}Create new link</button>` : `<button class="btn btn-teal btn-sm" data-act="wa" data-h="${id}">${ic('chat')}Share on WhatsApp</button><button class="btn btn-ghost btn-sm" data-act="copylink" data-h="${id}">${ic('copy')}Copy link</button><button class="btn btn-ghost btn-sm" data-act="openview" data-h="${id}">${ic('eye')}Their view</button><button class="btn btn-ghost btn-sm btn-icon" data-act="revoke" data-h="${id}" aria-label="Remove ${esc(h.name)}'s link">${ic('x')}</button>`}</div></article>`; }).join('')}</div>`
      : `<div class="panel empty"><h3>No helpers yet</h3><p>Add a relative, give them a category and send their link on WhatsApp. They can start without signing up.</p><button class="btn btn-gold" data-act="addhelper">${ic('plus')}Add helper</button></div>`}
    ${unassigned.length ? `<div class="unassigned"><span class="label">Needs a helper:</span>${unassigned.map((c) => `<button class="chip" data-act="assign" data-cat="${c.id}">${ic(c.icon)}${esc(c.name)}</button>`).join('')}</div>` : ''}
    <div class="tl-group" style="margin-top:22px"><h3>Recent activity</h3>${ev.activity.slice(-6).reverse().map((a) => `<div class="feed">${ic('spark')}${esc(a.t)}</div>`).join('') || '<p class="lede">Updates from helpers show up here.</p>'}</div>
   </div>`;
}

// ---------- mobile host
function mobileHost(ev, v) {
  const sel = selCat(), ready = readyOf(ev.cats);
  let body = '';
  if (v === 'orbit') {
    const cats = ev.cats.slice(0, 6);
    body = `<p class="tag-poem" style="font-size:22px;margin:6px 0 0">People, plans, possibilities.<br>All in one orbit.</p>
    <div class="morbit"><span class="track"></span>${planet(ev, Math.min(innerWidth * .46, 190), ready)}
     ${cats.map((c, i) => { const a = -Math.PI / 2 + i * Math.PI / 3; const st = status(c); return `<div class="bub" style="left:${50 + Math.cos(a) * 41}%;top:${50 + Math.sin(a) * 41}%"><button class="${c.id === sel.id ? 'on' : ''}" data-act="sel" data-cat="${c.id}" aria-label="${esc(c.name)} ${pct(c)}%">${ring('mb' + c.id, pct(c), RING_COL[st], 66, 3).replace('<svg', '<svg class="r"')}${ic(c.icon)}</button><small>${esc(c.name)} ${pct(c)}%</small></div>`; }).join('')}
    </div>
    <div class="mcards">${cats.map((c) => { const L = lead(ev, c), st = status(c); return `<button class="cap ${c.id === sel.id ? 'on' : ''}" data-act="sel" data-cat="${c.id}" data-mcard="${c.id}"><svg class="cico" aria-hidden="true"><use href="#i-${c.icon}"/></svg>${avatar(L, 46)}<span class="meta"><b>${esc(c.name)}</b><small>${L ? esc(L.name) : 'No helper yet'}</small><small class="st-${st}">Due ${fmtD(c.due)}</small></span><span class="ring">${ring('mc' + c.id, pct(c), RING_COL[st], 46)}<span>${pct(c)}%</span></span></button>`; }).join('')}</div>
    <section class="panel mpanel"><div class="mtitle"><svg class="ico" aria-hidden="true"><use href="#i-${sel.icon}"/></svg><div><b>${esc(sel.name)}</b><small>${lead(ev, sel) ? `Led by ${esc(lead(ev, sel).name)}` : `<button style="color:var(--gold-hi);text-decoration:underline" data-act="assign" data-cat="${sel.id}">Assign a helper</button>`} · Due ${fmtD(sel.due)} · ${pct(sel)}%</small></div></div>
     <div class="tabs" role="tablist">${['plan', 'vendors', 'notes', 'files'].map((t) => `<button role="tab" data-act="ptab" data-t="${t}" aria-selected="${S.ptab === t}">${t[0].toUpperCase() + t.slice(1)}</button>`).join('')}</div>
     <button class="btn btn-ghost btn-sm" style="margin-top:6px" data-act="askcat">${ic('spark')}Ask Utsav about ${esc(sel.name)}</button>
     ${S.ptab === 'plan' ? panelTab(ev, sel, true) : `<div style="margin-top:14px">${panelTab(ev, sel)}</div>`}</section>
    <p class="tag-script" style="text-align:center;margin:30px 0 0;transform:rotate(-5deg)">Good people, great events</p>`;
  } else body = `<section class="panel mview">${v === 'budget' ? budgetView(ev) : v === 'timeline' ? timelineView(ev) : familyView(ev)}</section>`;
  return `<div class="mhost"><header class="mhdr"><a class="logo" href="#/"><b>Utsav</b></a><span class="grow"><a class="ev" href="#/events" style="text-decoration:none">${esc(ev.title)}</a><small>${fmtD(ev.date)} · ${ev.guests} guests · ${inrShort(ev.budget)}</small></span>
    <button class="btn btn-ghost btn-icon" data-act="menu" aria-label="Menu">${ic('chev')}</button>${S.menu ? hostMenu().replace('class="menu"', 'class="menu" style="top:64px;right:12px"') : ''}</header>
   <div class="mbody">${body}</div>
   <nav class="bnav" aria-label="Views">${[['orbit', 'Orbit', 'orbit'], ['budget', 'Budget', 'wallet'], ['timeline', 'Timeline', 'cal'], ['family', 'Family', 'people']].map(([k, n, i]) => `<a href="#/e/${ev.id}/${k}" ${v === k ? 'aria-current="page"' : ''}>${ic(i)}${n}</a>`).join('')}<button data-act="copilot">${ic('spark')}Ask</button></nav></div>`;
}

// ================================================================= HELPER
const HX_TABS = [['today', 'home'], ['steps', 'list'], ['vendors', 'store'], ['ask', 'spark']];
const HX_LABEL = { en: { today: 'Today', steps: 'Steps', vendors: 'Vendors', ask: 'Ask' }, ta: { today: 'இன்று', steps: 'படிகள்', vendors: 'கடைகள்', ask: 'கேள்' } };
function hxRing(p, size, sw, col = '#FF9F1C', key = 'hx') {
  const r = (size - sw) / 2, Cc = 2 * Math.PI * r, to = Cc * (1 - p / 100), from = S.prevRing[key] ?? Cc; S.prevRing[key] = to;
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="#2C2C30" stroke-width="${sw}"/><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${col}" stroke-width="${sw}" stroke-linecap="round" stroke-dasharray="${Cc.toFixed(1)}" style="stroke-dashoffset:${from.toFixed(1)};transition:stroke-dashoffset 1s var(--ease)" data-off="${to.toFixed(1)}" transform="rotate(-90 ${size / 2} ${size / 2})"/></svg>`;
}
function viewHelper() {
  const d = S.h, L = T[S.lang], me = d.me, ev = d.event, ta = S.lang === 'ta', tab = S.route.tab || 'today';
  const tabbar = `<nav class="hx-tab" aria-label="Sections">${HX_TABS.map(([k, i]) => `<a href="#/h/${S.htoken}/${k}" ${tab === k ? 'aria-current="page"' : ''}>${ic(i)}<span>${HX_LABEL[S.lang][k]}</span></a>`).join('')}</nav>`;
  const lang = `<div class="hx-seg" role="group" aria-label="Language"><button data-act="lang" data-l="en" aria-pressed="${!ta}">EN</button><button data-act="lang" data-l="ta" aria-pressed="${ta}">தமிழ்</button></div>`;
  if (!d.mine.length) return `<div class="hx"><header class="hx-bar"><b class="hx-logo">Utsav</b>${lang}</header><div class="hx-w"><h1 class="hx-h1">${L.greet}, ${esc(me.name)}</h1><div class="hx-grp hx-pad"><b>${ta ? 'இன்னும் பணி இல்லை' : 'No task yet'}</b><p class="hx-mut">${ta ? 'உரிமையாளர் பணியை ஒதுக்கியதும் இந்தப் பக்கம் தானாக மாறும்.' : 'The host has not given you a category yet. This page updates by itself when they do.'}</p></div></div></div>`;
  if (!S.hsel || !d.mine.find((c) => c.id === S.hsel)) S.hsel = d.mine[0].id;
  const c = d.mine.find((x) => x.id === S.hsel), p = pct(c), st = status(c), n = nextIdx(c), dl = daysLeft(c.due);
  const catName = ta ? (CAT_TA[c.id] || c.name) : c.name;
  const switcher = d.mine.length > 1 ? `<div class="hx-chips">${d.mine.map((m) => `<button data-act="hsel" data-cat="${m.id}" aria-pressed="${m.id === c.id}">${esc(ta ? CAT_TA[m.id] || m.name : m.name)}</button>`).join('')}</div>` : '';
  const back = (title, extra = '') => `<header class="hx-bar"><a class="hx-back" href="#/h/${S.htoken}/today" aria-label="Back to today">${ic('back')}</a><b>${title}</b>${extra || '<span style="width:40px"></span>'}</header>`;
  let body = '';

  if (tab === 'today') {
    const done = c.steps.filter((s) => s.done).length;
    const dl2 = daysLeft(ev.date), myFns = (ev.functions || []).filter((f) => f.cats.some((id) => d.mine.some((m) => m.id === id)));
    body = `<header class="hx-bar"><b class="hx-logo">Utsav</b>${lang}</header>
    <div class="hx-w">
      <div class="hx-evc"><span class="hx-evi">${ic(TYPE_ICON[ev.type] || 'spark')}</span><span class="t"><b>${esc(ev.title)}</b><small>${fmtLong(ev.date)} · ${dl2 > 0 ? (ta ? `இன்னும் ${dl2} நாட்கள்` : `${dl2} days to go`) : (ta ? 'இன்று!' : 'Today!')}${ev.tradition && ev.tradition.id !== 'custom' ? ` · ${esc(ev.tradition.name)}` : ''}</small></span></div>
      <h1 class="hx-h1">${ta ? `${esc(me.name)}, ${esc(catName)} பொறுப்பு உங்களிடம்.` : `${esc(me.name)}, the ${esc(c.name.toLowerCase())} is in your hands.`}</h1>
      ${switcher}
      <div class="hx-stats"><div class="hx-ring">${hxRing(p, 68, 7)}<b>${p}%</b></div>
        <div class="hx-tiles"><div><b class="num">${c.cap >= 1e5 ? inrShort(c.cap) : `₹${+(c.cap / 1000).toFixed(1)}K`}</b><small>${L.cap}</small></div><div><b class="num">${Math.max(dl, 0)}</b><small>${L.left}</small></div><div><b class="st-${st}">${L.words[st]}</b><small>${L.status}</small></div></div></div>
      <div class="hx-lab"><span>${L.now}</span><span class="hx-acc">${n < 0 ? '' : (ta ? `படி ${n + 1} / ${c.steps.length}` : `Step ${n + 1} of ${c.steps.length}`)}</span></div>
      <section class="hx-grp hx-pad">${n < 0 ? `<b class="hx-h2">${L.alldone}</b><p class="hx-mut">${L.alldoneP}</p>`
        : `<b class="hx-h2">${esc(c.steps[n].t)}</b><p class="hx-mut">${ta ? L.hint : esc(stepHint(c.steps[n].t))}</p>
        <div class="hx-two"><button class="hx-btn y" data-act="callsheet" data-cat="${c.id}">${ic('phone')}${ta ? 'அழை' : 'Call'}</button><button class="hx-btn g" data-act="hmarknext" data-cat="${c.id}">${ic('check')}${ta ? 'முடிந்தது' : 'Done'}</button></div>`}</section>
      <section class="hx-grp" style="margin-top:12px">
        <button class="hx-row" data-act="hflags">${ic('alert', 'sa')}<span class="t"><b>${ta ? '3 கவனிக்க வேண்டியவை' : '3 things to watch'}</b><small>${esc((FLAGS[c.id] || FLAGS.food)[S.lang].slice(0, 2).join(', '))}…</small></span>${ic('right', 'ch')}</button>
        <button class="hx-row" data-act="hfamily"><span class="hx-stack">${d.team.slice(0, 5).map((t) => avatar(t.lead, 34)).join('')}</span><span class="t"><b>${L.family}</b><small>${esc(d.activity[0]?.t || (ta ? 'குழு முன்னேற்றம்' : 'See how the team is doing'))}</small></span>${ic('right', 'ch')}</button>
        <a class="hx-row" href="#/h/${S.htoken}/steps">${ic('list', 'sa')}<span class="t"><b>${ta ? 'என் படிகள்' : 'My steps'}</b><small>${done} / ${c.steps.length} ${ta ? 'முடிந்தது' : 'done'}</small></span>${ic('right', 'ch')}</a>
      </section>
      ${myFns.length ? `<div class="hx-lab"><span>${ta ? 'உங்கள் பணி உள்ள விழாக்கள்' : 'Functions you help with'}</span></div>
      <section class="hx-grp">${myFns.map((f) => `<div class="hx-row hx-fn ${daysLeft(f.date) < 0 ? 'past' : ''}"><span class="hx-date"><b>${dateOf(f.date).getDate()}</b>${dateOf(f.date).toLocaleDateString('en-IN', { month: 'short' })}</span><span class="t"><b>${esc(f.name)}</b><small>${f.when ? esc(f.when) : ''}${f.main ? (f.when ? ' · ' : '') + (ta ? 'முக்கிய நிகழ்வு' : 'Main ceremony') : ''}</small></span></div>`).join('')}</section>` : ''}
    </div>`;
  }

  if (tab === 'steps') {
    body = `${back(ta ? 'உங்கள் படிகள்' : 'Your steps')}<div class="hx-w">
      ${switcher}
      <div class="hx-head"><div class="hx-ring sm">${hxRing(p, 64, 7)}<b>${c.steps.filter((s) => s.done).length}/${c.steps.length}</b></div><div><b class="hx-h2">${esc(catName)}${ev.guests ? ` · ${ev.guests} ${ta ? 'விருந்தினர்' : 'guests'}` : ''}</b><p class="hx-mut" style="margin:2px 0 0">${ta ? `${fmtD(c.due)}க்குள் முடிக்கவும்` : `Finish all steps by ${fmtD(c.due)}`}</p></div></div>
      <div class="hx-lab"><span>${ta ? 'சரிபார்ப்பு பட்டியல்' : 'Checklist'}</span></div>
      <section class="hx-grp">${c.steps.map((s, i) => `<button class="hx-row hx-step ${s.done ? 'd' : i === n ? 'c' : ''}" data-act="hstep" data-cat="${c.id}" data-i="${i}" aria-pressed="${s.done}"><span class="ck">${s.done ? ic('check') : ''}</span><span class="t"><b>${esc(s.t)}</b>${i === n ? `<small class="hx-acc">${ta ? 'இப்போது' : 'Now'}${s.fn ? ` · ${esc(s.fn)}` : ''}</small>` : s.done ? `<small>${ta ? 'முடிந்தது' : 'Done'}</small>` : s.fn ? `<small>${ta ? '' : 'For '}${esc(s.fn)}${s.by ? ` · ${ta ? '' : 'by '}${fmtD(s.by)}` : ''}</small>` : ''}</span></button>`).join('')}</section>
      <div class="hx-lab"><span>${L.mine}</span></div>
      <section class="hx-grp">
        <label class="hx-row hx-field"><span class="t"><small>${L.quote}</small><input class="num" id="hq" inputmode="numeric" value="${c.quote || ''}" placeholder="0"></span>${c.quote ? `<span class="${c.quote > c.cap ? 'st-late' : 'st-ok'}" style="font-size:13.5px;font-weight:600">${c.quote > c.cap ? (ta ? 'வரம்பு மீறியது' : 'Over cap') : (ta ? 'வரம்புக்குள்' : 'Within cap')}</span>` : ''}</label>
        <label class="hx-row hx-field"><span class="t"><small>${L.notes}</small><textarea id="hn" rows="2" placeholder="${ta ? 'உதா: ஞாயிறு 11 மணிக்கு சுவை பார்த்தல்' : 'e.g. Tasting on Sunday at 11'}">${esc(c.notes)}</textarea></span></label>
      </section>
      <button class="hx-btn y full" data-act="hsave" data-cat="${c.id}">${L.save}</button>
    </div>`;
  }

  if (tab === 'vendors') {
    const vd = S.vendors[c.id];
    const filt = S.vfilter || 'best';
    body = `${back(esc(L.near(c.name)))}<div class="hx-w">
      ${switcher}
      <div class="hx-chips">${[['best', ta ? 'சிறந்தது' : 'Best match'], ['price', ta ? 'குறைந்த விலை' : 'Lowest price'], ['short', ta ? 'சேமித்தவை' : 'Shortlisted']].map(([k, t]) => `<button data-act="vfilter" data-f="${k}" aria-pressed="${filt === k}">${t}</button>`).join('')}</div>
      <div data-vgrid="${c.id}" data-n="5" data-style="hx">${hxVendors(c)}</div>
      <p class="hx-mut" style="font-size:13px;margin-top:12px">${ta ? 'விலைகள் AI மதிப்பீடுகள். விற்பனையாளரிடம் உறுதிசெய்யுங்கள்.' : `Prices are AI estimates. Confirm with the vendor.`} <span data-vsrc="${c.id}">${vd?.source === 'places' ? '<span class="sample-tag">From Google Maps</span>' : vd?.source === 'sample' ? '<span class="sample-tag">Examples</span>' : ''}</span></p>
    </div>`;
  }

  if (tab === 'ask') {
    const msgs = S.chat['h:' + c.id] || [{ who: 'ai', t: ta ? `வணக்கம் ${me.name}! ${catName} பணியில் நான் உதவுகிறேன். உங்கள் வரம்பு ${inr(c.cap)}.` : `Hi ${me.name}! I can help with the ${c.name.toLowerCase()} for ${ev.title}. Your cap is ${inr(c.cap)}.` }];
    body = `${back(ta ? 'உத்சவிடம் கேளுங்கள்' : 'Ask Utsav', lang)}<div class="hx-w hx-chatw">
      <p class="hx-mut" style="text-align:center;font-size:13px;margin:0 0 12px">${L.aiNote}</p>
      <div class="chat hx-chat">${msgs.map((m, i) => `<p class="msg ${m.who} ${m.typing ? 'typing' : ''}" style="${i < msgs.length - 2 ? 'animation:none' : ''}">${esc(m.t)}</p>`).join('')}</div>
      <div class="hx-askdock"><div class="hx-chips wrap">${L.chips.map((q, i) => `<button data-act="hchip" data-i="${i}">${esc(q)}</button>`).join('')}</div>
      <form class="hx-ask" data-form="hask"><label class="sr" for="hask">${L.type}</label><input id="hask" placeholder="${L.type}" autocomplete="off">
        ${(window.SpeechRecognition || window.webkitSpeechRecognition) ? `<button type="button" class="ib" data-act="mic" aria-label="Speak your question">${ic('mic')}</button>` : ''}<button class="ib send" aria-label="Send">${ic('send')}</button></form></div>
    </div>`;
  }
  return `<div class="hx">${body}</div>${tabbar}`;
}
function hxVendors(c) {
  const vd = S.vendors[c.id];
  if (!vd) { loadVendors(c.id, 'helper'); return `<div class="hx-grp hx-pad"><span class="skel" style="display:block;height:150px"></span><span class="skel" style="display:block;height:18px;width:60%;margin-top:14px"></span></div>`; }
  if (vd.error) return `<div class="hx-grp hx-pad"><p class="hx-mut">${esc(vd.error)}</p><button class="hx-btn g" data-act="reloadv" data-cat="${c.id}">Try again</button></div>`;
  const short = S.h?.mine.find((m) => m.id === c.id)?.shortlist || [];
  const ta = S.lang === 'ta';
  let list = vd.vendors.map((v, i) => ({ v, i }));
  const priceOf = (v) => Number(String(v.estimate || '').replace(/,/g, '').match(/\d+/)?.[0] || 1e12);
  if (S.vfilter === 'price') list = list.slice().sort((a, b) => priceOf(a.v) - priceOf(b.v));
  if (S.vfilter === 'short') list = list.filter((x) => short.some((s) => s.id === x.v.id));
  if (!list.length) return `<div class="hx-grp hx-pad"><b>${ta ? 'இன்னும் எதுவும் சேமிக்கவில்லை' : 'Nothing shortlisted yet'}</b><p class="hx-mut">${ta ? 'ஒரு விற்பனையாளரைத் திறந்து சேமி என்பதைத் தொடுங்கள்.' : 'Open a vendor and tap the bookmark to save it here.'}</p></div>`;
  const [top, ...rest] = list;
  const dig = (p) => (p || '').replace(/\D/g, '');
  const call = (v, i, cls) => v.phone ? `<a class="${cls}" href="tel:${esc(v.phone.replace(/\s/g, ''))}" aria-label="Call ${esc(v.name)}">${ic('phone')}${cls.includes('wide') ? (ta ? 'அழை' : 'Call') : ''}</a>` : `<button class="${cls}" data-act="callsheet" data-cat="${c.id}" data-v="${i}" aria-label="Call script for ${esc(v.name)}">${ic('phone')}${cls.includes('wide') ? (ta ? 'அழை' : 'Call') : ''}</button>`;
  const v = top.v, saved = short.some((s) => s.id === v.id), wa = dig(v.phone) ? `https://wa.me/${dig(v.phone).length === 10 ? '91' + dig(v.phone) : dig(v.phone)}` : null;
  return `<section class="hx-grp hx-top"><button class="hx-img" data-act="vendor" data-cat="${c.id}" data-i="${top.i}" aria-label="Open ${esc(v.name)}"><img src="${esc(v.img)}" alt="">${S.vfilter !== 'short' ? `<span class="hx-badge">${S.vfilter === 'price' ? (ta ? 'குறைந்த விலை' : 'Lowest price') : (ta ? 'சிறந்த பொருத்தம்' : 'Top match')}</span>` : ''}</button>
    <div class="hx-pad"><div class="hx-vt"><b>${esc(v.name)}</b>${v.rating ? `<span>★ ${v.rating} <small>(${v.reviews})</small></span>` : ''}</div>
    <p class="hx-mut" style="margin:2px 0 0">${esc(v.tag || (v.address || '').split(',')[0])}${v.price ? ` · ${esc(v.price)}` : ''}</p>
    <p style="margin:8px 0 0;font-size:15px">${esc(v.estimate || '')} <span class="hx-mut" style="font-size:12.5px">${ta ? 'AI மதிப்பீடு' : 'AI estimate'}</span></p>
    ${v.why ? `<p class="hx-why">${ta ? 'ஏன்: ' : 'Why picked: '}${esc(v.why)}</p>` : ''}
    <div class="hx-acts">${call(v, top.i, 'hx-btn gr wide')}${wa ? `<a class="hx-btn g" href="${wa}" target="_blank" rel="noopener" aria-label="WhatsApp">${ic('chat')}</a>` : `<button class="hx-btn g" disabled aria-label="No WhatsApp number">${ic('chat')}</button>`}<a class="hx-btn g" href="${esc(v.maps)}" target="_blank" rel="noopener" aria-label="Open in Maps">${ic('pin')}</a><button class="hx-btn ${saved ? 'y' : 'g'}" data-act="shortlist" data-cat="${c.id}" data-i="${top.i}" aria-label="${saved ? 'Remove from shortlist' : 'Shortlist'}">${ic(saved ? 'saved' : 'save')}</button></div></div></section>
  ${rest.length ? `<div class="hx-lab"><span>${ta ? 'மேலும்' : 'More options'}</span></div><section class="hx-grp">${rest.map(({ v: x, i }) => `<div class="hx-row"><button class="hx-thumb" data-act="vendor" data-cat="${c.id}" data-i="${i}" aria-label="Open ${esc(x.name)}"><img src="${esc(x.img)}" alt=""></button><span class="t"><b>${esc(x.name)}</b><small>${x.rating ? `★ ${x.rating} (${x.reviews}) · ` : ''}${esc(x.tag || '')}</small><small style="color:var(--hx-ink)">${esc(x.estimate || '')}</small></span>${call(x, i, 'hx-call')}</div>`).join('')}</section>` : ''}`;
}
function helperTop(me) {
  return `<header class="topbar">${logo('Big days,<br>small steps')}<div style="display:flex;align-items:center;gap:12px">
    <div class="lang" role="group" aria-label="Language"><button data-act="lang" data-l="en" aria-pressed="${S.lang === 'en'}">EN</button><button data-act="lang" data-l="ta" aria-pressed="${S.lang === 'ta'}" style="font-family:'Noto Sans Tamil',sans-serif">தமிழ்</button></div>
    ${avatar(me, 44)}</div></header>`;
}

// ================================================================= overlays
function openOverlay(html) { const still = html.includes('drawer still'); S.overlayOpen = true; $('#overlay').innerHTML = `<div class="scrim ${still ? 'still' : ''}" data-act="close"></div>${html}`; setTimeout(() => $('#overlay [autofocus], #overlay input, #overlay textarea')?.focus(), 50); }
function closeOverlay() { S.overlayOpen = false; $('#overlay').innerHTML = ''; try { speechSynthesis.cancel(); } catch { /* none */ } }
function toast(msg, bad = false) {
  const el = document.createElement('div'); el.className = 'toast';
  el.innerHTML = `${ic(bad ? 'alert' : 'check')}<span>${esc(msg)}</span>`; if (bad) el.querySelector('.ico').style.color = 'var(--rose)';
  $('#toasts').innerHTML = ''; $('#toasts').appendChild(el); setTimeout(() => el.remove(), 3600);
}
function showLamp(t, s) {
  S.overlayOpen = true;
  $('#overlay').innerHTML = `<div class="lampov" role="status"><span class="glow"></span><div class="inner"><svg class="big" viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="15" r="13" fill="#F2B85B" opacity=".18"/><path class="fl" d="M20 5c3 4 3.5 7 0 11-3.5-4-3-7 0-11z" fill="#F7D08A"/><path d="M6 22h28c-1.5 6-7 9-14 9S7.5 28 6 22z" fill="#C9883C"/><path d="M14 32h12l-2 3h-8z" fill="#9B6328"/></svg><p>${esc(t)}</p><small>${esc(s)}</small></div></div>`;
}
function burst(el) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || !el) return;
  const r = el.getBoundingClientRect(), b = document.createElement('div'); b.className = 'burst';
  b.style.left = r.left + r.width / 2 + 'px'; b.style.top = r.top + r.height / 2 + 'px';
  b.innerHTML = Array.from({ length: 18 }, (_, i) => { const a = i / 18 * Math.PI * 2, d = 50 + Math.random() * 70; return `<i style="--tx:${Math.cos(a) * d}px;--ty:${Math.sin(a) * d}px;${i % 3 === 0 ? 'background:#F2957A;' : i % 3 === 1 ? 'background:#86D3B5;' : ''}"></i>`; }).join('');
  document.body.appendChild(b); setTimeout(() => b.remove(), 1200);
}
function chatDrawer({ title, sub, key, chips, placeholder, form }) {
  const list = key === 'copilot' ? S.copilot : (S.chat[key] || []);
  const still = !!$('#overlay .drawer');
  openOverlay(`<aside class="drawer ${still ? 'still' : ''}" role="dialog" aria-label="${esc(title)}"><div class="mhead"><div><h2>${esc(title)}</h2><p>${esc(sub)}</p></div><button class="xbtn" data-act="close" aria-label="Close">${ic('x')}</button></div>
   <div class="chat">${list.map((m, i) => m.diff ? diffCard(m, i) : `<p class="msg ${m.who} ${m.typing ? 'typing' : ''}">${esc(m.t)}</p>`).join('') || `<p class="lede">${esc(placeholder)}</p>`}</div>
   <div class="qchips">${chips.map((q) => `<button class="chip" data-act="dchip" data-form="${form}" data-q="${esc(q)}">${esc(q)}</button>`).join('')}</div>
   <form class="askrow" data-form="${form}"><label class="sr" for="dq">Message</label><input class="input" id="dq" placeholder="${esc(placeholder)}" autocomplete="off"><button class="btn btn-gold btn-icon" aria-label="Send">${ic('send')}</button></form></aside>`);
  const c = $('#overlay .chat'); if (c) c.scrollTop = c.scrollHeight;
}
function diffCard(m, i) {
  const f = (d, v) => d.money ? inr(v) : d.date ? fmtLong(v) : esc(v);
  return `<div class="diff"><strong style="color:var(--gold-hi)">${esc(m.reply)}</strong>${m.diff.map((d) => `<span>${esc(d.label)}: ${d.from != null ? `<s>${f(d, d.from)}</s> → ` : ''}<ins>${f(d, d.to)}</ins></span>`).join('')}
   ${m.state === 'applied' ? '<span class="status st-done">Applied</span>' : m.state === 'discarded' ? '<span class="label">Discarded</span>' : `<div style="display:flex;gap:8px;margin-top:6px"><button class="btn btn-gold btn-sm" data-act="apply" data-i="${i}">Apply changes</button><button class="btn btn-ghost btn-sm" data-act="discard" data-i="${i}">Discard</button></div>`}</div>`;
}
function openCopilot() {
  const ev = S.ev; if (!ev) return;
  const add = ev.type === 'wedding' ? 'Add a mehendi function' : ev.type === 'birthday' ? 'Add a games hour' : 'Add a kolam contest';
  const later = new Date(dateOf(ev.date).getTime() + 7 * DAY).toLocaleDateString('en-IN', { day: 'numeric', month: 'long' });
  chatDrawer({ title: 'Ask Utsav', sub: 'Change the plan in plain words. Nothing changes until you apply.', key: 'copilot', chips: ['Cut budget by 15%', add, `Move the event to ${later}`], placeholder: 'Tell me what to change', form: 'copilot' });
}
async function copilotSend(q) {
  S.copilot.push({ who: 'me', t: q }, { who: 'ai', t: 'Thinking…', typing: true }); openCopilot();
  try {
    const r = await api(`/api/events/${S.ev.id}/copilot`, { method: 'POST', body: { message: q } });
    S.copilot.pop();
    S.copilot.push(r.changes ? { who: 'ai', diff: r.diff, changes: r.changes, reply: r.reply } : { who: 'ai', t: r.reply });
  } catch (e) { S.copilot.pop(); S.copilot.push({ who: 'ai', t: e.message }); }
  if (S.overlayOpen) openCopilot();
}
function openAskCat() {
  const c = selCat(), key = 'host:' + S.ev.id + ':' + c.id;
  S.chat[key] = S.chat[key] || [];
  chatDrawer({ title: `Ask Utsav about ${c.name.toLowerCase()}`, sub: `Cap ${inr(c.cap)} · ${S.ev.guests} guests · ${S.ev.city}`, key, chips: ['What is a fair price?', 'How much advance is okay?', 'What should I ask vendors?'], placeholder: 'Ask anything about this task', form: 'askcat' });
}
async function askCatSend(q) {
  const c = selCat(), key = 'host:' + S.ev.id + ':' + c.id, list = (S.chat[key] = S.chat[key] || []);
  list.push({ who: 'me', t: q }, { who: 'ai', t: 'Thinking…', typing: true }); openAskCat();
  try { const r = await api(`/api/events/${S.ev.id}/ask`, { method: 'POST', body: { cat: c.id, message: q, history: list.filter((m) => !m.typing).slice(-6) } }); list.pop(); list.push({ who: 'ai', t: r.reply }); }
  catch (e) { list.pop(); list.push({ who: 'ai', t: e.message }); }
  if (S.overlayOpen) openAskCat();
}
async function helperAsk(q) {
  const c = S.h.mine.find((x) => x.id === S.hsel), key = 'h:' + c.id;
  const list = (S.chat[key] = S.chat[key] || []);
  list.push({ who: 'me', t: q }, { who: 'ai', t: S.lang === 'ta' ? 'யோசிக்கிறேன்…' : 'Thinking…', typing: true }); render();
  try { const r = await api('/api/h/ask', { method: 'POST', helper: S.htoken, body: { cat: c.id, message: q, lang: S.lang, history: list.filter((m) => !m.typing).slice(-6) } }); list.pop(); list.push({ who: 'ai', t: r.reply }); }
  catch (e) { list.pop(); list.push({ who: 'ai', t: e.message }); }
  render();
}
function vendorModal(catId, i) {
  const vd = S.vendors[catId], v = vd?.vendors?.[i]; if (!v) return;
  const helper = S.route.name === 'helper';
  const short = helper ? S.h.mine.find((m) => m.id === catId)?.shortlist || [] : S.ev.cats.find((c) => c.id === catId).shortlist;
  const saved = short.some((s) => s.id === v.id);
  const digits = (v.phone || '').replace(/\D/g, '');
  const wa = digits ? `https://wa.me/${digits.length === 10 ? '91' + digits : digits}` : null;
  openOverlay(`<div class="modal" role="dialog" aria-label="${esc(v.name)}"><div class="vhero"><img src="${esc(v.img)}" alt=""></div>
   <div class="mhead"><div><h2>${esc(v.name)}</h2><p>${v.rating ? `★ ${v.rating} · ${v.reviews} reviews` : 'New on Google'}${v.sample ? ' · <span class="sample-tag">Example</span>' : ''}</p></div><button class="xbtn" data-act="close" aria-label="Close">${ic('x')}</button></div>
   <div class="kv-list"><div>${ic('coins')}<span><b>${esc(v.estimate)}</b> <span class="label">AI estimate, confirm with the vendor</span></span></div>
    <div>${ic('spark')}<span>${esc(v.why || '')}</span></div>${v.address ? `<div>${ic('pin')}<span>${esc(v.address)}</span></div>` : ''}
    <div>${ic('phone')}<span>${v.phone ? `<span class="num" style="user-select:all">${esc(v.phone)}</span>` : '<span class="label">Phone number shows here for real vendors from Google Maps.</span>'}</span></div></div>
   <div class="vacts">
    ${v.phone ? `<a class="btn btn-teal" href="tel:${esc(v.phone.replace(/\s/g, ''))}">${ic('phone')}Call</a>` : `<button class="btn btn-teal" data-act="callsheet" data-cat="${catId}" data-v="${i}">${ic('phone')}Script</button>`}
    ${wa ? `<a class="btn btn-ghost" href="${wa}" target="_blank" rel="noopener">${ic('chat')}WhatsApp</a>` : `<button class="btn btn-ghost" disabled title="No phone number">${ic('chat')}WhatsApp</button>`}
    <a class="btn btn-ghost" href="${esc(v.maps)}" target="_blank" rel="noopener">${ic('pin')}Maps</a>
    <button class="btn ${saved ? 'btn-gold' : 'btn-ghost'}" data-act="shortlist" data-cat="${catId}" data-i="${i}">${ic(saved ? 'saved' : 'save')}${saved ? 'Saved' : 'Shortlist'}</button></div>
   ${v.phone ? `<button class="btn btn-ghost" style="width:100%;margin-top:10px" data-act="callsheet" data-cat="${catId}" data-v="${i}">${ic('doc')}Open the call script</button>` : ''}</div>`);
}
function callSheet(catId, vi) {
  const helper = S.route.name === 'helper', lang = helper ? S.lang : 'en', L = T[lang];
  const ev = helper ? S.h.event : S.ev, c = (helper ? S.h.mine : S.ev.cats).find((x) => x.id === catId);
  const v = vi != null ? S.vendors[catId]?.vendors?.[vi] : null;
  openOverlay(`<div class="modal" role="dialog" aria-label="Call helper"><div class="mhead"><div><p class="label">${lang === 'ta' ? 'அழைப்பு உதவி' : 'Call helper'}</p><h2>${v ? esc(v.name) : esc(lang === 'ta' ? CAT_TA[c.id] || c.name : c.name)}</h2>${v?.phone ? `<p class="num" style="user-select:all">${esc(v.phone)}</p>` : ''}</div><button class="xbtn" data-act="close" aria-label="Close">${ic('x')}</button></div>
   <div class="script-box"><div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:8px"><b>${lang === 'ta' ? 'பேச வேண்டியது' : 'What to say'}</b><button class="btn btn-ghost btn-sm" data-act="speak" data-lang="${lang === 'ta' ? 'ta-IN' : 'en-IN'}">${ic('sound')}${lang === 'ta' ? 'படித்துக் காட்டு' : 'Read aloud'}</button></div><p id="script" style="margin:0">${esc(L.script(ev, c.name, c.id))}</p></div>
   <p style="margin:16px 0 8px;font-weight:500">${lang === 'ta' ? 'கேட்கும்போது டிக் செய்யுங்கள்' : 'Tick as you ask'}</p>
   <div class="chips">${L.qs(fmtD(ev.date)).map((q) => `<button class="chip" data-act="tick" aria-pressed="false">${esc(q)}</button>`).join('')}</div>
   <div class="field" style="margin-top:16px"><label for="cq">${L.quote}</label><input class="input num" id="cq" inputmode="numeric" placeholder="${c.id === 'food' ? `per plate × ${ev.guests}` : 'e.g. 45000'}"></div>
   <div style="display:flex;gap:10px;margin-top:16px;flex-wrap:wrap">${v?.phone ? `<a class="btn btn-teal" href="tel:${esc(v.phone.replace(/\s/g, ''))}">${ic('phone')}${L.call}</a>` : ''}<button class="btn btn-gold" style="flex:1" data-act="savequote" data-cat="${catId}">${L.save}</button></div></div>`);
}
function addHelperModal(catId) {
  const ev = S.ev, existing = Object.entries(ev.helpers).filter(([, h]) => !h.revoked);
  const def = catId || (ev.cats.find((c) => !c.lead) || ev.cats[0]).id;
  openOverlay(`<div class="modal" role="dialog" aria-label="Add helper"><div class="mhead"><div><h2>${catId ? 'Assign a helper' : 'Add helper'}</h2><p>They get a private link. No sign-up, works on any phone.</p></div><button class="xbtn" data-act="close" aria-label="Close">${ic('x')}</button></div>
   <form data-form="helper" style="display:grid;gap:14px">
    ${existing.length ? `<div class="field"><label for="ah-who">Who</label><select class="input" id="ah-who"><option value="">Someone new</option>${existing.map(([id, h]) => `<option value="${id}">${esc(h.name)}</option>`).join('')}</select></div>` : ''}
    <div id="ah-new" style="display:grid;gap:14px">
     <div class="field"><label for="ah-name">Name</label><input class="input" id="ah-name" maxlength="40" placeholder="Uncle Ravi"></div>
     <div class="field"><label for="ah-rel">Relation</label><input class="input" id="ah-rel" maxlength="30" placeholder="Uncle (maternal)"></div>
     <div class="field"><label for="ah-lang">Guide language</label><select class="input" id="ah-lang"><option value="en">English</option><option value="ta">Tamil (தமிழ்)</option></select></div></div>
    <div class="field"><label for="ah-cat">Category</label><select class="input" id="ah-cat">${ev.cats.map((c) => `<option value="${c.id}" ${c.id === def ? 'selected' : ''}>${esc(c.name)}${c.lead && ev.helpers[c.lead] ? ` · now ${esc(ev.helpers[c.lead].name)}` : ''}</option>`).join('')}</select></div>
    <p class="note bad" id="ah-err" hidden></p>
    <button class="btn btn-coral">${ic('plus')}Save and get link</button></form></div>`);
}
function linkFor(tok) { return `${location.origin}${location.pathname}#/h/${tok}`; }
function inviteText(h, tok) {
  const ev = S.ev, mine = ev.cats.filter((c) => c.lead === h.id).map((c) => c.name.toLowerCase()).join(' and ') || 'a task';
  return h.lang === 'ta'
    ? `வணக்கம் ${h.name}! ${ev.title} (${fmtLong(ev.date)}) நிகழ்ச்சியில் ${mine} பொறுப்பை நீங்கள் பார்த்துக்கொள்கிறீர்கள். உங்கள் வழிகாட்டி இங்கே (லாகின் தேவையில்லை): ${linkFor(tok)}`
    : `Vanakkam ${h.name}! You're helping with the ${mine} for ${ev.title} on ${fmtLong(ev.date)}. Your step-by-step guide is here, no login needed: ${linkFor(tok)}`;
}
function linkReady(hid, tok) {
  const h = { id: hid, ...S.ev.helpers[hid] };
  openOverlay(`<div class="modal" role="dialog" aria-label="Link ready"><div class="mhead"><div><h2>Link ready for ${esc(h.name)}</h2><p>Send it on WhatsApp. Anyone with this link can update ${esc(h.name)}’s task, so share it only with them.</p></div><button class="xbtn" data-act="close" aria-label="Close">${ic('x')}</button></div>
   <input class="input" readonly value="${esc(linkFor(tok))}" id="lnk" style="margin-bottom:14px">
   <div style="display:flex;gap:10px;flex-wrap:wrap"><a class="btn btn-teal" style="flex:1" href="https://wa.me/?text=${encodeURIComponent(inviteText(h, tok))}" target="_blank" rel="noopener">${ic('chat')}Share on WhatsApp</a>
   <button class="btn btn-ghost" data-act="copytxt" data-target="lnk">${ic('copy')}Copy link</button><a class="btn btn-ghost" href="#/h/${tok}" target="_blank" rel="noopener">${ic('eye')}Open their view</a></div></div>`);
}
async function ensureToken(hid) {
  let t = tokenFor(S.ev.id, hid);
  if (t) return t;
  const r = await api(`/api/events/${S.ev.id}/helpers`, { method: 'POST', body: { helperId: hid, name: S.ev.helpers[hid].name } });
  saveToken(S.ev.id, hid, r.token); S.ev = r.event; return r.token;
}
function summaryText(ev) {
  return `*${ev.title}*\n${fmtLong(ev.date)} · ${ev.city} · ${ev.guests} guests\nBudget ${inr(ev.budget)} · ${readyOf(ev.cats)}% ready\n\n${ev.cats.map((c) => { const L = lead(ev, c); return `${pct(c) === 100 ? '✅' : '⏳'} ${c.name}: ${L ? L.name : 'needs a helper'} · ${pct(c)}% · due ${fmtD(c.due)}`; }).join('\n')}\n\nPlanned with Utsav AI`;
}
function summaryModal() {
  const ev = S.ev, t = summaryText(ev);
  $('#print').innerHTML = `<h1>${esc(ev.title)}</h1><p>${fmtLong(ev.date)} · ${esc(ev.city)} · ${ev.guests} guests · Budget ${inr(ev.budget)}</p>${ev.cats.map((c) => `<h3>${esc(c.name)} · cap ${inr(c.cap)} · due ${fmtD(c.due)}</h3><ul>${c.steps.map((s) => `<li>${s.done ? '☑' : '☐'} ${esc(s.t)}</li>`).join('')}</ul>`).join('')}<p>Planned with Utsav AI</p>`;
  openOverlay(`<div class="modal" role="dialog" aria-label="Share summary"><div class="mhead"><div><h2>Share summary</h2><p>Paste it into the family group.</p></div><button class="xbtn" data-act="close" aria-label="Close">${ic('x')}</button></div>
   <textarea class="input" id="sumtxt" readonly style="min-height:220px">${esc(t)}</textarea>
   <div style="display:flex;gap:10px;margin-top:14px;flex-wrap:wrap"><button class="btn btn-gold" data-act="copytxt" data-target="sumtxt">${ic('copy')}Copy text</button><a class="btn btn-teal" href="https://wa.me/?text=${encodeURIComponent(t)}" target="_blank" rel="noopener">${ic('chat')}Open WhatsApp</a><button class="btn btn-ghost" data-act="print">${ic('doc')}Save as PDF</button></div></div>`);
}
function resourceModal(catId, r) {
  const c = S.ev.cats.find((x) => x.id === catId), L = T.en;
  const body = r === 'check' ? `<ol style="display:grid;gap:8px;padding-left:20px;margin:0">${c.steps.map((s) => `<li${s.done ? ' style="color:var(--dim);text-decoration:line-through"' : ''}>${esc(s.t)}</li>`).join('')}</ol>`
    : r === 'flags' ? `<div class="flags">${(FLAGS[c.id] || FLAGS.food).en.map((f) => `<div class="flag"><span>${ic('alert')}</span>${esc(f)}</div>`).join('')}</div>`
      : `<ul style="display:grid;gap:8px;padding-left:20px;margin:0">${L.qs(fmtD(S.ev.date)).map((q) => `<li>${esc(q)}</li>`).join('')}</ul><div class="script-box" style="margin-top:14px">${esc(L.script(S.ev, c.name))}</div>`;
  openOverlay(`<div class="modal" role="dialog"><div class="mhead"><div><h2>${esc(c.name)}: ${r === 'check' ? 'checklist' : r === 'flags' ? 'red flags' : 'questions to ask'}</h2></div><button class="xbtn" data-act="close" aria-label="Close">${ic('x')}</button></div>${body}</div>`);
}

// ================================================================= actions
async function hostOp(op, opts = {}) {
  try { const r = await api(`/api/events/${S.ev.id}/op`, { method: 'POST', body: op }); S.ev = r.event; if (!opts.silent) render(); return true; }
  catch (e) { toast(e.message, true); try { S.ev = (await api(`/api/events/${S.ev.id}`)).event; render(); } catch { /* ignore */ } return false; }
}
async function helperOp(op) {
  try { S.h = await api('/api/h/op', { method: 'POST', helper: S.htoken, body: op }); render(); return true; }
  catch (e) { toast(e.message, true); return false; }
}
function optimisticStep(cats, catId, i, done) { const c = cats.find((x) => x.id === catId); if (c) c.steps[i].done = done ?? !c.steps[i].done; return c; }

document.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-act]'); if (!b) { if (S.menu && !e.target.closest('.menu')) { S.menu = false; render(); } return; }
  const a = b.dataset.act, d = b.dataset;
  switch (a) {
    case 'close': closeOverlay(); break;
    case 'retry': route(); break;
    case 'home': location.hash = '#/'; break;
    case 'signin': signIn(); break;
    case 'signout': try { await firebase.auth().signOut(); toast('Signed out'); } catch { /* ignore */ } S.menu = false; render(); break;
    case 'sample': {
      b.disabled = true;
      const last = ls.get('utsav-sample', null);
      if (last) { try { await api(`/api/events/${last}`); location.hash = `#/e/${last}/orbit`; break; } catch { /* make a new one */ } }
      try { const r = await api('/api/events/sample', { method: 'POST' }); ls.set('utsav-sample', r.id); location.hash = `#/e/${r.id}/orbit`; }
      catch (err) { toast(err.message, true); b.disabled = false; }
      break;
    }
    case 'menu': S.menu = !S.menu; render(); break;
    case 'sel': S.sel = d.cat; S.ptab = 'plan'; S.prevTab = 0; render(); break;
    case 'ptab': S.ptab = d.t; render(); break;
    case 'step': {
      const c = optimisticStep(S.ev.cats, d.cat, +d.i); render();
      if (c.steps[+d.i].done) { burst(document.querySelector(`[data-act="step"][data-cat="${d.cat}"][data-i="${d.i}"]`)); }
      hostOp({ type: 'toggleStep', cat: d.cat, i: +d.i, done: c.steps[+d.i].done }, { silent: true });
      break;
    }
    case 'marknext': {
      const c = S.ev.cats.find((x) => x.id === d.cat), n = nextIdx(c); if (n < 0) break;
      burst(b); c.steps[n].done = true; render();
      toast(pct(c) === 100 ? `${c.name} is complete` : `Done: ${c.steps[n].t}`);
      hostOp({ type: 'toggleStep', cat: c.id, i: n, done: true }, { silent: true });
      break;
    }
    case 'vendor': vendorModal(d.cat, +d.i); break;
    case 'reloadv': delete S.vendors[d.cat]; render(); break;
    case 'shortlist': {
      const v = S.vendors[d.cat].vendors[+d.i];
      const op = { type: 'shortlist', cat: d.cat, vendor: { id: v.id, name: v.name, rating: v.rating, phone: v.phone, maps: v.maps } };
      const ok = S.route.name === 'helper' ? await helperOp(op) : await hostOp(op);
      if (ok) { vendorModal(d.cat, +d.i); toast('Shortlist updated'); }
      break;
    }
    case 'callsheet': callSheet(d.cat, d.v != null ? +d.v : null); break;
    case 'speak': {
      try { const u = new SpeechSynthesisUtterance($('#script').textContent); u.lang = d.lang; u.rate = .92; speechSynthesis.cancel(); speechSynthesis.speak(u); }
      catch { toast('Read aloud is not available in this browser.', true); }
      break;
    }
    case 'tick': b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') !== 'true'); break;
    case 'savequote': {
      const v = Math.round(Number(($('#cq').value || '').replace(/[^\d]/g, ''))); if (!v) { toast('Enter the quote amount first.', true); break; }
      const op = { type: 'setQuote', cat: d.cat, amount: v };
      if (S.route.name === 'helper' ? await helperOp(op) : await hostOp(op)) { closeOverlay(); toast(`Saved ${inr(v)}`); }
      break;
    }
    case 'res': resourceModal(d.cat, d.r); break;
    case 'copilot': S.menu = false; openCopilot(); break;
    case 'askcat': openAskCat(); break;
    case 'dchip': d.form === 'copilot' ? copilotSend(d.q) : askCatSend(d.q); break;
    case 'apply': {
      const m = S.copilot[+d.i];
      try { const r = await api(`/api/events/${S.ev.id}/copilot/apply`, { method: 'POST', body: { changes: m.changes } }); S.ev = r.event; m.state = 'applied'; render(); openCopilot(); toast('Changes applied'); }
      catch (err) { toast(err.message, true); }
      break;
    }
    case 'discard': S.copilot[+d.i].state = 'discarded'; openCopilot(); break;
    case 'summary': S.menu = false; summaryModal(); break;
    case 'print': window.print(); break;
    case 'copytxt': {
      const el = $('#' + d.target);
      try { await navigator.clipboard.writeText(el.value); toast('Copied'); } catch { el.select(); toast('Selected. Press Ctrl+C to copy.'); }
      break;
    }
    case 'hide': hostOp({ type: 'hideBudget', value: !S.ev.hideBudget }); break;
    case 'addhelper': S.menu = false; addHelperModal(d.cat); break;
    case 'assign': addHelperModal(d.cat); break;
    case 'helper': S.route.view !== 'family' ? (location.hash = `#/e/${S.ev.id}/family`) : null; break;
    case 'wa': {
      const w = window.open('', '_blank');
      try { const t = await ensureToken(d.h); const url = `https://wa.me/?text=${encodeURIComponent(inviteText({ id: d.h, ...S.ev.helpers[d.h] }, t))}`; if (w) w.location = url; else location.href = url; render(); }
      catch (err) { w?.close(); toast(err.message, true); }
      break;
    }
    case 'copylink': {
      try { const t = await ensureToken(d.h); await navigator.clipboard.writeText(linkFor(t)); toast('Link copied'); render(); }
      catch { const t = tokenFor(S.ev.id, d.h); if (t) linkReady(d.h, t); }
      break;
    }
    case 'openview': {
      const w = window.open('', '_blank');
      try { const t = await ensureToken(d.h); if (w) w.location = linkFor(t); else location.hash = `#/h/${t}`; render(); }
      catch (err) { w?.close(); toast(err.message, true); }
      break;
    }
    case 'newlink': {
      try { const r = await api(`/api/events/${S.ev.id}/helpers`, { method: 'POST', body: { helperId: d.h, name: S.ev.helpers[d.h].name } }); saveToken(S.ev.id, d.h, r.token); S.ev = r.event; render(); linkReady(d.h, r.token); }
      catch (err) { toast(err.message, true); }
      break;
    }
    case 'revoke': {
      try { const r = await api(`/api/events/${S.ev.id}/helpers/${d.h}`, { method: 'DELETE' }); S.ev = r.event; const t = tokens(); if (t[S.ev.id]) delete t[S.ev.id][d.h]; ls.set('utsav-tokens', t); render(); toast('Link removed. It no longer works.'); }
      catch (err) { toast(err.message, true); }
      break;
    }
    // wizard
    case 'wtype': S.w = { ...wizDefault(d.v), title: S.w.title, city: S.w.city, date: S.w.date }; render(); break;
    case 'wtrad': { const t = getTradition(S.w.type, d.v); S.w.tradition = t.id; if (t.funcs.length) S.w.funcs = t.funcs.map((f) => f.name); render(); break; }
    case 'wown': { const v = (S.w.own || '').trim().slice(0, 40); if (v && !S.w.funcs.some((f) => f.toLowerCase() === v.toLowerCase())) S.w.funcs.push(v); S.w.own = ''; render(); $('#w-own')?.focus(); break; }
    case 'wchip': { const arr = S.w[d.k], i = arr.indexOf(d.v); i < 0 ? arr.push(d.v) : arr.splice(i, 1); render(); break; }
    case 'wvibe': S.w.vibe = d.v; render(); break;
    case 'wback': S.wstep = Math.max(0, S.wstep - 1); render(); break;
    // helper
    case 'lang': S.lang = d.l; ls.set('utsav-lang-' + S.h.me.id, d.l); render(); break;
    case 'hsel': S.hsel = d.cat; render(); break;
    case 'hstep': {
      const c = optimisticStep(S.h.mine, d.cat, +d.i); render();
      if (c.steps[+d.i].done) burst($(`[data-act="hstep"][data-i="${d.i}"]`));
      helperOp({ type: 'toggleStep', cat: d.cat, i: +d.i, done: c.steps[+d.i].done });
      break;
    }
    case 'hmarknext': {
      const c = S.h.mine.find((x) => x.id === d.cat), n = nextIdx(c); if (n < 0) break;
      burst(b); c.steps[n].done = true; render();
      toast(S.lang === 'ta' ? 'முடிந்தது! குடும்பத்தினர் இதைப் பார்க்கலாம்.' : `Done. The family can see it.`);
      helperOp({ type: 'toggleStep', cat: c.id, i: n, done: true });
      break;
    }
    case 'hsave': {
      const q = Math.round(Number(($('#hq').value || '').replace(/[^\d]/g, ''))) || 0, nt = $('#hn').value;
      const ok1 = await helperOp({ type: 'setQuote', cat: d.cat, amount: q }); const ok2 = ok1 && await helperOp({ type: 'setNotes', cat: d.cat, text: nt });
      if (ok2) toast(S.lang === 'ta' ? 'சேமிக்கப்பட்டது' : 'Saved. The host can see it.');
      break;
    }
    case 'hchip': helperAsk(T[S.lang].chips[+d.i]); break;
    case 'vfilter': S.vfilter = d.f; render(); break;
    case 'hflags': { const c = S.h.mine.find((x) => x.id === S.hsel); const ta = S.lang === 'ta'; openOverlay(`<div class="modal hxm" role="dialog" aria-label="Watch out"><div class="mhead"><div><h2>${ta ? 'இவற்றைக் கவனியுங்கள்' : 'Watch out for these'}</h2><p>${ta ? 'விலை பேசும் முன் இவற்றைக் கேளுங்கள்.' : 'Check these before you agree to a price.'}</p></div><button class="xbtn" data-act="close" aria-label="Close">${ic('x')}</button></div><div class="hx-grp">${(FLAGS[c.id] || FLAGS.food)[S.lang].map((f) => `<div class="hx-row">${ic('alert', 'sa')}<span class="t"><b style="font-weight:500">${esc(f)}</b></span></div>`).join('')}</div></div>`); break; }
    case 'hfamily': { const L2 = T[S.lang]; openOverlay(`<div class="modal hxm" role="dialog" aria-label="Family"><div class="mhead"><div><h2>${L2.family}</h2><p>${L2.view}</p></div><button class="xbtn" data-act="close" aria-label="Close">${ic('x')}</button></div><div class="hx-grp">${S.h.team.map((t) => `<div class="hx-row">${avatar(t.lead, 40)}<span class="t"><b>${esc(t.lead?.name || (S.lang === 'ta' ? 'யாருமில்லை' : 'Open'))}</b><small>${esc(S.lang === 'ta' ? CAT_TA[t.id] || t.name : t.name)} · <span class="st-${t.status}">${L2.words[t.status]}</span></small></span><b class="num">${t.pct}%</b>${ic('lock', 'ch')}</div>`).join('')}</div>${S.h.activity.length ? `<div class="hx-lab"><span>${S.lang === 'ta' ? 'சமீபத்தியவை' : 'Recent'}</span></div><div class="hx-grp">${S.h.activity.slice(0, 4).map((a) => `<div class="hx-row">${ic('spark', 'sa')}<span class="t"><b style="font-weight:500">${esc(a.t)}</b></span></div>`).join('')}</div>` : ''}</div>`); break; }
    case 'jump': e.preventDefault(); $('#' + d.to)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); $$('.bnav button').forEach((x) => x.toggleAttribute('aria-current', x === b)); break;
    case 'mic': {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition; if (!SR) break;
      const rec = new SR(); rec.lang = S.lang === 'ta' ? 'ta-IN' : 'en-IN'; rec.interimResults = false;
      rec.onresult = (ev) => { const t = ev.results[0][0].transcript; if (t) helperAsk(t); };
      rec.onerror = () => toast(S.lang === 'ta' ? 'மைக் வேலை செய்யவில்லை' : 'The microphone did not work. Type your question instead.', true);
      try { rec.start(); toast(S.lang === 'ta' ? 'பேசுங்கள்…' : 'Listening…'); } catch { /* already running */ }
      break;
    }
  }
});

document.addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.target.dataset.form;
  if (f === 'wiz') {
    const err = wizValid(); const box = $('#w-err');
    if (err) { box.hidden = false; box.textContent = err; return; }
    if (S.wstep < 4) { S.wstep++; render(); scrollTo(0, 0); } else createPlan();
  }
  if (f === 'copilot' || f === 'askcat') { const v = $('#dq').value.trim(); if (v) (f === 'copilot' ? copilotSend : askCatSend)(v); }
  if (f === 'hask') { const v = $('#hask').value.trim(); if (v) helperAsk(v); }
  if (f === 'helper') {
    const who = $('#ah-who')?.value || '', cat = $('#ah-cat').value, err = $('#ah-err');
    try {
      if (who) {
        await hostOp({ type: 'assign', cat, helper: who }); closeOverlay(); toast(`${S.ev.helpers[who].name} now leads ${S.ev.cats.find((c) => c.id === cat).name.toLowerCase()}`);
      } else {
        const name = $('#ah-name').value.trim(); if (!name) { err.hidden = false; err.textContent = 'Enter the helper’s name.'; return; }
        const r = await api(`/api/events/${S.ev.id}/helpers`, { method: 'POST', body: { name, rel: $('#ah-rel').value.trim(), lang: $('#ah-lang').value, cat } });
        saveToken(S.ev.id, r.helperId, r.token); S.ev = r.event; render(); linkReady(r.helperId, r.token);
      }
    } catch (ex) { err.hidden = false; err.textContent = ex.message; }
  }
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.target.id === 'w-own') { e.preventDefault(); $('[data-act="wown"]')?.click(); }
});
document.addEventListener('input', (e) => {
  const t = e.target;
  if (t.dataset.w && S.w) {
    const k = t.dataset.w; S.w[k] = t.type === 'range' ? Number(t.value) : t.value;
    const set = (id, v) => { const el = $('#' + id); if (el) el.textContent = v; };
    if (k === 'guests') { set('v-guests', t.value); set('s-guests', t.value); }
    if (k === 'budget') { set('v-budget', inr(t.value)); set('s-budget', inr(t.value)); }
    if (k === 'guests' || k === 'budget') set('s-per', inr(S.w.budget / S.w.guests));
    if (k === 'city') set('s-city', t.value);
    if (k === 'date' && t.value) set('s-date', fmtLong(t.value));
  }
  if (t.id === 'ah-who') { $('#ah-new').hidden = !!t.value; }
});
document.addEventListener('change', (e) => {
  const t = e.target;
  if (t.dataset.w === 'sub') S.w.sub = t.value;
  if (t.dataset.cap) { const v = Math.round(Number(t.value.replace(/[^\d]/g, ''))) || 0; hostOp({ type: 'setCap', cat: t.dataset.cap, amount: v }); }
  if (t.dataset.notes) hostOp({ type: 'setNotes', cat: t.dataset.notes, text: t.value }, { silent: true }).then((ok) => ok && toast('Notes saved'));
  if (t.dataset.quote) hostOp({ type: 'setQuote', cat: t.dataset.quote, amount: Number(t.value.replace(/[^\d]/g, '')) || 0 });
  if (t.dataset.assign !== undefined && t.dataset.assign) hostOp({ type: 'assign', cat: t.dataset.assign, helper: t.value || null });
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { if (S.overlayOpen) closeOverlay(); else if (S.menu) { S.menu = false; render(); } } });

// ---------------------------------------------------------------- live updates
async function poll() {
  if (document.hidden || S.overlayOpen || ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;
  try {
    if (S.route.name === 'host' && S.ev) {
      const r = (await api(`/api/events/${S.ev.id}`)).event;
      if (r.updatedAt !== S.ev.updatedAt) {
        const fresh = r.activity.slice(S.ev.activity.length);
        S.ev = r; render();
        if (fresh.length) toast(fresh[fresh.length - 1].t);
      }
    } else if (S.route.name === 'helper' && S.h) {
      const r = await api('/api/h/me', { helper: S.htoken });
      if (JSON.stringify(r) !== JSON.stringify(S.h)) { S.h = r; render(); }
    }
  } catch (e) { if (S.route.name === 'helper' && e.code === 'LINK_INACTIVE') renderError(e, 'helper'); }
}
