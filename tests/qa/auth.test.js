import './setup/env.js';
import { describe, it, expect, beforeEach, vi } from 'vitest';

const authState = vi.hoisted(() => ({
  signInThrows: null,
  createUserThrows: null,
  signOutThrows: null,
  resetThrows: null
}));

vi.mock('../../core/firebase-config.js', () => ({
  firebaseConfig: { apiKey: 'test', projectId: 'test' }
}));

vi.mock('../../core/eventBus.js', () => ({
  eventBus: { emit: vi.fn(), on: vi.fn(), off: vi.fn() }
}));

vi.mock("https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js", () => {
  const app = { name: '[DEFAULT]', options: {} };
  return { initializeApp: vi.fn(() => app), getApps: vi.fn(() => [app]) };
});

vi.mock("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js", () => ({
  getAuth: vi.fn(() => ({})),
  signInWithEmailAndPassword: vi.fn(async () => {
    if (authState.signInThrows) throw authState.signInThrows;
    return { user: { uid: 'abcdefgh-1234-5678-9abc-def012345678', email: 'x@example.com' } };
  }),
  createUserWithEmailAndPassword: vi.fn(async () => {
    if (authState.createUserThrows) throw authState.createUserThrows;
    return { user: { uid: 'abcdefgh-1234-5678-9abc-def012345678', email: 'x@example.com' } };
  }),
  signOut: vi.fn(async () => {
    if (authState.signOutThrows) throw authState.signOutThrows;
  }),
  onAuthStateChanged: vi.fn(() => vi.fn()),
  sendPasswordResetEmail: vi.fn(async () => {
    if (authState.resetThrows) throw authState.resetThrows;
  })
}));

vi.mock("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js", () => ({
  getFirestore: vi.fn(() => ({})),
  doc: vi.fn(() => ({})),
  getDoc: vi.fn(async () => ({ exists: () => false, data: () => null })),
  setDoc: vi.fn(async () => undefined),
  onSnapshot: vi.fn(() => () => {})
}));

import { signIn, signUp, signOut, sendPasswordReset } from '../../core/auth.js';

function captureLogs() {
  const logs = { log: [], error: [], warn: [] };
  vi.spyOn(console, 'log').mockImplementation((...a) =>
    logs.log.push(a.map(x => typeof x === 'string' ? x : JSON.stringify(x)).join(' '))
  );
  vi.spyOn(console, 'error').mockImplementation((...a) =>
    logs.error.push(a.map(x => typeof x === 'string' ? x : JSON.stringify(x)).join(' '))
  );
  vi.spyOn(console, 'warn').mockImplementation((...a) =>
    logs.warn.push(a.map(x => typeof x === 'string' ? x : JSON.stringify(x)).join(' '))
  );
  return logs;
}

describe('Fase 3 / auth.js', () => {
  let logs;
  beforeEach(() => {
    vi.restoreAllMocks();
    logs = captureLogs();
    authState.signInThrows = null;
    authState.createUserThrows = null;
    authState.signOutThrows = null;
    authState.resetThrows = null;
  });

  it('A1 — signIn sucesso devolve { ok: true, user }', async () => {
    const r = await signIn('test@example.com', 'correct-password');
    expect(r.ok).toBe(true);
    expect(r.user).toBeDefined();
    expect(typeof r.user.uid).toBe('string');
  });

  it('A2 — signIn falha devolve { ok: false, error: string }', async () => {
    const err = new Error('auth/wrong-password');
    err.code = 'auth/wrong-password';
    authState.signInThrows = err;
    const r = await signIn('test@example.com', 'wrong-password');
    expect(r.ok).toBe(false);
    expect(typeof r.error).toBe('string');
    expect(r.error.length).toBeGreaterThan(0);
    expect(r).not.toHaveProperty('user');
  });

  it('A3 — signUp sucesso devolve { ok: true, user }', async () => {
    const r = await signUp('newuser@example.com', 'password123');
    expect(r.ok).toBe(true);
    expect(r.user).toBeDefined();
  });

  it('A4 — signUp falha devolve { ok: false, error: string }', async () => {
    const err = new Error('auth/email-already-in-use');
    err.code = 'auth/email-already-in-use';
    authState.createUserThrows = err;
    const r = await signUp('existing@example.com', 'password123');
    expect(r.ok).toBe(false);
    expect(typeof r.error).toBe('string');
  });

  it('A5 — sendPasswordReset sucesso devolve { ok: true }', async () => {
    const r = await sendPasswordReset('user@example.com');
    expect(r.ok).toBe(true);
  });

  it('A6 — sendPasswordReset falha devolve { ok: false, error: string }', async () => {
    const err = new Error('auth/user-not-found');
    err.code = 'auth/user-not-found';
    authState.resetThrows = err;
    const r = await sendPasswordReset('unknown@example.com');
    expect(r.ok).toBe(false);
    expect(typeof r.error).toBe('string');
  });

  it('A7 — signOut sucesso devolve { ok: true }', async () => {
    const r = await signOut();
    expect(r.ok).toBe(true);
  });

  it('A8 — log de signIn nao expoe UID completo', async () => {
    await signIn('test@example.com', 'password');
    const all = (logs.log.concat(logs.error, logs.warn)).join('\n');
    expect(all).not.toContain('abcdefgh-1234-5678-9abc-def012345678');
    expect(all).toMatch(/abcd\*\*\*/);
  });

  it('A9 — log de sendPasswordReset nao expoe email completo', async () => {
    await sendPasswordReset('john.doe@example.com');
    const all = (logs.log.concat(logs.error, logs.warn)).join('\n');
    expect(all).not.toContain('john.doe@example.com');
    expect(all).toMatch(/j\*\*\*@example\.com/);
  });

  it('A10 — log de erro de signIn nao expoe objeto err completo nem stack', async () => {
    const err = new Error('auth/wrong-password');
    err.code = 'auth/wrong-password';
    err.sensitiveField = 'password-value-should-not-appear';
    authState.signInThrows = err;
    await signIn('test@example.com', 'wrong-password');
    const all = logs.error.join('\n');
    expect(all).not.toMatch(/at\s+[\w$]+\s+\(/);
    expect(all).not.toContain('sensitiveField');
    expect(all).not.toContain('password-value-should-not-appear');
  });
});
