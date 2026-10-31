/**
 * EmptyState Component - V2 (F4.3)
 * Suporta as 8 variantes do Design System (LUM-DES-EMPTY-001).
 */

export function createEmptyState({
  title = 'Sem dados',
  message = '',
  icon = null,          // Pode ser um SVG string, emoji ou null
  actionLabel = '',
  onAction = null,
  secondaryLabel = '',  // Para a variante de duas opções
  onSecondary = null,
  variant = 'default',  // 'minimal', 'default', 'featured', 'illustration', 'double', 'contextual', 'card', 'mobile'
  fullWidth = false
} = {}) {
  const wrapper = document.createElement('div');
  wrapper.className = `lumiere-empty lumiere-empty--${variant} ${fullWidth ? 'is-full-width' : ''}`;
  wrapper.setAttribute('role', 'status');
  wrapper.setAttribute('aria-live', 'polite');

  // Ícone / Ilustração
  if (icon) {
    const iconWrap = document.createElement('div');
    iconWrap.className = 'lumiere-empty__icon';
    if (icon.startsWith('<svg')) {
      iconWrap.innerHTML = icon;
    } else {
      iconWrap.textContent = icon;
    }
    wrapper.appendChild(iconWrap);
  }

  // Título
  if (title) {
    const titleEl = document.createElement('h3');
    titleEl.className = 'lumiere-empty__title';
    titleEl.textContent = title;
    wrapper.appendChild(titleEl);
  }

  // Descrição
  if (message) {
    const msgEl = document.createElement('p');
    msgEl.className = 'lumiere-empty__message';
    msgEl.textContent = message;
    wrapper.appendChild(msgEl);
  }

  // Ações (Botões)
  const actionsWrap = document.createElement('div');
  actionsWrap.className = 'lumiere-empty__actions';

  if (actionLabel) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'lumiere-empty__btn lumiere-empty__btn--primary';
    btn.textContent = actionLabel;
    if (onAction) btn.addEventListener('click', onAction);
    actionsWrap.appendChild(btn);
  }

  if (secondaryLabel) {
    const btnSec = document.createElement('button');
    btnSec.type = 'button';
    btnSec.className = 'lumiere-empty__btn lumiere-empty__btn--secondary';
    btnSec.textContent = secondaryLabel;
    if (onSecondary) btnSec.addEventListener('click', onSecondary);
    actionsWrap.appendChild(btnSec);
  }

  if (actionsWrap.children.length > 0) {
    wrapper.appendChild(actionsWrap);
  }

  return wrapper;
}
