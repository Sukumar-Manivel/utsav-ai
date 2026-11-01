/* Utsav AI — single-page app. Hash routes:
   #/              landing            #/new         plan wizard
   #/events        host's events      #/e/:id/:view host (orbit | budget | timeline | family)
   #/h/:token/:tab helper app (today | steps | vendors | ask)                                  */
import './js/actions.js'; // registers every click, key and form handler
import { api } from './js/api.js';
import { poll } from './js/live.js';
import { closeOverlay } from './js/overlays.js';
import { fitStage, render, route } from './js/router.js';
import { S } from './js/state.js';
import { loadFirebase } from './js/auth.js';
import { $ } from './js/util.js';

async function init() {
  starfield();
  try {
    S.cfg = await api('/api/config');
  } catch {
    /* keep defaults */
  }
  addEventListener('hashchange', async () => {
    S.menu = false;
    closeOverlay();
    await route();
    scrollTo(0, 0);
    // tell screen readers the page changed: focus the main area (its h1 is read first)
    $('#app')?.focus({ preventScroll: true });
  });
  addEventListener('resize', () => {
    const m = innerWidth < 1100;
    if (m !== S.isM) {
      S.isM = m;
      render();
    } else fitStage();
  });
  route();
  if (S.cfg.firebase) loadFirebase();
  setInterval(poll, 8000);
}
function starfield() {
  const box = $('#stars');
  let h = '';
  for (let i = 0; i < 110; i++) {
    const r = ((i * 7919) % 97) / 97;
    h += `<i style="left:${(i * 37.3) % 100}%;top:${(i * 53.7 + i * i * 0.7) % 100}%;width:${(0.8 + r * 1.9).toFixed(1)}px;height:${(0.8 + r * 1.9).toFixed(1)}px;${i % 5 === 0 ? 'background:#FFE1B5;' : ''}box-shadow:0 0 ${(2 + r * 5) | 0}px ${i % 5 === 0 ? '#FFE1B5' : '#EDE9FF'};--d:${(2.4 + r * 4).toFixed(1)}s;--dl:${((i * 0.31) % 5).toFixed(2)}s"></i>`;
  }
  box.innerHTML = h;
}

init();
