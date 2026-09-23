/**
 * Card: Hoje (página completa)
 *
 * Mostra tudo o que está marcado para hoje:
 *  - Progresso do dia (arco) + 3 métricas (tarefas / hábitos / eventos)
 *  - Tarefas do dia (com toggles)
 *  - Hábitos do dia (com toggles + streak)
 *  - Eventos do dia (calendário)
 *  - Sessões de estudo do dia
 *
 * Fluxo: UI -> Core (DataManager) -> Storage -> EventBus
 */
import { dataManager } from '../../../core/dataManager.js';
import { eventBus } from '../../../core/eventBus.js';
import { ICONS } from '../../../js/icons.js';
import { t } from '../../../js/i18n.js';
import { createProgressRing } from '../../../components/progress-ring/progressRing.js';
import { createContextLine } from '../../../components/context-line/contextLine.js';
import { priorities } from '../../../core/intelligence/priorities.js';

const RELEVANT_COLLECTIONS = [
  'tasks', 'habits', 'habitLogs',
  'studySessions', 'studies',
  'calendarEvents'
];

let _unsubscribe = null;

/* ============================================================
   Helpers de data
   ============================================================ */

function todayYMD() {
  return new Date().toISOString().split('T')[0];
}

function ymdOf(iso) {
  if (!iso) return '';
  return String(iso).split('T')[0];
}

function formatTodayLong() {
  const d = new Date();
  const days = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
  const months = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  return days[d.getDay()] + ', ' + d.getDate() + ' ' + months[d.getMonth()];
}

