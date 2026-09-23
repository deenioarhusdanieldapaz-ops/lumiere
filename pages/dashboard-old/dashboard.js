/**
 * Dashboard - Orchestrator (v2 — compacto)
 *
 * Responsabilidades:
 *  - Construir os 5 blocos do Dashboard compacto
 *  - Delegar a citação ao registry (único section ativo)
 *  - Reagir a 'data:changed' (re-render com debounce)
 *
 * NÃO fala diretamente com o Core/Storage.
 * Recebe tudo pelo `context` (state, services, collections).
 */
import { dashboardRegistry } from './sections/registry.js';
import { quoteSection } from './sections/quote.js';
import { createProgressRing } from '../../components/progress-ring/progressRing.js';
import { createMiniCard } from '../../components/mini-card/miniCard.js';
import { createBarChart } from '../../components/bar-chart/barChart.js';
import { ICONS } from '../../js/icons.js';
import { eventBus } from '../../core/eventBus.js';

let _isRegistered = false;
let _lastContainer = null;
let _lastContext = null;
let _rerenderScheduled = false;

/* ============================================================
   Constantes
   ============================================================ */

const DIAS_LONGO = ['Domingo','Segunda-Feira','Terça-Feira','Quarta-Feira','Quinta-Feira','Sexta-Feira','Sábado'];
const DIAS_CURTO = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
const MESES_LONGO = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const MESES_CURTO = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const WEEKDAY_LABELS = ['S','T','Q','Q','S','S','D']; // Seg → Dom

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

function greetingByHour() {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 19) return 'Boa tarde';
  return 'Boa noite';
}

function dateLabelToday() {
  const now = new Date();
  return DIAS_LONGO[now.getDay()] + ', ' + now.getDate() + ' de ' + MESES_LONGO[now.getMonth()];
}

function formatTaskDue(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(d);
  target.setHours(0, 0, 0, 0);
  const diff = Math.round((target - today) / 86400000);

  if (diff === 0) {
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    if (hh === '00' && mm === '00') return 'Hoje';
    return 'Hoje ' + hh + ':' + mm;
  }
  if (diff === 1) return 'Amanhã';
  if (diff === -1) return 'Ontem';
  if (diff > 1 && diff < 7) return DIAS_CURTO[d.getDay()] + ' ' + d.getDate() + ' ' + MESES_CURTO[d.getMonth()];
  return d.getDate() + ' ' + MESES_CURTO[d.getMonth()];
}

function formatMoney(v) {
  if (v === null || v === undefined || Number.isNaN(v)) {
    return { value: '—', sublabel: 'sem dados' };
  }
  const abs = Math.abs(v);
  if (abs >= 1000000) {
    return { value: (v / 1000000).toFixed(1).replace('.0', '') + 'M', sublabel: 'MT' };
  }
  if (abs >= 1000) {
    return { value: Math.round(v / 1000) + 'K', sublabel: 'MT' };
  }
  return { value: String(Math.round(v)), sublabel: 'MT' };
}

/* ============================================================
   Cálculos
   ============================================================ */

function calculateDayProgress(collections = {}) {
  const today = todayYMD();
  const tasks = Array.isArray(collections.tasks) ? collections.tasks : [];
  const habits = Array.isArray(collections.habits) ? collections.habits : [];
  const habitLogs = Array.isArray(collections.habitLogs) ? collections.habitLogs : [];

  const todayTasks = tasks.filter(t => t.dueDate && ymdOf(t.dueDate) === today);
  const todayTasksDone = todayTasks.filter(t => t.status === 'completed');
  const activeHabits = habits.filter(h => h.status === 'active');
  const todayLogs = habitLogs.filter(l => l.completed && ymdOf(l.date) === today);

  const total = todayTasks.length + activeHabits.length;
  const done = todayTasksDone.length + todayLogs.length;

  if (total === 0) return null;
  return Math.round((done / total) * 100);
}

function countPendingTasks(collections = {}) {
  const tasks = Array.isArray(collections.tasks) ? collections.tasks : [];
  return tasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled').length;
}

