// Host routes: create and read plans, change them, manage helper links, co-pilot, vendors and chat.
// Every change goes through applyOp() or applyCopilotChanges() so the rules live in lib/plan.js.
import { Router } from 'express';
import { aiCopilot, aiHelperAnswer, aiPlan, findVendors } from '../lib/ai.js';
import { fail, rateLimit, wrap } from '../lib/http.js';
import {
  applyCopilotChanges,
  applyOp,
  buildPlan,
  cannedAnswer,
  newId,
  publicHostView,
  readyPct,
  ruleCopilot,
  samplePlan,
  sha256,
  validateInput,
} from '../lib/plan.js';
import { deleteToken, listEvents, saveEvent, setToken } from '../lib/store.js';

const MAX_MESSAGE = 400;
const HELPER_TOKEN_LENGTH = 32;

/** A new event owned by the caller, ready to save. */
const ownedEvent = (plan, actor) => ({ ...plan, id: newId(), owners: actor.ids, createdAt: Date.now() });
const findCat = (ev, id) => ev.cats.find((c) => c.id === id);

/** @param {{ auth: ReturnType<import('../lib/auth.js').createAuth> }} options */
export function hostRoutes({ auth }) {
  const { hostActor, loadOwned } = auth;
  const r = Router();

  // the plans this browser or Google account owns, newest first
  r.get(
    '/events',
    wrap(async (req, res) => {
      const actor = await hostActor(req);
      if (!actor) return res.json({ events: [] });
      const list = await listEvents(actor.ids);
      const summary = (e) => ({
        id: e.id,
        title: e.title,
        date: e.date,
        city: e.city,
        type: e.type,
        ready: readyPct(e),
        hero: e.hero,
      });
      return res.json({ events: list.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)).map(summary) });
    }),
  );

  r.post(
    '/events/sample',
    rateLimit(30),
    wrap(async (req, res) => {
      const actor = await hostActor(req);
      if (!actor) return fail(res, 401, 'UNAUTHENTICATED', 'Missing browser key.');
      const ev = ownedEvent(samplePlan(), actor);
      await saveEvent(ev);
      return res.json({ id: ev.id });
    }),
  );

  // Gemini drafts the plan; buildPlan() checks every rupee and date before it is saved.
  r.post(
    '/plan',
    rateLimit(10),
    wrap(async (req, res) => {
      const actor = await hostActor(req);
      if (!actor) return fail(res, 401, 'UNAUTHENTICATED', 'Missing browser key.');
      const { errors, value } = validateInput(req.body);
      if (errors.length) return fail(res, 422, 'VALIDATION_FAILED', errors.join(' '));
      const ai = await aiPlan(value);
      const ev = ownedEvent(buildPlan(value, ai), actor);
      if (req.user) ev.host = { name: req.user.name.split(' ')[0], avatar: req.user.picture };
      await saveEvent(ev);
      return res.json({ id: ev.id, ai: Boolean(ai) });
    }),
  );

  r.get(
    '/events/:id',
    wrap(async (req, res) => {
      const ctx = await loadOwned(req, res);
      if (ctx) res.json({ event: publicHostView(ctx.ev) });
    }),
  );

  r.post(
    '/events/:id/op',
    wrap(async (req, res) => {
      const ctx = await loadOwned(req, res);
      if (!ctx) return;
      applyOp(ctx.ev, req.body || {}, { kind: 'host' });
      await saveEvent(ctx.ev);
      res.json({ event: publicHostView(ctx.ev) });
    }),
  );

  // "delete" removes the caller from the owners; other owners keep the plan
  r.delete(
    '/events/:id',
    wrap(async (req, res) => {
      const ctx = await loadOwned(req, res);
      if (!ctx) return;
      ctx.ev.owners = ctx.ev.owners.filter((o) => !ctx.actor.ids.includes(o));
      await saveEvent(ctx.ev);
      res.status(204).end();
    }),
  );

  // Add a helper (or give an existing one a fresh link). The raw token is returned once and only its hash is kept.
  r.post(
    '/events/:id/helpers',
    wrap(async (req, res) => {
      const ctx = await loadOwned(req, res);
      if (!ctx) return;
      const { ev } = ctx;
      const name = String(req.body?.name || '')
        .trim()
        .slice(0, 40);
      if (!name) return fail(res, 422, 'VALIDATION_FAILED', 'Enter the helper’s name.');
      let hid = req.body?.helperId;
      if (hid && !ev.helpers[hid]) return fail(res, 404, 'NOT_FOUND', 'Unknown helper.');
      if (!hid) {
        hid =
          name
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '')
            .slice(0, 12) + newId(4).toLowerCase();
        ev.helpers[hid] = {
          name,
          rel: String(req.body?.rel || 'Family').slice(0, 30),
          lang: req.body?.lang === 'ta' ? 'ta' : 'en',
          avatar: null,
          tokenHash: null,
          revoked: false,
        };
      }
      const cat = findCat(ev, req.body?.cat);
      if (cat) cat.lead = hid;
      await deleteToken(ev.helpers[hid].tokenHash);
      const token = newId(HELPER_TOKEN_LENGTH);
      ev.helpers[hid].tokenHash = sha256(token);
      ev.helpers[hid].revoked = false;
      await setToken(sha256(token), { eventId: ev.id, helperId: hid });
      await saveEvent(ev);
      return res.json({ helperId: hid, token, event: publicHostView(ev) });
    }),
  );

  // revoke a helper's link immediately
  r.delete(
    '/events/:id/helpers/:hid',
    wrap(async (req, res) => {
      const ctx = await loadOwned(req, res);
      if (!ctx) return;
      const helper = ctx.ev.helpers[req.params.hid];
      if (!helper) return fail(res, 404, 'NOT_FOUND', 'Unknown helper.');
      await deleteToken(helper.tokenHash);
      helper.tokenHash = null;
      helper.revoked = true;
      await saveEvent(ctx.ev);
      return res.json({ event: publicHostView(ctx.ev) });
    }),
  );

  // Co-pilot step 1: turn a request into a change set and a before/after diff. Nothing is saved.
  r.post(
    '/events/:id/copilot',
    rateLimit(20),
    wrap(async (req, res) => {
      const ctx = await loadOwned(req, res);
      if (!ctx) return;
      const message = String(req.body?.message || '').slice(0, MAX_MESSAGE);
      if (!message.trim()) return fail(res, 422, 'VALIDATION_FAILED', 'Type what you want to change.');
      const out = (await aiCopilot(ctx.ev, message)) || ruleCopilot(ctx.ev, message);
      const { diff } = applyCopilotChanges(ctx.ev, out.changes);
      return res.json({ reply: out.reply, changes: diff.length ? out.changes : null, diff });
    }),
  );

  // Co-pilot step 2: the host pressed "Apply changes".
  r.post(
    '/events/:id/copilot/apply',
    wrap(async (req, res) => {
      const ctx = await loadOwned(req, res);
      if (!ctx) return;
      const { next, diff } = applyCopilotChanges(ctx.ev, req.body?.changes || null);
      if (!diff.length) return fail(res, 422, 'VALIDATION_FAILED', 'Nothing to change.');
      const labels = diff.map((d) => d.label).slice(0, 3);
      next.activity.push({ t: `Plan updated: ${labels.join(', ')}`, at: Date.now() });
      await saveEvent(next);
      return res.json({ event: publicHostView(next) });
    }),
  );

  r.get(
    '/events/:id/vendors',
    rateLimit(30),
    wrap(async (req, res) => {
      const ctx = await loadOwned(req, res);
      if (!ctx) return;
      const cat = findCat(ctx.ev, req.query.cat);
      if (!cat) return fail(res, 404, 'NOT_FOUND', 'Unknown category.');
      return res.json(await findVendors(cat, ctx.ev));
    }),
  );

  // the host asks Utsav about one category
  r.post(
    '/events/:id/ask',
    rateLimit(20),
    wrap(async (req, res) => {
      const ctx = await loadOwned(req, res);
      if (!ctx) return;
      const cat = findCat(ctx.ev, req.body?.cat);
      if (!cat) return fail(res, 404, 'NOT_FOUND', 'Unknown category.');
      const question = String(req.body?.message || '').slice(0, MAX_MESSAGE);
      const answer =
        (await aiHelperAnswer(ctx.ev, cat, question, 'en', req.body?.history || [])) ||
        cannedAnswer(cat, question, ctx.ev);
      return res.json({ reply: answer });
    }),
  );

  return r;
}
