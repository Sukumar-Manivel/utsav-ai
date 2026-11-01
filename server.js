// Utsav AI server: JSON API under /api and the static single-page app.
// Every write goes through applyOp() in lib/plan.js, so permissions live in one place.
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  validateInput, buildPlan, samplePlan, newId, sha256, isOwner, applyOp, OpError,
  redactForHelper, publicHostView, ruleCopilot, applyCopilotChanges, cannedAnswer, readyPct,
} from './lib/plan.js';
import { initStore, storeMode, getEvent, saveEvent, listEvents, getToken, setToken, deleteToken } from './lib/store.js';
import { initAI, aiEnabled, placesEnabled, aiPlan, aiCopilot, aiHelperAnswer, findVendors } from './lib/ai.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 8080;
const PROJECT = process.env.GOOGLE_CLOUD_PROJECT || process.env.FIREBASE_PROJECT_ID || '';

// ---------- Firebase Admin (verifies Google sign-in tokens, Firestore) ----------
let fbApp = null, fbAuth = null;
if (PROJECT) {
  try {
    const { initializeApp } = await import('firebase-admin/app');
    const { getAuth } = await import('firebase-admin/auth');
    fbApp = initializeApp({ projectId: PROJECT });
    fbAuth = getAuth(fbApp);
  } catch (e) { console.warn('[firebase] admin init failed:', e.message); }
}
await initStore(fbApp);
await initAI();

export const app = express();
app.disable('x-powered-by');
app.set('trust proxy', true);
app.use(express.json({ limit: '64kb' }));
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Permissions-Policy', 'camera=(), geolocation=(), payment=(), microphone=(self)');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups'); // Google sign-in opens a popup
  if (req.secure) res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  if (req.path.startsWith('/api/')) res.setHeader('Cache-Control', 'no-store');
  next();
});

// ---------- tiny rate limiter for AI and vendor routes ----------
const hits = new Map();
function rateLimit(limit = 20) {
  return (req, res, next) => {
    const key = req.ip + req.baseUrl;
    const now = Date.now();
    const arr = (hits.get(key) || []).filter((t) => now - t < 60000);
    if (arr.length >= limit) return fail(res, 429, 'RATE_LIMITED', 'Too many requests. Wait a minute and try again.');
    arr.push(now); hits.set(key, arr); next();
  };
}
setInterval(() => { const now = Date.now(); for (const [k, v] of hits) if (!v.some((t) => now - t < 60000)) hits.delete(k); }, 60000).unref();

function fail(res, status, code, message) { return res.status(status).json({ error: { code, message } }); }
const wrap = (fn) => (req, res) => fn(req, res).catch((e) => {
  if (e instanceof OpError) return fail(res, e.status, e.code, e.message);
  console.error(e);
  fail(res, 500, 'SERVER_ERROR', 'Something went wrong on our side. Try again.');
});