function countActiveHabits(collections = {}) {
  const habits = Array.isArray(collections.habits) ? collections.habits : [];
  return habits.filter(h => h.status === 'active').length;
}

function countActiveGoals(collections = {}) {
  const goals = Array.isArray(collections.goals) ? collections.goals : [];
  return goals.filter(g => g.status === 'active').length;
}

function sumBalances(collections = {}) {
  const accounts = Array.isArray(collections.financeAccounts) ? collections.financeAccounts : [];
  if (accounts.length === 0) return null;
  return accounts.reduce((s, a) => s + (Number(a.balance) || 0), 0);
}

function buildWeeklyBars(collections = {}) {
  const tasks = Array.isArray(collections.tasks) ? collections.tasks : [];
  const today = new Date();
  const dow = today.getDay(); // 0=Dom, 1=Seg...
  const offset = dow === 0 ? -6 : 1 - dow;

  const monday = new Date(today);
  monday.setDate(today.getDate() + offset);
  monday.setHours(0, 0, 0, 0);

  const points = [];
  let total = 0;
  let todayIndex = -1;

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const ymd = d.toISOString().split('T')[0];

    const count = tasks.filter(t => {
      if (t.status !== 'completed') return false;
      const when = t.completedAt || t.updatedAt || t.createdAt;
      return ymdOf(when) === ymd;
    }).length;

    points.push({ label: WEEKDAY_LABELS[i], value: count });
    total += count;
    if (ymd === todayYMD()) todayIndex = i;
  }

  return { points, total, todayIndex };
}

function buildUpcomingTasks(collections = {}) {
  const tasks = Array.isArray(collections.tasks) ? collections.tasks : [];
  return tasks
    .filter(t => t.status !== 'completed' && t.status !== 'cancelled' && t.dueDate)
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
    .slice(0, 3);
}

function buildTodayHabits(collections = {}) {
  const habits = Array.isArray(collections.habits) ? collections.habits : [];
  const habitLogs = Array.isArray(collections.habitLogs) ? collections.habitLogs : [];
  const today = todayYMD();

  return habits
    .filter(h => h.status === 'active')
    .slice(0, 4)
    .map(h => {
      const log = habitLogs.find(l => l.habitId === h.id && ymdOf(l.date) === today);
      return {
        id: h.id,
        name: h.name || '(sem nome)',
        done: !!(log && log.completed)
      };
    });
}

/* ============================================================
   Construtores de blocos
   ============================================================ */

function buildGreetingBlock(context) {
  const section = document.createElement('section');
  section.className = 'dashboard-section dashboard-section--greeting';

  const name = context.userName || 'Utilizador';
  const h1 = document.createElement('h1');
  h1.className = 'dashboard-greeting';
  h1.textContent = greetingByHour() + ', ' + name;
  section.appendChild(h1);

  const sub = document.createElement('p');
  sub.className = 'dashboard-greeting__sub';
  sub.textContent = 'Aqui está o resumo do teu dia.';
  section.appendChild(sub);

  return section;
}

