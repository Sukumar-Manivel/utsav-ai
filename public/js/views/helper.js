// Helper app: four phone pages (Today, Steps, Vendors, Ask) for a relative opening their private link.
import { CAT_TA, FLAGS, stepHint, T } from '../i18n.js';
import { avatar } from '../router.js';
import { S } from '../state.js';
import { dateOf, daysLeft, esc, fmtD, fmtLong, ic, inr, inrShort, nextIdx, pct, status, TYPE_ICON } from '../util.js';
import { loadVendors } from './host.js';

export const HX_TABS = [
  ['today', 'home'],
  ['steps', 'list'],
  ['vendors', 'store'],
  ['ask', 'spark'],
];
export const HX_LABEL = {
  en: { today: 'Today', steps: 'Steps', vendors: 'Vendors', ask: 'Ask' },
  ta: { today: 'இன்று', steps: 'படிகள்', vendors: 'கடைகள்', ask: 'கேள்' },
};
export function hxRing(p, size, sw, col = '#FF9F1C', key = 'hx') {
  const r = (size - sw) / 2,
    Cc = 2 * Math.PI * r,
    to = Cc * (1 - p / 100),
    from = S.prevRing[key] ?? Cc;
  S.prevRing[key] = to;
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="#2C2C30" stroke-width="${sw}"/><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${col}" stroke-width="${sw}" stroke-linecap="round" stroke-dasharray="${Cc.toFixed(1)}" style="stroke-dashoffset:${from.toFixed(1)};transition:stroke-dashoffset 1s var(--ease)" data-off="${to.toFixed(1)}" transform="rotate(-90 ${size / 2} ${size / 2})"/></svg>`;
}
export function viewHelper() {
  const d = S.h,
    L = T[S.lang],
    me = d.me,
    ev = d.event,
    ta = S.lang === 'ta',
    tab = S.route.tab || 'today';
  const tabbar = `<nav class="hx-tab" aria-label="Sections">${HX_TABS.map(([k, i]) => `<a href="#/h/${S.htoken}/${k}" ${tab === k ? 'aria-current="page"' : ''}>${ic(i)}<span>${HX_LABEL[S.lang][k]}</span></a>`).join('')}</nav>`;
  const lang = `<div class="hx-seg" role="group" aria-label="Language"><button data-act="lang" data-l="en" aria-pressed="${!ta}">EN</button><button data-act="lang" data-l="ta" aria-pressed="${ta}">தமிழ்</button></div>`;
  if (!d.mine.length)
    return `<div class="hx"><header class="hx-bar"><b class="hx-logo">Utsav</b>${lang}</header><div class="hx-w"><h1 class="hx-h1">${L.greet}, ${esc(me.name)}</h1><div class="hx-grp hx-pad"><b>${ta ? 'இன்னும் பணி இல்லை' : 'No task yet'}</b><p class="hx-mut">${ta ? 'உரிமையாளர் பணியை ஒதுக்கியதும் இந்தப் பக்கம் தானாக மாறும்.' : 'The host has not given you a category yet. This page updates by itself when they do.'}</p></div></div></div>`;
  if (!S.hsel || !d.mine.find((c) => c.id === S.hsel)) S.hsel = d.mine[0].id;
  const c = d.mine.find((x) => x.id === S.hsel),
    p = pct(c),
    st = status(c),
    n = nextIdx(c),
    dl = daysLeft(c.due);
  const catName = ta ? CAT_TA[c.id] || c.name : c.name;
  const switcher =
    d.mine.length > 1
      ? `<div class="hx-chips">${d.mine.map((m) => `<button data-act="hsel" data-cat="${m.id}" aria-pressed="${m.id === c.id}">${esc(ta ? CAT_TA[m.id] || m.name : m.name)}</button>`).join('')}</div>`
      : '';
  const back = (title, extra = '') =>
    `<header class="hx-bar"><a class="hx-back" href="#/h/${S.htoken}/today" aria-label="Back to today">${ic('back')}</a><h1>${title}</h1>${extra || '<span style="width:40px"></span>'}</header>`;
  let body = '';

  if (tab === 'today') {
    const done = c.steps.filter((s) => s.done).length;
    const dl2 = daysLeft(ev.date),
      myFns = (ev.functions || []).filter((f) => f.cats.some((id) => d.mine.some((m) => m.id === id)));
    body = `<header class="hx-bar"><b class="hx-logo">Utsav</b>${lang}</header>
    <div class="hx-w">
      <div class="hx-evc"><span class="hx-evi">${ic(TYPE_ICON[ev.type] || 'spark')}</span><span class="t"><b>${esc(ev.title)}</b><small>${fmtLong(ev.date)} · ${dl2 > 0 ? (ta ? `இன்னும் ${dl2} நாட்கள்` : `${dl2} days to go`) : ta ? 'இன்று!' : 'Today!'}${ev.tradition && ev.tradition.id !== 'custom' ? ` · ${esc(ev.tradition.name)}` : ''}</small></span></div>
      <h1 class="hx-h1">${ta ? `${esc(me.name)}, ${esc(catName)} பொறுப்பு உங்களிடம்.` : `${esc(me.name)}, the ${esc(c.name.toLowerCase())} is in your hands.`}</h1>
      ${switcher}
      <div class="hx-stats"><div class="hx-ring">${hxRing(p, 68, 7)}<b>${p}%</b></div>
        <div class="hx-tiles"><div><b class="num">${c.cap >= 1e5 ? inrShort(c.cap) : `₹${+(c.cap / 1000).toFixed(1)}K`}</b><small>${L.cap}</small></div><div><b class="num">${Math.max(dl, 0)}</b><small>${L.left}</small></div><div><b class="st-${st}">${L.words[st]}</b><small>${L.status}</small></div></div></div>
      <div class="hx-lab"><span>${L.now}</span><span class="hx-acc">${n < 0 ? '' : ta ? `படி ${n + 1} / ${c.steps.length}` : `Step ${n + 1} of ${c.steps.length}`}</span></div>
      <section class="hx-grp hx-pad">${
        n < 0
          ? `<b class="hx-h2">${L.alldone}</b><p class="hx-mut">${L.alldoneP}</p>`
          : `<b class="hx-h2">${esc(c.steps[n].t)}</b><p class="hx-mut">${ta ? L.hint : esc(stepHint(c.steps[n].t))}</p>
        <div class="hx-two"><button class="hx-btn y" data-act="callsheet" data-cat="${c.id}">${ic('phone')}${ta ? 'அழை' : 'Call'}</button><button class="hx-btn g" data-act="hmarknext" data-cat="${c.id}">${ic('check')}${ta ? 'முடிந்தது' : 'Done'}</button></div>`
      }</section>
      <section class="hx-grp mt-12">
        <button class="hx-row" data-act="hflags">${ic('alert', 'sa')}<span class="t"><b>${ta ? '3 கவனிக்க வேண்டியவை' : '3 things to watch'}</b><small>${esc((FLAGS[c.id] || FLAGS.food)[S.lang].slice(0, 2).join(', '))}…</small></span>${ic('right', 'ch')}</button>
        <button class="hx-row" data-act="hfamily"><span class="hx-stack">${d.team
          .slice(0, 5)
          .map((t) => avatar(t.lead, 34))
          .join(
            '',
          )}</span><span class="t"><b>${L.family}</b><small>${esc(d.activity[0]?.t || (ta ? 'குழு முன்னேற்றம்' : 'See how the team is doing'))}</small></span>${ic('right', 'ch')}</button>
        <a class="hx-row" href="#/h/${S.htoken}/steps">${ic('list', 'sa')}<span class="t"><b>${ta ? 'என் படிகள்' : 'My steps'}</b><small>${done} / ${c.steps.length} ${ta ? 'முடிந்தது' : 'done'}</small></span>${ic('right', 'ch')}</a>
      </section>
      ${
        myFns.length
          ? `<div class="hx-lab"><span>${ta ? 'உங்கள் பணி உள்ள விழாக்கள்' : 'Functions you help with'}</span></div>
      <section class="hx-grp">${myFns.map((f) => `<div class="hx-row hx-fn ${daysLeft(f.date) < 0 ? 'past' : ''}"><span class="hx-date"><b>${dateOf(f.date).getDate()}</b>${dateOf(f.date).toLocaleDateString('en-IN', { month: 'short' })}</span><span class="t"><b>${esc(f.name)}</b><small>${f.when ? esc(f.when) : ''}${f.main ? (f.when ? ' · ' : '') + (ta ? 'முக்கிய நிகழ்வு' : 'Main ceremony') : ''}</small></span></div>`).join('')}</section>`
          : ''
      }
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
        <label class="hx-row hx-field"><span class="t"><small>${L.quote}</small><input class="num" id="hq" inputmode="numeric" value="${c.quote || ''}" placeholder="0"></span>${c.quote ? `<span class="${c.quote > c.cap ? 'st-late' : 'st-ok'}" style="font-size:13.5px;font-weight:600">${c.quote > c.cap ? (ta ? 'வரம்பு மீறியது' : 'Over cap') : ta ? 'வரம்புக்குள்' : 'Within cap'}</span>` : ''}</label>
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
      <div class="hx-chips">${[
        ['best', ta ? 'சிறந்தது' : 'Best match'],
        ['price', ta ? 'குறைந்த விலை' : 'Lowest price'],
        ['short', ta ? 'சேமித்தவை' : 'Shortlisted'],
      ]
        .map(([k, t]) => `<button data-act="vfilter" data-f="${k}" aria-pressed="${filt === k}">${t}</button>`)
        .join('')}</div>
      <div data-vgrid="${c.id}" data-n="5" data-style="hx">${hxVendors(c)}</div>
      <p class="hx-mut fs-13 mt-12">${ta ? 'விலைகள் AI மதிப்பீடுகள். விற்பனையாளரிடம் உறுதிசெய்யுங்கள்.' : `Prices are AI estimates. Confirm with the vendor.`} <span data-vsrc="${c.id}">${vd?.source === 'places' ? '<span class="sample-tag">From Google Maps</span>' : vd?.source === 'sample' ? '<span class="sample-tag">Examples</span>' : ''}</span></p>
    </div>`;
  }

  if (tab === 'ask') {
    const msgs = S.chat['h:' + c.id] || [
      {
        who: 'ai',
        t: ta
          ? `வணக்கம் ${me.name}! ${catName} பணியில் நான் உதவுகிறேன். உங்கள் வரம்பு ${inr(c.cap)}.`
          : `Hi ${me.name}! I can help with the ${c.name.toLowerCase()} for ${ev.title}. Your cap is ${inr(c.cap)}.`,
      },
    ];
    body = `${back(ta ? 'உத்சவிடம் கேளுங்கள்' : 'Ask Utsav', lang)}<div class="hx-w hx-chatw">
      <p class="hx-mut" style="text-align:center;font-size:13px;margin:0 0 12px">${L.aiNote}</p>
      <div class="chat hx-chat">${msgs.map((m, i) => `<p class="msg ${m.who} ${m.typing ? 'typing' : ''}" style="${i < msgs.length - 2 ? 'animation:none' : ''}">${esc(m.t)}</p>`).join('')}</div>
      <div class="hx-askdock"><div class="hx-chips wrap">${L.chips.map((q, i) => `<button data-act="hchip" data-i="${i}">${esc(q)}</button>`).join('')}</div>
      <form class="hx-ask" data-form="hask"><label class="sr" for="hask">${L.type}</label><input id="hask" placeholder="${L.type}" autocomplete="off">
        ${window.SpeechRecognition || window.webkitSpeechRecognition ? `<button type="button" class="ib" data-act="mic" aria-label="Speak your question">${ic('mic')}</button>` : ''}<button class="ib send" aria-label="Send">${ic('send')}</button></form></div>
    </div>`;
  }
  return `<div class="hx">${body}</div>${tabbar}`;
}
export function hxVendors(c) {
  const vd = S.vendors[c.id];
  if (!vd) {
    loadVendors(c.id, 'helper');
    return `<div class="hx-grp hx-pad"><span class="skel" style="display:block;height:150px"></span><span class="skel" style="display:block;height:18px;width:60%;margin-top:14px"></span></div>`;
  }
  if (vd.error)
    return `<div class="hx-grp hx-pad"><p class="hx-mut">${esc(vd.error)}</p><button class="hx-btn g" data-act="reloadv" data-cat="${c.id}">Try again</button></div>`;
  const short = S.h?.mine.find((m) => m.id === c.id)?.shortlist || [];
  const ta = S.lang === 'ta';
  let list = vd.vendors.map((v, i) => ({ v, i }));
  const priceOf = (v) =>
    Number(
      String(v.estimate || '')
        .replace(/,/g, '')
        .match(/\d+/)?.[0] || 1e12,
    );
  if (S.vfilter === 'price') list = list.slice().sort((a, b) => priceOf(a.v) - priceOf(b.v));
  if (S.vfilter === 'short') list = list.filter((x) => short.some((s) => s.id === x.v.id));
  if (!list.length)
    return `<div class="hx-grp hx-pad"><b>${ta ? 'இன்னும் எதுவும் சேமிக்கவில்லை' : 'Nothing shortlisted yet'}</b><p class="hx-mut">${ta ? 'ஒரு விற்பனையாளரைத் திறந்து சேமி என்பதைத் தொடுங்கள்.' : 'Open a vendor and tap the bookmark to save it here.'}</p></div>`;
  const [top, ...rest] = list;
  const dig = (p) => (p || '').replace(/\D/g, '');
  const call = (v, i, cls) =>
    v.phone
      ? `<a class="${cls}" href="tel:${esc(v.phone.replace(/\s/g, ''))}" aria-label="Call ${esc(v.name)}">${ic('phone')}${cls.includes('wide') ? (ta ? 'அழை' : 'Call') : ''}</a>`
      : `<button class="${cls}" data-act="callsheet" data-cat="${c.id}" data-v="${i}" aria-label="Call script for ${esc(v.name)}">${ic('phone')}${cls.includes('wide') ? (ta ? 'அழை' : 'Call') : ''}</button>`;
  const v = top.v,
    saved = short.some((s) => s.id === v.id),
    wa = dig(v.phone) ? `https://wa.me/${dig(v.phone).length === 10 ? '91' + dig(v.phone) : dig(v.phone)}` : null;
  return `<section class="hx-grp hx-top"><button class="hx-img" data-act="vendor" data-cat="${c.id}" data-i="${top.i}"><img src="${esc(v.img)}" alt="Open ${esc(v.name)}">${S.vfilter !== 'short' ? `<span class="hx-badge">${S.vfilter === 'price' ? (ta ? 'குறைந்த விலை' : 'Lowest price') : ta ? 'சிறந்த பொருத்தம்' : 'Top match'}</span>` : ''}</button>
    <div class="hx-pad"><div class="hx-vt"><b>${esc(v.name)}</b>${v.rating ? `<span>★ ${v.rating} <small>(${v.reviews})</small></span>` : ''}</div>
    <p class="hx-mut" style="margin:2px 0 0">${esc(v.tag || (v.address || '').split(',')[0])}${v.price ? ` · ${esc(v.price)}` : ''}</p>
    <p style="margin:8px 0 0;font-size:15px">${esc(v.estimate || '')} <span class="hx-mut fs-12_5">${ta ? 'AI மதிப்பீடு' : 'AI estimate'}</span></p>
    ${v.why ? `<p class="hx-why">${ta ? 'ஏன்: ' : 'Why picked: '}${esc(v.why)}</p>` : ''}
    <div class="hx-acts">${call(v, top.i, 'hx-btn gr wide')}${wa ? `<a class="hx-btn g" href="${wa}" target="_blank" rel="noopener" aria-label="WhatsApp">${ic('chat')}</a>` : `<button class="hx-btn g" disabled aria-label="No WhatsApp number">${ic('chat')}</button>`}<a class="hx-btn g" href="${esc(v.maps)}" target="_blank" rel="noopener" aria-label="Open in Maps">${ic('pin')}</a><button class="hx-btn ${saved ? 'y' : 'g'}" data-act="shortlist" data-cat="${c.id}" data-i="${top.i}" aria-label="${saved ? 'Remove from shortlist' : 'Shortlist'}">${ic(saved ? 'saved' : 'save')}</button></div></div></section>
  ${rest.length ? `<div class="hx-lab"><span>${ta ? 'மேலும்' : 'More options'}</span></div><section class="hx-grp">${rest.map(({ v: x, i }) => `<div class="hx-row"><button class="hx-thumb" data-act="vendor" data-cat="${c.id}" data-i="${i}" aria-label="Open ${esc(x.name)}"><img src="${esc(x.img)}" alt=""></button><span class="t"><b>${esc(x.name)}</b><small>${x.rating ? `★ ${x.rating} (${x.reviews}) · ` : ''}${esc(x.tag || '')}</small><small style="color:var(--hx-ink)">${esc(x.estimate || '')}</small></span>${call(x, i, 'hx-call')}</div>`).join('')}</section>` : ''}`;
}
