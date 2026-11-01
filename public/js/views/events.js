// "My celebrations": the plans saved for this browser or Google account.
import { api } from '../api.js';
import { afterRender, dialArt, logo, ring } from '../router.js';
import { S } from '../state.js';
import { $, esc, fmtLong, ic } from '../util.js';

export function viewEvents() {
  const list = S.evList;
  return `<div class="page"><header class="topbar">${logo()}
   <nav class="flex gap-10 wrap">${S.cfg.firebase && !S.fbUser ? `<button class="btn btn-ghost btn-sm" data-act="signin">${ic('google')}Continue with Google</button>` : ''}<a class="btn btn-gold btn-sm" href="#/new">${ic('plus')}New plan</a></nav></header>
   <h1 class="h-serif fs-44 mt-36">Your celebrations</h1>
   <p class="lede">${S.fbUser ? `Signed in as ${esc(S.fbUser.displayName || S.fbUser.email)}.` : 'Plans you made in this browser. Sign in with Google to open them on other devices.'}</p>
   ${
     !list
       ? `<div class="evlist">${[0, 1].map(() => '<div class="skel" style="height:92px;border-radius:999px"></div>').join('')}</div>`
       : list.length
         ? `<div class="evlist">${list.map((e) => `<a class="evcard glass" href="#/e/${e.id}/orbit"><span class="mini"><span class="planet block">${e.hero ? `<img src="${esc(e.hero)}" alt="">` : dialArt(e.type)}</span></span><span class="flex-1 min-w-0"><b>${esc(e.title)}</b><small>${fmtLong(e.date)} · ${esc(e.city)}</small></span><span class="ring" style="position:relative;width:50px;height:50px;display:grid;place-items:center">${ring('ev' + e.id, e.ready, '#86D3B5')}<span style="position:absolute;font-size:12px">${e.ready}%</span></span></a>`).join('')}</div>`
         : `<div class="panel empty" style="margin-top:26px;max-width:560px"><h2>No plans yet</h2><p>Start a new plan, or open the sample to see how it works.</p><div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap"><a class="btn btn-coral" href="#/new">Start my plan</a><button class="btn btn-ghost" data-act="sample">Open the sample</button></div></div>`
   }
  </div>`;
}
export async function loadEvents() {
  S.evList = undefined;
  try {
    S.evList = (await api('/api/events')).events;
  } catch {
    S.evList = [];
  }
  if (S.route.name === 'events') {
    $('#app').innerHTML = viewEvents();
    afterRender();
  }
}
