// Event delegation: every click, submit, input and key press is routed by its data-act attribute.
/* global firebase */
import { signIn } from './auth.js';
import { api } from './api.js';
import { CAT_TA, FLAGS, T } from './i18n.js';
import {
  addHelperModal,
  askCatSend,
  burst,
  callSheet,
  closeOverlay,
  copilotSend,
  ensureToken,
  helperAsk,
  inviteText,
  linkFor,
  linkReady,
  openAskCat,
  openCopilot,
  openOverlay,
  resourceModal,
  summaryModal,
  toast,
  trapTab,
  vendorModal,
} from './overlays.js';
import { avatar, render, route } from './router.js';
import { S, saveToken, tokenFor, tokens } from './state.js';
import { $, $$, esc, fmtLong, ic, inr, ls, nextIdx, pct } from './util.js';
import { createPlan, wizDefault, wizValid } from './views/wizard.js';
import { getTradition } from '../traditions.js';

export async function hostOp(op, opts = {}) {
  try {
    const r = await api(`/api/events/${S.ev.id}/op`, { method: 'POST', body: op });
    S.ev = r.event;
    if (!opts.silent) render();
    return true;
  } catch (e) {
    toast(e.message, true);
    try {
      S.ev = (await api(`/api/events/${S.ev.id}`)).event;
      render();
    } catch {
      /* ignore */
    }
    return false;
  }
}
export async function helperOp(op) {
  try {
    S.h = await api('/api/h/op', { method: 'POST', helper: S.htoken, body: op });
    render();
    return true;
  } catch (e) {
    toast(e.message, true);
    return false;
  }
}
export function optimisticStep(cats, catId, i, done) {
  const c = cats.find((x) => x.id === catId);
  if (c) c.steps[i].done = done ?? !c.steps[i].done;
  return c;
}

