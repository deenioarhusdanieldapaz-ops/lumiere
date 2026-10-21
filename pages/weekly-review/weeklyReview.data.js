export function createDataState(stats) {
  const div = document.createElement('div');
  div.className = 'wr-page';
  
  const percent = stats.tasks.percent || 0;
  const tasksCompleted = stats.tasks.completed || 0;
  const tasksTotal = stats.tasks.total || 0;
  const habitsCompleted = stats.habits.completed || 0;
  const habitsTotal = stats.habits.total || 0;
  const goalsCompleted = stats.goals.completed || 0;
  const goalsTotal = stats.goals.total || 0;
  const start = stats.weekStart ? stats.weekStart.split('-').reverse().join('/') : '--/--';
  const end = stats.weekEnd ? stats.weekEnd.split('-').reverse().join('/') : '--/--';

  div.innerHTML = `
    <div class="wr-top-bar">
      <button class="wr-icon-btn" id="wr-btn-back">
        <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
      </button>
      <div class="wr-logo">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="#D9AD50"><path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z"/></svg>
        <span>LUMIÈRE</span>
        <small>— LIFE MANAGER —</small>
      </div>
      <div style="width: 40px;"></div>
    </div>
    <h1 class="wr-title">Revisão Semanal</h1>
    <p class="wr-sub">O seu progresso, em resumo.<br>Reflita, celebre e planeie o que vem a seguir.</p>
    <div class="wr-date-wrap">
      <button class="wr-date-btn" id="wr1-date-btn">
        <svg viewBox="0 0 24 24" width="16" height="16" stroke="#D9AD50" stroke-width="2" fill="none" style="margin-right: 8px;"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
        ${start} - ${end} ›
      </button>
    </div>
    <div class="wr-card">
      <div class="wr-summary-header">
        <div class="wr-summary-content">
          <div class="wr-circle" style="background: conic-gradient(#D9AD50 ${percent}%, #2a2521 0);"><span>${percent}%</span></div>
          <div class="wr-summary-text">
            <h3>Resumo da Semana</h3>
            <p>Você manteve o foco e avançou<br>nos seus objetivos.</p>
          </div>
        </div>
        <div class="wr-chevron" id="wr1-summary-chevron" style="cursor:pointer;">›</div>
      </div>
      <div class="wr-mini-stats">
        <div class="wr-mini-stat"><span class="val">${tasksCompleted}/${tasksTotal}</span><span class="lbl">Tarefas</span></div>
        <div class="wr-mini-stat"><span class="val">${habitsCompleted}/${habitsTotal}</span><span class="lbl">Hábitos</span></div>
        <div class="wr-mini-stat"><span class="val">${goalsCompleted}/${goalsTotal}</span><span class="lbl">Objetivos</span></div>
      </div>
    </div>
    <div class="wr-card">
      <div class="wr-progress-header">
        <h3>O seu progresso</h3>
        <button class="wr-btn-details" id="wr1-btn-details">Ver detalhes ›</button>
      </div>
      <div class="wr-chart-container">
        <div class="wr-y-axis"><span>100</span><span>75</span><span>50</span><span>25</span><span>0</span></div>
        <div class="wr-chart-area">
          <div class="wr-bar-chart">
            <div class="wr-bar" style="height: 2px;"></div><div class="wr-bar" style="height: 2px;"></div><div class="wr-bar" style="height: 2px;"></div><div class="wr-bar" style="height: 2px;"></div><div class="wr-bar" style="height: 2px;"></div><div class="wr-bar" style="height: 2px;"></div><div class="wr-bar" style="height: 2px;"></div>
          </div>
          <div class="wr-bar-labels"><span>Seg</span><span>Ter</span><span>Qua</span><span>Qui</span><span>Sex</span><span>Sáb</span><span>Dom</span></div>
        </div>
      </div>
    </div>
    <div class="wr-shortcuts">
      <div class="wr-shortcut" id="wr1-shortcut-reflection">
        <div class="wr-shortcut-left"><div class="wr-shortcut-icon"><svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none"><path d="M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66.95-2.3c.48.17.98.3 1.34.3C19 20 22 3 22 3c-1 2-8 2.25-13 3.25S2 11.5 2 13.5s1.75 3.75 1.75 3.75C7 8 17 8 17 8z"></path></svg></div><div><h4>Reflexão Pessoal</h4><p>O que correu bem? O que foi difícil?</p></div></div><div class="wr-chevron">›</div>
      </div>
    </div>
    <button class="wr-cta" id="wr1-btn-next">
      <div style="display:flex; align-items:center; gap:8px;">
        <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line><polyline points="9 15 11 17 15 13"></polyline></svg>
        Ver Resumo da Revisão
      </div>
      <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
    </button>
  `;

  setTimeout(() => {
    div.querySelector('#wr-btn-back')?.addEventListener('click', () => stateManager.navigateTo('overview'));
    div.querySelector('#wr1-date-btn')?.addEventListener('click', () => alert('A visualizar a semana atual.'));
    div.querySelector('#wr1-summary-chevron')?.addEventListener('click', () => document.dispatchEvent(new CustomEvent('weekly-review:go-to-screen2')));
    div.querySelector('#wr1-btn-details')?.addEventListener('click', () => document.dispatchEvent(new CustomEvent('weekly-review:go-to-screen3')));
    div.querySelector('#wr1-shortcut-reflection')?.addEventListener('click', () => document.dispatchEvent(new CustomEvent('weekly-review:go-to-screen4')));
    div.querySelector('#wr1-btn-next')?.addEventListener('click', () => document.dispatchEvent(new CustomEvent('weekly-review:go-to-screen2')));
  }, 50);

  return div;
}
