// Dialogs, drawers and toasts: focus handling, co-pilot, chats, vendor details, call script, sharing.
import { api } from './api.js';
import { CAT_TA, FLAGS, T } from './i18n.js';
import { render } from './router.js';
import { S, saveToken, tokenFor } from './state.js';
import { $, $$, dateOf, DAY, esc, fmtD, fmtLong, ic, inr, pct, readyOf } from './util.js';
import { lead, selCat } from './views/host.js';

// ---------------------------------------------------------------- accessibility helpers
export const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';
// A stable key for the focused control, so focus survives a full re-render.
export function focusKey(el) {
  if (!el || el === document.body) return null;
  if (el.id) return `#${CSS.escape(el.id)}`;
  const d = el.dataset || {};
  if (!d.act) return null;
  return ['act', 'cat', 'i', 'h', 'v', 't', 'k', 'f', 'l']
    .filter((k) => d[k] !== undefined)
    .map((k) => `[data-${k}="${CSS.escape(d[k])}"]`)
    .join('');
}
// Dialogs: remember what had focus, move focus inside, trap Tab, give it back on close.
export function openOverlay(html) {
  const still = html.includes('drawer still');
  if (!S.overlayOpen) S.lastFocus = focusKey(document.activeElement) || S.lastFocus;
  S.overlayOpen = true;
  $('#overlay').innerHTML =
    `<div class="scrim ${still ? 'still' : ''}" data-act="close" aria-hidden="true"></div>${html}`;
  const dlg = $('#overlay [role="dialog"]');
  if (dlg) {
    dlg.setAttribute('aria-modal', 'true');
    dlg.setAttribute('tabindex', '-1');
  }
  setTimeout(
    () =>
      ($('#overlay [autofocus], #overlay input:not([readonly]), #overlay textarea') || dlg)?.focus({
        preventScroll: true,
      }),
    50,
  );
}
export function closeOverlay() {
  const wasOpen = S.overlayOpen;
  S.overlayOpen = false;
  $('#overlay').innerHTML = '';
  try {
    speechSynthesis.cancel();
  } catch {
    /* none */
  }
  if (wasOpen && S.lastFocus) {
    $(S.lastFocus)?.focus({ preventScroll: true });
    S.lastFocus = null;
  }
}
export function trapTab(e) {
  const items = $$(FOCUSABLE, $('#overlay')).filter((el) => el.offsetParent !== null);
  if (!items.length) return;
  const first = items[0],
    last = items[items.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  } else if (!$('#overlay').contains(document.activeElement)) {
    e.preventDefault();
    first.focus();
  }
}
export function toast(msg, bad = false) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `${ic(bad ? 'alert' : 'check')}<span>${esc(msg)}</span>`;
  if (bad) el.querySelector('.ico').style.color = 'var(--rose)';
  $('#toasts').innerHTML = '';
  $('#toasts').appendChild(el);
  setTimeout(() => el.remove(), 3600);
}
export function showLamp(t, s) {
  S.overlayOpen = true;
  $('#overlay').innerHTML =
    `<div class="lampov" role="status"><span class="glow"></span><div class="inner"><svg class="big" viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="15" r="13" fill="#F2B85B" opacity=".18"/><path class="fl" d="M20 5c3 4 3.5 7 0 11-3.5-4-3-7 0-11z" fill="#F7D08A"/><path d="M6 22h28c-1.5 6-7 9-14 9S7.5 28 6 22z" fill="#C9883C"/><path d="M14 32h12l-2 3h-8z" fill="#9B6328"/></svg><p>${esc(t)}</p><small>${esc(s)}</small></div></div>`;
}
export function burst(el) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || !el) return;
  const r = el.getBoundingClientRect(),
    b = document.createElement('div');
  b.className = 'burst';
  b.style.left = r.left + r.width / 2 + 'px';
  b.style.top = r.top + r.height / 2 + 'px';
  b.innerHTML = Array.from({ length: 18 }, (_, i) => {
    const a = (i / 18) * Math.PI * 2,
      d = 50 + Math.random() * 70;
    return `<i style="--tx:${Math.cos(a) * d}px;--ty:${Math.sin(a) * d}px;${i % 3 === 0 ? 'background:#F2957A;' : i % 3 === 1 ? 'background:#86D3B5;' : ''}"></i>`;
  }).join('');
  document.body.appendChild(b);
  setTimeout(() => b.remove(), 1200);
}
export function chatDrawer({ title, sub, key, chips, placeholder, form }) {
  const list = key === 'copilot' ? S.copilot : S.chat[key] || [];
  const still = !!$('#overlay .drawer');
  openOverlay(`<aside class="drawer ${still ? 'still' : ''}" role="dialog" aria-label="${esc(title)}"><div class="mhead"><div><h2>${esc(title)}</h2><p>${esc(sub)}</p></div><button class="xbtn" data-act="close" aria-label="Close">${ic('x')}</button></div>
   <div class="chat">${list.map((m, i) => (m.diff ? diffCard(m, i) : `<p class="msg ${m.who} ${m.typing ? 'typing' : ''}">${esc(m.t)}</p>`)).join('') || `<p class="lede">${esc(placeholder)}</p>`}</div>
   <div class="qchips">${chips.map((q) => `<button class="chip" data-act="dchip" data-form="${form}" data-q="${esc(q)}">${esc(q)}</button>`).join('')}</div>
   <form class="askrow" data-form="${form}"><label class="sr" for="dq">Message</label><input class="input" id="dq" placeholder="${esc(placeholder)}" autocomplete="off"><button class="btn btn-gold btn-icon" aria-label="Send">${ic('send')}</button></form></aside>`);
  const c = $('#overlay .chat');
  if (c) c.scrollTop = c.scrollHeight;
}
export function diffCard(m, i) {
  const f = (d, v) => (d.money ? inr(v) : d.date ? fmtLong(v) : esc(v));
  return `<div class="diff"><strong style="color:var(--gold-hi)">${esc(m.reply)}</strong>${m.diff.map((d) => `<span>${esc(d.label)}: ${d.from !== undefined && d.from !== null ? `<s>${f(d, d.from)}</s> → ` : ''}<ins>${f(d, d.to)}</ins></span>`).join('')}
   ${m.state === 'applied' ? '<span class="status st-done">Applied</span>' : m.state === 'discarded' ? '<span class="label">Discarded</span>' : `<div class="flex gap-8 mt-6"><button class="btn btn-gold btn-sm" data-act="apply" data-i="${i}">Apply changes</button><button class="btn btn-ghost btn-sm" data-act="discard" data-i="${i}">Discard</button></div>`}</div>`;
}
export function openCopilot() {
  const ev = S.ev;
  if (!ev) return;
  const add =
    ev.type === 'wedding'
      ? 'Add a mehendi function'
      : ev.type === 'birthday'
        ? 'Add a games hour'
        : 'Add a kolam contest';
  const later = new Date(dateOf(ev.date).getTime() + 7 * DAY).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
  });
  chatDrawer({
    title: 'Ask Utsav',
    sub: 'Change the plan in plain words. Nothing changes until you apply.',
    key: 'copilot',
    chips: ['Cut budget by 15%', add, `Move the event to ${later}`],
    placeholder: 'Tell me what to change',
    form: 'copilot',
  });
}
export async function copilotSend(q) {
  S.copilot.push({ who: 'me', t: q }, { who: 'ai', t: 'Thinking…', typing: true });
  openCopilot();
  try {
    const r = await api(`/api/events/${S.ev.id}/copilot`, { method: 'POST', body: { message: q } });
    S.copilot.pop();
    S.copilot.push(
      r.changes ? { who: 'ai', diff: r.diff, changes: r.changes, reply: r.reply } : { who: 'ai', t: r.reply },
    );
  } catch (e) {
    S.copilot.pop();
    S.copilot.push({ who: 'ai', t: e.message });
  }
  if (S.overlayOpen) openCopilot();
}
export function openAskCat() {
  const c = selCat(),
    key = 'host:' + S.ev.id + ':' + c.id;
  S.chat[key] = S.chat[key] || [];
  chatDrawer({
    title: `Ask Utsav about ${c.name.toLowerCase()}`,
    sub: `Cap ${inr(c.cap)} · ${S.ev.guests} guests · ${S.ev.city}`,
    key,
    chips: ['What is a fair price?', 'How much advance is okay?', 'What should I ask vendors?'],
    placeholder: 'Ask anything about this task',
    form: 'askcat',
  });
}
export async function askCatSend(q) {
  const c = selCat(),
    key = 'host:' + S.ev.id + ':' + c.id,
    list = (S.chat[key] = S.chat[key] || []);
  list.push({ who: 'me', t: q }, { who: 'ai', t: 'Thinking…', typing: true });
  openAskCat();
  try {
    const r = await api(`/api/events/${S.ev.id}/ask`, {
      method: 'POST',
      body: { cat: c.id, message: q, history: list.filter((m) => !m.typing).slice(-6) },
    });
    list.pop();
    list.push({ who: 'ai', t: r.reply });
  } catch (e) {
    list.pop();
    list.push({ who: 'ai', t: e.message });
  }
  if (S.overlayOpen) openAskCat();
}
export async function helperAsk(q) {
  const c = S.h.mine.find((x) => x.id === S.hsel),
    key = 'h:' + c.id;
  const list = (S.chat[key] = S.chat[key] || []);
  list.push({ who: 'me', t: q }, { who: 'ai', t: S.lang === 'ta' ? 'யோசிக்கிறேன்…' : 'Thinking…', typing: true });
  render();
  try {
    const r = await api('/api/h/ask', {
      method: 'POST',
      helper: S.htoken,
      body: { cat: c.id, message: q, lang: S.lang, history: list.filter((m) => !m.typing).slice(-6) },
    });
    list.pop();
    list.push({ who: 'ai', t: r.reply });
  } catch (e) {
    list.pop();
    list.push({ who: 'ai', t: e.message });
  }
  render();
}
export function vendorModal(catId, i) {
  const vd = S.vendors[catId],
    v = vd?.vendors?.[i];
  if (!v) return;
  const helper = S.route.name === 'helper';
  const short = helper
    ? S.h.mine.find((m) => m.id === catId)?.shortlist || []
    : S.ev.cats.find((c) => c.id === catId).shortlist;
  const saved = short.some((s) => s.id === v.id);
  const digits = (v.phone || '').replace(/\D/g, '');
  const wa = digits ? `https://wa.me/${digits.length === 10 ? '91' + digits : digits}` : null;
  openOverlay(`<div class="modal" role="dialog" aria-label="${esc(v.name)}"><div class="vhero"><img src="${esc(v.img)}" alt=""></div>
   <div class="mhead"><div><h2>${esc(v.name)}</h2><p>${v.rating ? `★ ${v.rating} · ${v.reviews} reviews` : 'New on Google'}${v.sample ? ' · <span class="sample-tag">Example</span>' : ''}</p></div><button class="xbtn" data-act="close" aria-label="Close">${ic('x')}</button></div>
   <div class="kv-list"><div>${ic('coins')}<span><b>${esc(v.estimate)}</b> <span class="label">AI estimate, confirm with the vendor</span></span></div>
    <div>${ic('spark')}<span>${esc(v.why || '')}</span></div>${v.address ? `<div>${ic('pin')}<span>${esc(v.address)}</span></div>` : ''}
    <div>${ic('phone')}<span>${v.phone ? `<span class="num select-all">${esc(v.phone)}</span>` : '<span class="label">Phone number shows here for real vendors from Google Maps.</span>'}</span></div></div>
   <div class="vacts">
    ${v.phone ? `<a class="btn btn-teal" href="tel:${esc(v.phone.replace(/\s/g, ''))}">${ic('phone')}Call</a>` : `<button class="btn btn-teal" data-act="callsheet" data-cat="${catId}" data-v="${i}">${ic('phone')}Script</button>`}
    ${wa ? `<a class="btn btn-ghost" href="${wa}" target="_blank" rel="noopener">${ic('chat')}WhatsApp</a>` : `<button class="btn btn-ghost" disabled title="No phone number">${ic('chat')}WhatsApp</button>`}
    <a class="btn btn-ghost" href="${esc(v.maps)}" target="_blank" rel="noopener">${ic('pin')}Maps</a>
    <button class="btn ${saved ? 'btn-gold' : 'btn-ghost'}" data-act="shortlist" data-cat="${catId}" data-i="${i}">${ic(saved ? 'saved' : 'save')}${saved ? 'Saved' : 'Shortlist'}</button></div>
   ${v.phone ? `<button class="btn btn-ghost w-full mt-10" data-act="callsheet" data-cat="${catId}" data-v="${i}">${ic('doc')}Open the call script</button>` : ''}</div>`);
}
export function callSheet(catId, vi) {
  const helper = S.route.name === 'helper',
    lang = helper ? S.lang : 'en',
    L = T[lang];
  const ev = helper ? S.h.event : S.ev,
    c = (helper ? S.h.mine : S.ev.cats).find((x) => x.id === catId);
  const v = vi !== null && vi !== undefined ? S.vendors[catId]?.vendors?.[vi] : null;
  openOverlay(`<div class="modal" role="dialog" aria-label="Call helper"><div class="mhead"><div><p class="label">${lang === 'ta' ? 'அழைப்பு உதவி' : 'Call helper'}</p><h2>${v ? esc(v.name) : esc(lang === 'ta' ? CAT_TA[c.id] || c.name : c.name)}</h2>${v?.phone ? `<p class="num select-all">${esc(v.phone)}</p>` : ''}</div><button class="xbtn" data-act="close" aria-label="Close">${ic('x')}</button></div>
   <div class="script-box"><div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:8px"><b>${lang === 'ta' ? 'பேச வேண்டியது' : 'What to say'}</b><button class="btn btn-ghost btn-sm" data-act="speak" data-lang="${lang === 'ta' ? 'ta-IN' : 'en-IN'}">${ic('sound')}${lang === 'ta' ? 'படித்துக் காட்டு' : 'Read aloud'}</button></div><p class="m-0" id="script">${esc(L.script(ev, c.name, c.id))}</p></div>
   <p style="margin:16px 0 8px;font-weight:500">${lang === 'ta' ? 'கேட்கும்போது டிக் செய்யுங்கள்' : 'Tick as you ask'}</p>
   <div class="chips">${L.qs(fmtD(ev.date))
     .map((q) => `<button class="chip" data-act="tick" aria-pressed="false">${esc(q)}</button>`)
     .join('')}</div>
   <div class="field mt-16"><label for="cq">${L.quote}</label><input class="input num" id="cq" inputmode="numeric" placeholder="${c.id === 'food' ? `per plate × ${ev.guests}` : 'e.g. 45000'}"></div>
   <div class="flex gap-10 mt-16 wrap">${v?.phone ? `<a class="btn btn-teal" href="tel:${esc(v.phone.replace(/\s/g, ''))}">${ic('phone')}${L.call}</a>` : ''}<button class="btn btn-gold flex-1" data-act="savequote" data-cat="${catId}">${L.save}</button></div></div>`);
}
export function addHelperModal(catId) {
  const ev = S.ev,
    existing = Object.entries(ev.helpers).filter(([, h]) => !h.revoked);
  const def = catId || (ev.cats.find((c) => !c.lead) || ev.cats[0]).id;
  openOverlay(`<div class="modal" role="dialog" aria-label="Add helper"><div class="mhead"><div><h2>${catId ? 'Assign a helper' : 'Add helper'}</h2><p>They get a private link. No sign-up, works on any phone.</p></div><button class="xbtn" data-act="close" aria-label="Close">${ic('x')}</button></div>
   <form class="grid gap-14" data-form="helper">
    ${existing.length ? `<div class="field"><label for="ah-who">Who</label><select class="input" id="ah-who"><option value="">Someone new</option>${existing.map(([id, h]) => `<option value="${id}">${esc(h.name)}</option>`).join('')}</select></div>` : ''}
    <div class="grid gap-14" id="ah-new">
     <div class="field"><label for="ah-name">Name</label><input class="input" id="ah-name" maxlength="40" placeholder="Uncle Ravi"></div>
     <div class="field"><label for="ah-rel">Relation</label><input class="input" id="ah-rel" maxlength="30" placeholder="Uncle (maternal)"></div>
     <div class="field"><label for="ah-lang">Guide language</label><select class="input" id="ah-lang"><option value="en">English</option><option value="ta">Tamil (தமிழ்)</option></select></div></div>
    <div class="field"><label for="ah-cat">Category</label><select class="input" id="ah-cat">${ev.cats.map((c) => `<option value="${c.id}" ${c.id === def ? 'selected' : ''}>${esc(c.name)}${c.lead && ev.helpers[c.lead] ? ` · now ${esc(ev.helpers[c.lead].name)}` : ''}</option>`).join('')}</select></div>
    <p class="note bad" id="ah-err" hidden></p>
    <button class="btn btn-coral">${ic('plus')}Save and get link</button></form></div>`);
}
export function linkFor(tok) {
  return `${location.origin}${location.pathname}#/h/${tok}`;
}
export function inviteText(h, tok) {
  const ev = S.ev,
    mine =
      ev.cats
        .filter((c) => c.lead === h.id)
        .map((c) => c.name.toLowerCase())
        .join(' and ') || 'a task';
  return h.lang === 'ta'
    ? `வணக்கம் ${h.name}! ${ev.title} (${fmtLong(ev.date)}) நிகழ்ச்சியில் ${mine} பொறுப்பை நீங்கள் பார்த்துக்கொள்கிறீர்கள். உங்கள் வழிகாட்டி இங்கே (லாகின் தேவையில்லை): ${linkFor(tok)}`
    : `Vanakkam ${h.name}! You're helping with the ${mine} for ${ev.title} on ${fmtLong(ev.date)}. Your step-by-step guide is here, no login needed: ${linkFor(tok)}`;
}
export function linkReady(hid, tok) {
  const h = { id: hid, ...S.ev.helpers[hid] };
  openOverlay(`<div class="modal" role="dialog" aria-label="Link ready"><div class="mhead"><div><h2>Link ready for ${esc(h.name)}</h2><p>Send it on WhatsApp. Anyone with this link can update ${esc(h.name)}’s task, so share it only with them.</p></div><button class="xbtn" data-act="close" aria-label="Close">${ic('x')}</button></div>
   <input class="input mb-14" readonly value="${esc(linkFor(tok))}" id="lnk">
   <div class="flex gap-10 wrap"><a class="btn btn-teal flex-1" href="https://wa.me/?text=${encodeURIComponent(inviteText(h, tok))}" target="_blank" rel="noopener">${ic('chat')}Share on WhatsApp</a>
   <button class="btn btn-ghost" data-act="copytxt" data-target="lnk">${ic('copy')}Copy link</button><a class="btn btn-ghost" href="#/h/${tok}" target="_blank" rel="noopener">${ic('eye')}Open their view</a></div></div>`);
}
export async function ensureToken(hid) {
  const t = tokenFor(S.ev.id, hid);
  if (t) return t;
  const r = await api(`/api/events/${S.ev.id}/helpers`, {
    method: 'POST',
    body: { helperId: hid, name: S.ev.helpers[hid].name },
  });
  saveToken(S.ev.id, hid, r.token);
  S.ev = r.event;
  return r.token;
}
export function summaryText(ev) {
  return `*${ev.title}*\n${fmtLong(ev.date)} · ${ev.city} · ${ev.guests} guests\nBudget ${inr(ev.budget)} · ${readyOf(ev.cats)}% ready\n\n${ev.cats
    .map((c) => {
      const L = lead(ev, c);
      return `${pct(c) === 100 ? '✅' : '⏳'} ${c.name}: ${L ? L.name : 'needs a helper'} · ${pct(c)}% · due ${fmtD(c.due)}`;
    })
    .join('\n')}\n\nPlanned with Utsav AI`;
}
export function summaryModal() {
  const ev = S.ev,
    t = summaryText(ev);
  $('#print').innerHTML =
    `<h1>${esc(ev.title)}</h1><p>${fmtLong(ev.date)} · ${esc(ev.city)} · ${ev.guests} guests · Budget ${inr(ev.budget)}</p>${ev.cats.map((c) => `<h2>${esc(c.name)} · cap ${inr(c.cap)} · due ${fmtD(c.due)}</h2><ul>${c.steps.map((s) => `<li>${s.done ? '☑' : '☐'} ${esc(s.t)}</li>`).join('')}</ul>`).join('')}<p>Planned with Utsav AI</p>`;
  openOverlay(`<div class="modal" role="dialog" aria-label="Share summary"><div class="mhead"><div><h2>Share summary</h2><p>Paste it into the family group.</p></div><button class="xbtn" data-act="close" aria-label="Close">${ic('x')}</button></div>
   <textarea class="input" id="sumtxt" readonly style="min-height:220px">${esc(t)}</textarea>
   <div class="flex gap-10 mt-14 wrap"><button class="btn btn-gold" data-act="copytxt" data-target="sumtxt">${ic('copy')}Copy text</button><a class="btn btn-teal" href="https://wa.me/?text=${encodeURIComponent(t)}" target="_blank" rel="noopener">${ic('chat')}Open WhatsApp</a><button class="btn btn-ghost" data-act="print">${ic('doc')}Save as PDF</button></div></div>`);
}
export function resourceModal(catId, r) {
  const c = S.ev.cats.find((x) => x.id === catId),
    L = T.en;
  const body =
    r === 'check'
      ? `<ol class="grid gap-8 pl-20 m-0">${c.steps.map((s) => `<li${s.done ? ' style="color:var(--dim);text-decoration:line-through"' : ''}>${esc(s.t)}</li>`).join('')}</ol>`
      : r === 'flags'
        ? `<div class="flags">${(FLAGS[c.id] || FLAGS.food).en.map((f) => `<div class="flag"><span>${ic('alert')}</span>${esc(f)}</div>`).join('')}</div>`
        : `<ul class="grid gap-8 pl-20 m-0">${L.qs(fmtD(S.ev.date))
            .map((q) => `<li>${esc(q)}</li>`)
            .join('')}</ul><div class="script-box mt-14">${esc(L.script(S.ev, c.name))}</div>`;
  openOverlay(
    `<div class="modal" role="dialog"><div class="mhead"><div><h2>${esc(c.name)}: ${r === 'check' ? 'checklist' : r === 'flags' ? 'red flags' : 'questions to ask'}</h2></div><button class="xbtn" data-act="close" aria-label="Close">${ic('x')}</button></div>${body}</div>`,
  );
}