// ---------- actors ----------
async function hostActor(req) {
  const ids = [];
  const auth = req.get('authorization') || '';
  if (auth.startsWith('Bearer ') && fbAuth) {
    try { const t = await fbAuth.verifyIdToken(auth.slice(7)); ids.push('g:' + t.uid); req.user = { name: t.name || t.email || 'Host', picture: t.picture || null }; } catch { /* ignore */ }
  }
  const key = req.get('x-host-key') || '';
  if (/^[a-f0-9]{32,64}$/.test(key)) ids.push('k:' + sha256(key));
  return ids.length ? { kind: 'host', ids } : null;
}
async function loadOwned(req, res) {
  const actor = await hostActor(req);
  if (!actor) { fail(res, 401, 'UNAUTHENTICATED', 'Sign in or open the plan from this browser.'); return null; }
  const ev = await getEvent(req.params.id);
  if (!ev) { fail(res, 404, 'NOT_FOUND', 'That plan does not exist.'); return null; }
  if (!isOwner(ev, actor)) { fail(res, 403, 'FORBIDDEN', 'This plan belongs to someone else.'); return null; }
  // remember a newly signed-in identity on plans made as a guest
  actor.ids.forEach((id) => { if (!ev.owners.includes(id)) ev.owners.push(id); });
  return { ev, actor };
}
async function helperCtx(req, res) {
  const token = req.get('x-helper-token') || '';
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) { fail(res, 401, 'UNAUTHENTICATED', 'This link is not valid.'); return null; }
  const idx = await getToken(sha256(token));
  if (!idx) { fail(res, 401, 'LINK_INACTIVE', 'This link is no longer active. Ask the host for a new one.'); return null; }
  const ev = await getEvent(idx.eventId);
  const h = ev?.helpers?.[idx.helperId];
  if (!ev || !h || h.revoked || h.tokenHash !== sha256(token)) { fail(res, 401, 'LINK_INACTIVE', 'This link is no longer active. Ask the host for a new one.'); return null; }
  return { ev, helperId: idx.helperId };
}

// ---------- public ----------
app.get('/api/config', (req, res) => {
  res.json({
    ai: aiEnabled(), places: placesEnabled(), store: storeMode(),
    firebase: process.env.FIREBASE_API_KEY ? {
      apiKey: process.env.FIREBASE_API_KEY,
      authDomain: process.env.FIREBASE_AUTH_DOMAIN || `${PROJECT}.firebaseapp.com`,
      projectId: PROJECT, appId: process.env.FIREBASE_APP_ID || undefined,
    } : null,
  });
});
app.get('/api/health', (req, res) => res.json({ ok: true }));

// Place photo proxy so the Places key never reaches the browser.
app.get('/api/photo', rateLimit(120), wrap(async (req, res) => {
  const name = String(req.query.name || '');
  if (!process.env.PLACES_API_KEY || !/^places\/[A-Za-z0-9_-]+\/photos\/[A-Za-z0-9_-]+$/.test(name)) return fail(res, 404, 'NOT_FOUND', 'No photo.');
  const r = await fetch(`https://places.googleapis.com/v1/${name}/media?maxWidthPx=640&key=${process.env.PLACES_API_KEY}`);
  if (!r.ok) return fail(res, 404, 'NOT_FOUND', 'No photo.');
  res.setHeader('Content-Type', r.headers.get('content-type') || 'image/jpeg');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.send(Buffer.from(await r.arrayBuffer()));
}));

// ---------- host: events ----------
app.get('/api/events', wrap(async (req, res) => {
  const actor = await hostActor(req);
  if (!actor) return res.json({ events: [] });
  const list = await listEvents(actor.ids);
  res.json({ events: list.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)).map((e) => ({ id: e.id, title: e.title, date: e.date, city: e.city, type: e.type, ready: readyPct(e), hero: e.hero })) });
}));

app.post('/api/events/sample', rateLimit(30), wrap(async (req, res) => {
  const actor = await hostActor(req);
  if (!actor) return fail(res, 401, 'UNAUTHENTICATED', 'Missing browser key.');
  const ev = { ...samplePlan(), id: newId(), owners: actor.ids, createdAt: Date.now() };
  await saveEvent(ev);
  res.json({ id: ev.id });
}));

app.post('/api/plan', rateLimit(10), wrap(async (req, res) => {
  const actor = await hostActor(req);
  if (!actor) return fail(res, 401, 'UNAUTHENTICATED', 'Missing browser key.');
  const { errors, value } = validateInput(req.body);
  if (errors.length) return fail(res, 422, 'VALIDATION_FAILED', errors.join(' '));
  const ai = await aiPlan(value);
  const ev = { ...buildPlan(value, ai), id: newId(), owners: actor.ids, createdAt: Date.now() };
  if (req.user) ev.host = { name: req.user.name.split(' ')[0], avatar: req.user.picture };
  await saveEvent(ev);
  res.json({ id: ev.id, ai: !!ai });
}));

