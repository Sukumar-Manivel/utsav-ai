// Helper routes (/api/h/*): everything a relative can do from their private link.
// The redacted view hides the full budget and other helpers' notes; writes are limited to their own task.
import { Router } from 'express';
import { aiHelperAnswer, findVendors } from '../lib/ai.js';
import { fail, rateLimit, wrap } from '../lib/http.js';
import { applyOp, cannedAnswer, redactForHelper } from '../lib/plan.js';
import { saveEvent } from '../lib/store.js';

const MAX_MESSAGE = 400;
/** The helper's own category, or undefined when they ask about someone else's. */
const ownCat = (ctx, id) => ctx.ev.cats.find((c) => c.id === id && c.lead === ctx.helperId);

/** @param {{ auth: ReturnType<import('../lib/auth.js').createAuth> }} options */
export function helperRoutes({ auth }) {
  const { helperCtx } = auth;
  const r = Router();

  r.get(
    '/me',
    wrap(async (req, res) => {
      const ctx = await helperCtx(req, res);
      if (ctx) res.json(redactForHelper(ctx.ev, ctx.helperId));
    }),
  );

  // applyOp() refuses (403) any change outside the helper's own category
  r.post(
    '/op',
    wrap(async (req, res) => {
      const ctx = await helperCtx(req, res);
      if (!ctx) return;
      applyOp(ctx.ev, req.body || {}, { kind: 'helper', helperId: ctx.helperId });
      await saveEvent(ctx.ev);
      res.json(redactForHelper(ctx.ev, ctx.helperId));
    }),
  );

  r.get(
    '/vendors',
    rateLimit(30),
    wrap(async (req, res) => {
      const ctx = await helperCtx(req, res);
      if (!ctx) return;
      const cat = ownCat(ctx, req.query.cat);
      if (!cat) return fail(res, 403, 'FORBIDDEN_TASK', 'You can only see vendors for your own task.');
      return res.json(await findVendors(cat, ctx.ev));
    }),
  );

  r.post(
    '/ask',
    rateLimit(20),
    wrap(async (req, res) => {
      const ctx = await helperCtx(req, res);
      if (!ctx) return;
      const cat = ownCat(ctx, req.body?.cat);
      if (!cat) return fail(res, 403, 'FORBIDDEN_TASK', 'You can only ask about your own task.');
      const question = String(req.body?.message || '').slice(0, MAX_MESSAGE);
      if (!question.trim()) return fail(res, 422, 'VALIDATION_FAILED', 'Type a question.');
      const lang = req.body?.lang === 'ta' ? 'ta' : 'en';
      const answer =
        (await aiHelperAnswer(ctx.ev, cat, question, lang, req.body?.history || [])) ||
        cannedAnswer(cat, question, ctx.ev);
      return res.json({ reply: answer });
    }),
  );

  return r;
}
