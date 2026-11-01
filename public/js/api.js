// fetch() wrapper: adds the host key, Google ID token or helper token and turns API errors into thrown Errors.
import { S } from './state.js';

export async function api(path, { method = 'GET', body, helper } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (helper) headers['X-Helper-Token'] = helper;
  else {
    headers['X-Host-Key'] = S.hostKey;
    if (S.fbUser) {
      try {
        headers.Authorization = 'Bearer ' + (await S.fbUser.getIdToken());
      } catch {
        /* offline */
      }
    }
  }
  let r;
  try {
    r = await fetch(path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  } catch {
    const e = new Error('No connection. Check your internet and try again.');
    e.code = 'OFFLINE';
    throw e;
  }
  if (r.status === 204) return null;
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    const e = new Error(j.error?.message || 'Something went wrong. Try again.');
    e.code = j.error?.code;
    e.status = r.status;
    throw e;
  }
  return j;
}
