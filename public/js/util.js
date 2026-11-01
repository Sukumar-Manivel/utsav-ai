// Small browser helpers shared by every view: escaping, money and date formatting,
// icons, local storage and progress maths. Pure functions, no DOM state.
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const esc = (s) =>
  String(s ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
export const inr = (n) => '₹' + Math.round(Number(n) || 0).toLocaleString('en-IN');
export const inrShort = (n) =>
  n >= 1e7 ? `₹${+(n / 1e7).toFixed(2)} Cr` : n >= 1e5 ? `₹${+(n / 1e5).toFixed(1)} L` : inr(n);
export const DAY = 864e5;
export const todayISO = (o = 0) => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + o);
  return d.toLocaleDateString('en-CA');
};
export const dateOf = (iso) => new Date(iso + 'T00:00:00');
export const daysLeft = (iso) => Math.round((dateOf(iso) - dateOf(todayISO())) / DAY);
export const fmtD = (iso) => dateOf(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
export const fmtLong = (iso) =>
  dateOf(iso).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
export const ic = (n, cls = '') => `<svg class="ico ${cls}" aria-hidden="true"><use href="#i-${n}"/></svg>`;
export const initials = (n) =>
  String(n || '?')
    .replace(/^(Uncle|Aunt|Chithi|Chithappa|Cousin)\s+/i, '')
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
export const ls = {
  get(k, d) {
    try {
      const v = localStorage.getItem(k);
      return v ? JSON.parse(v) : d;
    } catch {
      return d;
    }
  },
  set(k, v) {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch {
      /* storage blocked */
    }
  },
};
export const randHex = (n) =>
  [...crypto.getRandomValues(new Uint8Array(n))].map((b) => b.toString(16).padStart(2, '0')).join('');

export const TYPE_LABEL = { wedding: 'Wedding', birthday: 'Birthday', community: 'Community event' };
export const TYPE_ICON = { wedding: 'rings', birthday: 'cake', community: 'people' };
export const PILL_ICON = {
  venue: 'doc',
  guests: 'send',
  transport: 'transport',
  food: 'doc',
  decor: 'decor',
  entertainment: 'entertainment',
  photos: 'photos',
  music: 'music',
};
export const RING_COL = { ok: '#86D3B5', done: '#86D3B5', soon: '#E9C98A', late: '#F0957A' };
export const STATUS_WORD = { ok: 'On track', done: 'Done', soon: 'Due soon', late: 'Overdue' };

export const pct = (c) =>
  c.steps.length ? Math.round((c.steps.filter((s) => s.done).length / c.steps.length) * 100) : 0;
export const readyOf = (cats) => {
  let d = 0,
    t = 0;
  cats.forEach((c) => {
    t += c.steps.length;
    d += c.steps.filter((s) => s.done).length;
  });
  return t ? Math.round((d / t) * 100) : 0;
};
export const status = (c) => {
  const p = c.pct ?? pct(c);
  if (p === 100) return 'done';
  const l = daysLeft(c.due);
  return l < 0 ? 'late' : l <= 7 ? 'soon' : 'ok';
};
export const nextIdx = (c) => c.steps.findIndex((s) => !s.done);
