// @vitest-environment jsdom
import './setup/env.js';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createEmptyState } from '../../components/empty-state/emptyState.js';

describe('F4.3 / createEmptyState', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('T1 — wrapper tem classe default + is-full-width off', () => {
    const el = createEmptyState({ title: 'Vazio' });
    expect(el.className).toContain('lumiere-empty--default');
    expect(el.className).not.toContain('is-full-width');
  });

  it('T2 — role="status" e aria-live="polite"', () => {
    const el = createEmptyState({ title: 'Vazio' });
    expect(el.getAttribute('role')).toBe('status');
    expect(el.getAttribute('aria-live')).toBe('polite');
  });

  it('T3 — título renderizado', () => {
    const el = createEmptyState({ title: 'Sem tarefas' });
    expect(el.querySelector('.lumiere-empty__title').textContent).toBe('Sem tarefas');
  });

  it('T4 — mensagem renderizada', () => {
    const el = createEmptyState({ title: 'X', message: 'Cria a tua primeira tarefa.' });
    expect(el.querySelector('.lumiere-empty__message').textContent).toBe('Cria a tua primeira tarefa.');
  });

  it('T5 — botão primário com callback', () => {
    const onAction = vi.fn();
    const el = createEmptyState({ title: 'X', actionLabel: 'Criar', onAction });
    const btn = el.querySelector('.lumiere-empty__btn--primary');
    expect(btn.textContent).toBe('Criar');
    btn.click();
    expect(onAction).toHaveBeenCalledOnce();
  });

  it('T6 — botão secundário com callback', () => {
    const onSecondary = vi.fn();
    const el = createEmptyState({ title: 'X', secondaryLabel: 'Importar', onSecondary });
    const btn = el.querySelector('.lumiere-empty__btn--secondary');
    expect(btn.textContent).toBe('Importar');
    btn.click();
    expect(onSecondary).toHaveBeenCalledOnce();
  });

  it('T7 — variant customizada', () => {
    const el = createEmptyState({ title: 'X', variant: 'minimal' });
    expect(el.className).toContain('lumiere-empty--minimal');
  });

  it('T8 — fullWidth aplica is-full-width', () => {
    const el = createEmptyState({ title: 'X', fullWidth: true });
    expect(el.className).toContain('is-full-width');
  });

  it('T9 — sem args: default title "Sem dados" aplicado (comportamento real)', () => {
    const el = createEmptyState({});
    const titleEl = el.querySelector('.lumiere-empty__title');
    expect(titleEl).toBeTruthy();
    expect(titleEl.textContent).toBe('Sem dados');
    expect(el.querySelector('.lumiere-empty__message')).toBeNull();
    expect(el.querySelector('.lumiere-empty__actions')).toBeNull();
  });

  it('T9b — title vazio explícito NÃO cria h3', () => {
    const el = createEmptyState({ title: '' });
    expect(el.querySelector('.lumiere-empty__title')).toBeNull();
  });

  it('T10 — icon como string SVG é injetado como innerHTML', () => {
    const svg = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/></svg>';
    const el = createEmptyState({ title: 'X', icon: svg });
    const iconWrap = el.querySelector('.lumiere-empty__icon');
    expect(iconWrap.innerHTML).toContain('<svg');
  });

  it('T11 — icon como emoji é textContent (sem HTML)', () => {
    const el = createEmptyState({ title: 'X', icon: '📝' });
    const iconWrap = el.querySelector('.lumiere-empty__icon');
    expect(iconWrap.textContent).toBe('📝');
    expect(iconWrap.innerHTML).not.toContain('<svg');
  });
});