function categoryLabel(cat) {
  return t('category', cat) || cat || '—';
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
   Cálculos
   ============================================================ */

/**
 * Tarefas marcadas para hoje:
 *  - dueDate = hoje, ou
 *  - startDate = hoje
 */
function tasksToday(tasks) {
  const today = todayYMD();
  return tasks.filter(t => {
    const due = t.dueDate ? ymdOf(t.dueDate) : '';
    const start = t.startDate ? ymdOf(t.startDate) : '';
    return due === today || start === today;
  });
}

/**
 * Hábitos activos + estado de hoje.
 * Retorna cada hábito com:
 *  - log: HabitLog de hoje (ou null)
 *  - done: boolean
 *  - streak: dias consecutivos com log.completed = true até hoje
 */
function habitsToday(habits, habitLogs) {
  const today = todayYMD();
  const active = habits.filter(h => h.status === 'active');

  return active.map(habit => {
    const logToday = habitLogs.find(l =>
      l.habitId === habit.id && ymdOf(l.date) === today
    );

    const logsByHabit = habitLogs
      .filter(l => l.habitId === habit.id && l.completed === true)
      .map(l => ymdOf(l.date))
      .filter(Boolean)
      .sort()
      .reverse();

    // Streak: contar dias consecutivos desde hoje (ou desde ontem se hoje não estiver feito)
    let streak = 0;
    const cursor = new Date(today);
    if (logsByHabit[0] !== today) {
      cursor.setDate(cursor.getDate() - 1);
    }
    for (let i = 0; i < 365; i++) {
      const key = cursor.toISOString().split('T')[0];
      if (logsByHabit.includes(key)) {
        streak++;
        cursor.setDate(cursor.getDate() - 1);
      } else {
        break;
      }
    }

    return {
      habit,
      log: logToday || null,
      done: Boolean(logToday && logToday.completed),
      streak
    };
  });
}

/**
 * Eventos que ocorrem hoje (baseado em start).
 */
function eventsToday(events) {
  const today = todayYMD();
  return events
    .filter(e => e.start && ymdOf(e.start) === today)
    .sort((a, b) => String(a.start).localeCompare(String(b.start)));
}

/**
 * Sessões de estudo de hoje.
 */
function studySessionsToday(sessions) {
  const today = todayYMD();
  return sessions.filter(s => s.date && ymdOf(s.date) === today);
}

/**
 * Calcula tudo o que o card precisa.
 */
function calculateTodayStats(collections) {
  const tasks = Array.isArray(collections.tasks) ? collections.tasks : [];
  const habits = Array.isArray(collections.habits) ? collections.habits : [];
  const habitLogs = Array.isArray(collections.habitLogs) ? collections.habitLogs : [];
  const studySessions = Array.isArray(collections.studySessions) ? collections.studySessions : [];
  const studies = Array.isArray(collections.studies) ? collections.studies : [];
  const events = Array.isArray(collections.calendarEvents) ? collections.calendarEvents : [];

  const tToday = tasksToday(tasks);
  const hToday = habitsToday(habits, habitLogs);
  const eToday = eventsToday(events);
  const sToday = studySessionsToday(studySessions);

  const tasksDone = tToday.filter(t => t.status === 'completed').length;
  const tasksTotal = tToday.length;

  const habitsDone = hToday.filter(h => h.done).length;
  const habitsTotal = hToday.length;

  const studiesDone = sToday.filter(s => Number(s.duration) > 0).length;
  const studiesTotal = sToday.length;

  const eventsCount = eToday.length;

  // Progresso = soma dos feitos / soma dos totais
  const total = tasksTotal + habitsTotal + studiesTotal;
  const done = tasksDone + habitsDone + studiesDone;
  const progress = total > 0 ? Math.round((done / total) * 100) : 0;

  // Total de minutos de estudo hoje
  const totalStudyMin = sToday.reduce((sum, s) => sum + (Number(s.duration) || 0), 0);

  return {
    progress,
    tasksDone,
    tasksTotal,
    habitsDone,
    habitsTotal,
    studiesDone,
    studiesTotal,
    eventsCount,
    totalStudyMin,
    tasks: tToday,
    habits: hToday,
    events: eToday,
    studySessions: sToday,
    studies,
    totalItems: total
  };
}

/* ============================================================
   UI — Header
   ============================================================ */

function buildHeader() {
  const header = document.createElement('header');
  header.className = 'today__header';

  const title = document.createElement('h1');
  title.className = 'today__title';
  title.textContent = 'Hoje';
  header.appendChild(title);

  const sub = document.createElement('p');
  sub.className = 'today__sub';
  sub.textContent = formatTodayLong();
  header.appendChild(sub);

  return header;
}

/* ============================================================
   UI — Hero card (arco + 3 métricas)
   ============================================================ */

function buildMetric(label, value) {
  const metric = document.createElement('div');
  metric.className = 'today__hero-metric';

  const valueEl = document.createElement('div');
  valueEl.className = 'today__hero-metric-value';
  valueEl.textContent = String(value);
  metric.appendChild(valueEl);

  const labelEl = document.createElement('div');
  labelEl.className = 'today__hero-metric-label';
  labelEl.textContent = label;
  metric.appendChild(labelEl);

  return metric;
}

function buildHeroCard(stats) {
  const card = document.createElement('section');
  card.className = 'today__hero';

  // Arco de progresso
  const ringWrap = document.createElement('div');
  ringWrap.className = 'today__hero-ring';
  const ring = createProgressRing({
    value: stats.progress,
    variant: 'default',
    size: 140,
    stroke: 10,
    animate: true
  });
  ringWrap.appendChild(ring);

  const ringLabel = document.createElement('div');
  ringLabel.className = 'today__hero-ring-label';
  ringLabel.textContent = 'do teu dia concluído';
  ringWrap.appendChild(ringLabel);

  card.appendChild(ringWrap);

  // 3 métricas
  const metrics = document.createElement('div');
  metrics.className = 'today__hero-metrics';

  metrics.appendChild(buildMetric('tarefas', stats.tasksDone + '/' + stats.tasksTotal));
  metrics.appendChild(buildMetric('hábitos', stats.habitsDone + '/' + stats.habitsTotal));
  metrics.appendChild(buildMetric('eventos', stats.eventsCount));

  card.appendChild(metrics);

  return card;
}

/* ============================================================
   UI — Secção TAREFAS
   ============================================================ */

function buildTaskRow(task) {
  const row = document.createElement('div');
  row.className = 'today__task';
  if (task.status === 'completed') row.classList.add('is-completed');

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'today__task-toggle';
  toggle.setAttribute('role', 'checkbox');
  toggle.setAttribute('aria-checked', task.status === 'completed' ? 'true' : 'false');
  toggle.setAttribute('aria-label',
    task.status === 'completed' ? 'Marcar como pendente' : 'Marcar como concluída');

  toggle.addEventListener('click', async () => {
    const next = task.status === 'completed' ? 'pending' : 'completed';
    try {
      await dataManager.update('tasks', task.id, { status: next });
    } catch (err) {
      console.error('[Today] Erro ao alternar tarefa:', err);
    }
  });
  row.appendChild(toggle);

  const iconWrap = document.createElement('span');
  iconWrap.className = 'today__task-icon';
  const iconKey = categoryIconKey(task.category);
  if (ICONS[iconKey]) iconWrap.innerHTML = ICONS[iconKey];
  row.appendChild(iconWrap);

  const textWrap = document.createElement('div');
  textWrap.className = 'today__task-text';

  const nameEl = document.createElement('div');
  nameEl.className = 'today__task-name';
  nameEl.textContent = task.name || 'Sem título';
  textWrap.appendChild(nameEl);

  const metaEl = document.createElement('div');
  metaEl.className = 'today__task-meta';
  metaEl.textContent = categoryLabel(task.category) + ' · Hoje';
  textWrap.appendChild(metaEl);

  row.appendChild(textWrap);

  const badge = document.createElement('span');
  const prio = task.priority || 'medium';
  badge.className = 'today__task-badge today__task-badge--' + prio;
  badge.textContent = priorityLabel(prio);
  row.appendChild(badge);

  const time = document.createElement('span');
  time.className = 'today__task-time';
  time.textContent = task.startTime || '';
  row.appendChild(time);

  return row;
}

function buildTasksSection(stats) {
  const section = document.createElement('section');
  section.className = 'today__section today__section--tasks';

  const header = document.createElement('header');
  header.className = 'today__section-header';

  const title = document.createElement('h3');
  title.className = 'today__section-title';
  title.textContent = 'Tarefas';
  header.appendChild(title);

  const count = document.createElement('span');
  count.className = 'today__section-count';
  count.textContent = stats.tasksDone + ' de ' + stats.tasksTotal;
  header.appendChild(count);

  section.appendChild(header);

  if (stats.tasks.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'today__section-empty';
    empty.textContent = 'Sem tarefas para hoje.';
    section.appendChild(empty);

    const seeAll = document.createElement('button');
    seeAll.type = 'button';
    seeAll.className = 'today__section-see-all';
    seeAll.textContent = 'Ver todas as tarefas \u2192';
    seeAll.addEventListener('click', () => {
      eventBus.emit('navigation:changed', { page: 'tasks' });
    });
    section.appendChild(seeAll);

    return section;
  }

  const list = document.createElement('div');
  list.className = 'today__tasks-list';
  stats.tasks.slice(0, 3).forEach(t => list.appendChild(buildTaskRow(t)));
  section.appendChild(list);

  const seeAll = document.createElement('button');
  seeAll.type = 'button';
  seeAll.className = 'today__section-see-all';
  seeAll.textContent = 'Ver todas as tarefas \u2192';
  seeAll.addEventListener('click', () => {
    eventBus.emit('navigation:changed', { page: 'tasks' });
  });
  section.appendChild(seeAll);

  return section;
}

/* ============================================================
   UI — Secção HÁBITOS
   ============================================================ */

function buildHabitRow(item) {
  const row = document.createElement('div');
  row.className = 'today__habit';
  if (item.done) row.classList.add('is-completed');

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'today__habit-toggle';
  toggle.setAttribute('role', 'checkbox');
  toggle.setAttribute('aria-checked', item.done ? 'true' : 'false');
  toggle.setAttribute('aria-label',
    item.done ? 'Desmarcar hábito' : 'Marcar hábito como feito');

  toggle.addEventListener('click', async () => {
    const today = todayYMD();
    try {
      if (item.log) {
        // Já existe log: alternar
        await dataManager.update('habitLogs', item.log.id, {
          completed: !item.log.completed
        });
      } else {
        // Criar log novo
        await dataManager.create('habitLogs', {
          habitId: item.habit.id,
          date: today,
          completed: true,
          value: 1
        });
      }
    } catch (err) {
      console.error('[Today] Erro ao alternar hábito:', err);
    }
  });
  row.appendChild(toggle);

  const textWrap = document.createElement('div');
  textWrap.className = 'today__habit-text';

  const nameEl = document.createElement('div');
  nameEl.className = 'today__habit-name';
  nameEl.textContent = item.habit.name || 'Sem nome';
  textWrap.appendChild(nameEl);

  // Barra de progresso (0 ou 100% por agora — um hábito é binário hoje)
  const barWrap = document.createElement('div');
  barWrap.className = 'today__habit-bar-wrap';
  const bar = document.createElement('div');
  bar.className = 'today__habit-bar';
  bar.style.width = item.done ? '100%' : '0%';
  barWrap.appendChild(bar);
  textWrap.appendChild(barWrap);

  row.appendChild(textWrap);

  const pct = document.createElement('span');
  pct.className = 'today__habit-pct';
  pct.textContent = item.done ? '100%' : '0%';
  row.appendChild(pct);

  // Streak
  const streak = document.createElement('span');
  streak.className = 'today__habit-streak';
  const fireIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="today__habit-streak-icon"><path d="M12 2c0 4-4 5-4 10a4 4 0 0 0 8 0c0-2-1-3-1-3s3 2 3 5a6 6 0 0 1-12 0c0-6 6-8 6-12z"/></svg>';
  streak.innerHTML = fireIcon + '<span class="today__habit-streak-count">' + item.streak + ' ' + (item.streak === 1 ? 'dia' : 'dias') + '</span>';
  row.appendChild(streak);

  return row;
}

function buildHabitsSection(stats) {
  const section = document.createElement('section');
  section.className = 'today__section today__section--habits';

  const header = document.createElement('header');
  header.className = 'today__section-header';

  const title = document.createElement('h3');
  title.className = 'today__section-title';
  title.textContent = 'Hábitos';
  header.appendChild(title);

  const count = document.createElement('span');
  count.className = 'today__section-count';
  count.textContent = stats.habitsDone + ' de ' + stats.habitsTotal;
  header.appendChild(count);

  section.appendChild(header);

  if (stats.habits.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'today__section-empty';
    empty.textContent = 'Sem hábitos activos.';
    section.appendChild(empty);

    const seeAll = document.createElement('button');
    seeAll.type = 'button';
    seeAll.className = 'today__section-see-all';
    seeAll.textContent = 'Ver todos os hábitos \u2192';
    seeAll.addEventListener('click', () => {
      eventBus.emit('navigation:changed', { page: 'habits' });
    });
    section.appendChild(seeAll);

    return section;
  }

  const list = document.createElement('div');
  list.className = 'today__habits-list';
  stats.habits.slice(0, 3).forEach(h => list.appendChild(buildHabitRow(h)));
  section.appendChild(list);

  const seeAll = document.createElement('button');
  seeAll.type = 'button';
  seeAll.className = 'today__section-see-all';
  seeAll.textContent = 'Ver todos os hábitos \u2192';
  seeAll.addEventListener('click', () => {
    eventBus.emit('navigation:changed', { page: 'habits' });
  });
  section.appendChild(seeAll);

  return section;
}

/* ============================================================
   UI — Secção EVENTOS
   ============================================================ */

function formatTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return pad(d.getHours()) + ':' + pad(d.getMinutes());
}