document.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-act]');
  if (!b) {
    if (S.menu && !e.target.closest('.menu')) {
      S.menu = false;
      render();
    }
    return;
  }
  const a = b.dataset.act,
    d = b.dataset;
  switch (a) {
    case 'close':
      closeOverlay();
      break;
    case 'skip':
      e.preventDefault();
      $('#app').focus();
      break;
    case 'retry':
      route();
      break;
    case 'home':
      location.hash = '#/';
      break;
    case 'signin':
      signIn();
      break;
    case 'signout':
      try {
        await firebase.auth().signOut();
        toast('Signed out');
      } catch {
        /* ignore */
      }
      S.menu = false;
      render();
      break;
    case 'sample': {
      b.disabled = true;
      const last = ls.get('utsav-sample', null);
      if (last) {
        try {
          await api(`/api/events/${last}`);
          location.hash = `#/e/${last}/orbit`;
          break;
        } catch {
          /* make a new one */
        }
      }
      try {
        const r = await api('/api/events/sample', { method: 'POST' });
        ls.set('utsav-sample', r.id);
        location.hash = `#/e/${r.id}/orbit`;
      } catch (err) {
        toast(err.message, true);
        b.disabled = false;
      }
      break;
    }
    case 'menu':
      S.menu = !S.menu;
      render();
      break;
    case 'sel':
      S.sel = d.cat;
      S.ptab = 'plan';
      S.prevTab = 0;
      render();
      break;
    case 'ptab':
      S.ptab = d.t;
      render();
      break;
    case 'step': {
      const c = optimisticStep(S.ev.cats, d.cat, +d.i);
      render();
      if (c.steps[+d.i].done) {
        burst(document.querySelector(`[data-act="step"][data-cat="${d.cat}"][data-i="${d.i}"]`));
      }
      hostOp({ type: 'toggleStep', cat: d.cat, i: +d.i, done: c.steps[+d.i].done }, { silent: true });
      break;
    }
    case 'marknext': {
      const c = S.ev.cats.find((x) => x.id === d.cat),
        n = nextIdx(c);
      if (n < 0) break;
      burst(b);
      c.steps[n].done = true;
      render();
      toast(pct(c) === 100 ? `${c.name} is complete` : `Done: ${c.steps[n].t}`);
      hostOp({ type: 'toggleStep', cat: c.id, i: n, done: true }, { silent: true });
      break;
    }
    case 'vendor':
      vendorModal(d.cat, +d.i);
      break;
    case 'reloadv':
      delete S.vendors[d.cat];
      render();
      break;
    case 'shortlist': {
      const v = S.vendors[d.cat].vendors[+d.i];
      const op = {
        type: 'shortlist',
        cat: d.cat,
        vendor: { id: v.id, name: v.name, rating: v.rating, phone: v.phone, maps: v.maps },
      };
      const ok = S.route.name === 'helper' ? await helperOp(op) : await hostOp(op);
      if (ok) {
        vendorModal(d.cat, +d.i);
        toast('Shortlist updated');
      }
      break;
    }
    case 'callsheet':
      callSheet(d.cat, d.v !== undefined ? +d.v : null);
      break;
    case 'speak': {
      try {
        const u = new SpeechSynthesisUtterance($('#script').textContent);
        u.lang = d.lang;
        u.rate = 0.92;
        speechSynthesis.cancel();
        speechSynthesis.speak(u);
      } catch {
        toast('Read aloud is not available in this browser.', true);
      }
      break;
    }
    case 'tick':
      b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') !== 'true');
      break;
    case 'savequote': {
      const v = Math.round(Number(($('#cq').value || '').replace(/[^\d]/g, '')));
      if (!v) {
        toast('Enter the quote amount first.', true);
        break;
      }
      const op = { type: 'setQuote', cat: d.cat, amount: v };
      if (S.route.name === 'helper' ? await helperOp(op) : await hostOp(op)) {
        closeOverlay();
        toast(`Saved ${inr(v)}`);
      }
      break;
    }
    case 'res':
      resourceModal(d.cat, d.r);
      break;
    case 'copilot':
      S.menu = false;
      openCopilot();
      break;
    case 'askcat':
      openAskCat();
      break;
    case 'dchip':
      d.form === 'copilot' ? copilotSend(d.q) : askCatSend(d.q);
      break;
    case 'apply': {
      const m = S.copilot[+d.i];
      try {
        const r = await api(`/api/events/${S.ev.id}/copilot/apply`, { method: 'POST', body: { changes: m.changes } });
        S.ev = r.event;
        m.state = 'applied';
        render();
        openCopilot();
        toast('Changes applied');
      } catch (err) {
        toast(err.message, true);
      }
      break;
    }
    case 'discard':
      S.copilot[+d.i].state = 'discarded';
      openCopilot();
      break;
    case 'summary':
      S.menu = false;
      summaryModal();
      break;
    case 'print':
      window.print();
      break;
    case 'copytxt': {
      const el = $('#' + d.target);
      try {
        await navigator.clipboard.writeText(el.value);
        toast('Copied');
      } catch {
        el.select();
        toast('Selected. Press Ctrl+C to copy.');
      }
      break;
    }
    case 'hide':
      hostOp({ type: 'hideBudget', value: !S.ev.hideBudget });
      break;
    case 'addhelper':
      S.menu = false;
      addHelperModal(d.cat);
      break;
    case 'assign':
      addHelperModal(d.cat);
      break;
    case 'helper':
      S.route.view !== 'family' ? (location.hash = `#/e/${S.ev.id}/family`) : null;
      break;
    case 'wa': {
      const w = window.open('', '_blank');
      try {
        const t = await ensureToken(d.h);
        const url = `https://wa.me/?text=${encodeURIComponent(inviteText({ id: d.h, ...S.ev.helpers[d.h] }, t))}`;
        if (w) w.location = url;
        else location.href = url;
        render();
      } catch (err) {
        w?.close();
        toast(err.message, true);
      }
      break;
    }
    case 'copylink': {
      try {
        const t = await ensureToken(d.h);
        await navigator.clipboard.writeText(linkFor(t));
        toast('Link copied');
        render();
      } catch {
        const t = tokenFor(S.ev.id, d.h);
        if (t) linkReady(d.h, t);
      }
      break;
    }
    case 'openview': {
      const w = window.open('', '_blank');
      try {
        const t = await ensureToken(d.h);
        if (w) w.location = linkFor(t);
        else location.hash = `#/h/${t}`;
        render();
      } catch (err) {
        w?.close();
        toast(err.message, true);
      }
      break;
    }
    case 'newlink': {
      try {
        const r = await api(`/api/events/${S.ev.id}/helpers`, {
          method: 'POST',
          body: { helperId: d.h, name: S.ev.helpers[d.h].name },
        });
        saveToken(S.ev.id, d.h, r.token);
        S.ev = r.event;
        render();
        linkReady(d.h, r.token);
      } catch (err) {
        toast(err.message, true);
      }
      break;
    }
    case 'revoke': {
      try {
        const r = await api(`/api/events/${S.ev.id}/helpers/${d.h}`, { method: 'DELETE' });
        S.ev = r.event;
        const t = tokens();
        if (t[S.ev.id]) delete t[S.ev.id][d.h];
        ls.set('utsav-tokens', t);
        render();
        toast('Link removed. It no longer works.');
      } catch (err) {
        toast(err.message, true);
      }
      break;
    }
    // wizard
    case 'wtype':
      S.w = { ...wizDefault(d.v), title: S.w.title, city: S.w.city, date: S.w.date };
      render();
      break;
    case 'wtrad': {
      const t = getTradition(S.w.type, d.v);
      S.w.tradition = t.id;
      if (t.funcs.length) S.w.funcs = t.funcs.map((f) => f.name);
      render();
      break;
    }
    case 'wown': {
      const v = (S.w.own || '').trim().slice(0, 40);
      if (v && !S.w.funcs.some((f) => f.toLowerCase() === v.toLowerCase())) S.w.funcs.push(v);
      S.w.own = '';
      render();
      $('#w-own')?.focus();
      break;
    }
    case 'wchip': {
      const arr = S.w[d.k],
        i = arr.indexOf(d.v);
      i < 0 ? arr.push(d.v) : arr.splice(i, 1);
      render();
      break;
    }
    case 'wvibe':
      S.w.vibe = d.v;
      render();
      break;
    case 'wback':
      S.wstep = Math.max(0, S.wstep - 1);
      render();
      break;
    // helper
    case 'lang':
      S.lang = d.l;
      ls.set('utsav-lang-' + S.h.me.id, d.l);
      render();
      break;
    case 'hsel':
      S.hsel = d.cat;
      render();
      break;
    case 'hstep': {
      const c = optimisticStep(S.h.mine, d.cat, +d.i);
      render();
      if (c.steps[+d.i].done) burst($(`[data-act="hstep"][data-i="${d.i}"]`));
      helperOp({ type: 'toggleStep', cat: d.cat, i: +d.i, done: c.steps[+d.i].done });
      break;
    }
    case 'hmarknext': {
      const c = S.h.mine.find((x) => x.id === d.cat),
        n = nextIdx(c);
      if (n < 0) break;
      burst(b);
      c.steps[n].done = true;
      render();
      toast(S.lang === 'ta' ? 'முடிந்தது! குடும்பத்தினர் இதைப் பார்க்கலாம்.' : `Done. The family can see it.`);
      helperOp({ type: 'toggleStep', cat: c.id, i: n, done: true });
      break;
    }
    case 'hsave': {
      const q = Math.round(Number(($('#hq').value || '').replace(/[^\d]/g, ''))) || 0,
        nt = $('#hn').value;
      const ok1 = await helperOp({ type: 'setQuote', cat: d.cat, amount: q });
      const ok2 = ok1 && (await helperOp({ type: 'setNotes', cat: d.cat, text: nt }));
      if (ok2) toast(S.lang === 'ta' ? 'சேமிக்கப்பட்டது' : 'Saved. The host can see it.');
      break;
    }
    case 'hchip':
      helperAsk(T[S.lang].chips[+d.i]);
      break;
    case 'vfilter':
      S.vfilter = d.f;
      render();
      break;
    case 'hflags': {
      const c = S.h.mine.find((x) => x.id === S.hsel);
      const ta = S.lang === 'ta';
      openOverlay(
        `<div class="modal hxm" role="dialog" aria-label="Watch out"><div class="mhead"><div><h2>${ta ? 'இவற்றைக் கவனியுங்கள்' : 'Watch out for these'}</h2><p>${ta ? 'விலை பேசும் முன் இவற்றைக் கேளுங்கள்.' : 'Check these before you agree to a price.'}</p></div><button class="xbtn" data-act="close" aria-label="Close">${ic('x')}</button></div><div class="hx-grp">${(FLAGS[c.id] || FLAGS.food)[S.lang].map((f) => `<div class="hx-row">${ic('alert', 'sa')}<span class="t"><b class="fw-500">${esc(f)}</b></span></div>`).join('')}</div></div>`,
      );
      break;
    }
    case 'hfamily': {
      const L2 = T[S.lang];
      openOverlay(
        `<div class="modal hxm" role="dialog" aria-label="Family"><div class="mhead"><div><h2>${L2.family}</h2><p>${L2.view}</p></div><button class="xbtn" data-act="close" aria-label="Close">${ic('x')}</button></div><div class="hx-grp">${S.h.team.map((t) => `<div class="hx-row">${avatar(t.lead, 40)}<span class="t"><b>${esc(t.lead?.name || (S.lang === 'ta' ? 'யாருமில்லை' : 'Open'))}</b><small>${esc(S.lang === 'ta' ? CAT_TA[t.id] || t.name : t.name)} · <span class="st-${t.status}">${L2.words[t.status]}</span></small></span><b class="num">${t.pct}%</b>${ic('lock', 'ch')}</div>`).join('')}</div>${
          S.h.activity.length
            ? `<div class="hx-lab"><span>${S.lang === 'ta' ? 'சமீபத்தியவை' : 'Recent'}</span></div><div class="hx-grp">${S.h.activity
                .slice(0, 4)
                .map(
                  (a) =>
                    `<div class="hx-row">${ic('spark', 'sa')}<span class="t"><b class="fw-500">${esc(a.t)}</b></span></div>`,
                )
                .join('')}</div>`
            : ''
        }</div>`,
      );
      break;
    }
    case 'jump':
      e.preventDefault();
      $('#' + d.to)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      $$('.bnav button').forEach((x) => x.toggleAttribute('aria-current', x === b));
      break;
    case 'mic': {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SR) break;
      const rec = new SR();
      rec.lang = S.lang === 'ta' ? 'ta-IN' : 'en-IN';
      rec.interimResults = false;
      rec.onresult = (ev) => {
        const t = ev.results[0][0].transcript;
        if (t) helperAsk(t);
      };
      rec.onerror = () =>
        toast(
          S.lang === 'ta' ? 'மைக் வேலை செய்யவில்லை' : 'The microphone did not work. Type your question instead.',
          true,
        );
      try {
        rec.start();
        toast(S.lang === 'ta' ? 'பேசுங்கள்…' : 'Listening…');
      } catch {
        /* already running */
      }
      break;
    }
  }
});

