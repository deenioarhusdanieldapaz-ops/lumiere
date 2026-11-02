// @vitest-environment jsdom
import './setup/env.js';
import { describe, it, expect, beforeEach, vi } from 'vitest';

if (typeof globalThis.requestAnimationFrame === 'undefined') {
  globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);
}

vi.mock('../../components/sheet/sheet.js', () => ({
  createSheet: vi.fn(({ items }) => ({ open: vi.fn(), _items: items }))
}));

vi.mock('../../core/eventBus.js', () => ({
  eventBus: { emit: vi.fn(), on: vi.fn(), off: vi.fn() }
}));

import { showHelpWelcome } from '../../components/help-welcome/help-welcome.js';
import { showHelpPanel } from '../../components/help-panel/help-panel.js';
import { createSheet } from '../../components/sheet/sheet.js';

function nextFrame() { return new Promise(r => setTimeout(r, 20)); }

describe('F44 Lote 1 / Finanças e Hábitos', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('help-welcome — customText', () => {
    it('W1 — customText.title substitui o default', async () => {
      showHelpWelcome('Finanças', null, { title: 'Cápsula QA', subtitle: 'Sub QA' });
      await nextFrame();
      expect(document.querySelector('.hw-title-line1').textContent).toContain('Cápsula QA');
    });

    it('W2 — sem customText → default "Bem-vindo ao Módulo" + moduleName', async () => {
      showHelpWelcome('Finanças');
      await nextFrame();
      expect(document.querySelector('.hw-title-line1').textContent).toContain('Bem-vindo ao Módulo');
      expect(document.querySelector('.hw-title-line2').textContent).toBe('Finanças');
    });

    it('W3 — customText.subtitle substitui a descrição', async () => {
      showHelpWelcome('Finanças', null, { title: 'X', subtitle: 'Descrição QA' });
      await nextFrame();
      expect(document.querySelector('.hw-desc').textContent).toBe('Descrição QA');
    });

    it('W4 — normalize: "Finanças" e "financas" geram a mesma chave', async () => {
      showHelpWelcome('Finanças');
      await nextFrame();
      document.querySelector('#hw-skip').click();
      expect(localStorage.getItem('lumiere_help_financas_seen')).toBe('true');
      localStorage.clear();
      showHelpWelcome('financas');
      await nextFrame();
      document.querySelector('#hw-skip').click();
      expect(localStorage.getItem('lumiere_help_financas_seen')).toBe('true');
    });

    it('W5 — normalize: "Hábitos" grava chave "habitos" (sem acento)', async () => {
      showHelpWelcome('Hábitos');
      await nextFrame();
      document.querySelector('#hw-skip').click();
      expect(localStorage.getItem('lumiere_help_habitos_seen')).toBe('true');
    });
  });

  describe('help-panel — customData', () => {
    it('P1 — cria 4 items (guide, tips, faq, manual)', () => {
      showHelpPanel('Finanças', { tips: [], faq: [], tutorial: [] });
      const call = createSheet.mock.calls[createSheet.mock.calls.length - 1];
      const labels = call[0].items.map(i => i.label);
      expect(labels).toContain('Guia do Módulo');
      expect(labels).toContain('Dicas Contextuais');
      expect(labels).toContain('Perguntas Frequentes');
      expect(labels).toContain('Manual do Lumière');
    });

    it('P2 — customData com tips/faq/tutorial não crasha', () => {
      expect(() => showHelpPanel('Tarefas', {
        tips: [{ id: 't', title: 'T', text: 'X', target: '.qa' }],
        faq: [{ q: 'Q?', a: 'A.' }],
        tutorial: [{ target: '.qa', title: 'T', text: 'X' }]
      })).not.toThrow();
    });

    it('P3 — sem customData não crasha (fallback vazio)', () => {
      expect(() => showHelpPanel('Tarefas')).not.toThrow();
    });
  });
});
