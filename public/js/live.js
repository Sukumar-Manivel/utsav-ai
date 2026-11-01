// Live updates: polls the plan every few seconds and re-renders when a helper or host changes something.
import { api } from './api.js';
import { toast } from './overlays.js';
import { render, renderError } from './router.js';
import { S } from './state.js';

export async function poll() {
  if (document.hidden || S.overlayOpen || ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName))
    return;
  try {
    if (S.route.name === 'host' && S.ev) {
      const r = (await api(`/api/events/${S.ev.id}`)).event;
      if (r.updatedAt !== S.ev.updatedAt) {
        const fresh = r.activity.slice(S.ev.activity.length);
        S.ev = r;
        render();
        if (fresh.length) toast(fresh[fresh.length - 1].t);
      }
    } else if (S.route.name === 'helper' && S.h) {
      const r = await api('/api/h/me', { helper: S.htoken });
      if (JSON.stringify(r) !== JSON.stringify(S.h)) {
        S.h = r;
        render();
      }
    }
  } catch (e) {
    if (S.route.name === 'helper' && e.code === 'LINK_INACTIVE') renderError(e, 'helper');
  }
}
