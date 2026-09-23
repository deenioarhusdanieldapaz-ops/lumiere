/**
 * Section: Hábitos
 *
 * Placeholder. NAO importa Core. Recebe tudo via context.
 */

export const habitsSection = {
  id: 'habits',
  order: 60,

  /**
   * @param {HTMLElement} container
   * @param {Object} context
   */
  render(container, context = {}) {
    const wrapper = document.createElement('section');
    wrapper.className = 'dashboard-section dashboard-section--habits';
    wrapper.setAttribute('aria-label', 'Hábitos');

    const title = document.createElement('h3');
    title.className = 'dashboard-section__title';
    title.textContent = 'Hábitos';
    wrapper.appendChild(title);

    const empty = document.createElement('p');
    empty.className = 'dashboard-section__empty';
    empty.textContent = 'Sem hábitos registados.';
    wrapper.appendChild(empty);

    container.appendChild(wrapper);
  }
};

export default habitsSection;
