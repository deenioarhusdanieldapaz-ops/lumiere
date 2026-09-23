/**
 * Section: Objetivos
 *
 * Placeholder. NAO importa Core. Recebe tudo via context.
 */

export const goalsSection = {
  id: 'goals',
  order: 50,

  /**
   * @param {HTMLElement} container
   * @param {Object} context
   */
  render(container, context = {}) {
    const wrapper = document.createElement('section');
    wrapper.className = 'dashboard-section dashboard-section--goals';
    wrapper.setAttribute('aria-label', 'Objetivos');

    const title = document.createElement('h3');
    title.className = 'dashboard-section__title';
    title.textContent = 'Objetivos';
    wrapper.appendChild(title);

    const empty = document.createElement('p');
    empty.className = 'dashboard-section__empty';
    empty.textContent = 'Sem objetivos definidos.';
    wrapper.appendChild(empty);

    container.appendChild(wrapper);
  }
};

export default goalsSection;
