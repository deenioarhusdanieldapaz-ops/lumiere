/**
 * Section: Today
 *
 * Mostra a data atual + placeholder do que está agendado para hoje.
 * NÃO importa Core. Recebe tudo via context.
 */

export const todaySection = {
  id: 'today',
  order: 20,

  /**
   * @param {HTMLElement} container
   * @param {Object} context
   */
  render(container, context = {}) {
    const now = new Date();
    const dateStr = now.toLocaleDateString('pt-PT', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    });

    const wrapper = document.createElement('section');
    wrapper.className = 'dashboard-section dashboard-section--today';
    wrapper.setAttribute('aria-label', 'Hoje');

    const title = document.createElement('h3');
    title.className = 'dashboard-section__title';
    title.textContent = 'Hoje';
    wrapper.appendChild(title);

    const date = document.createElement('p');
    date.className = 'dashboard-section__date';
    date.textContent = dateStr;
    wrapper.appendChild(date);

    const empty = document.createElement('p');
    empty.className = 'dashboard-section__empty';
    empty.textContent = 'Nada agendado para hoje.';
    wrapper.appendChild(empty);

    container.appendChild(wrapper);
  }
};

export default todaySection;
