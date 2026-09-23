/**
 * Card: Objetivo Principal (página completa)
 *
 * Mostra o objetivo marcado como isPrimary: true.
 * Progresso = marcos concluídos (60%) + tarefas completas (40%).
 *
 * Fluxo: UI -> Core (DataManager) -> Storage -> EventBus
 * Não toca em Dexie/IndexedDB directamente.
 */
import { dataManager } from '../../../core/dataManager.js';
import { eventBus } from '../../../core/eventBus.js';
import { ICONS } from '../../../js/icons.js';
import { createContextLine } from '../../../components/context-line/contextLine.js';

const RELEVANT_COLLECTIONS = ['goals', 'goalMilestones', 'tasks'];

let _unsubscribe = null;

/* ============================================================
   Cálculo de progresso
   ============================================================ */

/**
 * Calcula o progresso de um objetivo.
 * Regra: marcos (60%) + tarefas ligadas (40%).
 * Se só um dos lados tiver dados, esse lado vale 100%.
 * Se nenhum tiver dados, usa o campo progress do Goal.
 *
 * @param {Object} goal
 * @param {Array} milestones
 * @param {Array} tasks
 * @returns {{ pct: number, milestonesDone: number, milestonesTotal: number, tasksDone: number, tasksTotal: number }}
 */
export function calculateGoalProgress(goal, milestones, tasks) {
  const msTotal = milestones.length;
  const msDone = milestones.filter(m => m.status === 'completed').length;

  const tTotal = tasks.length;
  const tDone = tasks.filter(t => t.status === 'completed').length;

  let pct = 0;

  if (msTotal > 0 && tTotal > 0) {
    const msPct = (msDone / msTotal) * 60;
    const tPct  = (tDone / tTotal)   * 40;
    pct = msPct + tPct;
  } else if (msTotal > 0) {
    pct = (msDone / msTotal) * 100;
  } else if (tTotal > 0) {
    pct = (tDone / tTotal) * 100;
  } else {
    pct = Number(goal.progress) || 0;
  }

  return {
    pct: Math.round(Math.max(0, Math.min(100, pct))),
    milestonesDone: msDone,
    milestonesTotal: msTotal,
    tasksDone: tDone,
    tasksTotal: tTotal
  };
}

/**
 * Encontra o objetivo marcado como principal.
 * @param {Array} goals
 * @returns {Object|null}
 */
export function findPrimaryGoal(goals) {
  if (!Array.isArray(goals)) return null;
  return goals.find(g => g.isPrimary === true && g.status !== 'archived') || null;
}

/**
 * Devolve tarefas ligadas a um objetivo.
 * @param {Array} tasks
 * @param {string} goalId
 * @returns {Array}
 */
export function getLinkedTasks(tasks, goalId) {
  if (!Array.isArray(tasks) || !goalId) return [];
  return tasks.filter(t => t.goalId === goalId);
}

/**
 * Devolve marcos de um objetivo, ordenados por dueDate.
 * @param {Array} milestones
 * @param {string} goalId
 * @returns {Array}
 */
export function getMilestones(milestones, goalId) {
  if (!Array.isArray(milestones) || !goalId) return [];
  return milestones
    .filter(m => m.goalId === goalId)
    .sort((a, b) => {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return a.dueDate.localeCompare(b.dueDate);
    });
}

/* ============================================================
   UI — Helpers
   ============================================================ */

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  return d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear();
}

function categoryLabel(cat) {
  const map = {
    personal: 'Pessoal', work: 'Trabalho', study: 'Estudos',
    health: 'Saúde', finance: 'Finanças', home: 'Casa',
    lumiere: 'Lumière', leisure: 'Lazer', other: 'Outro'
  };
  return map[cat] || 'Outro';
}

function priorityLabel(p) {
  const map = { urgent: 'Urgente', high: 'Alta', medium: 'Média', low: 'Baixa' };
  return map[p] || 'Média';
}

function categoryIconKey(cat) {
  const map = {
    personal: 'target', work: 'book', study: 'book',
    health: 'refresh', finance: 'dollar', home: 'target',
    lumiere: 'diamond', leisure: 'refresh', other: 'target'
  };
  return map[cat] || 'target';
}

/* ============================================================
   UI — Header
   ============================================================ */