document.addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.target.dataset.form;
  if (f === 'wiz') {
    const err = wizValid();
    const box = $('#w-err');
    if (err) {
      box.hidden = false;
      box.textContent = err;
      return;
    }
    if (S.wstep < 4) {
      S.wstep++;
      render();
      scrollTo(0, 0);
    } else createPlan();
  }
  if (f === 'copilot' || f === 'askcat') {
    const v = $('#dq').value.trim();
    if (v) (f === 'copilot' ? copilotSend : askCatSend)(v);
  }
  if (f === 'hask') {
    const v = $('#hask').value.trim();
    if (v) helperAsk(v);
  }
  if (f === 'helper') {
    const who = $('#ah-who')?.value || '',
      cat = $('#ah-cat').value,
      err = $('#ah-err');
    try {
      if (who) {
        await hostOp({ type: 'assign', cat, helper: who });
        closeOverlay();
        toast(`${S.ev.helpers[who].name} now leads ${S.ev.cats.find((c) => c.id === cat).name.toLowerCase()}`);
      } else {
        const name = $('#ah-name').value.trim();
        if (!name) {
          err.hidden = false;
          err.textContent = 'Enter the helper’s name.';
          return;
        }
        const r = await api(`/api/events/${S.ev.id}/helpers`, {
          method: 'POST',
          body: { name, rel: $('#ah-rel').value.trim(), lang: $('#ah-lang').value, cat },
        });
        saveToken(S.ev.id, r.helperId, r.token);
        S.ev = r.event;
        render();
        linkReady(r.helperId, r.token);
      }
    } catch (ex) {
      err.hidden = false;
      err.textContent = ex.message;
    }
  }
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.target.id === 'w-own') {
    e.preventDefault();
    $('[data-act="wown"]')?.click();
  }
});
document.addEventListener('input', (e) => {
  const t = e.target;
  if (t.dataset.w && S.w) {
    const k = t.dataset.w;
    S.w[k] = t.type === 'range' ? Number(t.value) : t.value;
    const set = (id, v) => {
      const el = $('#' + id);
      if (el) el.textContent = v;
    };
    if (k === 'guests') {
      set('v-guests', t.value);
      set('s-guests', t.value);
    }
    if (k === 'budget') {
      set('v-budget', inr(t.value));
      set('s-budget', inr(t.value));
    }
    if (k === 'guests' || k === 'budget') set('s-per', inr(S.w.budget / S.w.guests));
    if (k === 'city') set('s-city', t.value);
    if (k === 'date' && t.value) set('s-date', fmtLong(t.value));
  }
  if (t.id === 'ah-who') {
    $('#ah-new').hidden = !!t.value;
  }
});
document.addEventListener('change', (e) => {
  const t = e.target;
  if (t.dataset.w === 'sub') S.w.sub = t.value;
  if (t.dataset.cap) {
    const v = Math.round(Number(t.value.replace(/[^\d]/g, ''))) || 0;
    hostOp({ type: 'setCap', cat: t.dataset.cap, amount: v });
  }
  if (t.dataset.notes)
    hostOp({ type: 'setNotes', cat: t.dataset.notes, text: t.value }, { silent: true }).then(
      (ok) => ok && toast('Notes saved'),
    );
  if (t.dataset.quote)
    hostOp({ type: 'setQuote', cat: t.dataset.quote, amount: Number(t.value.replace(/[^\d]/g, '')) || 0 });
  if (t.dataset.assign !== undefined && t.dataset.assign)
    hostOp({ type: 'assign', cat: t.dataset.assign, helper: t.value || null });
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Tab' && S.overlayOpen) trapTab(e);
  if (e.key === 'Escape') {
    if (S.overlayOpen) closeOverlay();
    else if (S.menu) {
      S.menu = false;
      render();
    }
  }
});
