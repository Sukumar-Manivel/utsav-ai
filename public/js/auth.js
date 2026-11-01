// Optional Google sign-in with Firebase Auth (loaded only when the server has a Firebase config).
/* global firebase */
import { S } from './state.js';
import { render } from './router.js';
import { toast } from './overlays.js';

export async function loadFirebase() {
  const load = (src) =>
    new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = res;
      s.onerror = rej;
      document.head.appendChild(s);
    });
  try {
    await load('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
    await load('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js');
    firebase.initializeApp(S.cfg.firebase);
    firebase.auth().onAuthStateChanged((u) => {
      const changed = (u?.uid || null) !== (S.fbUser?.uid || null);
      S.fbUser = u;
      if (changed && ['landing', 'events'].includes(S.route.name)) render();
    });
  } catch {
    S.cfg.firebase = null;
  }
}
export async function signIn() {
  if (!window.firebase) return toast('Google sign-in is not set up on this server. You can keep planning without it.');
  try {
    await firebase.auth().signInWithPopup(new firebase.auth.GoogleAuthProvider());
    toast('Signed in');
    location.hash = '#/events';
  } catch (e) {
    if (e.code !== 'auth/popup-closed-by-user') toast('Sign-in did not finish. Try again.');
  }
}
