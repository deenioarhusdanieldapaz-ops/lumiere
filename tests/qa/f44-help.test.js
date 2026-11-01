// @vitest-environment jsdom
import './setup/env.js';
import { describe, it, expect, beforeEach, vi } from 'vitest';

if (typeof globalThis.requestAnimationFrame === 'undefined') {
  globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);
}

import { showHelpWelcome } from '../../components/help-welcome/help-welcome.js';
import { showHelpTutorial } from '../../components/help-tutorial/help-tutorial.js';
import { showHelpTooltip } from '../../components/help-tooltip/help-tooltip.js';

function nextFrame() { return new Promise(r => setTimeout(r, 20)); }

describe('F44 / help components', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('help-welcome', () => {
    it('W1 — cria backdrop + modal', async () => {
      showHelpWelcome('Tarefas');
      await nextFrame();
      expect(document.querySelector('.help-welcome-backdrop')).toBeTruthy();
      expect(document.querySelector('.help-welcome-modal')).toBeTruthy();
    });

    it('W2 — #hw-start grava seen (normalizado) + onComplete', async () => {
      const onComplete = vi.fn();
      showHelpWelcome('Tarefas', onComplete);
      await nextFrame();
      document.querySelector('#hw-start').click();
      expect(localStorage.getItem('lumiere_help_tarefas_seen')).toBe('true');
      expect(onComplete).toHaveBeenCalledOnce();
    });

    it('W3 — #hw-skip grava seen SEM onComplete', async () => {
      const onComplete = vi.fn();
      showHelpWelcome('Tarefas', onComplete);
      await nextFrame();
      document.querySelector('#hw-skip').click();
      expect(localStorage.getItem('lumiere_help_tarefas_seen')).toBe('true');
      expect(onComplete).not.toHaveBeenCalled();
    });

    it('W4 — #hw-close-btn NÃO grava seen', async () => {
      showHelpWelcome('Tarefas');
      await nextFrame();
      document.querySelector('#hw-close-btn').click();
      expect(localStorage.getItem('lumiere_help_tarefas_seen')).toBeNull();
    });

    it('W5 — case-insensitive: "TAREFAS" e "tarefas" geram a mesma chave', async () => {
      showHelpWelcome('TAREFAS');
      await nextFrame();
      document.querySelector('#hw-skip').click();
      expect(localStorage.getItem('lumiere_help_tarefas_seen')).toBe('true');
      localStorage.clear();
      showHelpWelcome('tarefas');
      await nextFrame();
      document.querySelector('#hw-skip').click();
      expect(localStorage.getItem('lumiere_help_tarefas_seen')).toBe('true');
    });
  });

  describe('help-tutorial', () => {
    const steps = [
      { target: '.step-1', title: 'Passo 1', text: 'Primeiro' },
      { target: '.step-2', title: 'Passo 2', text: 'Segundo' },
      { target: '.step-3', title: 'Passo 3', text: 'Terceiro' }
    ];

    it('TU1 — cria backdrop + tooltip + spotlight', async () => {
      showHelpTutorial(steps);
      await nextFrame();
      expect(document.querySelector('.help-tutorial-backdrop')).toBeTruthy();
      expect(document.querySelector('.help-tutorial-tooltip')).toBeTruthy();
      expect(document.querySelector('.help-tutorial-spotlight')).toBeTruthy();
    });

    it('TU2 — mostra passo 1 de 3', async () => {
      showHelpTutorial(steps);
      await nextFrame();
      expect(document.querySelector('.tut-step-indicator').textContent).toContain('Passo 1 de 3');
      expect(document.querySelector('.tut-title').textContent).toBe('Passo 1');
    });

    it('TU3 — #tut-next avança para passo 2', async () => {
      showHelpTutorial(steps);
      await nextFrame();
      document.querySelector('#tut-next').click();
      await nextFrame();
      expect(document.querySelector('.tut-step-indicator').textContent).toContain('Passo 2 de 3');
    });

    it('TU4 — #tut-prev volta para passo 1', async () => {
      showHelpTutorial(steps);
      await nextFrame();
      document.querySelector('#tut-next').click();
      await nextFrame();
      document.querySelector('#tut-prev').click();
      await nextFrame();
      expect(document.querySelector('.tut-step-indicator').textContent).toContain('Passo 1 de 3');
    });

    it('TU5 — último passo: "Concluir" e chama onComplete', async () => {
      const onComplete = vi.fn();
      showHelpTutorial(steps, onComplete);
      await nextFrame();
      document.querySelector('#tut-next').click();
      await nextFrame();
      document.querySelector('#tut-next').click();
      await nextFrame();
      const btn = document.querySelector('#tut-next');
      expect(btn.textContent).toBe('Concluir');
      btn.click();
      await nextFrame();
      expect(onComplete).toHaveBeenCalledOnce();
    });

    it('TU6 — #tut-skip fecha sem onComplete', async () => {
      const onComplete = vi.fn();
      showHelpTutorial(steps, onComplete);
      await nextFrame();
      document.querySelector('#tut-skip').click();
      await nextFrame();
      expect(document.querySelector('.help-tutorial-backdrop')).toBeNull();
      expect(onComplete).not.toHaveBeenCalled();
    });

    it('TU7 — steps vazio não cria DOM', async () => {
      showHelpTutorial([]);
      await nextFrame();
      expect(document.querySelector('.help-tutorial-backdrop')).toBeNull();
    });
  });

  describe('help-tooltip', () => {
    function makeTarget() {
      const btn = document.createElement('button');
      document.body.appendChild(btn);
      return btn;
    }

    it('TT1 — targetEl null não cria bubble', () => {
      showHelpTooltip({ targetEl: null, id: 'tip_x', title: 'T', text: 'X' });
      expect(document.querySelector('.help-tooltip-bubble')).toBeNull();
    });

    it('TT2 — dismissed=true NÃO mostra', () => {
      localStorage.setItem('lumiere_tip_dismissed_tip_x', 'true');
      showHelpTooltip({ targetEl: makeTarget(), id: 'tip_x', title: 'T', text: 'X' });
      expect(document.querySelector('.help-tooltip-bubble')).toBeNull();
    });

    it('TT3 — cria bubble com title + text', () => {
      showHelpTooltip({ targetEl: makeTarget(), id: 'tip_x', title: 'Título QA', text: 'Texto QA' });
      expect(document.querySelector('.tooltip-title').textContent).toBe('Título QA');
      expect(document.querySelector('.tooltip-text').textContent).toBe('Texto QA');
    });

    it('TT4 — checkbox OFF: "Entendi" NÃO grava dismissal', () => {
      showHelpTooltip({ targetEl: makeTarget(), id: 'tip_x', title: 'T', text: 'X' });
      document.querySelector('.tooltip-btn').click();
      expect(localStorage.getItem('lumiere_tip_dismissed_tip_x')).toBeNull();
    });

    it('TT5 — checkbox ON: "Entendi" grava dismissal', () => {
      showHelpTooltip({ targetEl: makeTarget(), id: 'tip_x', title: 'T', text: 'X' });
      document.querySelector('#tooltip-dismiss-tip_x').checked = true;
      document.querySelector('.tooltip-btn').click();
      expect(localStorage.getItem('lumiere_tip_dismissed_tip_x')).toBe('true');
    });

    it('TT6 — onDismiss é chamado ao fechar', () => {
      const onDismiss = vi.fn();
      showHelpTooltip({ targetEl: makeTarget(), id: 'tip_x', title: 'T', text: 'X', onDismiss });
      document.querySelector('.tooltip-btn').click();
      expect(onDismiss).toHaveBeenCalledOnce();
    });
  });
});
