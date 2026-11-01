// Small HTTP helpers shared by every route: JSON errors, async error handling,
// a per-route rate limiter and the security headers sent on every response.
import { OpError } from './plan.js';

const MINUTE = 60_000;

/**
 * Send a JSON error in the one shape the browser understands: { error: { code, message } }.
 * @param {import('express').Response} res
 * @param {number} status HTTP status
 * @param {string} code machine-readable code, e.g. "FORBIDDEN_TASK"
 * @param {string} message plain-language message shown to the person
 */
export function fail(res, status, code, message) {
  return res.status(status).json({ error: { code, message } });
}

/**
 * Wrap an async route so thrown errors become JSON responses instead of crashes.
 * Permission and validation errors (OpError) keep their status; anything else is a 500 without details.
 * @param {(req: import('express').Request, res: import('express').Response) => Promise<unknown>} handler
 */
export const wrap = (handler) => (req, res) =>
  handler(req, res).catch((e) => {
    if (e instanceof OpError) return fail(res, e.status, e.code, e.message);
    console.error(e);
    return fail(res, 500, 'SERVER_ERROR', 'Something went wrong on our side. Try again.');
  });

const limiters = new Set();
/**
 * Sliding-window rate limiter: at most `limit` requests per minute per IP for the routes it guards.
 * Each call creates its own counter, so a busy AI route cannot use up another route's allowance.
 * @param {number} limit requests per minute
 */
export function rateLimit(limit = 20) {
  const hits = new Map();
  limiters.add(hits);
  return (req, res, next) => {
    const now = Date.now();
    const recent = (hits.get(req.ip) || []).filter((t) => now - t < MINUTE);
    if (recent.length >= limit)
      return fail(res, 429, 'RATE_LIMITED', 'Too many requests. Wait a minute and try again.');
    recent.push(now);
    hits.set(req.ip, recent);
    return next();
  };
}
// forget idle IPs once a minute so the maps stay small
setInterval(() => {
  const now = Date.now();
  for (const hits of limiters)
    for (const [ip, times] of hits) if (!times.some((t) => now - t < MINUTE)) hits.delete(ip);
}, MINUTE).unref();

// Only these outside hosts may load scripts, fonts, frames or be called from the page.
const CSP = [
  "default-src 'self'",
  "script-src 'self' https://www.gstatic.com https://apis.google.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: https://*.googleusercontent.com",
  "connect-src 'self' https://*.googleapis.com",
  'frame-src https://*.firebaseapp.com https://accounts.google.com',
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

/** Express middleware that sets the security headers on every response. */
export function securityHeaders(req, res, next) {
  res.setHeader('Content-Security-Policy', CSP);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Permissions-Policy', 'camera=(), geolocation=(), payment=(), microphone=(self)');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups'); // Google sign-in opens a popup
  if (req.secure) res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  if (req.path.startsWith('/api/')) res.setHeader('Cache-Control', 'no-store');
  next();
}