function buildHeader() {
  const header = document.createElement('header');
  header.className = 'main-goal__header';

  const title = document.createElement('h1');
  title.className = 'main-goal__title';
  title.textContent = 'Objetivo Principal';
  header.appendChild(title);

  const sub = document.createElement('p');
  sub.className = 'main-goal__sub';
  sub.textContent = 'O teu foco actual';
  header.appendChild(sub);

  return header;
}

/* ============================================================
   UI — Hero card
   ============================================================ */

function buildHeroCard(goal, progress) {
  const card = document.createElement('section');
  card.className = 'main-goal__hero';

  // Topo: ícone + label small caps
  const top = document.createElement('div');
  top.className = 'main-goal__hero-top';

  const iconWrap = document.createElement('span');
  iconWrap.className = 'main-goal__hero-icon';
  if (ICONS.target) iconWrap.innerHTML = ICONS.target;
  top.appendChild(iconWrap);

  const label = document.createElement('span');
  label.className = 'main-goal__hero-label';
  label.textContent = 'Objetivo Principal';
  top.appendChild(label);

  card.appendChild(top);

  // Nome do objetivo
  const name = document.createElement('h2');
  name.className = 'main-goal__hero-name';
  name.textContent = goal.name || 'Sem título';
  card.appendChild(name);

  // Meta: categoria · prazo
  const metaParts = [categoryLabel(goal.category)];
  if (goal.targetDate) {
    metaParts.push('Prazo: ' + formatDate(goal.targetDate));
  }
  const meta = document.createElement('p');
  meta.className = 'main-goal__hero-meta';
  meta.textContent = metaParts.join(' · ');
  card.appendChild(meta);

  // Progresso: barra + %
  const progressRow = document.createElement('div');
  progressRow.className = 'main-goal__hero-progress';

  const barWrap = document.createElement('div');
  barWrap.className = 'main-goal__hero-bar-wrap';
  const bar = document.createElement('div');
  bar.className = 'main-goal__hero-bar';
  bar.style.width = progress.pct + '%';
  barWrap.appendChild(bar);
  progressRow.appendChild(barWrap);

  const pct = document.createElement('span');
  pct.className = 'main-goal__hero-pct';
  pct.textContent = progress.pct + '%';
  progressRow.appendChild(pct);

  card.appendChild(progressRow);

  // Legenda
  const legend = document.createElement('p');
  legend.className = 'main-goal__hero-legend';
  const msText = progress.milestonesTotal > 0
    ? progress.milestonesDone + ' de ' + progress.milestonesTotal + ' marcos'
    : 'sem marcos';
  const tText = progress.tasksTotal > 0
    ? progress.tasksDone + ' de ' + progress.tasksTotal + ' tarefas'
    : 'sem tarefas';
  legend.textContent = msText + ' · ' + tText;
  card.appendChild(legend);

  // Ver detalhes
  const seeDetails = document.createElement('button');
  seeDetails.type = 'button';
  seeDetails.className = 'main-goal__hero-see-details';
  seeDetails.textContent = 'Ver detalhes →';
  seeDetails.addEventListener('click', () => {
    eventBus.emit('navigation:changed', { page: 'goals' });
  });
  card.appendChild(seeDetails);

  return card;
}

/* ============================================================
   UI — Secção MARCOS
   ============================================================ */

function buildMilestoneRow(ms) {
  const row = document.createElement('div');
  row.className = 'main-goal__milestone';
  if (ms.status === 'completed') row.classList.add('is-completed');

  const toggle = document.createElement('span');
  toggle.className = 'main-goal__milestone-toggle';
  toggle.setAttribute('aria-hidden', 'true');
  row.appendChild(toggle);

  const textWrap = document.createElement('div');
  textWrap.className = 'main-goal__milestone-text';

  const nameEl = document.createElement('div');
  nameEl.className = 'main-goal__milestone-name';
  nameEl.textContent = ms.name || 'Sem título';
  textWrap.appendChild(nameEl);

  if (ms.dueDate) {
    const dueEl = document.createElement('div');
    dueEl.className = 'main-goal__milestone-due';
    dueEl.textContent = formatDate(ms.dueDate);
    textWrap.appendChild(dueEl);
  }

  row.appendChild(textWrap);

  const badge = document.createElement('span');
  badge.className = 'main-goal__milestone-badge main-goal__milestone-badge--' + (ms.status || 'pending');
  badge.textContent = ms.status === 'completed' ? 'Concluído' : 'Pendente';
  row.appendChild(badge);

  return row;
}

