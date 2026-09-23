/**
 * Section: Finanças
 *
 * Placeholder. NAO importa Core. Recebe tudo via context.
 */

export const financesSection = {
  id: 'finances',
  order: 80,

  /**
   * @param {HTMLElement} container
   * @param {Object} context
   */
  render(container, context = {}) {
    const wrapper = document.createElement('section');
    wrapper.className = 'dashboard-section dashboard-section--finances';
    wrapper.setAttribute('aria-label', 'Finanças');

    const title = document.createElement('h3');
    title.className = 'dashboard-section__title';
    title.textContent = 'Finanças';
    wrapper.appendChild(title);

    const empty = document.createElement('p');
    empty.className = 'dashboard-section__empty';
    empty.textContent = 'Sem dados financeiros.';
    wrapper.appendChild(empty);

    container.appendChild(wrapper);
  }
};

export default financesSection;
