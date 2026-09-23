/**
 * Bar Chart Component
 * Gráfico de barras verticais em SVG — sem bibliotecas externas.
 * Ideal para dados discretos por dia/categoria.
 *
 * Estados:
 *  - 'default' : tem dados
 *  - 'loading' : indeterminado
 *  - 'empty'   : sem dados (≠ zero)
 *  - 'error'   : falha
 */

const WIDTH_DEFAULT = 420;
const HEIGHT_DEFAULT = 180;
const PADDING = { top: 30, right: 12, bottom: 32, left: 12 };
const BAR_GAP = 6;              // espaço entre barras
const BAR_RADIUS = 4;           // raio dos cantos
const VALUE_OFFSET = 10;        // margem em cima das barras para o valor

export function createBarChart({
  points = [],
  variant = 'default',
  width = WIDTH_DEFAULT,
  height = HEIGHT_DEFAULT,
  highlightIndex = -1,        // índice do dia atual (glow)
  averageValue = null,        // linha tracejada da média (opcional)
  animate = true,
  maxLabels = 7
} = {}) {
  const wrapper = document.createElement('div');
  wrapper.className = `lumiere-bar-chart lumiere-bar-chart--${variant}`;

  // Estados não-default
  if (variant === 'loading') {
    wrapper.innerHTML = '<div class="lumiere-bar-chart__state"><span class="lumiere-bar-chart__spinner"></span></div>';
    return wrapper;
  }
  if (variant === 'empty' || !Array.isArray(points) || points.length === 0) {
    wrapper.innerHTML = '<div class="lumiere-bar-chart__state"><span class="lumiere-bar-chart__text">Sem dados.</span></div>';
    return wrapper;
  }
  if (variant === 'error') {
    wrapper.innerHTML = '<div class="lumiere-bar-chart__state"><span class="lumiere-bar-chart__text">Erro ao carregar.</span></div>';
    return wrapper;
  }

  const innerW = width  - PADDING.left - PADDING.right;
  const innerH = height - PADDING.top  - PADDING.bottom;

  const values = points.map(p => Number(p.value) || 0);
  const maxV = Math.max(...values, 1);
  const minV = 0;

  const n = points.length;
  const barSlot = innerW / n;
  const barWidth = Math.max(6, barSlot - BAR_GAP);

  // SVG paths
  let barsSvg = '';
  let labelsSvg = '';
  let valuesSvg = '';

  points.forEach((p, i) => {
    const v = values[i];
    const x = PADDING.left + i * barSlot + (barSlot - barWidth) / 2;
    const barH = Math.max(2, ((v - minV) / (maxV - minV || 1)) * innerH);
    const y = PADDING.top + innerH - barH;

    const isHighlight = i === highlightIndex;
    const fill = isHighlight ? 'url(#barGoldHighlight)' : 'url(#barGold)';
    const filter = isHighlight ? 'filter="url(#barGlow)"' : '';

    // Barra com cantos arredondados
    barsSvg += `<rect class="lumiere-bar-chart__bar${isHighlight ? ' is-highlight' : ''}"
      x="${x.toFixed(1)}" y="${y.toFixed(1)}"
      width="${barWidth.toFixed(1)}" height="${barH.toFixed(1)}"
      rx="${BAR_RADIUS}" ry="${BAR_RADIUS}"
      fill="${fill}" ${filter}
      data-index="${i}" />`;

    // Valor por cima (só se > 0)
    if (v > 0) {
      valuesSvg += `<text class="lumiere-bar-chart__value${isHighlight ? ' is-highlight' : ''}"
        x="${(x + barWidth / 2).toFixed(1)}" y="${(y - VALUE_OFFSET).toFixed(1)}"
        text-anchor="middle">${v}</text>`;
    }

    // Rótulo abaixo
    if (p.label && i < maxLabels) {
      const cx = x + barWidth / 2;
      const cy = height - 8;
      labelsSvg += `<text class="lumiere-bar-chart__label${isHighlight ? ' is-highlight' : ''}"
        x="${cx.toFixed(1)}" y="${cy.toFixed(1)}"
        text-anchor="middle">${p.label}</text>`;
    }
  });

  // Linha da média (opcional)
  let averageLineSvg = '';
  if (typeof averageValue === 'number' && averageValue > 0) {
    const avgY = PADDING.top + innerH - ((averageValue - minV) / (maxV - minV || 1)) * innerH;
    averageLineSvg = `
      <line class="lumiere-bar-chart__avg-line"
        x1="${PADDING.left}" y1="${avgY.toFixed(1)}"
        x2="${(width - PADDING.right).toFixed(1)}" y2="${avgY.toFixed(1)}" />
      <text class="lumiere-bar-chart__avg-label"
        x="${PADDING.left}"
        y="${(avgY - 5).toFixed(1)}"
        text-anchor="start">Média</text>
    `;
  }

  wrapper.innerHTML = `
    <svg class="lumiere-bar-chart__svg"
         viewBox="0 0 ${width} ${height}"
         preserveAspectRatio="xMidYMid meet"
         role="img"
         aria-label="Gráfico de barras">
      <defs>
        <linearGradient id="barGold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="#f5d76e"/>
          <stop offset="100%" stop-color="#9f7f20"/>
        </linearGradient>
        <linearGradient id="barGoldHighlight" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="#fceab0"/>
          <stop offset="100%" stop-color="#d4af37"/>
        </linearGradient>
        <filter id="barGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur"/>
          <feMerge>
            <feMergeNode in="blur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>

      <g class="lumiere-bar-chart__avg">
        ${averageLineSvg}
      </g>
      <g class="lumiere-bar-chart__bars">
        ${barsSvg}
      </g>
      <g class="lumiere-bar-chart__values">
        ${valuesSvg}
      </g>
      <g class="lumiere-bar-chart__labels">
        ${labelsSvg}
      </g>
    </svg>
  `;

  // Animação: barras crescem de baixo para cima
  if (animate) {
    requestAnimationFrame(() => {
      const bars = wrapper.querySelectorAll('.lumiere-bar-chart__bar');
      bars.forEach((bar, i) => {
        const originalY = Number(bar.getAttribute('y'));
        const originalH = Number(bar.getAttribute('height'));
        const baseY = PADDING.top + innerH;

        // Estado inicial: colapsado em baixo
        bar.setAttribute('y', String(baseY));
        bar.setAttribute('height', '0');

        setTimeout(() => {
          bar.style.transition = 'y 700ms cubic-bezier(0.16, 1, 0.3, 1), height 700ms cubic-bezier(0.16, 1, 0.3, 1)';
          bar.setAttribute('y', String(originalY));
          bar.setAttribute('height', String(originalH));
        }, i * 60);
      });
    });
  }

  return wrapper;
}

export default { createBarChart };
