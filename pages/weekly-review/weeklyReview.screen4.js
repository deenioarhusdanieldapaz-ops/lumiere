export function createScreen4(stats, reviewData) {
  const div = document.createElement('div');
  div.className = 'wr3-screen';

  const r = reviewData.reflection || {};

  div.innerHTML = `
    <div class="wr2-header">
      <button class="wr-icon-btn" id="wr4-btn-back"><svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg></button>
      <div class="wr-logo"><svg viewBox="0 0 24 24" width="20" height="20" fill="#D9AD50"><path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z"/></svg><span>LUMIÈRE</span><small>— LIFE MANAGER —</small></div>
      <button class="wr-icon-btn" id="wr4-btn-close"><svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
    </div>
    <div class="wr2-titles">
      <h1>Reflexão Pessoal</h1>
      <p>Um momento para si. Seja honesto(a).</p>
    </div>
    <div class="wr2-cards">
      <div class="wr2-card" style="padding-bottom:12px;">
        <div class="wr2-card-header" style="margin-bottom: 8px;"><div class="wr2-card-title"><div class="wr2-icon-box" style="background:transparent; border:1px solid #D9AD50;">☀️</div><div><h3>O que correu bem?</h3><p>Conte o que foi positivo.</p></div></div></div>
        <textarea class="wr4-textarea" id="wr4-well" placeholder="Escreva aqui..." maxlength="500">${r.well || ''}</textarea>
      </div>
      <div class="wr2-card" style="padding-bottom:12px;">
        <div class="wr2-card-header" style="margin-bottom: 8px;"><div class="wr2-card-title"><div class="wr2-icon-box" style="background:transparent; border:1px solid #D9AD50;">⚠️</div><div><h3>O que foi mais difícil?</h3><p>Identifique os desafios.</p></div></div></div>
        <textarea class="wr4-textarea" id="wr4-difficult" placeholder="Escreva aqui..." maxlength="500">${r.difficult || ''}</textarea>
      </div>
      <div class="wr2-card" style="padding-bottom:12px;">
        <div class="wr2-card-header" style="margin-bottom: 8px;"><div class="wr2-card-title"><div class="wr2-icon-box" style="background:transparent; border:1px solid #D9AD50;">❤️</div><div><h3>Como me sinto?</h3><p>Avalie o seu bem-estar.</p></div></div></div>
        <div class="wr4-emojis">
          <div class="wr4-emoji" data-val="Muito baixo">😞<br><small>Muito baixo</small></div>
          <div class="wr4-emoji" data-val="Baixo">😐<br><small>Baixo</small></div>
          <div class="wr4-emoji" data-val="Regular">🙂<br><small>Regular</small></div>
          <div class="wr4-emoji" data-val="Bom">😊<br><small>Bom</small></div>
          <div class="wr4-emoji" data-val="Excelente">🤩<br><small>Excelente</small></div>
        </div>
      </div>
    </div>
    <div class="wr2-footer">
      <button class="wr2-btn-voltar" id="wr4-btn-next">Continuar →</button>
    </div>
  `;

  setTimeout(() => {
    // Emojis
    let selectedEmoji = reviewData.wellbeing || '';
    const emojis = div.querySelectorAll('.wr4-emoji');
    emojis.forEach(e => {
      if (e.getAttribute('data-val') === selectedEmoji) e.style.opacity = '1';
      e.addEventListener('click', () => {
        emojis.forEach(el => el.style.opacity = '0.5');
        e.style.opacity = '1';
        selectedEmoji = e.getAttribute('data-val');
      });
    });

    div.querySelector('#wr4-btn-back')?.addEventListener('click', () => document.dispatchEvent(new CustomEvent('weekly-review:go-to-screen3')));
    div.querySelector('#wr4-btn-close')?.addEventListener('click', () => stateManager.navigateTo('overview'));
    
    div.querySelector('#wr4-btn-next')?.addEventListener('click', () => {
      reviewData.reflection = {
        well: div.querySelector('#wr4-well').value,
        difficult: div.querySelector('#wr4-difficult').value
      };
      reviewData.wellbeing = selectedEmoji;
      document.dispatchEvent(new CustomEvent('weekly-review:go-to-screen5'));
    });
  }, 50);

  return div;
}