function buildMilestonesSection(milestones) {
  const section = document.createElement('section');
  section.className = 'main-goal__section main-goal__section--milestones';

  const header = document.createElement('header');
  header.className = 'main-goal__section-header';

  const title = document.createElement('h3');
  title.className = 'main-goal__section-title';
  title.textContent = 'Marcos';
  header.appendChild(title);

  const seeAll = document.createElement('button');
  seeAll.type = 'button';
  seeAll.className = 'main-goal__section-see-all';
  seeAll.textContent = 'Ver todos →';
  seeAll.addEventListener('click', () => {
    eventBus.emit('navigation:changed', { page: 'goals' });
  });
  header.appendChild(seeAll);

  section.appendChild(header);

  if (milestones.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'main-goal__section-empty';
    empty.textContent = 'Sem marcos definidos.';
    section.appendChild(empty);
    return section;
  }

  const list = document.createElement('div');
  list.className = 'main-goal__milestones-list';
  milestones.slice(0, 4).forEach(m => list.appendChild(buildMilestoneRow(m)));
  section.appendChild(list);

  return section;
}

/* ============================================================
   UI — Secção TAREFAS LIGADAS
   ============================================================ */

function buildTaskRow(task) {
  const row = document.createElement('div');
  row.className = 'main-goal__task';
  if (task.status === 'completed') row.classList.add('is-completed');

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'main-goal__task-toggle';
  toggle.setAttribute('role', 'checkbox');
  toggle.setAttribute('aria-checked', task.status === 'completed' ? 'true' : 'false');
  toggle.setAttribute('aria-label',
    task.status === 'completed' ? 'Marcar como pendente' : 'Marcar como concluída');

  toggle.addEventListener('click', async () => {
    const next = task.status === 'completed' ? 'pending' : 'completed';
    try {
      await dataManager.update('tasks', task.id, { status: next });
    } catch (err) {
      console.error('[MainGoal] Erro ao alternar tarefa:', err);
    }
  });
  row.appendChild(toggle);

  const iconWrap = document.createElement('span');
  iconWrap.className = 'main-goal__task-icon';
  const iconKey = categoryIconKey(task.category);
  if (ICONS[iconKey]) iconWrap.innerHTML = ICONS[iconKey];
  row.appendChild(iconWrap);

  const textWrap = document.createElement('div');
  textWrap.className = 'main-goal__task-text';

  const nameEl = document.createElement('div');
  nameEl.className = 'main-goal__task-name';
  nameEl.textContent = task.name || 'Sem título';
  textWrap.appendChild(nameEl);

  const metaEl = document.createElement('div');
  metaEl.className = 'main-goal__task-meta';
  metaEl.textContent = categoryLabel(task.category) + ' · ' + priorityLabel(task.priority || 'medium');
  textWrap.appendChild(metaEl);

  row.appendChild(textWrap);

  const badge = document.createElement('span');
  const prio = task.priority || 'medium';
  badge.className = 'main-goal__task-badge main-goal__task-badge--' + prio;
  badge.textContent = priorityLabel(prio);
  row.appendChild(badge);

  return row;
}

function buildTasksSection(tasks) {
  const section = document.createElement('section');
  section.className = 'main-goal__section main-goal__section--tasks';

  const header = document.createElement('header');
  header.className = 'main-goal__section-header';

  const title = document.createElement('h3');
  title.className = 'main-goal__section-title';
  title.textContent = 'Tarefas ligadas';
  header.appendChild(title);

  const seeAll = document.createElement('button');
  seeAll.type = 'button';
  seeAll.className = 'main-goal__section-see-all';
  seeAll.textContent = 'Ver todas →';
  seeAll.addEventListener('click', () => {
    eventBus.emit('navigation:changed', { page: 'tasks' });
  });
  header.appendChild(seeAll);

  section.appendChild(header);

  if (tasks.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'main-goal__section-empty';
    empty.textContent = 'Sem tarefas ligadas a este objetivo.';
    section.appendChild(empty);
    return section;
  }

  const list = document.createElement('div');
  list.className = 'main-goal__tasks-list';
  tasks.slice(0, 3).forEach(t => list.appendChild(buildTaskRow(t)));
  section.appendChild(list);

  return section;
}

/* ============================================================
   UI — Tip no fundo
   ============================================================ */

