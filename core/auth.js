/**
 * core/auth.js — Autenticação opcional com Firebase.
 */

import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { firebaseConfig } from "./firebase-config.js";
import { eventBus } from "./eventBus.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let _currentUser = null;
let _currentSubscription = null;
let _unsubscribeSnapshot = null;
let _authInitialized = false;
let _forceExpired = false;

const TRIAL_MS = 48 * 60 * 60 * 1000;

function emitAuthChanged() {
  eventBus.emit('auth:changed', {
    user: _currentUser,
    subscription: _currentSubscription,
    hasAccess: hasActiveAccess()
  });
}

function toDate(ts) {
  if (!ts) return null;
  if (typeof ts.toDate === 'function') return ts.toDate();
  if (ts instanceof Date) return ts;
  return new Date(ts);
}

async function ensureSubscriptionDoc(user) {
  if (!user) return null;
  const ref = doc(db, 'subscriptions', user.uid);

  try {
    const snap = await getDoc(ref);
    if (snap.exists()) return snap.data();
  } catch (e) {
    console.warn('[Auth] getDoc falhou:', e && e.message);
    return null;
  }

  try {
    const now = new Date();
    const payload = {
      status: 'trial',
      trialStartedAt: now,
      trialEndsAt: new Date(now.getTime() + TRIAL_MS),
      createdAt: now
    };
    await setDoc(ref, payload);
    console.log('[Auth] subscriptions/' + user.uid + ' criado (trial 48h)');
    return payload;
  } catch (e) {
    console.warn('[Auth] setDoc falhou:', e && e.message);
    try {
      const snap2 = await getDoc(ref);
      return snap2.exists() ? snap2.data() : null;
    } catch (_) {
      return null;
    }
  }
}

function attachSnapshot(user) {
  if (_unsubscribeSnapshot) {
    _unsubscribeSnapshot();
    _unsubscribeSnapshot = null;
  }
  if (!user) return;
  const ref = doc(db, 'subscriptions', user.uid);
  _unsubscribeSnapshot = onSnapshot(ref,
    (snap) => {
      _currentSubscription = snap.exists() ? snap.data() : null;
      eventBus.emit('subscription:changed', { subscription: _currentSubscription });
      emitAuthChanged();
    },
    (err) => {
      console.warn('[Auth] onSnapshot erro:', err && err.message);
    }
  );
}

/* ---------- API pública ---------- */

export function getCurrentUser() {
  return _currentUser;
}

export function getSubscription() {
  return _currentSubscription;
}

export function hasActiveAccess() {
  if (_forceExpired) return false;
  if (!_currentUser) return true;
  if (!_currentSubscription) return true;

  const sub = _currentSubscription;

  if (sub.status === 'active') return true;

  if (sub.status === 'trial' && sub.trialEndsAt) {
    const end = toDate(sub.trialEndsAt);
    return end && end.getTime() > Date.now();
  }

  return false;
}

export async function signUp(email, password) {
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    console.log('[Auth] Conta criada:', cred.user.uid);
    await ensureSubscriptionDoc(cred.user);
    return { ok: true, user: cred.user };
  } catch (e) {
    console.error('[Auth] signUp erro:', e && e.code, e && e.message);
    eventBus.emit('auth:error', { action: 'signUp', code: e && e.code, message: e && e.message });
    return { ok: false, error: e };
  }
}

export async function signIn(email, password) {
  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    console.log('[Auth] Login OK:', cred.user.uid);
    await ensureSubscriptionDoc(cred.user);
    return { ok: true, user: cred.user };
  } catch (e) {
    console.error('[Auth] signIn erro:', e && e.code, e && e.message);
    eventBus.emit('auth:error', { action: 'signIn', code: e && e.code, message: e && e.message });
    return { ok: false, error: e };
  }
}

export async function signOut() {
  try {
    await fbSignOut(auth);
    console.log('[Auth] Logout');
    return { ok: true };
  } catch (e) {
    console.error('[Auth] signOut erro:', e && e.message);
    return { ok: false, error: e };
  }
}

export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}

export async function sendPasswordReset(email) {
  try {
    await sendPasswordResetEmail(auth, email);
    console.log('[Auth] Reset enviado para', email);
    return { ok: true };
  } catch (e) {
    console.error('[Auth] reset erro:', e && e.code, e && e.message);
    eventBus.emit('auth:error', { action: 'reset', code: e && e.code, message: e && e.message });
    return { ok: false, error: e };
  }
}

export function setForceExpired(v) {
  _forceExpired = Boolean(v);
  console.log('[Auth] forceExpired =', _forceExpired);
  emitAuthChanged();
}

export function initAuth() {
  if (_authInitialized) return;
  _authInitialized = true;
  onAuthStateChanged(auth, async (user) => {
    _currentUser = user || null;
    if (user) {
      const sub = await ensureSubscriptionDoc(user);
      _currentSubscription = sub;
      attachSnapshot(user);
    } else {
      _currentSubscription = null;
      if (_unsubscribeSnapshot) {
        _unsubscribeSnapshot();
        _unsubscribeSnapshot = null;
      }
    }
    emitAuthChanged();
  });
}

export default {
  initAuth,
  setForceExpired,
  signUp,
  signIn,
  signOut,
  onAuthChange,
  getCurrentUser,
  getSubscription,
  hasActiveAccess,
  sendPasswordReset
};