app.get('/api/events/:id', wrap(async (req, res) => {
  const ctx = await loadOwned(req, res); if (!ctx) return;
  res.json({ event: publicHostView(ctx.ev) });
}));

app.post('/api/events/:id/op', wrap(async (req, res) => {
  const ctx = await loadOwned(req, res); if (!ctx) return;
  applyOp(ctx.ev, req.body || {}, { kind: 'host' });
  await saveEvent(ctx.ev);
  res.json({ event: publicHostView(ctx.ev) });
}));

app.delete('/api/events/:id', wrap(async (req, res) => {
  const ctx = await loadOwned(req, res); if (!ctx) return;
  ctx.ev.owners = ctx.ev.owners.filter((o) => !ctx.actor.ids.includes(o));
  await saveEvent(ctx.ev);
  res.status(204).end();
}));

// helpers
app.post('/api/events/:id/helpers', wrap(async (req, res) => {
  const ctx = await loadOwned(req, res); if (!ctx) return;
  const { ev } = ctx;
  const name = String(req.body?.name || '').trim().slice(0, 40);
  if (!name) return fail(res, 422, 'VALIDATION_FAILED', 'Enter the helper’s name.');
  let hid = req.body?.helperId;
  if (hid && !ev.helpers[hid]) return fail(res, 404, 'NOT_FOUND', 'Unknown helper.');
  if (!hid) {
    hid = name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 12) + newId(4).toLowerCase();
    ev.helpers[hid] = { name, rel: String(req.body?.rel || 'Family').slice(0, 30), lang: req.body?.lang === 'ta' ? 'ta' : 'en', avatar: null, tokenHash: null, revoked: false };
  }
  const cat = ev.cats.find((c) => c.id === req.body?.cat);
  if (cat) cat.lead = hid;
  await deleteToken(ev.helpers[hid].tokenHash);
  const token = newId(32);
  ev.helpers[hid].tokenHash = sha256(token);
  ev.helpers[hid].revoked = false;
  await setToken(sha256(token), { eventId: ev.id, helperId: hid });
  await saveEvent(ev);
  res.json({ helperId: hid, token, event: publicHostView(ev) });
}));

app.delete('/api/events/:id/helpers/:hid', wrap(async (req, res) => {
  const ctx = await loadOwned(req, res); if (!ctx) return;
  const h = ctx.ev.helpers[req.params.hid];
  if (!h) return fail(res, 404, 'NOT_FOUND', 'Unknown helper.');
  await deleteToken(h.tokenHash);
  h.tokenHash = null; h.revoked = true;
  await saveEvent(ctx.ev);
  res.json({ event: publicHostView(ctx.ev) });
}));

// co-pilot
app.post('/api/events/:id/copilot', rateLimit(20), wrap(async (req, res) => {
  const ctx = await loadOwned(req, res); if (!ctx) return;
  const message = String(req.body?.message || '').slice(0, 400);
  if (!message.trim()) return fail(res, 422, 'VALIDATION_FAILED', 'Type what you want to change.');
  const out = (await aiCopilot(ctx.ev, message)) || ruleCopilot(ctx.ev, message);
  const { diff } = applyCopilotChanges(ctx.ev, out.changes);
  res.json({ reply: out.reply, changes: diff.length ? out.changes : null, diff });
}));
app.post('/api/events/:id/copilot/apply', wrap(async (req, res) => {
  const ctx = await loadOwned(req, res); if (!ctx) return;
  const { next, diff } = applyCopilotChanges(ctx.ev, req.body?.changes || null);
  if (!diff.length) return fail(res, 422, 'VALIDATION_FAILED', 'Nothing to change.');
  next.activity.push({ t: `Plan updated: ${diff.map((d) => d.label).slice(0, 3).join(', ')}`, at: Date.now() });
  await saveEvent(next);
  res.json({ event: publicHostView(next) });
}));