function buildTip() {
  const tip = document.createElement('div');
  tip.className = 'main-goal__tip';

  const iconWrap = document.createElement('span');
  iconWrap.className = 'main-goal__tip-icon';
  iconWrap.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.2 1 2h6c0-.8.4-1.5 1-2A7 7 0 0 0 12 2z"/></svg>';
  tip.appendChild(iconWrap);

  const text = document.createElement('p');
  text.className = 'main-goal__tip-text';
  text.textContent = 'O teu objetivo principal define o teu ritmo. Mantém o foco!';
  tip.appendChild(text);

  return tip;
}

/* ============================================================
   UI — Link para outros objetivos
   ============================================================ */

function buildFooterLink(otherCount) {
  const wrap = document.createElement('div');
  wrap.className = 'main-goal__footer-link-wrap';

  const link = document.createElement('button');
  link.type = 'button';
  link.className = 'main-goal__footer-link';
  const suffix = otherCount === 1 ? 'objetivo' : 'objetivos';
  link.textContent = otherCount > 0
    ? 'Ver os outros ' + otherCount + ' ' + suffix + ' →'
    : 'Ver todos os objetivos →';
  link.addEventListener('click', () => {
    eventBus.emit('navigation:changed', { page: 'goals' });
  });
  wrap.appendChild(link);

  return wrap;
}

/* ============================================================
   UI — Estado vazio
   ============================================================ */

function buildEmptyCard() {
  const card = document.createElement('section');
  card.className = 'main-goal__empty-card';

  const iconWrap = document.createElement('div');
  iconWrap.className = 'main-goal__empty-icon';
  if (ICONS.target) iconWrap.innerHTML = ICONS.target;
  card.appendChild(iconWrap);

  const title = document.createElement('h2');
  title.className = 'main-goal__empty-title';
  title.textContent = 'Sem objetivo principal definido';
  card.appendChild(title);

  const text = document.createElement('p');
  text.className = 'main-goal__empty-text';
  text.textContent = 'Escolhe um objetivo para acompanhar o teu foco e ver a tua evolução.';
  card.appendChild(text);

  const cta = document.createElement('button');
  cta.type = 'button';
  cta.className = 'main-goal__empty-cta';
  cta.innerHTML = '<span class="main-goal__empty-cta-plus" aria-hidden="true">+</span> Definir objetivo principal';
  cta.addEventListener('click', () => {
    eventBus.emit('navigation:changed', { page: 'goals' });
  });
  card.appendChild(cta);

  return card;
}

function buildAllGoalsSection(goals) {
  const section = document.createElement('section');
  section.className = 'main-goal__all-goals';

  const header = document.createElement('header');
  header.className = 'main-goal__all-goals-header';

  const title = document.createElement('h3');
  title.className = 'main-goal__all-goals-title';
  title.textContent = 'Os teus objetivos';
  header.appendChild(title);

  const seeAll = document.createElement('button');
  seeAll.type = 'button';
  seeAll.className = 'main-goal__all-goals-see-all';
  seeAll.textContent = 'Ver todos →';
  seeAll.addEventListener('click', () => {
    eventBus.emit('navigation:changed', { page: 'goals' });
  });
  header.appendChild(seeAll);

  section.appendChild(header);

  if (goals.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'main-goal__all-goals-empty';
    empty.textContent = 'Ainda não tens objetivos criados.';
    section.appendChild(empty);
    return section;
  }

  const grid = document.createElement('div');
  grid.className = 'main-goal__all-goals-grid';

  goals.slice(0, 6).forEach(goal => {
    const tile = document.createElement('button');
    tile.type = 'button';
    tile.className = 'main-goal__goal-tile';

    const top = document.createElement('div');
    top.className = 'main-goal__goal-tile-top';

    const iconWrap = document.createElement('span');
    iconWrap.className = 'main-goal__goal-tile-icon';
    if (ICONS.target) iconWrap.innerHTML = ICONS.target;
    top.appendChild(iconWrap);

    const chev = document.createElement('span');
    chev.className = 'main-goal__goal-tile-chevron';
    chev.setAttribute('aria-hidden', 'true');
    chev.textContent = '\u203A';
    top.appendChild(chev);

    tile.appendChild(top);

    const nameEl = document.createElement('div');
    nameEl.className = 'main-goal__goal-tile-name';
    nameEl.textContent = goal.name || 'Sem título';
    tile.appendChild(nameEl);

    const pct = document.createElement('div');
    pct.className = 'main-goal__goal-tile-pct';
    pct.textContent = (Number(goal.progress) || 0) + '%';
    tile.appendChild(pct);

    const barWrap = document.createElement('div');
    barWrap.className = 'main-goal__goal-tile-bar-wrap';
    const bar = document.createElement('div');
    bar.className = 'main-goal__goal-tile-bar';
    bar.style.width = (Number(goal.progress) || 0) + '%';
    barWrap.appendChild(bar);
    tile.appendChild(barWrap);

    tile.addEventListener('click', () => {
      eventBus.emit('navigation:changed', { page: 'goals' });
    });

    grid.appendChild(tile);
  });

  section.appendChild(grid);
  return section;
}

