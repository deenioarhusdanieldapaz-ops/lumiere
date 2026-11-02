import { createSheet } from '../sheet/sheet.js';
import { eventBus } from '../../core/eventBus.js';
import { showHelpTutorial } from '../help-tutorial/help-tutorial.js';
import { showHelpTooltip } from '../help-tooltip/help-tooltip.js';

// Dados das dicas (para o sub-menu)


// Dados do FAQ


export function showHelpPanel(moduleName = 'Tarefas', customData = {}) {
  const iconPlay = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="22" height="22"><circle cx="12" cy="12" r="10"></circle><polygon points="10 8 16 12 10 16 10 8"></polygon></svg>`;
  const iconBulb = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="22" height="22"><path d="M9 18h6"></path><path d="M10 22h4"></path><path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.2 1 2h6c0-.8.4-1.5 1-2A7 7 0 0 0 12 2z"></path></svg>`;
  const iconHelp = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="22" height="22"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`;
  const iconBook = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="22" height="22"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>`;

  const sheet = createSheet({
    title: 'Ajuda & Orientação',
    items: [
      { iconHtml: iconPlay, label: 'Guia do Módulo', sublabel: 'Aprenda passo a passo a usar este módulo.', action: 'guide' },
      { iconHtml: iconBulb, label: 'Dicas Contextuais', sublabel: 'Descubra dicas úteis quando precisar.', action: 'tips' },
      { iconHtml: iconHelp, label: 'Perguntas Frequentes', sublabel: 'Respostas para as dúvidas mais comuns.', action: 'faq' },
      { iconHtml: iconBook, label: 'Manual do Lumière', sublabel: 'Consulte o Manual do Lumière.', action: 'manual', highlight: true }
    ],
    onSelect: (item) => {
      if (item.action === 'guide') {
        const tutorialSteps = customData.tutorial || [];
        if (tutorialSteps.length > 0) {
          showHelpTutorial(tutorialSteps, () => {
            try { eventBus.emit('toast:show', { type: 'success', text: 'Guia do Módulo concluído!' }); } catch (_) {}
          });
        }
      } else if (item.action === 'tips') {
        openTipsMenu(customData.tips || []);
      } else if (item.action === 'faq') {
        openFaqMenu(customData.faq || []);
      } else if (item.action === 'manual') {
        alert('O Manual do Lumière estará disponível em breve.');
      }
    }
  });
  sheet.open();
}

// ==========================================
// FUNÇÕES AUXILIARES (ROTAS)
// ==========================================

function openTipsMenu(tips) {
  const sheet = createSheet({
    title: 'Dicas Contextuais',
    items: tips.map(tip => ({
      label: tip.title,
      sublabel: 'Ver dica',
      action: 'show_tip',
      tipData: tip
    })),
    onSelect: (item) => {
      if (item.action === 'show_tip') {
        // Espera o Sheet fechar (300ms) antes de mostrar o tooltip
        setTimeout(() => {
          const targetEl = document.querySelector(item.tipData.target) || document.querySelector('.lumiere-empty__btn');
          
          if (targetEl) {
            // Intencional: O utilizador clicou manualmente para ver a dica novamente.
            localStorage.removeItem('lumiere_tip_dismissed_' + item.tipData.id);
            showHelpTooltip({
              targetEl: targetEl,
              id: item.tipData.id,
              title: item.tipData.title,
              text: item.tipData.text
            });
          } else {
            // Fallback: Se o elemento não existe (lista vazia e sem botão header), mostra alerta
            alert(item.tipData.title + '\n\n' + item.tipData.text);
          }
        }, 350);
      }
    }
  });
  sheet.open();
}

function openFaqMenu(faq) {
  // Cria um modal customizado (overlay) para o Acordeão
  const backdrop = document.createElement('div');
  backdrop.className = 'help-faq-backdrop';

  const modal = document.createElement('div');
  modal.className = 'help-faq-modal';

  let faqHtml = `<h2 class="faq-title">Perguntas Frequentes</h2>`;
  faq.forEach(item => {
    faqHtml += `
      <details class="faq-item">
        <summary class="faq-question">${item.q}</summary>
        <p class="faq-answer">${item.a}</p>
      </details>
    `;
  });
  faqHtml += `<button type="button" class="faq-close-btn">Fechar</button>`;

  modal.innerHTML = faqHtml;
  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);

  const close = () => {
    backdrop.classList.remove('is-active');
    setTimeout(() => backdrop.remove(), 300);
  };

  modal.querySelector('.faq-close-btn').addEventListener('click', close);
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(); });

  requestAnimationFrame(() => backdrop.classList.add('is-active'));
}
