// @vitest-environment jsdom
import './setup/env.js';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { showDeleteModal } from '../../components/delete-modal/delete-modal.js';

if (typeof globalThis.requestAnimationFrame === 'undefined') {
  globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);
}

function getEls() {
  return {
    backdrop: document.querySelector('.delete-modal-backdrop'),
    input: document.querySelector('#delete-confirm-input'),
    btnDelete: document.querySelector('#delete-confirm-btn'),
    btnCancel: document.querySelector('.delete-modal__btn--cancel')
  };
}

function type(input, text) {
  input.value = text;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

describe('F4.3 / delete-modal', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('T1 — botão começa desativado', () => {
    showDeleteModal({ onConfirm: vi.fn() });
    const { btnDelete } = getEls();
    expect(btnDelete).toBeTruthy();
    expect(btnDelete.disabled).toBe(true);
  });

  it('T2 — "apagar" (minúsculo) mantém desativado', () => {
    showDeleteModal({ onConfirm: vi.fn() });
    const { input, btnDelete } = getEls();
    type(input, 'apagar');
    expect(btnDelete.disabled).toBe(true);
  });

  it('T3 — "APAGAR " (com espaço) mantém desativado', () => {
    showDeleteModal({ onConfirm: vi.fn() });
    const { input, btnDelete } = getEls();
    type(input, 'APAGAR ');
    expect(btnDelete.disabled).toBe(true);
  });

  it('T4 — "APAGAR" exato ativa o botão', () => {
    showDeleteModal({ onConfirm: vi.fn() });
    const { input, btnDelete } = getEls();
    type(input, 'APAGAR');
    expect(btnDelete.disabled).toBe(false);
  });

  it('T5 — Cancelar não chama onConfirm', () => {
    const onConfirm = vi.fn();
    showDeleteModal({ onConfirm });
    const { input, btnCancel } = getEls();
    type(input, 'APAGAR');
    btnCancel.click();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('T6 — Eliminar (input válido) chama onConfirm', async () => {
    const onConfirm = vi.fn().mockResolvedValue();
    showDeleteModal({ onConfirm });
    const { input, btnDelete } = getEls();
    type(input, 'APAGAR');
    btnDelete.click();
    await vi.waitFor(() => expect(onConfirm).toHaveBeenCalledOnce());
  });

  it('T7 — onConfirm rejeitado mostra estado de erro', async () => {
    const onConfirm = vi.fn().mockRejectedValue(new Error('Backup falhou QA'));
    showDeleteModal({ onConfirm });
    const { input, btnDelete } = getEls();
    type(input, 'APAGAR');
    btnDelete.click();
    await vi.waitFor(() => {
      const errorMsg = document.querySelector('#delete-error-msg');
      expect(errorMsg?.textContent).toContain('Backup falhou QA');
    });
  });

  it('T8 — confirmWord customizado (REINICIAR) só aceita REINICIAR', () => {
    showDeleteModal({ onConfirm: vi.fn(), confirmWord: 'REINICIAR' });
    const { input, btnDelete } = getEls();
    type(input, 'APAGAR');
    expect(btnDelete.disabled).toBe(true);
    type(input, 'REINICIAR');
    expect(btnDelete.disabled).toBe(false);
  });

  it('T9 — clicar no backdrop não fecha modal', () => {
    showDeleteModal({ onConfirm: vi.fn() });
    const { backdrop } = getEls();
    backdrop.click();
    expect(document.querySelector('.delete-modal-backdrop')).toBeTruthy();
  });

  it('T10 — após erro, botão "Tentar novamente" volta ao estado normal', async () => {
    const onConfirm = vi.fn().mockRejectedValue(new Error('Falha QA'));
    showDeleteModal({ onConfirm });
    const { input, btnDelete } = getEls();
    type(input, 'APAGAR');
    btnDelete.click();
    await vi.waitFor(() => {
      expect(document.querySelector('#delete-error-msg')?.textContent).toContain('Falha QA');
    });
    document.querySelector('#delete-btn-retry').click();
    const contents = document.querySelectorAll('.delete-modal__content');
    let visibleNormal = false;
    contents.forEach(c => {
      if (!c.classList.contains('delete-modal__content--error') &&
          !c.classList.contains('delete-modal__content--processing') &&
          c.style.display === 'flex') visibleNormal = true;
    });
    expect(visibleNormal).toBe(true);
  });
});
