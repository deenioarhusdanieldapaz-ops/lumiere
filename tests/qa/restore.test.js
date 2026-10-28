import './setup/env.js';
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../core/eventBus.js', () => ({
  eventBus: { emit: vi.fn(), on: vi.fn(), off: vi.fn() }
}));

import { restoreData, ALL_COLLECTIONS } from '../../core/backup.js';
import { storageManager } from '../../core/storageManager.js';

function validTask(id, overrides = {}) {
  return {
    id, name: 'Tarefa QA ' + id, category: 'personal', status: 'pending',
    priority: 'medium', recurrence: 'none', reminder: false,
    tags: [], attachments: [],
    createdAt: '2026-10-28T00:00:00.000Z', updatedAt: '2026-10-28T00:00:00.000Z',
    ...overrides
  };
}

function makePayload(tasks = [], overrides = {}) {
  const data = {};
  for (const col of ALL_COLLECTIONS) data[col] = [];
  data.tasks = tasks;
  for (const [k, v] of Object.entries(overrides)) data[k] = v;
  let totalRecords = 0;
  for (const col of ALL_COLLECTIONS) totalRecords += data[col].length;
  return { formatVersion: 1, dbVersion: 4, exportedAt: new Date().toISOString(), appVersion: 'qa', totalRecords, data };
}

async function clearAll() {
  for (const col of ALL_COLLECTIONS) {
    try { await storageManager.clear(col); } catch (_) {}
  }
}
async function seedTasks(n) {
  const r = [];
  for (let i = 0; i < n; i++) { const t = validTask('seed-' + i); await storageManager.create('tasks', t); r.push(t); }
  return r;
}
async function dumpTasks() {
  const all = await storageManager.list('tasks');
  return all.sort((a, b) => (a.id < b.id ? -1 : 1));
}
function expectNoNetwork() { expect(globalThis.__networkCalls).toEqual([]); }

describe('F1-QA-001 / restoreData', () => {
  beforeEach(async () => { await clearAll(); });

  it('T1 — happy path', async () => {
    const payload = makePayload([validTask('qa-1'), validTask('qa-2')]);
    const result = await restoreData(payload);
    expect(result.success).toBe(true);
    expect(result.restoredCount).toBe(2);
    expect(result.errors).toEqual([]);
    const final = await dumpTasks();
    expect(final.length).toBe(2);
    expect(final.map(t => t.id)).toEqual(['qa-1', 'qa-2']);
    expectNoNetwork();
  });

  it('T2 — registo invalido (name vazio)', async () => {
    const seeded = await seedTasks(2);
    const payload = makePayload([validTask('qa-bad', { name: '' })]);
    const result = await restoreData(payload);
    expect(result.success).toBe(false);
    expect(result.restoredCount).toBe(0);
    expect(result.errors.length).toBeGreaterThan(0);
    const final = await dumpTasks();
    expect(final.length).toBe(2);
    expect(final.map(t => t.id).sort()).toEqual(seeded.map(t => t.id).sort());
    expectNoNetwork();
  });

  it('T3b — registo sem id: falha bulkPut, rollback', async () => {
    const seeded = await seedTasks(2);
    const taskSemId = validTask('placeholder'); delete taskSemId.id;
    const payload = makePayload([taskSemId]);
    const result = await restoreData(payload);
    expect(result.success).toBe(false);
    expect(result.restoredCount).toBe(0);
    const final = await dumpTasks();
    expect(final.length).toBe(2);
    expect(final.map(t => t.id).sort()).toEqual(seeded.map(t => t.id).sort());
    expectNoNetwork();
  });

  it('T5b — payload null', async () => {
    const result = await restoreData(null);
    expect(result.success).toBe(false);
    expect(result.restoredCount).toBe(0);
  });

  it('T5c — formatVersion invalida', async () => {
    await seedTasks(1);
    const payload = makePayload([validTask('qa-1')]);
    payload.formatVersion = 99;
    const result = await restoreData(payload);
    expect(result.success).toBe(false);
    expect((await dumpTasks()).length).toBe(1);
    expectNoNetwork();
  });

  it('T5d — dbVersion ausente', async () => {
    const payload = makePayload([validTask('qa-1')]);
    delete payload.dbVersion;
    const result = await restoreData(payload);
    expect(result.success).toBe(false);
  });

  it('T5e — totalRecords divergente', async () => {
    await seedTasks(1);
    const payload = makePayload([validTask('qa-1')]);
    payload.totalRecords = 999;
    const result = await restoreData(payload);
    expect(result.success).toBe(false);
    expect((await dumpTasks()).length).toBe(1);
    expectNoNetwork();
  });

  it('T5f — colecao em falta', async () => {
    const payload = makePayload([validTask('qa-1')]);
    delete payload.data.goals;
    const result = await restoreData(payload);
    expect(result.success).toBe(false);
  });
});
