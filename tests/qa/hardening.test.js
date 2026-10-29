import './setup/env.js';
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../core/eventBus.js', () => ({
  eventBus: { emit: vi.fn(), on: vi.fn(), off: vi.fn() }
}));

import { exportAllData, uploadDailyBackup } from '../../core/backup.js';
import { storageManager } from '../../core/storageManager.js';

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

describe('F2-SEC-001 / hardening', () => {
  let logs;
  beforeEach(() => {
    vi.restoreAllMocks();
    logs = captureLogs();
  });

  it('H1 — exportAllData lanca quando uma colecao falha', async () => {
    const spy = vi.spyOn(storageManager, 'list').mockRejectedValueOnce(new Error('Falha simulada QA'));
    await expect(exportAllData()).rejects.toThrow(/Falha ao exportar a coleção/);
    expect(logs.error.join('\n')).toMatch(/Erro crítico ao ler coleção/);
    spy.mockRestore();
  });

  it('H2 — log de erro de export nao expoe objeto err completo nem campos sensiveis', async () => {
    vi.spyOn(storageManager, 'list').mockRejectedValueOnce(new Error('Teste QA interno'));
    try { await exportAllData(); } catch (_) {}
    const all = (logs.error.concat(logs.log, logs.warn)).join('\n');
    expect(all).not.toMatch(/at\s+[\w$]+\s+\(/);   // sem stack trace
    expect(all).not.toMatch(/amount|email|password|token|secret/i);
    expect(all).toMatch(/Teste QA interno/);
  });

  it('H3 — uploadDailyBackup devolve { ok: false, error } quando Firebase nao esta acessivel', async () => {
    // Sem mock Firebase: import remoto falha (rede bloqueada).
    // O catch (linha 207) deve devolver { ok: false, error }
    const result = await uploadDailyBackup('test-uid-abcd-1234');
    expect(result).toBeDefined();
    expect(result).toHaveProperty('ok', false);
    expect(result).toHaveProperty('error');
    expect(typeof result.error).toBe('string');
  });

  it('H4 — log de erro de Firebase usa prefixo [Backup][Firebase] sem err completo', async () => {
    await uploadDailyBackup('test-uid-abcd-1234');
    const all = logs.error.join('\n');
    expect(all).toMatch(/\[Backup\]\[Firebase\]/);
    expect(all).not.toMatch(/at\s+[\w$]+\s+\(/);
    expect(all).not.toMatch(/password|token|secret|apiKey/i);
    expect(all).toMatch(/sem-codigo|Error|TypeError|ERR_/);
  });

  it('H5 — uploadDailyBackup com UID nao vaza UID completo em logs de sucesso', async () => {
    const uid = 'abcdefghij-1234-5678-9abc-def012345678';
    try { await uploadDailyBackup(uid); } catch (_) {}
    const all = (logs.log.concat(logs.error, logs.warn)).join('\n');
    expect(all).not.toContain(uid);
    if (all.includes('Enviado com sucesso')) {
      expect(all).toMatch(/abcd\*\*\*/);
    }
  });
});
