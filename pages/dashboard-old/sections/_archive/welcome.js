/**
 * Section: Welcome
 *
 * Mostra uma saudação ao utilizador.
 * Recebe tudo via `context` — NÃO importa Core nem Storage.
 *
 * Context esperado:
 *   context.userName : string (opcional)
 *   context.state    : object (opcional)
 */

export const welcomeSection = {
  id: 'welcome',
  order: 10,

  /**
   * @param {HTMLElement} container
   * @param {Object} context
   */
  render(container, context = {}) {
    const name = (context.userName || context.state?.userName || '').trim();
    const greeting = name ? `Bem-vindo, ${name}` : 'Bem-vindo';

    const wrapper = document.createElement('section');
    wrapper.className = 'dashboard-section dashboard-section--welcome';
    wrapper.setAttribute('aria-label', 'Boas-vindas');

    const title = document.createElement('h2');
    title.className = 'dashboard-section__title';
    title.textContent = greeting;
    wrapper.appendChild(title);

    const subtitle = document.createElement('p');
    subtitle.className = 'dashboard-section__subtitle';
    subtitle.textContent = 'O seu gestor pessoal Lumière.';
    wrapper.appendChild(subtitle);

    container.appendChild(wrapper);
  }
};

export default welcomeSection;