// vendors (host)
app.get('/api/events/:id/vendors', rateLimit(30), wrap(async (req, res) => {
  const ctx = await loadOwned(req, res); if (!ctx) return;
  const cat = ctx.ev.cats.find((c) => c.id === req.query.cat);
  if (!cat) return fail(res, 404, 'NOT_FOUND', 'Unknown category.');
  res.json(await cachedVendors(ctx.ev, cat));
}));
// host chat about a category
app.post('/api/events/:id/ask', rateLimit(20), wrap(async (req, res) => {
  const ctx = await loadOwned(req, res); if (!ctx) return;
  const cat = ctx.ev.cats.find((c) => c.id === req.body?.cat);
  if (!cat) return fail(res, 404, 'NOT_FOUND', 'Unknown category.');
  const q = String(req.body?.message || '').slice(0, 400);
  const a = (await aiHelperAnswer(ctx.ev, cat, q, 'en', req.body?.history || [])) || cannedAnswer(cat, q, ctx.ev);
  res.json({ reply: a });
}));

const vendorCache = new Map();
async function cachedVendors(ev, cat) {
  const key = `${ev.id}:${cat.id}:${ev.city}`;
  const hit = vendorCache.get(key);
  if (hit && Date.now() - hit.at < 86400000) return hit.data;
  const data = await findVendors(cat, ev);
  vendorCache.set(key, { at: Date.now(), data });
  return data;
}

// ---------- helper ----------
app.get('/api/h/me', wrap(async (req, res) => {
  const ctx = await helperCtx(req, res); if (!ctx) return;
  res.json(redactForHelper(ctx.ev, ctx.helperId));
}));
app.post('/api/h/op', wrap(async (req, res) => {
  const ctx = await helperCtx(req, res); if (!ctx) return;
  applyOp(ctx.ev, req.body || {}, { kind: 'helper', helperId: ctx.helperId });
  await saveEvent(ctx.ev);
  res.json(redactForHelper(ctx.ev, ctx.helperId));
}));
app.get('/api/h/vendors', rateLimit(30), wrap(async (req, res) => {
  const ctx = await helperCtx(req, res); if (!ctx) return;
  const cat = ctx.ev.cats.find((c) => c.id === req.query.cat && c.lead === ctx.helperId);
  if (!cat) return fail(res, 403, 'FORBIDDEN_TASK', 'You can only see vendors for your own task.');
  res.json(await cachedVendors(ctx.ev, cat));
}));
app.post('/api/h/ask', rateLimit(20), wrap(async (req, res) => {
  const ctx = await helperCtx(req, res); if (!ctx) return;
  const cat = ctx.ev.cats.find((c) => c.id === req.body?.cat && c.lead === ctx.helperId);
  if (!cat) return fail(res, 403, 'FORBIDDEN_TASK', 'You can only ask about your own task.');
  const q = String(req.body?.message || '').slice(0, 400);
  if (!q.trim()) return fail(res, 422, 'VALIDATION_FAILED', 'Type a question.');
  const lang = req.body?.lang === 'ta' ? 'ta' : 'en';
  const a = (await aiHelperAnswer(ctx.ev, cat, q, lang, req.body?.history || [])) || cannedAnswer(cat, q, ctx.ev);
  res.json({ reply: a });
}));

app.use('/api', (req, res) => fail(res, 404, 'NOT_FOUND', 'Unknown API route.'));

// ---------- static ----------
app.use(express.static(path.join(__dirname, 'public'), { maxAge: '1h', index: 'index.html' }));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

// Start listening only when run directly (tests import the app instead).
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) app.listen(PORT, () => console.log(`Utsav AI on :${PORT} · AI ${aiEnabled() ? 'on' : 'off'} · Places ${placesEnabled() ? 'on' : 'off'} · store ${storeMode()}`));
