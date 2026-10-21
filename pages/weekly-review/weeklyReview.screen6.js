import { saveWeeklyReview } from '../../core/weeklyReview.js';

export function createScreen6(stats, reviewData) {
  const div = document.createElement('div');
  div.className = 'wr3-screen';
  
  const r = reviewData.reflection || {};
  const w = reviewData.wellbeing || 'Não avaliado';

  div.innerHTML = `
    <div class="wr2-header">
      <button class="wr-icon-btn" id="wr6-btn-back"><svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg></button>
      <div class="wr-logo"><svg viewBox="0 0 24 24" width="20" height="20" fill="#D9AD50"><path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z"/></svg><span>LUMIÈRE</span><small>— LIFE MANAGER —</small></div>
      <div style="width:40px;"></div>
    </div>
    <div class="wr2-titles">
      <h1>Resumo da Revisão</h1>
      <p>Veja o que construiu nesta semana.</p>
    </div>
    <div class="wr2-cards">
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
        <div class="wr2-card" style="padding:12px;"><strong>${stats.tasks.completed}/${stats.tasks.total}</strong><br><small>Tarefas</small></div>
        <div class="wr2-card" style="padding:12px;"><strong>${stats.habits.completed}/${stats.habits.total}</strong><br><small>Hábitos</small></div>
        <div class="wr2-card" style="padding:12px;"><strong>${stats.goals.completed}/${stats.goals.total}</strong><br><small>Objetivos</small></div>
        <div class="wr2-card" style="padding:12px;"><strong>${w}</strong><br><small>Bem-estar</small></div>
      </div>
      
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:10px;">
        <div class="wr2-card" style="padding:12px;">
          <h4 style="margin:0 0 8px 0; font-size:0.8rem; color:#F4EBD7;">☀️ O que correu bem?</h4>
          <p style="margin:0; font-size:0.7rem; color:#BDB5A5;">${r.well || 'Não preenchido.'}</p>
        </div>
        <div class="wr2-card" style="padding:12px;">
          <h4 style="margin:0 0 8px 0; font-size:0.8rem; color:#F4EBD7;">⚠️ O que foi mais difícil?</h4>
          <p style="margin:0; font-size:0.7rem; color:#BDB5A5;">${r.difficult || 'Não preenchido.'}</p>
        </div>
      </div>
    </div>
    <div class="wr2-footer">
      <button class="wr2-btn-voltar" id="wr6-btn-next">🏠 Concluir Revisão ✓</button>
    </div>
  `;

  setTimeout(() => {
    div.querySelector('#wr6-btn-back')?.addEventListener('click', () => document.dispatchEvent(new CustomEvent('weekly-review:go-to-screen5')));
    
    const btnNext = div.querySelector('#wr6-btn-next');
    btnNext?.addEventListener('click', async () => {
      btnNext.textContent = 'A guardar...';
      btnNext.disabled = true;
      try {
        await saveWeeklyReview(stats, reviewData);
        document.dispatchEvent(new CustomEvent('weekly-review:go-to-screen7'));
      } catch (error) {
        console.error(error);
        alert('Erro ao guardar. Tente novamente.');
        btnNext.textContent = '🏠 Concluir Revisão ✓';
        btnNext.disabled = false;
      }
    });
  }, 50);

  return div;
}
