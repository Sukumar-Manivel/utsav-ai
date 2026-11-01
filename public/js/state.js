// Shared app state (one object) and the helper link tokens this browser created.
import { ls, randHex } from './util.js';

export const S = {
  cfg: { ai: false, places: false, firebase: null },
  fbUser: null,
  hostKey: ls.get('utsav-host-key', null),
  route: { name: 'landing' },
  isM: innerWidth < 1100,
  ev: null,
  sel: null,
  ptab: 'plan',
  prevTab: 0,
  introFor: null,
  menu: false,
  vendors: {},
  vgen: 0,
  h: null,
  htoken: null,
  hsel: null,
  lang: 'en',
  chat: {},
  copilot: [],
  w: null,
  wstep: 0,
  overlayOpen: false,
  prevRing: {},
};
if (!S.hostKey) {
  S.hostKey = randHex(24);
  ls.set('utsav-host-key', S.hostKey);
}
export const tokens = () => ls.get('utsav-tokens', {});
export const saveToken = (eid, hid, tok) => {
  const t = tokens();
  (t[eid] = t[eid] || {})[hid] = tok;
  ls.set('utsav-tokens', t);
};
export const tokenFor = (eid, hid) => tokens()[eid]?.[hid] || null;
