/**
 * Section: Lumière
 *
 * Placeholder. NAO importa Core. Recebe tudo via context.
 */

export const lumiereSection = {
  id: 'lumiere',
  order: 90,

  /**
   * @param {HTMLElement} container
   * @param {Object} context
   */
  render(container, context = {}) {
    const wrapper = document.createElement('section');
    wrapper.className = 'dashboard-section dashboard-section--lumiere';
    wrapper.setAttribute('aria-label', 'Lumière');

    const title = document.createElement('h3');
    title.className = 'dashboard-section__title';
    title.textContent = 'Lumière';
    wrapper.appendChild(title);

    const empty = document.createElement('p');
    empty.className = 'dashboard-section__empty';
    empty.textContent = 'Sem dados de operação Lumière.';
    wrapper.appendChild(empty);

    container.appendChild(wrapper);
  }
};

export default lumiereSection;