const EVENT_CATEGORY_COLORS = {
  work: '#d4af37',
  personal: '#9ecc8f',
  study: '#7fb3d5',
  health: '#d4665a',
  finance: '#d4af37',
  home: '#b8956a',
  lumiere: '#d4af37',
  leisure: '#9ecc8f',
  other: '#b8b0a4'
};

function buildEventRow(event) {
  const row = document.createElement('div');
  row.className = 'today__event';

  const barColor = EVENT_CATEGORY_COLORS[event.category] || '#b8b0a4';
  const bar = document.createElement('span');
  bar.className = 'today__event-bar';
  bar.style.background = barColor;
  row.appendChild(bar);

  const iconWrap = document.createElement('span');
  iconWrap.className = 'today__event-icon';
  if (ICONS.calendar) iconWrap.innerHTML = ICONS.calendar;
  row.appendChild(iconWrap);

  const textWrap = document.createElement('div');
  textWrap.className = 'today__event-text';

  const titleEl = document.createElement('div');
  titleEl.className = 'today__event-title';
  titleEl.textContent = event.title || 'Sem título';
  textWrap.appendChild(titleEl);

  const metaEl = document.createElement('div');
  metaEl.className = 'today__event-meta';
  const startT = formatTime(event.start);
  const endT = formatTime(event.end);
  const timeRange = startT && endT ? startT + ' - ' + endT : (startT || 'Dia inteiro');
  metaEl.textContent = timeRange + ' · ' + categoryLabel(event.category);
  textWrap.appendChild(metaEl);

  row.appendChild(textWrap);

  const chev = document.createElement('span');
  chev.className = 'today__event-chevron';
  chev.setAttribute('aria-hidden', 'true');
  chev.textContent = '\u203A';
  row.appendChild(chev);

  return row;
}

