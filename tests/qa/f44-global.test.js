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

// Nomes confirmados por inspeção de pages/*/*.js
const MODULES = [
  { name: 'Objetivos',  key: 'objetivos'  },  // Metas
  { name: 'Estudos',    key: 'estudos'    },
  { name: 'Calendário', key: 'calendario' },  // acento removido por normalize
  { name: 'Notas',      key: 'notas'      },
  { name: 'Lumière',    key: 'lumiere'    },  // acento removido por normalize
  { name: 'Templates',  key: 'templates'  }
];

describe('F44 Global / 6 módulos do Lote 2', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    localStorage.clear();
    vi.restoreAllMocks();
  });

  // ============ WELCOME: persiste chave correta (incluindo normalize) ============
  describe('help-welcome — persistência por módulo', () => {
    MODULES.forEach(m => {
      it(`W[${m.key}] — showHelpWelcome('${m.name}') grava lumiere_help_${m.key}_seen`, async () => {
        showHelpWelcome(m.name);
        await nextFrame();
        document.querySelector('#hw-skip').click();
        expect(localStorage.getItem(`lumiere_help_${m.key}_seen`)).toBe('true');
      });
    });
  });

  // ============ PANEL: aceita customData sem crashar ============
  describe('help-panel — customData por módulo', () => {
    MODULES.forEach(m => {
      it(`P[${m.key}] — showHelpPanel('${m.name}', HELP_CONFIG) não crasha`, () => {
        expect(() => showHelpPanel(m.name, {
          welcome: { title: `Cápsula ${m.name}`, subtitle: 'QA' },
          tips: [{ id: 'tip_qa', target: '.qa', title: 'T', text: 'X' }],
          faq: [{ q: 'Q?', a: 'A.' }],
          tutorial: [{ target: '.qa', title: 'T', text: 'X' }]
        })).not.toThrow();
      });
    });
  });

  // ============ NORMALIZE: prova explícita para os 2 com acento ============
  describe('help-welcome — normalize de acentos', () => {
    it('N1 — "Calendário" grava "calendario" (sem acento)', async () => {
      showHelpWelcome('Calendário');
      await nextFrame();
      document.querySelector('#hw-skip').click();
      expect(localStorage.getItem('lumiere_help_calendario_seen')).toBe('true');
      expect(localStorage.getItem('lumiere_help_calendário_seen')).toBeNull();
    });

    it('N2 — "Lumière" grava "lumiere" (sem acento)', async () => {
      showHelpWelcome('Lumière');
      await nextFrame();
      document.querySelector('#hw-skip').click();
      expect(localStorage.getItem('lumiere_help_lumiere_seen')).toBe('true');
      expect(localStorage.getItem('lumiere_help_lumière_seen')).toBeNull();
    });
  });
});
