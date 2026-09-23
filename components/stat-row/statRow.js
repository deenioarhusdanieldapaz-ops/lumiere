/**
 * Stat Row Component
 * Linha de estatística reutilizável: ícone + label + valor + estado (cor).
 * NÃO conhece regras de negócio. Recebe tudo via parâmetros.
 *
 * Estados visuais (variant):
 *  - 'good'    : verde (bom)
 *  - 'warning' : amarelo (neutro/atenção)
 *  - 'bad'     : vermelho (mau)
 *  - 'empty'   : cinza (sem dados)
 */

export function createStatRow({
  icon = '',
  label = '',
  value = '',
  variant = 'good',
  onClick = null,
  page = ''
} = {}) {
  const row = document.createElement('button');
  row.className = `lumiere-stat-row lumiere-stat-row--${variant}`;
  row.type = 'button';

  if (page) row.dataset.page = page;

  // Ícone
  if (icon) {
    const iconEl = document.createElement('span');
    iconEl.className = 'lumiere-stat-row__icon';
    iconEl.setAttribute('data-icon', icon);
    row.appendChild(iconEl);
  }

  // Label
  const labelEl = document.createElement('span');
  labelEl.className = 'lumiere-stat-row__label';
  labelEl.textContent = label;
  row.appendChild(labelEl);

  // Valor (parte direita: estado + check)
  const valueWrap = document.createElement('span');
  valueWrap.className = 'lumiere-stat-row__value';

  const valueText = document.createElement('span');
  valueText.className = 'lumiere-stat-row__value-text';
  valueText.textContent = value;
  valueWrap.appendChild(valueText);

  // Check (visual)
  const check = document.createElement('span');
  check.className = 'lumiere-stat-row__check';
  check.setAttribute('aria-hidden', 'true');
  check.textContent = variant === 'bad' ? '!' : (variant === 'empty' ? '—' : '✓');
  valueWrap.appendChild(check);

  row.appendChild(valueWrap);

  if (typeof onClick === 'function') {
    row.addEventListener('click', (e) => {
      e.stopPropagation();
      onClick(page, e);
    });
  }

  return row;
}

export default { createStatRow };