function buildEventsSection(stats) {
  const section = document.createElement('section');
  section.className = 'today__section today__section--events';

  const header = document.createElement('header');
  header.className = 'today__section-header';

  const title = document.createElement('h3');
  title.className = 'today__section-title';
  title.textContent = 'Eventos';
  header.appendChild(title);

  const count = document.createElement('span');
  count.className = 'today__section-count';
  count.textContent = stats.events.length;
  header.appendChild(count);

  section.appendChild(header);

  if (stats.events.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'today__section-empty';
    empty.textContent = 'Sem eventos marcados para hoje.';
    section.appendChild(empty);
    return section;
  }

  const list = document.createElement('div');
  list.className = 'today__events-list';
  stats.events.forEach(e => list.appendChild(buildEventRow(e)));
  section.appendChild(list);

  return section;
}

/* ============================================================
   UI — Secção ESTUDOS
   ============================================================ */

function formatMinutes(min) {
  const m = Number(min) || 0;
  if (m < 60) return m + ' min';
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest === 0 ? h + 'h' : h + 'h ' + rest + 'min';
}

function buildStudyRow(session, study, maxMin) {
  const row = document.createElement('div');
  row.className = 'today__study';

  const barColor = '#d4af37';

  const barLeft = document.createElement('span');
  barLeft.className = 'today__study-bar';
  barLeft.style.background = barColor;
  row.appendChild(barLeft);

  const textWrap = document.createElement('div');
  textWrap.className = 'today__study-text';

  const nameEl = document.createElement('div');
  nameEl.className = 'today__study-name';
  nameEl.textContent = study ? (study.name || 'Estudo') : 'Estudo removido';
  textWrap.appendChild(nameEl);

  const barWrap = document.createElement('div');
  barWrap.className = 'today__study-bar-wrap';
  const bar = document.createElement('div');
  bar.className = 'today__study-bar-fill';
  const dur = Number(session.duration) || 0;
  const pct = maxMin > 0 ? Math.round((dur / maxMin) * 100) : 0;
  bar.style.width = pct + '%';
  barWrap.appendChild(bar);
  textWrap.appendChild(barWrap);

  row.appendChild(textWrap);

  const durEl = document.createElement('span');
  durEl.className = 'today__study-duration';
  durEl.textContent = formatMinutes(dur);
  row.appendChild(durEl);

  return row;
}

