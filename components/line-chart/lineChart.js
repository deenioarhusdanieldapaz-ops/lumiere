/**
 * Line Chart Component
 * Gráfico de linha SVG simples — sem bibliotecas externas.
 * Recebe uma série de pontos e desenha linha + pontos + labels X.
 *
 * Estados:
 *  - 'default' : tem dados
 *  - 'loading' : indeterminado
 *  - 'empty'   : sem dados (≠ zero)
 *  - 'error'   : falha
 */

const WIDTH_DEFAULT = 480;
const HEIGHT_DEFAULT = 160;
const PADDING = { top: 20, right: 20, bottom: 30, left: 20 };

export function createLineChart({
  points = [],
  variant = 'default',
  width = WIDTH_DEFAULT,
  height = HEIGHT_DEFAULT,
  showGrid = true,
  animate = true,
  valueSuffix = ''
} = {}) {
  const wrapper = document.createElement('div');
  wrapper.className = `lumiere-chart lumiere-chart--${variant}`;

  // Estado indeterminado / vazio / erro
  if (variant === 'loading') {
    wrapper.innerHTML = '<div class="lumiere-chart__state"><span class="lumiere-chart__spinner"></span></div>';
    return wrapper;
  }
  if (variant === 'empty') {
    wrapper.innerHTML = '<div class="lumiere-chart__state"><span class="lumiere-chart__text">Sem dados.</span></div>';
    return wrapper;
  }
  if (variant === 'error') {
    wrapper.innerHTML = '<div class="lumiere-chart__state"><span class="lumiere-chart__text">Erro ao carregar.</span></div>';
    return wrapper;
  }

  // Sem pontos válidos → tratar como empty
  if (!Array.isArray(points) || points.length === 0) {
    wrapper.innerHTML = '<div class="lumiere-chart__state"><span class="lumiere-chart__text">Sem dados.</span></div>';
    return wrapper;
  }

  const innerW = width  - PADDING.left - PADDING.right;
  const innerH = height - PADDING.top  - PADDING.bottom;

  // Valores
  const values = points.map(p => Number(p.value) || 0);
  const maxV = Math.max(...values, 1);
  const minV = Math.min(...values, 0);

  // Distribuir X
  const stepX = points.length > 1 ? innerW / (points.length - 1) : 0;
  const xAt = i => PADDING.left + i * stepX;
  const yAt = v => PADDING.top + innerH - ((v - minV) / (maxV - minV || 1)) * innerH;

  // Path
  const coords = points.map((p, i) => ({ x: xAt(i), y: yAt(values[i]) }));
  const pathD = coords.map((c, i) => (i === 0 ? 'M' : 'L') + c.x.toFixed(1) + ',' + c.y.toFixed(1)).join(' ');

  // Área (path fechado até à base)
  const areaD = pathD + ' L' + coords[coords.length - 1].x.toFixed(1) + ',' + (PADDING.top + innerH)
                + ' L' + coords[0].x.toFixed(1) + ',' + (PADDING.top + innerH) + ' Z';

  // Grid horizontal (4 linhas)
  let gridLines = '';
  if (showGrid) {
    for (let i = 0; i <= 3; i++) {
      const y = PADDING.top + (innerH / 3) * i;
      gridLines += `<line x1="${PADDING.left}" y1="${y}" x2="${PADDING.left + innerW}" y2="${y}" class="lumiere-chart__grid-line"/>`;
    }
  }

  // Pontos + labels X
  let dotsSvg = '';
  let labelsSvg = '';
  points.forEach((p, i) => {
    const c = coords[i];
    dotsSvg += `<circle cx="${c.x}" cy="${c.y}" r="3.5" class="lumiere-chart__dot"/>`;
    if (p.label) {
      labelsSvg += `<text x="${c.x}" y="${height - 8}" text-anchor="middle" class="lumiere-chart__label">${p.label}</text>`;
    }
  });

  const pathLen = Math.round(Math.hypot(innerW, innerH)) + 200;

  wrapper.innerHTML = `
    <svg class="lumiere-chart__svg"
         viewBox="0 0 ${width} ${height}"
         preserveAspectRatio="xMidYMid meet"
         role="img"
         aria-label="Gráfico de linha">
      <defs>
        <linearGradient id="lcGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="rgba(212, 175, 55, 0.28)"/>
          <stop offset="100%" stop-color="rgba(212, 175, 55, 0)"/>
        </linearGradient>
      </defs>
      ${gridLines}
      <path d="${areaD}" fill="url(#lcGrad)" class="lumiere-chart__area"/>
      <path d="${pathD}" class="lumiere-chart__line" fill="none"
            stroke-dasharray="${animate ? pathLen : 0}"
            stroke-dashoffset="${animate ? pathLen : 0}"/>
      ${dotsSvg}
      ${labelsSvg}
    </svg>
  `;

  // Animação: desenha a linha ao montar
  if (animate) {
    requestAnimationFrame(() => {
      const line = wrapper.querySelector('.lumiere-chart__line');
      if (line) {
        line.style.transition = 'stroke-dashoffset 1400ms cubic-bezier(0.16, 1, 0.3, 1)';
        line.setAttribute('stroke-dashoffset', '0');
      }
    });
  }

  return wrapper;
}

export default { createLineChart };
