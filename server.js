// Utsav AI server: JSON API under /api and the static single-page app.
// Routes live in routes/, shared HTTP helpers in lib/http.js, identity checks in lib/auth.js,
// and every rule about who may change what in lib/plan.js.
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { aiEnabled, initAI, placesEnabled } from './lib/ai.js';
import { createAuth } from './lib/auth.js';
import { fail, securityHeaders } from './lib/http.js';
import { initStore, storeMode } from './lib/store.js';
import { helperRoutes } from './routes/helper.js';
import { hostRoutes } from './routes/host.js';
import { publicRoutes } from './routes/public.js';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(ROOT, 'public');
const PORT = Number(process.env.PORT) || 8080;
const PROJECT = process.env.GOOGLE_CLOUD_PROJECT || process.env.FIREBASE_PROJECT_ID || '';

/** Firebase Admin verifies Google sign-in and gives Firestore access when a project is configured. */
async function initFirebase(project) {
  if (!project) return { app: null, auth: null };
  try {
    const { initializeApp } = await import('firebase-admin/app');
    const { getAuth } = await import('firebase-admin/auth');
    const app = initializeApp({ projectId: project });
    return { app, auth: getAuth(app) };
  } catch (e) {
    console.warn('[firebase] admin init failed:', e.message);
    return { app: null, auth: null };
  }
}

const firebase = await initFirebase(PROJECT);
await initStore(firebase.app);
await initAI();

export const app = express();
app.disable('x-powered-by');
app.set('trust proxy', true);
app.use(express.json({ limit: '64kb' }));
app.use(securityHeaders);

const auth = createAuth(firebase.auth);
app.use('/api', publicRoutes({ project: PROJECT }));
app.use('/api', hostRoutes({ auth }));
app.use('/api/h', helperRoutes({ auth }));
app.use('/api', (req, res) => fail(res, 404, 'NOT_FOUND', 'Unknown API route.'));

// the single-page app: static files, and index.html for every other path
app.use(express.static(PUBLIC, { maxAge: '1h', index: 'index.html' }));
app.get('*', (req, res) => res.sendFile(path.join(PUBLIC, 'index.html')));

// Start listening only when run directly (tests import the app instead).
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  app.listen(PORT, () => {
    const on = (flag) => (flag ? 'on' : 'off');
    console.log(`Utsav AI on :${PORT} · AI ${on(aiEnabled())} · Places ${on(placesEnabled())} · store ${storeMode()}`);
  });
}