function buildOverviewBlock(context) {
  const section = document.createElement('section');
  section.className = 'dashboard-section dashboard-section--overview';

  const collections = context.collections || {};

  // --- Ring ---
  const ringWrap = document.createElement('div');
  ringWrap.className = 'dashboard-overview__ring';
  const pct = calculateDayProgress(collections);
  const ring = createProgressRing({
    value: pct === null ? 0 : pct,
    variant: pct === null ? 'empty' : 'default',
    size: 110,
    stroke: 9,
    animate: true
  });
  ringWrap.appendChild(ring);

  const ringLabel = document.createElement('div');
  ringLabel.className = 'dashboard-overview__ring-label';
  ringLabel.textContent = 'do dia concluído';
  ringWrap.appendChild(ringLabel);

  section.appendChild(ringWrap);

  // --- Mini-cards ---
  const cardsWrap = document.createElement('div');
  cardsWrap.className = 'dashboard-overview__cards';

  const pendingTasks = countPendingTasks(collections);
  const activeHabits = countActiveHabits(collections);
  const activeGoals = countActiveGoals(collections);
  const money = formatMoney(sumBalances(collections));

  const cards = [
    { icon: 'check',    label: 'Tarefas',   value: pendingTasks, sublabel: 'pendentes', page: 'tasks' },
    { icon: 'refresh',  label: 'Hábitos',   value: activeHabits, sublabel: 'ativos',    page: 'habits' },
    { icon: 'target',   label: 'Objetivos', value: activeGoals,  sublabel: 'em curso',  page: 'goals' },
    { icon: 'dollar',   label: 'Finanças',  value: money.value,  sublabel: money.sublabel, page: 'finances' }
  ];

  for (const c of cards) {
    const card = createMiniCard({
      icon: c.icon,
      label: c.label,
      value: c.value,
      sublabel: c.sublabel,
      page: c.page,
      onClick: (page) => eventBus.emit('navigation:changed', { page })
    });
    cardsWrap.appendChild(card);
  }

  section.appendChild(cardsWrap);

  // Injetar ícones nos mini-cards (foram criados após o injectIcons do bootstrap)
  requestAnimationFrame(() => {
    section.querySelectorAll('[data-icon]').forEach(el => {
      const name = el.getAttribute('data-icon');
      if (ICONS[name] && !el.innerHTML.trim()) {
        el.innerHTML = ICONS[name];
      }
    });
  });

  return section;
}

function buildWeeklyBlock(context) {
  const section = document.createElement('section');
  section.className = 'dashboard-section dashboard-section--weekly';

  const collections = context.collections || {};
  const { points, total, todayIndex } = buildWeeklyBars(collections);

  // Header
  const header = document.createElement('div');
  header.className = 'dashboard-section__header';

  const title = document.createElement('h3');
  title.className = 'dashboard-section__title';
  title.textContent = 'Esta semana';
  header.appendChild(title);

  section.appendChild(header);

  // Sub-meta
  const meta = document.createElement('p');
  meta.className = 'dashboard-section__meta';
  meta.textContent = total === 0
    ? 'Sem tarefas concluídas esta semana.'
    : total + ' tarefa' + (total !== 1 ? 's' : '') + ' concluída' + (total !== 1 ? 's' : '');
  section.appendChild(meta);

  // Gráfico
  const chartWrap = document.createElement('div');
  chartWrap.className = 'dashboard-section__chart';
  const chart = createBarChart({
    points,
    variant: total === 0 ? 'empty' : 'default',
    highlightIndex: todayIndex,
    animate: true
  });
  chartWrap.appendChild(chart);
  section.appendChild(chartWrap);

  return section;
}

function buildUpcomingTasksBlock(context) {
  const section = document.createElement('section');
  section.className = 'dashboard-section dashboard-section--tasks';

  const collections = context.collections || {};
  const tasks = buildUpcomingTasks(collections);

  // Header
  const header = document.createElement('div');
  header.className = 'dashboard-section__header';

  const title = document.createElement('h3');
  title.className = 'dashboard-section__title';
  title.textContent = 'Próximas tarefas';
  header.appendChild(title);

  const link = document.createElement('button');
  link.className = 'dashboard-section__link';
  link.type = 'button';
  link.textContent = 'Ver todas ›';
  link.addEventListener('click', () => {
    eventBus.emit('navigation:changed', { page: 'tasks' });
  });
  header.appendChild(link);

  section.appendChild(header);

  // Lista
  if (tasks.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'dashboard-section__empty';
    empty.textContent = 'Sem tarefas agendadas.';
    section.appendChild(empty);
    return section;
  }

  const ul = document.createElement('ul');
  ul.className = 'dashboard-list';

  for (const t of tasks) {
    const li = document.createElement('li');
    li.className = 'dashboard-list__item';

    const check = document.createElement('span');
    check.className = 'dashboard-list__check';
    li.appendChild(check);

    const label = document.createElement('span');
    label.className = 'dashboard-list__label';
    label.textContent = t.name || '(sem nome)';
    li.appendChild(label);

    const meta = document.createElement('span');
    meta.className = 'dashboard-list__meta';
    meta.textContent = formatTaskDue(t.dueDate);
    li.appendChild(meta);

    ul.appendChild(li);
  }

  section.appendChild(ul);
  return section;
}