function buildStudiesSection(stats) {
  const section = document.createElement('section');
  section.className = 'today__section today__section--studies';

  const header = document.createElement('header');
  header.className = 'today__section-header';

  const title = document.createElement('h3');
  title.className = 'today__section-title';
  title.textContent = 'Estudos';
  header.appendChild(title);

  const total = document.createElement('span');
  total.className = 'today__section-total';
  total.textContent = formatMinutes(stats.totalStudyMin);
  header.appendChild(total);

  section.appendChild(header);

  if (stats.studySessions.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'today__section-empty';
    empty.textContent = 'Sem sessões de estudo hoje.';
    section.appendChild(empty);
    return section;
  }

  const maxMin = Math.max(...stats.studySessions.map(s => Number(s.duration) || 0));
  const list = document.createElement('div');
  list.className = 'today__studies-list';
  stats.studySessions.forEach(session => {
    const study = stats.studies.find(x => x.id === session.studyId) || null;
    list.appendChild(buildStudyRow(session, study, maxMin));
  });
  section.appendChild(list);

  return section;
}

/* ============================================================
   UI — Tip no fundo
   ============================================================ */

function buildTip() {
  const tip = document.createElement('div');
  tip.className = 'today__tip';

  const iconWrap = document.createElement('span');
  iconWrap.className = 'today__tip-icon';
  iconWrap.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.2 1 2h6c0-.8.4-1.5 1-2A7 7 0 0 0 12 2z"/></svg>';
  tip.appendChild(iconWrap);

  const text = document.createElement('p');
  text.className = 'today__tip-text';
  text.textContent = 'O dia é construído uma tarefa de cada vez.';
  tip.appendChild(text);

  return tip;
}

