import './setup/env.js';
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js", () => {
  const state = { exists: false, setDocThrows: null };
  return {
    __state: state,
    getFirestore: vi.fn(() => ({})),
    doc: vi.fn(() => ({})),
    setDoc: vi.fn(async () => {
      if (state.setDocThrows) throw state.setDocThrows;
      return undefined;
    }),
    getDoc: vi.fn(async () => ({ exists: () => state.exists })),
    collection: vi.fn(() => ({})),
    getDocs: vi.fn(async () => ({ docs: [], empty: true })),
    deleteDoc: vi.fn(async () => undefined)
  };
});

import { uploadDailyBackup, forceUploadBackup } from '../../core/backup.js';
import { dataManager } from '../../core/dataManager.js';

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

describe('F2-SEC-001 / uploadDailyBackup + forceUploadBackup (lacunas)', () => {
  let logs;
  beforeEach(async () => {
    vi.restoreAllMocks();
    logs = captureLogs();
    const fb = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
    fb.__state.exists = false;
    fb.__state.setDocThrows = null;
  });

  it('H10 — uploadDailyBackup devolve { ok: false } quando exportAllData lanca (falha de colecao)', async () => {
    // Simula falha de leitura de uma colecao: exportAllData vai lancar.
    // uploadDailyBackup tem de apanhar e devolver { ok: false, error }.
    vi.spyOn(dataManager, 'list').mockRejectedValueOnce(new Error('Falha simulada de colecao QA'));
    const r = await uploadDailyBackup('test-uid-h10');
    expect(r).toBeDefined();
    expect(r.ok).toBe(false);
    expect(typeof r.error).toBe('string');
    expect(r.error.length).toBeGreaterThan(0);
    // Sanitizacao: o log de erro nao deve conter stack trace nem objeto err completo
    const all = (logs.error.concat(logs.warn)).join('\n');
    expect(all).not.toMatch(/at\s+[\w$]+\s+\(/);
    expect(all).not.toMatch(/password|token|secret|apiKey/i);
  });

  it('H11 — forceUploadBackup devolve { ok: true, date } no sucesso', async () => {
    vi.spyOn(dataManager, 'list').mockResolvedValue([]);
    const r = await forceUploadBackup('test-uid-h11');
    expect(r).toBeDefined();
    expect(r.ok).toBe(true);
    expect(typeof r.date).toBe('string');
    expect(r.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('H12 — forceUploadBackup devolve { ok: false, error } sanitizado quando setDoc falha', async () => {
    vi.spyOn(dataManager, 'list').mockResolvedValue([]);
    const fb = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
    const err = new Error('permission-denied');
    err.code = 'permission-denied';
    fb.__state.setDocThrows = err;
    const r = await forceUploadBackup('test-uid-h12');
    expect(r).toBeDefined();
    expect(r.ok).toBe(false);
    expect(typeof r.error).toBe('string');
    expect(r.error.length).toBeGreaterThan(0);
    // Sanitizacao: log de erro deve ter prefixo [Backup][Firebase] e nao expor err completo
    const all = logs.error.join('\n');
    expect(all).toMatch(/\[Backup\]\[Firebase\]/);
    expect(all).not.toMatch(/at\s+[\w$]+\s+\(/);
    expect(all).not.toMatch(/password|token|secret|apiKey/i);
    // Nao deve conter o UID completo do teste
    expect(all).not.toContain('test-uid-h12');
  });
});
