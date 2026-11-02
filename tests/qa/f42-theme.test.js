// @vitest-environment jsdom
import './setup/env.js';
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('F4.2 / stateManager tema e persistência', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
  });

  it('T1 — default theme = noir (localStorage vazio)', async () => {
    const { stateManager } = await import('../../core/stateManager.js');
    expect(stateManager.getState().user.preferences.theme).toBe('noir');
  });

  it('T2 — set() persiste theme em localStorage[lumiereState]', async () => {
    const { stateManager } = await import('../../core/stateManager.js');
    stateManager.set({ user: { preferences: { theme: 'lumiere' } } });
    const stored = JSON.parse(localStorage.getItem('lumiereState'));
    expect(stored.user.preferences.theme).toBe('lumiere');
    expect(stored.preferences.theme).toBe('lumiere');
  });

  it('T3 — _loadPersistedState restaura theme do localStorage no arranque', async () => {
    localStorage.setItem('lumiereState', JSON.stringify({
      user: { preferences: { theme: 'lumiere' } },
      preferences: { theme: 'lumiere' }
    }));
    vi.resetModules();
    const { stateManager } = await import('../../core/stateManager.js');
    expect(stateManager.getState().user.preferences.theme).toBe('lumiere');
  });

  it('T6 — persistência entre "sessões" (resetModules simula reload)', async () => {
    const { stateManager: s1 } = await import('../../core/stateManager.js');
    s1.set({ user: { preferences: { theme: 'lumiere' } } });

    vi.resetModules();
    const { stateManager: s2 } = await import('../../core/stateManager.js');
    expect(s2.getState().user.preferences.theme).toBe('lumiere');
  });

  it('T2b — tema inválido persistido não quebra arranque', async () => {
    localStorage.setItem('lumiereState', JSON.stringify({
      user: { preferences: { theme: 'inexistente' } },
      preferences: { theme: 'inexistente' }
    }));
    vi.resetModules();
    const { stateManager } = await import('../../core/stateManager.js');
    // O stateManager não valida; apenas persiste. O applyTheme (não testado) é que valida.
    // Este teste documenta que o stateManager aceita qualquer string.
    expect(typeof stateManager.getState().user.preferences.theme).toBe('string');
  });
});