/* ============================================================
   UI — Estado vazio
   ============================================================ */

function buildEmptyCard() {
  const card = document.createElement('section');
  card.className = 'today__empty-card';

  const iconWrap = document.createElement('div');
  iconWrap.className = 'today__empty-icon';
  iconWrap.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="8" y1="3" x2="8" y2="7"/><line x1="16" y1="3" x2="16" y2="7"/></svg>';
  card.appendChild(iconWrap);

  const title = document.createElement('h2');
  title.className = 'today__empty-title';
  title.textContent = 'Nada marcado para hoje';
  card.appendChild(title);

  const text = document.createElement('p');
  text.className = 'today__empty-text';
  text.textContent = 'Adiciona tarefas, hábitos ou eventos para começar o teu dia.';
  card.appendChild(text);

  const cta = document.createElement('button');
  cta.type = 'button';
  cta.className = 'today__empty-cta';
  cta.innerHTML = '<span class="today__empty-cta-plus" aria-hidden="true">+</span> Adicionar ao dia';
  cta.addEventListener('click', () => {
    eventBus.emit('navigation:changed', { page: 'tasks' });
  });
  card.appendChild(cta);

  return card;
}

function buildSuggestionTile(iconSvg, title, subtitle, targetPage) {
  const tile = document.createElement('button');
  tile.type = 'button';
  tile.className = 'today__suggestion-tile';

  const iconWrap = document.createElement('span');
  iconWrap.className = 'today__suggestion-icon';
  iconWrap.innerHTML = iconSvg;
  tile.appendChild(iconWrap);

  const textWrap = document.createElement('div');
  textWrap.className = 'today__suggestion-text';

  const titleEl = document.createElement('div');
  titleEl.className = 'today__suggestion-title';
  titleEl.textContent = title;
  textWrap.appendChild(titleEl);

  const subEl = document.createElement('div');
  subEl.className = 'today__suggestion-sub';
  subEl.textContent = subtitle;
  textWrap.appendChild(subEl);

  tile.appendChild(textWrap);

  const chev = document.createElement('span');
  chev.className = 'today__suggestion-chevron';
  chev.setAttribute('aria-hidden', 'true');
  chev.textContent = '\u203A';
  tile.appendChild(chev);

  tile.addEventListener('click', () => {
    eventBus.emit('navigation:changed', { page: targetPage });
  });

  return tile;
}

