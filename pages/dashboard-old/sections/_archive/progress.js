/**
 * Section: Progress
 *
 * Mostra o Índice de Evolução como círculo (progressRing).
 * NÃO importa Core. Recebe tudo via context.
 */
import { createProgressRing } from '../../../components/progress-ring/progressRing.js';

export const progressSection = {
  id: 'progress',
  order: 40,

  /**
   * @param {HTMLElement} container
   * @param {Object} context
   */
  render(container, context = {}) {
    const wrapper = document.createElement('section');
    wrapper.className = 'dashboard-section dashboard-section--progress';
    wrapper.setAttribute('aria-label', 'Progresso');

    const title = document.createElement('h3');
    title.className = 'dashboard-section__title';
    title.textContent = 'Progresso geral';
    wrapper.appendChild(title);

    // Tentar obter o índice do contexto (se existir)
    const collections = context.collections || {};
    let indexValue = null;
    let indexReason = '';

    // Se o contexto trouxer um índice calculado, usamos
    if (context.insights && typeof context.insights.index === 'number') {
      indexValue = context.insights.index;
      indexReason = context.insights.reason || '';
    } else if (context.lumiereIndex && typeof context.lumiereIndex.score === 'number') {
      indexValue = context.lumiereIndex.score;
      indexReason = context.lumiereIndex.reason || '';
    }

    const ringWrap = document.createElement('div');
    ringWrap.className = 'dashboard-section__ring';

    const ring = createProgressRing({
      value: indexValue === null ? 0 : indexValue,
      label: 'Índice de Evolução',
      caption: indexReason,
      variant: indexValue === null ? 'empty' : 'default',
      size: 140,
      stroke: 10,
      animate: true
    });
    ringWrap.appendChild(ring);
    wrapper.appendChild(ringWrap);

    container.appendChild(wrapper);
  }
};

export default progressSection;
