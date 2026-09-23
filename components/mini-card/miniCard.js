/**
 * Mini Card Component
 * Cartão compacto para o Dashboard — ícone + label + valor + sub-label.
 * NÃO conhece regras de negócio. Recebe tudo via parâmetros.
 *
 * Estados:
 *  - 'default' : valor definido
 *  - 'empty'   : sem dados (≠ zero)
 *  - 'loading' : indeterminado
 *  - 'error'   : falha
 */

export function createMiniCard({
  icon = '',
  label = '',
  value = '',
  sublabel = '',
  variant = 'default',
  onClick = null,
  page = ''
} = {}) {
  const card = document.createElement('button');
  card.className = `lumiere-mini-card lumiere-mini-card--${variant}`;
  card.type = 'button';

  if (page) card.dataset.page = page;

  if (icon) {
    const iconEl = document.createElement('span');
    iconEl.className = 'lumiere-mini-card__icon';
    iconEl.setAttribute('data-icon', icon);
    card.appendChild(iconEl);
  }

  const labelEl = document.createElement('span');
  labelEl.className = 'lumiere-mini-card__label';
  labelEl.textContent = label;
  card.appendChild(labelEl);

  const valueEl = document.createElement('span');
  valueEl.className = 'lumiere-mini-card__value';
  if (variant === 'empty') {
    valueEl.textContent = '—';
  } else if (variant === 'loading') {
    valueEl.textContent = '…';
  } else if (variant === 'error') {
    valueEl.textContent = '!';
  } else {
    valueEl.textContent = String(value);
  }
  card.appendChild(valueEl);

  if (sublabel) {
    const subEl = document.createElement('span');
    subEl.className = 'lumiere-mini-card__sublabel';
    subEl.textContent = sublabel;
    card.appendChild(subEl);
  }

  if (typeof onClick === 'function') {
    card.addEventListener('click', (e) => {
      e.stopPropagation();
      onClick(page, e);
    });
  }

  return card;
}

export default { createMiniCard };