function buildSuggestionsSection() {
  const section = document.createElement('section');
  section.className = 'today__suggestions';

  const header = document.createElement('header');
  header.className = 'today__suggestions-header';

  const title = document.createElement('h3');
  title.className = 'today__suggestions-title';
  title.textContent = 'Sugestões';
  header.appendChild(title);

  section.appendChild(header);

  const list = document.createElement('div');
  list.className = 'today__suggestions-list';

  const iconCheck = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>';
  const iconRefresh = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="21 12 3 12"/><polyline points="8 7 3 12 8 17"/><polyline points="16 7 21 12 16 17"/></svg>';
  const iconCalendar = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="8" y1="3" x2="8" y2="7"/><line x1="16" y1="3" x2="16" y2="7"/></svg>';

  list.appendChild(buildSuggestionTile(iconCheck, 'Criar uma tarefa', 'Adiciona algo para hoje', 'tasks'));
  list.appendChild(buildSuggestionTile(iconRefresh, 'Adicionar um hábito', 'Constrói uma rotina', 'habits'));
  list.appendChild(buildSuggestionTile(iconCalendar, 'Marcar um evento', 'Reserva um horário', 'calendar'));

  section.appendChild(list);
  return section;
}

function buildEmptyTip() {
  const tip = document.createElement('div');
  tip.className = 'today__tip';

  const iconWrap = document.createElement('span');
  iconWrap.className = 'today__tip-icon';
  iconWrap.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.2 1 2h6c0-.8.4-1.5 1-2A7 7 0 0 0 12 2z"/></svg>';
  tip.appendChild(iconWrap);

  const text = document.createElement('p');
  text.className = 'today__tip-text';
  text.textContent = 'Os dias vazios também são dias para respirar.';
  tip.appendChild(text);

  return tip;
}

/* ============================================================
   Contexto inteligente
   ============================================================ */

const CONTEXT_ICON_CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.2 1 2h6c0-.8.4-1.5 1-2A7 7 0 0 0 12 2z"/></svg>';

function buildTodayContext(collections) {
  const ranked = priorities.rank(collections, 1);
  if (ranked.length === 0) return null;

  const top = ranked[0];
  let variant = 'info';
  if (top.type === 'task-overdue') variant = 'bad';
  else if (top.type === 'task-today' || top.type === 'event-today') variant = 'warning';

  return createContextLine({
    iconHtml: CONTEXT_ICON_CHECK,
    text: top.title + ' — ' + top.detail + '. Comeca por aqui.',
    variant
  });
}

/* ============================================================
   Init
   ============================================================ */

export async function initToday(container) {
  if (!container) {
    console.warn('[Today] container nao fornecido');
    return;
  }

  if (_unsubscribe) {
    try { _unsubscribe(); } catch (e) { /* noop */ }
    _unsubscribe = null;
  }

  container.innerHTML = '<p class="today__loading">A carregar\u2026</p>';

  const collections = {};
  try {
    const results = await Promise.all(
      RELEVANT_COLLECTIONS.map(n => dataManager.list(n).catch(() => []))
    );
    RELEVANT_COLLECTIONS.forEach((n, i) => {
      collections[n] = Array.isArray(results[i]) ? results[i] : [];
    });
  } catch (err) {
    console.error('[Today] Erro ao ler colecoes:', err);
  }

  const stats = calculateTodayStats(collections);

  const isFullyEmpty =
    stats.tasksTotal === 0 &&
    stats.habitsTotal === 0 &&
    stats.eventsCount === 0 &&
    stats.studiesTotal === 0;

  container.innerHTML = '';

  const page = document.createElement('section');
  page.className = 'today';

  page.appendChild(buildHeader());

  if (isFullyEmpty) {
    page.appendChild(buildEmptyCard());
    page.appendChild(buildSuggestionsSection());
    page.appendChild(buildEmptyTip());
  } else {
    page.appendChild(buildHeroCard(stats));

    const ctx = buildTodayContext(collections);
    if (ctx) page.appendChild(ctx);

    page.appendChild(buildTasksSection(stats));
    page.appendChild(buildHabitsSection(stats));
    page.appendChild(buildEventsSection(stats));
    page.appendChild(buildStudiesSection(stats));
    page.appendChild(buildTip());
  }

  container.appendChild(page);

  _unsubscribe = eventBus.on('data:changed', (payload) => {
    if (payload && RELEVANT_COLLECTIONS.includes(payload.collection)) {
      initToday(container);
    }
  });
}

export default {
  initToday,
  calculateTodayStats
};
