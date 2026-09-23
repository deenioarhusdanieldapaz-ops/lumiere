/**
 * Context Line Component
 *
 * Linha fina de contexto que aparece abaixo do hero de cada card.
 * Mostra 1 insight acionavel derivado de Intelligence ou calculo local.
 *
 * Nao conhece regras de negocio — recebe tudo via parametros.
 *
 * Variantes:
 *  - 'info'    : neutro/positivo (dourado claro)
 *  - 'warning' : atencao (dourado)
 *  - 'bad'     : urgente (vermelho suave)
 *  - 'good'    : conquista (verde suave)
 */

const DEFAULT_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.2 1 2h6c0-.8.4-1.5 1-2A7 7 0 0 0 12 2z"/></svg>';

export function createContextLine({
  iconHtml = DEFAULT_ICON,
  text = '',
  variant = 'info'
} = {}) {
  const el = document.createElement('div');
  el.className = 'lumiere-context-line lumiere-context-line--' + variant;

  const iconWrap = document.createElement('span');
  iconWrap.className = 'lumiere-context-line__icon';
  iconWrap.innerHTML = iconHtml;
  el.appendChild(iconWrap);

  const textWrap = document.createElement('p');
  textWrap.className = 'lumiere-context-line__text';
  textWrap.textContent = text;
  el.appendChild(textWrap);

  return el;
}

export default { createContextLine };
