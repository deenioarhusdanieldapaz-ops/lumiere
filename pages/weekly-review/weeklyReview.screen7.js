export function createScreen7() {
  const div = document.createElement('div');
  div.className = 'wr7-screen';

  div.innerHTML = `
    <div style="display:flex; justify-content:flex-end; padding:20px;">
      <button class="wr-icon-btn" id="wr7-btn-close"><svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
    </div>
    
    <div class="wr7-content">
      <div class="wr7-icon-container">
        <div class="wr7-glow-ring"></div>
        <span style="position:absolute; top:-15px; font-size:1.5rem;">👑</span>
        <svg class="wr7-check" viewBox="0 0 24 24" width="50" height="50" stroke="#D9AD50" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
      </div>
      
      <h1 class="wr7-title">Revisão Semanal<br>Concluída!</h1>
      <p class="wr7-subtitle">Parabéns! Você analisou sua semana, reconheceu seus progressos e já está a construir uma versão ainda melhor de si.</p>

      <div class="wr7-quote-box">
        <p>“ O progresso não é sobre perfeição, é sobre consistência. ”</p>
        <span>— LUMIÈRE</span>
      </div>
    </div>

    <div class="wr7-footer">
      <button class="wr7-btn-main" id="wr7-btn-progress">📊 Ver Meu Progresso →</button>
      <button class="wr7-btn-secondary" id="wr7-btn-restart">↺ Fazer nova revisão</button>
      <p style="text-align:center; font-size:0.7rem; color:#BDB5A5; margin-top:8px;">7/6 Conclusão</p>
    </div>
  `;

  return div;
}