function buildQuoteCard() {
  const card = document.createElement('div');
  card.className = 'main-goal__quote';

  const iconWrap = document.createElement('span');
  iconWrap.className = 'main-goal__quote-icon';
  if (ICONS.target) iconWrap.innerHTML = ICONS.target;
  card.appendChild(iconWrap);

  const divider = document.createElement('div');
  divider.className = 'main-goal__quote-divider';
  card.appendChild(divider);

  const text = document.createElement('p');
  text.className = 'main-goal__quote-text';
  text.innerHTML = 'Grandes conquistas começam<br>com pequenos passos.';
  card.appendChild(text);

  return card;
}

/* ============================================================
   Init
   ============================================================ */

/* Contexto inteligente */
function buildGoalContext(goal, progress) {
  if (!goal) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (goal.targetDate) {
    const target = new Date(goal.targetDate);
    const days = Math.round((target - today) / 86400000);
    if (days >= 0 && days <= 30) {
      const pending = progress.milestonesTotal - progress.milestonesDone;
      const text = 'Prazo em ' + days + ' dia' + (days !== 1 ? 's' : '') +
        '. Ainda faltam ' + pending + ' marco' + (pending !== 1 ? 's' : '') + '.';
      return createContextLine({ text, variant: days <= 7 ? 'bad' : 'warning' });
    }
  }
  if (progress.pct < 30) {
    return createContextLine({
      text: 'Apenas ' + progress.pct + '% concluido. Um marco de cada vez.',
      variant: 'warning'
    });
  }
  return null;
}

export async function initMainGoal(container) {
  if (!container) {
    console.warn('[MainGoal] container nao fornecido');
    return;
  }

  if (_unsubscribe) {
    try { _unsubscribe(); } catch (e) { /* noop */ }
    _unsubscribe = null;
  }

  container.innerHTML = '<p class="main-goal__loading">A carregar\u2026</p>';

  const collections = {};
  try {
    const results = await Promise.all(
      RELEVANT_COLLECTIONS.map(n => dataManager.list(n).catch(() => []))
    );
    RELEVANT_COLLECTIONS.forEach((n, i) => {
      collections[n] = Array.isArray(results[i]) ? results[i] : [];
    });
  } catch (err) {
    console.error('[MainGoal] Erro ao ler colecoes:', err);
  }

  const primaryGoal = findPrimaryGoal(collections.goals);

  container.innerHTML = '';

  const page = document.createElement('section');
  page.className = 'main-goal';

  page.appendChild(buildHeader());

  if (primaryGoal) {
    const milestones = getMilestones(collections.goalMilestones, primaryGoal.id);
    const tasks = getLinkedTasks(collections.tasks, primaryGoal.id);
    const progress = calculateGoalProgress(primaryGoal, milestones, tasks);

    page.appendChild(buildHeroCard(primaryGoal, progress));

    const ctx = buildGoalContext(primaryGoal, progress);
    if (ctx) page.appendChild(ctx);

    page.appendChild(buildMilestonesSection(milestones));
    page.appendChild(buildTasksSection(tasks));
    page.appendChild(buildTip());

    const otherCount = collections.goals.filter(g => g.id !== primaryGoal.id).length;
    page.appendChild(buildFooterLink(otherCount));
  } else {
    // Estado vazio — sem objetivo principal definido
    const allGoals = collections.goals.filter(g => g.status !== 'archived');
    page.appendChild(buildEmptyCard());
    page.appendChild(buildAllGoalsSection(allGoals));
    page.appendChild(buildQuoteCard());
  }

  container.appendChild(page);

  _unsubscribe = eventBus.on('data:changed', (payload) => {
    if (payload && RELEVANT_COLLECTIONS.includes(payload.collection)) {
      initMainGoal(container);
    }
  });
}

export default { initMainGoal, calculateGoalProgress, findPrimaryGoal, getLinkedTasks, getMilestones };
