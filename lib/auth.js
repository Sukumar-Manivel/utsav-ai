// Who is calling? Hosts are identified by a Google ID token and/or a random per-browser key;
// helpers by the private token in their link. Only hashes of keys and tokens are ever stored.
import { fail } from './http.js';
import { isOwner, sha256 } from './plan.js';
import { getEvent, getToken } from './store.js';

const HOST_KEY = /^[a-f0-9]{32,64}$/;
const HELPER_TOKEN = /^[A-Za-z0-9_-]{20,64}$/;

/**
 * Build the identity helpers. `verifyIdToken` comes from Firebase Admin when Google sign-in is set up.
 * @param {{ verifyIdToken?: (token: string) => Promise<{ uid: string, name?: string, email?: string, picture?: string }> }} [firebaseAuth]
 */
export function createAuth(firebaseAuth = null) {
  /** The host identities on this request, or null when there are none. */
  async function hostActor(req) {
    const ids = [];
    const header = req.get('authorization') || '';
    if (header.startsWith('Bearer ') && firebaseAuth) {
      try {
        const t = await firebaseAuth.verifyIdToken(header.slice(7));
        ids.push('g:' + t.uid);
        req.user = { name: t.name || t.email || 'Host', picture: t.picture || null };
      } catch {
        // an expired or forged token simply does not count as an identity
      }
    }
    const key = req.get('x-host-key') || '';
    if (HOST_KEY.test(key)) ids.push('k:' + sha256(key));
    return ids.length ? { kind: 'host', ids } : null;
  }

  /** Load the plan in :id if the caller owns it; otherwise send 401/403/404 and return null. */
  async function loadOwned(req, res) {
    const actor = await hostActor(req);
    if (!actor) return void fail(res, 401, 'UNAUTHENTICATED', 'Sign in or open the plan from this browser.');
    const ev = await getEvent(req.params.id);
    if (!ev) return void fail(res, 404, 'NOT_FOUND', 'That plan does not exist.');
    if (!isOwner(ev, actor)) return void fail(res, 403, 'FORBIDDEN', 'This plan belongs to someone else.');
    // a guest who later signs in with Google keeps access to the plans made in this browser
    for (const id of actor.ids) if (!ev.owners.includes(id)) ev.owners.push(id);
    return { ev, actor };
  }

  /** Resolve the helper behind the link token; otherwise send 401 and return null. */
  async function helperCtx(req, res) {
    const token = req.get('x-helper-token') || '';
    if (!HELPER_TOKEN.test(token)) return void fail(res, 401, 'UNAUTHENTICATED', 'This link is not valid.');
    const inactive = () =>
      fail(res, 401, 'LINK_INACTIVE', 'This link is no longer active. Ask the host for a new one.');
    const hash = sha256(token);
    const idx = await getToken(hash);
    if (!idx) return void inactive();
    const ev = await getEvent(idx.eventId);
    const helper = ev?.helpers?.[idx.helperId];
    if (!helper || helper.revoked || helper.tokenHash !== hash) return void inactive();
    return { ev, helperId: idx.helperId };
  }

  return { hostActor, loadOwned, helperCtx };
}
