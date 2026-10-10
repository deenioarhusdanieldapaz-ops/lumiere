/**
 * Foco Hoje — Página com lista priorizada + Pomodoro
 */
import { dataManager } from '../../core/dataManager.js';
import { eventBus } from '../../core/eventBus.js';
import { startSession, openConfigFor } from './focus-timer.js';

const RELEVANT = ['tasks', 'habits', 'habitLogs', 'focusSessions'];
const STARS_DISPLAY = 4;

let _container = null;
let _unsubscribe = null;
let _state = {
  tasks: [],
  habits: [],
  habitLogs: [],
  focusSessions: [],
  loading: false
};

/* ---------- Helpers ---------- */
function todayYMD() {
  return new Date().toISOString().split('T')[0];
}
function ymdOf(iso) {
  return iso ? String(iso).split('T')[0] : '';
}
function formatTodayLong() {
  const d = new Date();
  const days = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
  const months = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  return days[d.getDay()] + ', ' + d.getDate() + ' ' + months[d.getMonth()];
}

/* ---------- Filtros de "hoje" ---------- */
function tasksToday(tasks) {
  const today = todayYMD();
  return (tasks || []).filter(t => {
    const due = ymdOf(t.dueDate);
    const start = ymdOf(t.startDate);
    return due === today || start === today;
  }).filter(t => t.status !== 'cancelled' && t.status !== 'completed');
}

function habitsToday(habits, logs) {
  const today = todayYMD();
  const doneIds = new Set((logs || []).filter(l => l.date === today && l.completed).map(l => l.habitId));
  return (habits || [])
    .filter(h => h.status !== 'paused' && h.status !== 'archived')
    .map(h => ({ ...h, _doneToday: doneIds.has(h.id) }));
}

/* ---------- Sessões de foco ---------- */
function sessionsForEntityToday(sessions, entityId) {
  const today = todayYMD();
  return (sessions || []).filter(s => s.date === today && s.entityId === entityId);
}
function aggregateSessions(sessions) {
  return sessions.reduce((acc, s) => {
    acc.cycles += (s.completedCycles || 0);
    acc.minutes += (s.focusMinutes || 0);
    return acc;
  }, { cycles: 0, minutes: 0 });
}

/* ---------- Builders ---------- */
function el(tag, cls, txt) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (txt !== undefined) e.textContent = txt;
  return e;
}

function starsRow(cycles, max) {
  const wrap = el('span', 'focus-item__stars');
  const filled = Math.min(cycles, max);
  for (let i = 0; i < max; i++) {
    const s = el('span', 'focus-item__star' + (i < filled ? '' : ' focus-item__star--empty'), '\u2726');
    wrap.appendChild(s);
  }
  return wrap;
}

function formatMinutes(m) {
  if (!m) return '0 min';
  if (m < 60) return m + ' min';
  const h = Math.floor(m / 60);
  const r = m % 60;
  return h + 'h' + (r > 0 ? ' ' + r + 'min' : '');
}

function priorityLabel(p) {
  return ({ urgent: 'urgente', high: 'alta', medium: 'média', low: 'baixa' })[p] || 'média';
}

function buildSummaryCard(totalCycles, totalMinutes) {
  const card = el('div', 'focus-list__summary');
  const starsWrap = el('div', 'focus-list__summary-stars');
  for (let i = 0; i < STARS_DISPLAY; i++) {
    const s = el('span', 'focus-list__summary-star' + (i < Math.min(totalCycles, STARS_DISPLAY) ? '' : ' focus-list__summary-star--empty'), '\u2726');
    starsWrap.appendChild(s);
  }
  card.appendChild(starsWrap);

  const textWrap = el('div', 'focus-list__summary-text');
  const line1 = el('div', null, totalCycles + (totalCycles === 1 ? ' ciclo' : ' ciclos') + ' · ' + formatMinutes(totalMinutes) + ' hoje');
  textWrap.appendChild(line1);
  const delta = el('div', 'focus-list__summary-delta', totalCycles > 0 ? 'Continua assim' : 'Começa o primeiro ciclo');
  textWrap.appendChild(delta);
  card.appendChild(textWrap);

  card.appendChild(el('span', 'focus-list__summary-chev', '\u203A'));

  card.addEventListener('click', () => {
    try { eventBus.emit('toast:show', { type: 'info', text: 'Estatísticas de foco em breve.' }); } catch (_) {}
  });
  return card;
}

