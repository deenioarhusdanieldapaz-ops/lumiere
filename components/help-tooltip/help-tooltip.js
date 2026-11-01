export function showHelpTooltip({ targetEl, id, title, text, onDismiss }) {
  if (!targetEl) return;

  // Verificar se já foi dispensada
  const dismissed = localStorage.getItem('lumiere_tip_dismissed_' + id);
  if (dismissed === 'true') return;

  // Remover tooltip antigo se existir
  const existing = document.querySelector('.help-tooltip-bubble');
  if (existing) existing.remove();

  const bubble = document.createElement('div');
  bubble.className = 'help-tooltip-bubble';
  
  // SVG da Lâmpada
  const iconBulb = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="18" height="18" style="color: var(--color-gold); margin-bottom: 4px;"><path d="M9 18h6"></path><path d="M10 22h4"></path><path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.2 1 2h6c0-.8.4-1.5 1-2A7 7 0 0 0 12 2z"></path></svg>`;

  bubble.innerHTML = `
    <div class="tooltip-arrow"></div>
    <div class="tooltip-header">
      ${iconBulb}
      <span class="tooltip-title">${title}</span>
    </div>
    <p class="tooltip-text">${text}</p>
    <label class="tooltip-checkbox-label">
      <input type="checkbox" id="tooltip-dismiss-${id}"> Não mostrar novamente
    </label>
    <button type="button" class="tooltip-btn">Entendi</button>
  `;

  document.body.appendChild(bubble);

  // Posicionar
  const rect = targetEl.getBoundingClientRect();
  const bubbleTop = rect.bottom + 15 + window.scrollY; // 15px de espaço para a seta
  const bubbleWidth = 260; // Largura fixa do CSS
  const bubbleLeft = Math.max(10, Math.min(window.innerWidth - bubbleWidth - 10, rect.left));
  
  bubble.style.top = `${bubbleTop}px`;
  bubble.style.left = `${bubbleLeft}px`;

  // Calcular a posição da seta (centro do elemento alvo relativo ao balão)
  const targetCenter = rect.left + (rect.width / 2);
  let arrowLeft = targetCenter - bubbleLeft;
  // Limitar a seta para não sair do balão
  arrowLeft = Math.max(15, Math.min(bubbleWidth - 15, arrowLeft));
  
  const arrow = bubble.querySelector('.tooltip-arrow');
  if (arrow) arrow.style.left = `${arrowLeft}px`;

  // Eventos
  const close = () => {
    const checkbox = bubble.querySelector(`#tooltip-dismiss-${id}`);
    if (checkbox && checkbox.checked) {
      localStorage.setItem('lumiere_tip_dismissed_' + id, 'true');
    }
    bubble.remove();
    if (onDismiss) onDismiss();
  };

  bubble.querySelector('.tooltip-btn').addEventListener('click', close);

  // Fechar ao clicar fora
  const outsideClick = (e) => {
    if (!bubble.contains(e.target) && e.target !== targetEl) {
      document.removeEventListener('click', outsideClick);
      close();
    }
  };
  
  setTimeout(() => document.addEventListener('click', outsideClick), 100);
}
