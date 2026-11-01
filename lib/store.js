// Event storage: Cloud Firestore when available (Cloud Run), in-memory otherwise.
// Every read/write goes through here so the rest of the server stays storage-agnostic.

const mem = { events: new Map(), tokens: new Map() };
let db = null;
let mode = 'memory';

export async function initStore(firebaseApp) {
  const want = process.env.USE_FIRESTORE === '1' || (!!process.env.K_SERVICE && process.env.USE_FIRESTORE !== '0');
  if (!want || !firebaseApp) return mode;
  try {
    const { getFirestore } = await import('firebase-admin/firestore');
    db = getFirestore(firebaseApp);
    await db.collection('health').doc('ping').set({ at: Date.now() });
    mode = 'firestore';
  } catch (e) {
    console.warn('[store] Firestore unavailable, using memory:', e.message);
    db = null;
  }
  return mode;
}
export const storeMode = () => mode;

export async function getEvent(id) {
  if (!/^[A-Za-z0-9]{6,20}$/.test(id || '')) return null;
  if (db) {
    const s = await db.collection('events').doc(id).get();
    return s.exists ? s.data() : null;
  }
  const e = mem.events.get(id);
  return e ? structuredClone(e) : null;
}

export async function saveEvent(ev) {
  ev.updatedAt = Date.now();
  if (db) { await db.collection('events').doc(ev.id).set(JSON.parse(JSON.stringify(ev))); return; }
  mem.events.set(ev.id, structuredClone(ev));
}

export async function listEvents(ownerIds) {
  if (!ownerIds.length) return [];
  if (db) {
    const s = await db.collection('events').where('owners', 'array-contains-any', ownerIds.slice(0, 10)).limit(30).get();
    return s.docs.map((d) => d.data());
  }
  return [...mem.events.values()].filter((e) => e.owners.some((o) => ownerIds.includes(o)));
}

export async function getToken(hash) {
  if (db) { const s = await db.collection('helperTokens').doc(hash).get(); return s.exists ? s.data() : null; }
  return mem.tokens.get(hash) || null;
}
export async function setToken(hash, data) {
  if (db) { await db.collection('helperTokens').doc(hash).set(data); return; }
  mem.tokens.set(hash, data);
}
export async function deleteToken(hash) {
  if (!hash) return;
  if (db) { await db.collection('helperTokens').doc(hash).delete(); return; }
  mem.tokens.delete(hash);
}
