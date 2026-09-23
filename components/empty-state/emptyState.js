/**
 * EmptyState Component
 * Exibe um estado vazio (ausência de dados).
 * NÃO é um erro. NÃO é loading.
 * Pode ter um ícone, título, mensagem e ação opcional.
 */

/**
 * @param {Object} options
 * @param {string} [options.title='Sem dados'] - Título principal
 * @param {string} [options.message=''] - Mensagem explicativa
 * @param {string} [options.icon='—'] - Ícone textual/símbolo
 * @param {string} [options.actionLabel=''] - Rótulo do botão de ação
 * @param {Function} [options.onAction=null] - Callback do botão
 * @param {string} [options.variant='default'] - 'default' | 'compact' | 'inline'
 * @returns {HTMLElement}
 */
export function createEmptyState({
  title = 'Sem dados',
  message = '',
  icon = '—',
  actionLabel = '',
  onAction = null,
  variant = 'default'
} = {}) {
  const wrapper = document.createElement('div');
  wrapper.className = `lumiere-empty lumiere-empty--${variant}`;
  wrapper.setAttribute('role', 'status');
  wrapper.setAttribute('aria-live', 'polite');

  if (icon) {
    const iconEl = document.createElement('div');
    iconEl.className = 'lumiere-empty__icon';
    iconEl.setAttribute('aria-hidden', 'true');
    iconEl.textContent = icon;
    wrapper.appendChild(iconEl);
  }

  if (title) {
    const titleEl = document.createElement('h3');
    titleEl.className = 'lumiere-empty__title';
    titleEl.textContent = title;
    wrapper.appendChild(titleEl);
  }

  if (message) {
    const msgEl = document.createElement('p');
    msgEl.className = 'lumiere-empty__message';
    msgEl.textContent = message;
    wrapper.appendChild(msgEl);
  }

  if (actionLabel && typeof onAction === 'function') {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'lumiere-empty__action';
    btn.textContent = actionLabel;
    btn.addEventListener('click', () => onAction());
    wrapper.appendChild(btn);
  }

  return wrapper;
}

export default createEmptyState;
