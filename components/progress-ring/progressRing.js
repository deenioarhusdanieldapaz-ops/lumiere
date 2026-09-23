/**
 * Progress Ring Component
 * Círculo SVG animado com percentagem central.
 * NÃO conhece regras de negócio — recebe value 0-100.
 *
 * Estados:
 *  - 'default' : valor definido (0-100)
 *  - 'loading' : indeterminado
 *  - 'empty'   : sem dados (≠ zero)
 *  - 'error'   : falha ao carregar
 */

const SIZE_DEFAULT = 140;
const STROKE_DEFAULT = 10;

export function createProgressRing({
  value = 0,
  label = '',
  caption = '',
  variant = 'default',
  size = SIZE_DEFAULT,
  stroke = STROKE_DEFAULT,
  animate = true
} = {}) {
  const wrapper = document.createElement('div');
  wrapper.className = `lumiere-ring lumiere-ring--${variant}`;

  const isValueState = variant === 'default' && typeof value === 'number';
  const pct = isValueState ? Math.max(0, Math.min(100, value)) : 0;

  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - pct / 100);

  // Conteúdo central conforme o estado
  let centerContent = '';
  if (variant === 'loading') {
    centerContent = '<span class="lumiere-ring__center-loading" aria-hidden="true"></span>';
  } else if (variant === 'empty') {
    centerContent = '<span class="lumiere-ring__center-text">—</span>';
  } else if (variant === 'error') {
    centerContent = '<span class="lumiere-ring__center-text">!</span>';
  } else {
    centerContent = `<span class="lumiere-ring__center-value">${Math.round(pct)}</span><span class="lumiere-ring__center-symbol">%</span>`;
  }

  wrapper.innerHTML = `
    <div class="lumiere-ring__svg-wrap">
      <svg class="lumiere-ring__svg"
           viewBox="0 0 ${size} ${size}"
           width="${size}"
           height="${size}"
           role="img"
           aria-label="${label ? label + ': ' + Math.round(pct) + '%' : Math.round(pct) + '%'}">
        <circle class="lumiere-ring__track"
                cx="${size/2}" cy="${size/2}" r="${radius}"
                fill="none" stroke-width="${stroke}"/>
        <circle class="lumiere-ring__bar"
                cx="${size/2}" cy="${size/2}" r="${radius}"
                fill="none" stroke-width="${stroke}"
                stroke-linecap="round"
                stroke-dasharray="${circumference}"
                stroke-dashoffset="${dashOffset}"
                transform="rotate(-90 ${size/2} ${size/2})"/>
      </svg>
      <div class="lumiere-ring__center">${centerContent}</div>
    </div>
    ${label ? `<div class="lumiere-ring__label">${label}</div>` : ''}
    ${caption ? `<div class="lumiere-ring__caption">${caption}</div>` : ''}
  `;

  return wrapper;
}

export default { createProgressRing };
