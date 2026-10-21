export function createScreen3(stats) {
  const div = document.createElement('div');
  div.className = 'wr3-screen';

  const taskPct = stats.tasks.percent || 0;
  const habitPct = stats.habits.total === 0 ? 0 : Math.round((stats.habits.completed / stats.habits.total) * 100);
  const goalPct = stats.goals.total === 0 ? 0 : Math.round((stats.goals.completed / stats.goals.total) * 100);
  const pendingTasks = stats.tasks.total - stats.tasks.completed;

  div.innerHTML = `
    <div class="wr2-header">
      <button class="wr-icon-btn" id="wr3-btn-back"><svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg></button>
      <div class="wr-logo"><svg viewBox="0 0 24 24" width="20" height="20" fill="#D9AD50"><path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z"/></svg><span>LUMIÈRE</span><small>— LIFE MANAGER —</small></div>
      <button class="wr-icon-btn" id="wr3-btn-close"><svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
    </div>
    <div class="wr2-titles">
      <h1>O seu progresso</h1>
      <p>Veja como evoluiu ao longo da semana.</p>
    </div>
    <div class="wr3-tabs">
      <button class="wr3-tab is-active" data-target="tasks">Tarefas</button>
      <button class="wr3-tab" data-target="habits">Hábitos</button>
      <button class="wr3-tab" data-target="goals">Objetivos</button>
      <button class="wr3-tab" data-target="wellbeing">Bem-estar</button>
    </div>
    
    <div class="wr2-cards">
      <!-- TAREFAS -->
      <div class="wr2-card wr3-content" data-content="tasks" style="display: flex; flex-direction: column;">
        <div class="wr2-card-header">
          <div class="wr2-card-title"><div class="wr2-icon-box">✓</div><div><h3>Tarefas</h3><p>${stats.tasks.completed} de ${stats.tasks.total} concluídas</p></div></div>
          <div class="wr-chevron" id="wr3-chev-tasks" style="cursor:pointer; font-size:1.5rem; color:#D9AD50;">›</div>
        </div>
        <div class="wr2-progress-bar" style="margin-bottom: 20px;"><div class="wr2-progress-fill" style="width: ${taskPct}%;"></div></div>
        <div class="wr2-stats-row">
          <div class="wr2-stat">
            <div style="display:flex; align-items:center; gap:6px;"><span class="dot" style="background:#2ecc71;"></span><span>Concluídas</span></div>
            <strong>${stats.tasks.completed}</strong>
          </div>
          <div class="wr2-stat">
            <div style="display:flex; align-items:center; gap:6px;"><span class="dot" style="background:#f1c40f;"></span><span>Pendentes</span></div>
            <strong>${pendingTasks}</strong>
          </div>
          <div class="wr2-stat">
            <div style="display:flex; align-items:center; gap:6px;"><span class="dot" style="background:#e74c3c;"></span><span>Atrasadas</span></div>
            <strong>0</strong>
          </div>
        </div>
      </div>

      <!-- HÁBITOS -->
      <div class="wr2-card wr3-content" data-content="habits" style="display: none; flex-direction: column;">
        <div class="wr2-card-header">
          <div class="wr2-card-title"><div class="wr2-icon-box">🔥</div><div><h3>Hábitos</h3><p>${stats.habits.completed} de ${stats.habits.total} cumpridos</p></div></div>
          <div class="wr-chevron" id="wr3-chev-habits" style="cursor:pointer; font-size:1.5rem; color:#D9AD50;">›</div>
        </div>
        <div class="wr2-progress-bar" style="margin-bottom: 20px;"><div class="wr2-progress-fill" style="width: ${habitPct}%;"></div></div>
        <div class="wr2-habits-icons" style="border-top: none; padding-top: 0; align-items: flex-start;">
          ${stats.habits.list && stats.habits.list.length > 0 ? stats.habits.list.map(h => `<div class="wr2-habit-icon"><span>${h.icon}</span><small>${h.name.substring(0, 8)}</small></div>`).join('') : '<p style="font-size:0.75rem; color:#BDB5A5; width:100%; text-align:center;">Nenhum hábito registado.</p>'}
        </div>
      </div>

      <!-- OBJETIVOS -->
      <div class="wr2-card wr3-content" data-content="goals" style="display: none; flex-direction: column;">
        <div class="wr2-card-header">
          <div class="wr2-card-title"><div class="wr2-icon-box">🎯</div><div><h3>Objetivos</h3><p>${stats.goals.completed} de ${stats.goals.total} alcançados</p></div></div>
          <div class="wr-chevron" id="wr3-chev-goals" style="cursor:pointer; font-size:1.5rem; color:#D9AD50;">›</div>
        </div>
        <div class="wr2-progress-bar" style="margin-bottom: 20px;"><div class="wr2-progress-fill" style="width: ${goalPct}%;"></div></div>
        <div class="wr2-goals-list" style="border-top: none; padding-top: 0;">
          ${stats.goals.list && stats.goals.list.length > 0 ? stats.goals.list.map(g => `<div class="wr2-goal-item ${g.status === 'completed' ? 'is-completed' : ''}">${g.status === 'completed' ? '✓' : '○'} ${g.name}</div>`).join('') : '<p style="font-size:0.75rem; color:#BDB5A5; width:100%; text-align:center;">Nenhum objetivo definido.</p>'}
        </div>
      </div>
    </div>
    
    <div class="wr2-footer">
      <button class="wr2-btn-voltar" id="wr3-btn-next">Continuar →</button>
    </div>
  `;

  setTimeout(() => {
    const tabs = div.querySelectorAll('.wr3-tab');
    const contents = div.querySelectorAll('.wr3-content');

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('is-active'));
        tab.classList.add('is-active');
        const target = tab.getAttribute('data-target');
        contents.forEach(c => {
          c.style.display = (c.getAttribute('data-content') === target) ? 'flex' : 'none';
        });
      });
    });

    div.querySelector('#wr3-chev-tasks')?.addEventListener('click', () => stateManager.navigateTo('tasks'));
    div.querySelector('#wr3-chev-habits')?.addEventListener('click', () => stateManager.navigateTo('habits'));
    div.querySelector('#wr3-chev-goals')?.addEventListener('click', () => stateManager.navigateTo('goals'));
    div.querySelector('#wr3-btn-back')?.addEventListener('click', () => document.dispatchEvent(new CustomEvent('weekly-review:go-to-screen2')));
    div.querySelector('#wr3-btn-close')?.addEventListener('click', () => stateManager.navigateTo('overview'));
    div.querySelector('#wr3-btn-next')?.addEventListener('click', () => document.dispatchEvent(new CustomEvent('weekly-review:go-to-screen4')));
  }, 50);

  return div;
}
