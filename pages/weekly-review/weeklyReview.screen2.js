import { stateManager } from '../../core/stateManager.js';

export function createScreen2(stats) {
  const div = document.createElement('div');
  div.className = 'wr3-screen';

  const taskPct = stats.tasks.percent || 0;
  const habitPct = stats.habits.total === 0 ? 0 : Math.round((stats.habits.completed / stats.habits.total) * 100);
  const goalPct = stats.goals.total === 0 ? 0 : Math.round((stats.goals.completed / stats.goals.total) * 100);
  const pendingTasks = stats.tasks.total - stats.tasks.completed;

  div.innerHTML = `
    <div class="wr2-header">
      <button class="wr-icon-btn" id="wr2-btn-back">
        <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
      </button>
      <div class="wr-logo">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="#D9AD50"><path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z"/></svg>
        <span>LUMIÈRE</span>
        <small>— LIFE MANAGER —</small>
      </div>
      <button class="wr-icon-btn" id="wr2-btn-close">
        <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </button>
    </div>

    <div class="wr2-titles">
      <h1>Resumo da Semana</h1>
      <p>Um olhar rápido sobre o que conquistou.</p>
    </div>

    <div class="wr2-date">
      <button class="wr-date-btn">
        <svg viewBox="0 0 24 24" width="16" height="16" stroke="#D9AD50" stroke-width="2" fill="none" style="margin-right:8px;"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
        ${stats.weekStart.split('-').reverse().join('/')} - ${stats.weekEnd.split('-').reverse().join('/')} ›
      </button>
    </div>

    <div class="wr2-cards">
      <!-- TAREFAS -->
      <div class="wr2-card">
        <div class="wr2-card-header">
          <div class="wr2-card-title">
            <div class="wr2-icon-box">✓</div>
            <div><h3>Tarefas</h3><p>${stats.tasks.completed} de ${stats.tasks.total} concluídas</p></div>
          </div>
          <div class="wr-chevron" id="wr2-chev-tasks" style="cursor:pointer; font-size:1.5rem; color:#D9AD50;">›</div>
        </div>
        <div class="wr2-progress-bar">
          <div class="wr2-progress-fill" style="width: ${taskPct}%;"></div>
          <span class="wr2-progress-text">${taskPct}%</span>
        </div>
        <div class="wr2-stats-row">
          <div class="wr2-stat"><div style="display:flex; align-items:center; gap:6px;"><span class="dot" style="background:#2ecc71;"></span><span>Concluídas</span></div><strong>${stats.tasks.completed}</strong></div>
          <div class="wr2-stat"><div style="display:flex; align-items:center; gap:6px;"><span class="dot" style="background:#f1c40f;"></span><span>Pendentes</span></div><strong>${pendingTasks}</strong></div>
          <div class="wr2-stat"><div style="display:flex; align-items:center; gap:6px;"><span class="dot" style="background:#e74c3c;"></span><span>Atrasadas</span></div><strong>0</strong></div>
        </div>
      </div>

      <!-- HÁBITOS -->
      <div class="wr2-card">
        <div class="wr2-card-header">
          <div class="wr2-card-title">
            <div class="wr2-icon-box">🔥</div>
            <div><h3>Hábitos</h3><p>${stats.habits.completed} de ${stats.habits.total} cumpridos</p></div>
          </div>
          <div class="wr-chevron" id="wr2-chev-habits" style="cursor:pointer; font-size:1.5rem; color:#D9AD50;">›</div>
        </div>
        <div class="wr2-progress-bar">
          <div class="wr2-progress-fill" style="width: ${habitPct}%;"></div>
          <span class="wr2-progress-text">${habitPct}%</span>
        </div>
        <div class="wr2-habits-icons">
          ${stats.habits.list && stats.habits.list.length > 0 ? stats.habits.list.slice(0, 5).map(h => `<div class="wr2-habit-icon"><span>${h.icon}</span><small>${h.name.substring(0, 8)}</small></div>`).join('') : '<p style="font-size:0.75rem; color:#BDB5A5; text-align:center; width:100%;">Nenhum hábito registado.</p>'}
        </div>
      </div>

      <!-- OBJETIVOS -->
      <div class="wr2-card">
        <div class="wr2-card-header">
          <div class="wr2-card-title">
            <div class="wr2-icon-box">🎯</div>
            <div><h3>Objetivos</h3><p>${stats.goals.completed} de ${stats.goals.total} alcançados</p></div>
          </div>
          <div class="wr-chevron" id="wr2-chev-goals" style="cursor:pointer; font-size:1.5rem; color:#D9AD50;">›</div>
        </div>
        <div class="wr2-progress-bar">
          <div class="wr2-progress-fill" style="width: ${goalPct}%;"></div>
          <span class="wr2-progress-text">${goalPct}%</span>
        </div>
        <div class="wr2-goals-list">
          ${stats.goals.list && stats.goals.list.length > 0 ? stats.goals.list.slice(0, 3).map(g => `<div class="wr2-goal-item ${g.status === 'completed' ? 'is-completed' : ''}">${g.status === 'completed' ? '✓' : '○'} ${g.name}</div>`).join('') : '<p style="font-size:0.75rem; color:#BDB5A5; text-align:center; width:100%;">Nenhum objetivo definido.</p>'}
        </div>
      </div>

      <!-- APRENDIZAGENS -->
      <div class="wr2-card">
        <div class="wr2-card-header">
          <div class="wr2-card-title">
            <div class="wr2-icon-box">💡</div>
            <div><h3>Novas Aprendizagens</h3><p>O que levou desta semana?</p></div>
          </div>
          <div class="wr-chevron">›</div>
        </div>
        <div class="wr2-quote">
          <p>Pequenos avanços também são grandes conquistas.</p>
        </div>
      </div>
    </div>

    <div class="wr2-footer">
      <button class="wr2-btn-voltar" id="wr2-btn-next">Continuar →</button>
    </div>
  `;

  // Lógica de Cliques do Ecrã 2
  setTimeout(() => {
    div.querySelector('#wr2-chev-tasks')?.addEventListener('click', () => stateManager.navigateTo('tasks'));
    div.querySelector('#wr2-chev-habits')?.addEventListener('click', () => stateManager.navigateTo('habits'));
    div.querySelector('#wr2-chev-goals')?.addEventListener('click', () => stateManager.navigateTo('goals'));

    div.querySelector('#wr2-btn-back')?.addEventListener('click', () => document.dispatchEvent(new CustomEvent('weekly-review:go-to-screen1')));
    div.querySelector('#wr2-btn-close')?.addEventListener('click', () => stateManager.navigateTo('overview'));
    div.querySelector('#wr2-btn-next')?.addEventListener('click', () => document.dispatchEvent(new CustomEvent('weekly-review:go-to-screen3')));
  }, 50);

  return div;
}