function buildTodayHabitsBlock(context) {
  const section = document.createElement('section');
  section.className = 'dashboard-section dashboard-section--habits';

  const collections = context.collections || {};
  const habits = buildTodayHabits(collections);

  // Header
  const header = document.createElement('div');
  header.className = 'dashboard-section__header';

  const title = document.createElement('h3');
  title.className = 'dashboard-section__title';
  title.textContent = 'Hábitos de hoje';
  header.appendChild(title);

  const link = document.createElement('button');
  link.className = 'dashboard-section__link';
  link.type = 'button';
  link.textContent = 'Ver todas ›';
  link.addEventListener('click', () => {
    eventBus.emit('navigation:changed', { page: 'habits' });
  });
  header.appendChild(link);

  section.appendChild(header);

  if (habits.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'dashboard-section__empty';
    empty.textContent = 'Sem hábitos definidos.';
    section.appendChild(empty);
    return section;
  }

  const ul = document.createElement('ul');
  ul.className = 'dashboard-list dashboard-list--habits';

  for (const h of habits) {
    const li = document.createElement('li');
    li.className = 'dashboard-list__item' + (h.done ? ' is-done' : '');

    const check = document.createElement('span');
    check.className = 'dashboard-list__check';
    check.textContent = h.done ? '✓' : '';
    li.appendChild(check);

    const label = document.createElement('span');
    label.className = 'dashboard-list__label';
    label.textContent = h.name;
    li.appendChild(label);

    ul.appendChild(li);
  }

  section.appendChild(ul);
  return section;
}

/* ============================================================
   Registry (só a citação)
   ============================================================ */

function registerSections() {
  if (_isRegistered) return;
  dashboardRegistry.register(quoteSection);
  _isRegistered = true;
}

/* ============================================================
   API pública
   ============================================================ */

export function loadDashboard(container, context = {}) {
  if (!container || !(container instanceof HTMLElement)) {
    console.warn('[Dashboard] container inválido.');
    return;
  }

  registerSections();

  _lastContainer = container;
  _lastContext = context;

  container.innerHTML = '';

  // Blocos estáticos
  try {
    container.appendChild(buildGreetingBlock(context));
    container.appendChild(buildOverviewBlock(context));
    container.appendChild(buildWeeklyBlock(context));
    container.appendChild(buildUpcomingTasksBlock(context));
    container.appendChild(buildTodayHabitsBlock(context));
  } catch (err) {
    console.error('[Dashboard] Erro ao renderizar blocos:', err);
  }

  // Sections registadas (citação)
  const sections = dashboardRegistry.list();
  for (const section of sections) {
    try {
      const sectionRoot = document.createElement('div');
      sectionRoot.className = 'dashboard-section-root';
      sectionRoot.dataset.sectionId = section.id;
      container.appendChild(sectionRoot);
      section.render(sectionRoot, context);
    } catch (err) {
      console.error(`[Dashboard] Erro ao renderizar "${section.id}":`, err);
    }
  }
}

export function scheduleRerender() {
  if (!_lastContainer || _rerenderScheduled) return;
  _rerenderScheduled = true;
  Promise.resolve().then(() => {
    _rerenderScheduled = false;
    loadDashboard(_lastContainer, _lastContext);
  });
}

export function attachDashboardEvents(bus) {
  if (!bus || typeof bus.on !== 'function') return;
  bus.on('data:changed', () => scheduleRerender());
}

export const dashboard = {
  loadDashboard,
  scheduleRerender,
  attachDashboardEvents,
  registry: dashboardRegistry
};

export default dashboard;
