import './setup/env.js';
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js", () => {
  const state = { exists: false };
  return {
    __state: state,
    getFirestore: vi.fn(() => ({})),
    doc: vi.fn(() => ({})),
    setDoc: vi.fn(async () => undefined),
    getDoc: vi.fn(async () => ({ exists: () => state.exists })),
    collection: vi.fn(() => ({})),
    getDocs: vi.fn(async () => ({ docs: [], empty: true })),
    deleteDoc: vi.fn(async () => undefined)
  };
});

import { uploadDailyBackup } from '../../core/backup.js';
import { dataManager } from '../../core/dataManager.js';

describe('F2-SEC-001 / uploadDailyBackup contract', () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    const fb = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
    fb.__state.exists = false;
  });

  it('H6 — sem UID devolve { ok: false, error }', async () => {
    const r = await uploadDailyBackup(null);
    expect(r).toBeDefined();
    expect(r.ok).toBe(false);
    expect(typeof r.error).toBe('string');
    expect(r.error).toMatch(/autenticado|UID/i);
  });

  it('H7 — backup do dia ja existe devolve { ok: true, skipped: true }', async () => {
    const fb = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
    fb.__state.exists = true;
    const r = await uploadDailyBackup('test-uid-1234');
    expect(r).toBeDefined();
    expect(r.ok).toBe(true);
    expect(r.skipped).toBe(true);
  });

  it('H8 — payload > 1MB devolve { ok: false, error }', async () => {
    const fb = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
    fb.__state.exists = false;
    const huge = Array.from({ length: 5 }, (_, i) => ({ id: 'x' + i, payload: 'a'.repeat(10000) }));
    vi.spyOn(dataManager, 'list').mockResolvedValue(huge);
    const r = await uploadDailyBackup('test-uid-1234');
    expect(r).toBeDefined();
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/1MB|grande/i);
  });

  it('H9 — sucesso devolve { ok: true, date }', async () => {
    const fb = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
    fb.__state.exists = false;
    vi.spyOn(dataManager, 'list').mockResolvedValue([]);
    const r = await uploadDailyBackup('test-uid-1234');
    expect(r).toBeDefined();
    expect(r.ok).toBe(true);
    expect(typeof r.date).toBe('string');
    expect(r.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
