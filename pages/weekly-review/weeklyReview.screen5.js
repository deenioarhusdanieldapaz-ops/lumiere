export function createScreen5(stats, reviewData) {
  const div = document.createElement('div');
  div.className = 'wr3-screen';
  const p = reviewData.priorities || ['', '', ''];

  div.innerHTML = `
    <div class="wr2-header">
      <button class="wr-icon-btn" id="wr5-btn-back"><svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg></button>
      <div class="wr-logo"><svg viewBox="0 0 24 24" width="20" height="20" fill="#D9AD50"><path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z"/></svg><span>LUMIÈRE</span><small>— LIFE MANAGER —</small></div>
      <button class="wr-icon-btn" id="wr5-btn-close"><svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
    </div>
    <div class="wr2-titles">
      <h1>Próxima Semana</h1>
      <p>Defina as suas 3 prioridades e organize as tarefas.</p>
    </div>
    <div class="wr2-cards">
      <div class="wr2-card">
        <div class="wr2-card-header">
          <div class="wr2-card-title"><div class="wr2-icon-box">🏆</div><div><h3>3 Prioridades da Semana</h3><p>O que é mais importante?</p></div></div>
        </div>
        <div style="display:flex; flex-direction:column; gap:10px; margin-top:12px;">
          <div style="display:flex; align-items:center; gap:10px;"><div style="width:24px; height:24px; border-radius:50%; background:rgba(217,173,80,0.2); color:#D9AD50; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:0.8rem;">1</div><input type="text" class="wr5-input" id="wr5-p1" value="${p[0] || ''}" placeholder="Primeira prioridade..." /></div>
          <div style="display:flex; align-items:center; gap:10px;"><div style="width:24px; height:24px; border-radius:50%; background:rgba(217,173,80,0.2); color:#D9AD50; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:0.8rem;">2</div><input type="text" class="wr5-input" id="wr5-p2" value="${p[1] || ''}" placeholder="Segunda prioridade..." /></div>
          <div style="display:flex; align-items:center; gap:10px;"><div style="width:24px; height:24px; border-radius:50%; background:rgba(217,173,80,0.2); color:#D9AD50; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:0.8rem;">3</div><input type="text" class="wr5-input" id="wr5-p3" value="${p[2] || ''}" placeholder="Terceira prioridade..." /></div>
        </div>
      </div>
      <div class="wr2-card" style="padding:12px;">
        <h4 style="margin:0 0 8px 0; font-size:0.8rem; color:#F4EBD7; display:flex; align-items:center; gap:6px;">📋 Tarefas pendentes</h4>
        <div style="display:flex; flex-direction:column; gap:8px; margin-top:12px;">
          <label style="font-size:0.75rem; color:#F4EBD7; display:flex; align-items:center; gap:6px;"><input type="checkbox" style="accent-color:#D9AD50;"> Rever e-mails</label>
          <label style="font-size:0.75rem; color:#F4EBD7; display:flex; align-items:center; gap:6px;"><input type="checkbox" style="accent-color:#D9AD50;"> Ler o livro</label>
        </div>
      </div>
    </div>
    <div class="wr2-footer">
      <button class="wr2-btn-voltar" id="wr5-btn-next">Guardar e Continuar →</button>
    </div>
  `;

  setTimeout(() => {
    div.querySelector('#wr5-btn-back')?.addEventListener('click', () => document.dispatchEvent(new CustomEvent('weekly-review:go-to-screen4')));
    div.querySelector('#wr5-btn-close')?.addEventListener('click', () => stateManager.navigateTo('overview'));
    
    div.querySelector('#wr5-btn-next')?.addEventListener('click', () => {
      reviewData.priorities = [
        div.querySelector('#wr5-p1').value,
        div.querySelector('#wr5-p2').value,
        div.querySelector('#wr5-p3').value
      ];
      document.dispatchEvent(new CustomEvent('weekly-review:go-to-screen6'));
    });
  }, 50);

  return div;
}
