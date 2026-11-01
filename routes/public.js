// Public routes: client config, health check and the Google Places photo proxy.
import { Router } from 'express';
import { aiEnabled, placesEnabled } from '../lib/ai.js';
import { fail, rateLimit, wrap } from '../lib/http.js';
import { storeMode } from '../lib/store.js';

const PLACE_PHOTO = /^places\/[A-Za-z0-9_-]+\/photos\/[A-Za-z0-9_-]+$/;

/** @param {{ project: string }} options */
export function publicRoutes({ project }) {
  const r = Router();

  // What the browser needs to know: which features are on and the public Firebase web config.
  r.get('/config', (req, res) => {
    const { FIREBASE_API_KEY, FIREBASE_AUTH_DOMAIN, FIREBASE_APP_ID } = process.env;
    res.json({
      ai: aiEnabled(),
      places: placesEnabled(),
      store: storeMode(),
      firebase: FIREBASE_API_KEY
        ? {
            apiKey: FIREBASE_API_KEY,
            authDomain: FIREBASE_AUTH_DOMAIN || `${project}.firebaseapp.com`,
            projectId: project,
            appId: FIREBASE_APP_ID || undefined,
          }
        : null,
    });
  });

  r.get('/health', (req, res) => res.json({ ok: true }));

  // Vendor photos are fetched here so the Places key never reaches the browser.
  r.get(
    '/photo',
    rateLimit(120),
    wrap(async (req, res) => {
      const name = String(req.query.name || '');
      const key = process.env.PLACES_API_KEY;
      if (!key || !PLACE_PHOTO.test(name)) return fail(res, 404, 'NOT_FOUND', 'No photo.');
      const upstream = await fetch(`https://places.googleapis.com/v1/${name}/media?maxWidthPx=640&key=${key}`);
      if (!upstream.ok) return fail(res, 404, 'NOT_FOUND', 'No photo.');
      res.setHeader('Content-Type', upstream.headers.get('content-type') || 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      return res.send(Buffer.from(await upstream.arrayBuffer()));
    }),
  );

  return r;
}
