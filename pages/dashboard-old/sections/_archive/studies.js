/**
 * Section: Estudos
 *
 * Placeholder. NAO importa Core. Recebe tudo via context.
 */

export const studiesSection = {
  id: 'studies',
  order: 70,

  /**
   * @param {HTMLElement} container
   * @param {Object} context
   */
  render(container, context = {}) {
    const wrapper = document.createElement('section');
    wrapper.className = 'dashboard-section dashboard-section--studies';
    wrapper.setAttribute('aria-label', 'Estudos');

    const title = document.createElement('h3');
    title.className = 'dashboard-section__title';
    title.textContent = 'Estudos';
    wrapper.appendChild(title);

    const empty = document.createElement('p');
    empty.className = 'dashboard-section__empty';
    empty.textContent = 'Sem estudos em curso.';
    wrapper.appendChild(empty);

    container.appendChild(wrapper);
  }
};

export default studiesSection;
