/**
 * Progress Component
 * Barra de progresso reutilizável. NÃO conhece regras de negócio.
 * Recebe valor/label via parâmetros.
 *
 * Estados suportados:
 *  - 'default'  : valor definido (0-100)
 *  - 'loading'  : indeterminado (sem valor)
 *  - 'empty'    : sem dados disponíveis (≠ zero)
 *  - 'error'    : falha ao carregar
 */

/**
 * @param {Object} options
 * @param {number|null} [options.value=0] - 0 a 100. Use null para loading/empty/error.
 * @param {string} [options.label=''] - Texto exibido acima da barra
 * @param {string} [options.variant='default'] - 'default' | 'loading' | 'empty' | 'error'
 * @param {boolean} [options.showPercent=true] - Mostrar valor em %
 * @param {string} [options.size='md'] - 'sm' | 'md' | 'lg'
 * @returns {HTMLElement}
 */
export function createProgress({
  value = 0,
  label = '',
  variant = 'default',
  showPercent = true,
  size = 'md'
} = {}) {
  const wrapper = document.createElement('div');
  wrapper.className = `lumiere-progress lumiere-progress--${variant} lumiere-progress--${size}`;

  // Header: label + percentual
  if (label || (showPercent && variant === 'default')) {
    const header = document.createElement('div');
    header.className = 'lumiere-progress__header';

    if (label) {
      const l = document.createElement('span');
      l.className = 'lumiere-progress__label';
      l.textContent = label;
      header.appendChild(l);
    }

    if (showPercent && variant === 'default') {
      const p = document.createElement('span');
      p.className = 'lumiere-progress__percent';
      const safe = clamp(value);
      p.textContent = `${safe}%`;
      header.appendChild(p);
    }

    wrapper.appendChild(header);
  }

  // Track + Fill
  const track = document.createElement('div');
  track.className = 'lumiere-progress__track';

  const fill = document.createElement('div');
  fill.className = 'lumiere-progress__fill';

  if (variant === 'default') {
    const safe = clamp(value);
    fill.style.width = `${safe}%`;
    track.setAttribute('role', 'progressbar');
    track.setAttribute('aria-valuemin', '0');
    track.setAttribute('aria-valuemax', '100');
    track.setAttribute('aria-valuenow', String(safe));
    if (label) track.setAttribute('aria-label', label);
  } else {
    // Loading: barra indeterminada
    // Empty: barra sem preenchimento (traço)
    // Error: barra vazia com estilo de erro
    track.setAttribute('role', 'progressbar');
    if (label) track.setAttribute('aria-label', label);
    if (variant === 'loading') {
      track.setAttribute('aria-valuetext', 'carregando');
    } else if (variant === 'empty') {
      track.setAttribute('aria-valuetext', 'sem dados');
    } else if (variant === 'error') {
      track.setAttribute('aria-valuetext', 'erro');
    }
  }

  track.appendChild(fill);
  wrapper.appendChild(track);

  return wrapper;
}

function clamp(v) {
  const n = Number(v);
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

export default createProgress;
