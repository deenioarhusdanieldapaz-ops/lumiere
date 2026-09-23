/**
 * Card Component
 * Componente reutilizável de UI. NÃO conhece regras de negócio.
 * Recebe dados via parâmetros e emite callbacks.
 */

/**
 * Cria um elemento de card.
 * @param {Object} options
 * @param {string} options.title - Título do card
 * @param {string} [options.subtitle] - Subtítulo opcional
 * @param {string|HTMLElement} [options.content] - Conteúdo principal
 * @param {string} [options.variant='default'] - 'default' | 'compact' | 'highlight'
 * @param {boolean} [options.clickable=false]
 * @param {Function} [options.onClick]
 * @param {Array<string>} [options.actions] - Ações opcionais
 * @param {Function} [options.onAction] - (actionName) => void
 * @returns {HTMLElement}
 */
export function createCard({
  title = '',
  subtitle = '',
  content = '',
  variant = 'default',
  clickable = false,
  onClick = null,
  actions = [],
  onAction = null
} = {}) {
  const card = document.createElement('article');
  card.className = `lumiere-card lumiere-card--${variant}`;
  if (clickable) {
    card.classList.add('lumiere-card--clickable');
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
  }

  if (title || subtitle || actions.length > 0) {
    const header = document.createElement('header');
    header.className = 'lumiere-card__header';

    if (title) {
      const h = document.createElement('h3');
      h.className = 'lumiere-card__title';
      h.textContent = title;
      header.appendChild(h);
    }

    if (subtitle) {
      const s = document.createElement('p');
      s.className = 'lumiere-card__subtitle';
      s.textContent = subtitle;
      header.appendChild(s);
    }

    if (actions.length > 0) {
      const actionsWrapper = document.createElement('div');
      actionsWrapper.className = 'lumiere-card__actions';
      actions.forEach((action) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'lumiere-card__action';
        btn.dataset.action = action;
        btn.setAttribute('aria-label', action);
        btn.textContent = action;
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (typeof onAction === 'function') onAction(action);
        });
        actionsWrapper.appendChild(btn);
      });
      header.appendChild(actionsWrapper);
    }

    card.appendChild(header);
  }

  const body = document.createElement('div');
  body.className = 'lumiere-card__body';
  if (typeof content === 'string') {
    body.textContent = content;
  } else if (content instanceof HTMLElement) {
    body.appendChild(content);
  }
  card.appendChild(body);

  if (clickable && typeof onClick === 'function') {
    card.addEventListener('click', () => onClick());
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onClick();
      }
    });
  }

  return card;
}

export default createCard;