function buildItem(entity, kind) {
  const row = el('div', 'focus-item');
  if (entity._doneToday) row.classList.add('focus-item--done');

  const icon = el('span', 'focus-item__icon', kind === 'task' ? '\u{1F4DD}' : '\u{1F504}');
  row.appendChild(icon);

  const body = el('div', 'focus-item__body');
  const name = el('div', 'focus-item__name', entity.name || '(sem nome)');
  body.appendChild(name);

  const sessions = sessionsForEntityToday(_state.focusSessions, entity.id);
  const agg = aggregateSessions(sessions);

  const meta = el('div', 'focus-item__meta');
  meta.appendChild(starsRow(agg.cycles, STARS_DISPLAY));
  meta.appendChild(el('span', null, formatMinutes(agg.minutes) || '0 min'));
  if (kind === 'task' && entity.priority) {
    const prio = el('span', 'focus-item__priority focus-item__priority--' + entity.priority, priorityLabel(entity.priority));
    meta.appendChild(prio);
  }
  body.appendChild(meta);
  row.appendChild(body);

  if (entity._doneToday) {
    const check = el('span', 'focus-item__check', '\u2713');
    row.appendChild(check);
  } else {
    const play = el('button', 'focus-item__play', '\u25B6');
    play.type = 'button';
    play.setAttribute('aria-label', 'Iniciar foco em ' + (entity.name || ''));
    play.addEventListener('click', () => {
      console.log('[Focus] play clicked | kind=' + kind + ' | id=' + entity.id);
      openConfigFor({
        type: kind,
        id: entity.id,
        name: entity.name || '(sem nome)'
      });
    });
    row.appendChild(play);
  }

  return row;
}

function buildSection(title, count, entities, kind) {
  const sec = el('section', 'focus-list__section');
  const head = el('div', 'focus-list__section-head');
  head.appendChild(el('h3', 'focus-list__section-title', title));
  head.appendChild(el('span', 'focus-list__section-count', count + (kind === 'task' ? ' tarefas' : ' ativos')));
  sec.appendChild(head);
  for (const e of entities) sec.appendChild(buildItem(e, kind));
  return sec;
}

function buildEmpty() {
  const wrap = el('div', 'focus-empty');
  wrap.appendChild(el('span', 'focus-empty__icon', '\u{1F3AF}'));
  wrap.appendChild(el('p', null, 'Nada marcado para hoje. Adiciona tarefas ou hábitos para começar.'));
  return wrap;
}

/* ---------- Render principal ---------- */
function render() {
  if (!_container) return;
  _container.innerHTML = '';

  const page = el('div', 'focus-page');
  const list = el('div', 'focus-list');

  const header = el('header', 'focus-list__header');
  header.appendChild(el('h1', 'focus-list__title', 'FOCO HOJE'));
  header.appendChild(el('p', 'focus-list__date', formatTodayLong()));
  list.appendChild(header);

  const todayTasks = tasksToday(_state.tasks);
  const todayHabits = habitsToday(_state.habits, _state.habitLogs);

  const todaySessions = (_state.focusSessions || []).filter(s => s.date === todayYMD());
  const todayAgg = aggregateSessions(todaySessions);

  list.appendChild(buildSummaryCard(todayAgg.cycles, todayAgg.minutes));

  const nothing = todayTasks.length === 0 && todayHabits.length === 0;
  if (nothing) {
    list.appendChild(buildEmpty());
  } else {
    const prioOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
    todayTasks.sort((a, b) => (prioOrder[a.priority] ?? 2) - (prioOrder[b.priority] ?? 2));

    if (todayTasks.length > 0) {
      list.appendChild(buildSection('TAREFAS', todayTasks.length, todayTasks, 'task'));
    }
    if (todayHabits.length > 0) {
      const doneCount = todayHabits.filter(h => h._doneToday).length;
      list.appendChild(buildSection('HÁBITOS', doneCount + ' de ' + todayHabits.length, todayHabits, 'habit'));
    }
  }

  page.appendChild(list);
  _container.appendChild(page);
}

/* ---------- Carga de dados ---------- */
async function loadData() {
  _state.loading = true;
  try {
    const results = await Promise.all(
      RELEVANT.map(n => dataManager.list(n).catch(() => []))
    );
    RELEVANT.forEach((n, i) => { _state[n] = Array.isArray(results[i]) ? results[i] : []; });
  } catch (err) {
    console.error('[Focus] Erro ao ler coleções:', err);
  }
  _state.loading = false;
  render();
}

/* ---------- Entrada pública ---------- */
export function initFocus(container) {
  if (!container) {
    console.warn('[Focus] container inválido.');
    return;
  }
  _container = container;

  if (_unsubscribe) _unsubscribe();
  _unsubscribe = eventBus.on('data:changed', (payload) => {
    if (payload && RELEVANT.includes(payload.collection)) {
      loadData();
    }
  });

  loadData();
}

export default { initFocus };
