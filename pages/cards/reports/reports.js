/**
 * Card: Relatorios (pagina completa)
 *
 * Analise historica por periodo. 4 periodos:
 *  - 7 dias / 30 dias / 90 dias / 1 ano
 *
 * Cada metrica tem variacao vs periodo anterior equivalente.
 *
 * Fluxo: UI -> Core (DataManager) -> Storage -> EventBus
 */
import { dataManager } from '../../../core/dataManager.js';
import { eventBus } from '../../../core/eventBus.js';
import { ICONS } from '../../../js/icons.js';
import { createLineChart } from '../../../components/line-chart/lineChart.js';
import { createBarChart } from '../../../components/bar-chart/barChart.js';
import { formatMoney, t } from '../../../js/i18n.js';
import { lumiereIndex } from '../../../core/intelligence/lumiereIndex.js';

const RELEVANT_COLLECTIONS = [
  'tasks', 'habits', 'habitLogs',
  'studySessions', 'studies',
  'financeTransactions',
  'lumiereSales',
  'calendarEvents',
  'goals'
];

let _unsubscribe = null;

/* ============================================================
   Helpers de data
   ============================================================ */

function ymdOf(iso) {
  if (!iso) return '';
  return String(iso).split('T')[0];
}

function todayYMD() {
  return new Date().toISOString().split('T')[0];
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

/**
 * Devolve o range actual e o range anterior equivalente.
 * @param {number} days
 * @returns {{ current: {start,end}, previous: {start,end} }}
 */
function periodRanges(days) {
  const end = todayYMD();
  const start = daysAgo(days - 1);
  const prevEnd = daysAgo(days);
  const prevStart = daysAgo(days * 2 - 1);
  return {
    current:  { start, end },
    previous: { start: prevStart, end: prevEnd }
  };
}

function inRange(ymd, range) {
  return ymd && ymd >= range.start && ymd <= range.end;
}

function pctChange(current, previous) {
  if (previous === 0) return current === 0 ? 0 : null;
  return Math.round(((current - previous) / Math.abs(previous)) * 100);
}

/* ============================================================
   Metricas por periodo
   ============================================================ */

function computeMetrics(collections, range) {
  const tasks = Array.isArray(collections.tasks) ? collections.tasks : [];
  const habits = Array.isArray(collections.habits) ? collections.habits : [];
  const habitLogs = Array.isArray(collections.habitLogs) ? collections.habitLogs : [];
  const studySessions = Array.isArray(collections.studySessions) ? collections.studySessions : [];
  const transactions = Array.isArray(collections.financeTransactions) ? collections.financeTransactions : [];
  const sales = Array.isArray(collections.lumiereSales) ? collections.lumiereSales : [];

  // Tarefas concluidas no periodo
  const tasksCompleted = tasks.filter(t =>
    t.status === 'completed' &&
    inRange(ymdOf(t.updatedAt || t.createdAt), range)
  ).length;

  // Consistencia de habitos: logs completed / (habits active * dias)
  const activeHabits = habits.filter(h => h.status === 'active').length;
  const days = Math.max(1, Math.round((new Date(range.end) - new Date(range.start)) / 86400000) + 1);
  const habitsDone = habitLogs.filter(l =>
    l.completed === true && inRange(ymdOf(l.date), range)
  ).length;
  const habitConsistency = activeHabits > 0
    ? Math.round((habitsDone / (activeHabits * days)) * 100)
    : 0;

  // Tempo de estudo em minutos
  const studyMin = studySessions
    .filter(s => inRange(ymdOf(s.date), range))
    .reduce((sum, s) => sum + (Number(s.duration) || 0), 0);

  // Saldo financeiro do periodo
  const inRangeTrx = transactions.filter(t => inRange(ymdOf(t.date), range));
  const income = inRangeTrx.filter(t => t.type === 'income').reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const expense = inRangeTrx.filter(t => t.type === 'expense').reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const balance = Math.round(income - expense);

  // Vendas Lumière
  const salesCount = sales.filter(s => inRange(ymdOf(s.date), range)).length;

  return {
    tasksCompleted,
    habitConsistency,
    studyMin,
    balance,
    salesCount,
    days
  };
}

/* ============================================================
   Calculo completo
   ============================================================ */

function calculateReports(collections, days = 30) {
  const ranges = periodRanges(days);

  const current = computeMetrics(collections, ranges.current);
  const previous = computeMetrics(collections, ranges.previous);

  return {
    period: days,
    current,
    previous,
    changes: {
      tasks: pctChange(current.tasksCompleted, previous.tasksCompleted),
      habits: pctChange(current.habitConsistency, previous.habitConsistency),
      studies: pctChange(current.studyMin, previous.studyMin),
      balance: current.balance - previous.balance,
      sales: pctChange(current.salesCount, previous.salesCount)
    }
  };
}

/* ============================================================
   UI — Header
   ============================================================ */

function buildHeader() {
  const header = document.createElement('header');
  header.className = 'reports__header';

  const title = document.createElement('h1');
  title.className = 'reports__title';
  title.textContent = 'Relatorios';
  header.appendChild(title);

  const sub = document.createElement('p');
  sub.className = 'reports__sub';
  sub.textContent = 'A tua historia em numeros';
  header.appendChild(sub);

  return header;
}

/* ============================================================
   UI — Tabs de periodo
   ============================================================ */

const PERIOD_OPTIONS = [
  { days: 7,   label: '7 dias' },
  { days: 30,  label: '30 dias' },
  { days: 90,  label: '90 dias' },
  { days: 365, label: '1 ano' }
];

function buildPeriodTabs(currentPeriod, onChange) {
  const wrap = document.createElement('div');
  wrap.className = 'reports__tabs';

  PERIOD_OPTIONS.forEach(opt => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'reports__tab';
    if (opt.days === currentPeriod) btn.classList.add('is-active');
    btn.textContent = opt.label;
    btn.addEventListener('click', () => {
      if (opt.days !== currentPeriod) onChange(opt.days);
    });
    wrap.appendChild(btn);
  });

  return wrap;
}

/* ============================================================
   UI — Card Resumo (2x2)
   ============================================================ */

function formatStudyTime(min) {
  const m = Number(min) || 0;
  if (m < 60) return m + 'min';
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest === 0 ? h + 'h' : h + 'h ' + rest + 'min';
}

function formatChange(pct, isMoney) {
  if (pct === null || pct === undefined) {
    return { text: 'sem base anterior', variant: 'empty' };
  }
  if (isMoney) {
    const v = Number(pct) || 0;
    if (v === 0) return { text: 'estavel', variant: 'neutral' };
    return {
      text: (v > 0 ? '+' : '') + v + ' MT',
      variant: v > 0 ? 'up' : 'down'
    };
  }
  const v = Number(pct) || 0;
  if (v === 0) return { text: 'estavel', variant: 'neutral' };
  return {
    text: (v > 0 ? '+' : '') + v + '% vs periodo anterior',
    variant: v > 0 ? 'up' : 'down'
  };
}

function buildSummaryMetric(iconSvg, value, label, change) {
  const el = document.createElement('div');
  el.className = 'reports__summary-metric';

  const top = document.createElement('div');
  top.className = 'reports__summary-metric-top';

  const iconWrap = document.createElement('span');
  iconWrap.className = 'reports__summary-icon';
  iconWrap.innerHTML = iconSvg;
  top.appendChild(iconWrap);

  const valueEl = document.createElement('span');
  valueEl.className = 'reports__summary-value';
  valueEl.textContent = value;
  top.appendChild(valueEl);

  el.appendChild(top);

  const labelEl = document.createElement('div');
  labelEl.className = 'reports__summary-label';
  labelEl.textContent = label;
  el.appendChild(labelEl);

  const changeEl = document.createElement('div');
  changeEl.className = 'reports__summary-change reports__summary-change--' + change.variant;
  changeEl.textContent = change.text;
  el.appendChild(changeEl);

  return el;
}

function buildSummaryCard(stats) {
  const card = document.createElement('section');
  card.className = 'reports__summary';

  // Header
  const header = document.createElement('div');
  header.className = 'reports__summary-header';

  const headerIcon = document.createElement('span');
  headerIcon.className = 'reports__summary-header-icon';
  headerIcon.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="6" y1="20" x2="6" y2="14"/><line x1="12" y1="20" x2="12" y2="8"/><line x1="18" y1="20" x2="18" y2="4"/></svg>';
  header.appendChild(headerIcon);

  const headerLabel = document.createElement('span');
  headerLabel.className = 'reports__summary-header-label';
  headerLabel.textContent = stats.period === 365
    ? 'Ultimo ano'
    : 'Ultimos ' + stats.period + ' dias';
  header.appendChild(headerLabel);

  card.appendChild(header);

  // Grid 2x2
  const grid = document.createElement('div');
  grid.className = 'reports__summary-grid';

  const iconCheck = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="8 12 11 15 16 9"/></svg>';
  const iconHeart = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>';
  const iconBook = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>';
  const iconDollar = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>';

  grid.appendChild(buildSummaryMetric(
    iconCheck,
    String(stats.current.tasksCompleted),
    'tarefas concluidas',
    formatChange(stats.changes.tasks)
  ));

  grid.appendChild(buildSummaryMetric(
    iconHeart,
    stats.current.habitConsistency + '%',
    'consistencia de habitos',
    formatChange(stats.changes.habits)
  ));

  grid.appendChild(buildSummaryMetric(
    iconBook,
    formatStudyTime(stats.current.studyMin),
    'tempo de estudo',
    formatChange(stats.changes.studies)
  ));

  grid.appendChild(buildSummaryMetric(
    iconDollar,
    formatMoney(stats.current.balance, 'MZN'),
    'saldo do periodo',
    formatChange(stats.changes.balance, true)
  ));

  card.appendChild(grid);
  return card;
}

/* ============================================================
   Calculo de pontos de evolucao
   ============================================================ */

/**
 * Calcula N pontos do indice ao longo do periodo.
 * Cada ponto representa uma janela de 7 dias terminando naquela data.
 */
function computeEvolutionPoints(collections, period) {
  // Escolher granularidade: max 10 pontos
  const totalPoints = Math.min(10, Math.max(4, Math.round(period / 7)));
  const step = Math.floor(period / totalPoints);
  const points = [];

  for (let i = 0; i < totalPoints; i++) {
    const endOffset = period - (i + 1) * step;
    const windowEnd = new Date();
    windowEnd.setDate(windowEnd.getDate() - endOffset);
    const windowEndStr = windowEnd.toISOString().split('T')[0];

    // Filtrar coleccoes na janela de 7 dias que termina em windowEnd
    const windowStart = new Date(windowEnd);
    windowStart.setDate(windowStart.getDate() - 6);
    const windowStartStr = windowStart.toISOString().split('T')[0];

    const windowCollections = filterCollectionsByRange(collections, windowStartStr, windowEndStr);
    const idx = lumiereIndex.calculate(windowCollections);

    points.push({
      label: formatShortDate(windowEndStr),
      value: typeof idx.score === 'number' ? idx.score : 0
    });
  }

  return points;
}

function formatShortDate(ymd) {
  const d = new Date(ymd);
  if (Number.isNaN(d.getTime())) return '';
  const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  return d.getDate() + ' ' + months[d.getMonth()];
}

function filterCollectionsByRange(collections, start, end) {
  const out = {};
  for (const key of Object.keys(collections)) {
    const arr = collections[key];
    if (!Array.isArray(arr)) { out[key] = arr; continue; }
    out[key] = arr.filter(item => {
      const d = item.date || item.updatedAt || item.createdAt || item.start;
      if (!d) return true;
      const ymd = String(d).split('T')[0];
      return ymd >= start && ymd <= end;
    });
  }
  return out;
}

/* ============================================================
   UI — Grafico de evolucao
   ============================================================ */

function buildEvolutionSection(collections, stats) {
  const section = document.createElement('section');
  section.className = 'reports__section reports__section--evolution';

  const header = document.createElement('header');
  header.className = 'reports__section-header';

  const title = document.createElement('h3');
  title.className = 'reports__section-title';
  title.textContent = 'Evolucao';
  header.appendChild(title);

  const sub = document.createElement('span');
  sub.className = 'reports__section-total';
  sub.textContent = 'Indice de evolucao';
  header.appendChild(sub);

  section.appendChild(header);

  const points = computeEvolutionPoints(collections, stats.period);

  if (points.every(p => p.value === 0)) {
    const empty = document.createElement('p');
    empty.className = 'reports__section-empty';
    empty.textContent = 'Sem dados suficientes para mostrar evolucao.';
    section.appendChild(empty);
    return section;
  }

  const chartWrap = document.createElement('div');
  chartWrap.className = 'reports__chart-wrap';

  const chart = createLineChart({
    points,
    valueSuffix: '%'
  });
  chartWrap.appendChild(chart);

  section.appendChild(chartWrap);
  return section;
}

/* ============================================================
   UI — Seccao POR AREA
   ============================================================ */

function buildAreaCard(iconSvg, label, value, change) {
  const el = document.createElement('div');
  el.className = 'reports__area';

  const top = document.createElement('div');
  top.className = 'reports__area-top';

  const iconWrap = document.createElement('span');
  iconWrap.className = 'reports__area-icon';
  iconWrap.innerHTML = iconSvg;
  top.appendChild(iconWrap);

  const textWrap = document.createElement('div');
  textWrap.className = 'reports__area-text';

  const labelEl = document.createElement('div');
  labelEl.className = 'reports__area-label';
  labelEl.textContent = label;
  textWrap.appendChild(labelEl);

  const valueEl = document.createElement('div');
  valueEl.className = 'reports__area-value';
  valueEl.textContent = value;
  textWrap.appendChild(valueEl);

  top.appendChild(textWrap);
  el.appendChild(top);

  if (change) {
    const changeEl = document.createElement('div');
    changeEl.className = 'reports__area-change reports__area-change--' + change.variant;
    changeEl.textContent = change.text;
    el.appendChild(changeEl);
  }

  return el;
}

function buildAreasSection(stats) {
  const section = document.createElement('section');
  section.className = 'reports__section reports__section--areas';

  const header = document.createElement('header');
  header.className = 'reports__section-header';

  const title = document.createElement('h3');
  title.className = 'reports__section-title';
  title.textContent = 'Por area';
  header.appendChild(title);

  section.appendChild(header);

  const grid = document.createElement('div');
  grid.className = 'reports__areas-grid';

  const iconCheck = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="8 12 11 15 16 9"/></svg>';
  const iconHeart = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>';
  const iconBook = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>';
  const iconDollar = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>';
  const iconDiamond = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3h12l4 6-10 12L2 9z"/><path d="M2 9h20"/><path d="M12 21L6 9l6-6 6 6-6 12z"/></svg>';

  grid.appendChild(buildAreaCard(
    iconCheck,
    'Tarefas',
    stats.current.tasksCompleted + ' concluidas',
    formatChange(stats.changes.tasks)
  ));

  grid.appendChild(buildAreaCard(
    iconHeart,
    'Habitos',
    stats.current.habitConsistency + '% consistencia',
    formatChange(stats.changes.habits)
  ));

  grid.appendChild(buildAreaCard(
    iconBook,
    'Estudos',
    formatStudyTime(stats.current.studyMin),
    formatChange(stats.changes.studies)
  ));

  grid.appendChild(buildAreaCard(
    iconDollar,
    'Financas',
    formatMoney(stats.current.balance, 'MZN'),
    formatChange(stats.changes.balance, true)
  ));

  grid.appendChild(buildAreaCard(
    iconDiamond,
    'Lumiere',
    stats.current.salesCount + ' vendas',
    formatChange(stats.changes.sales)
  ));

  section.appendChild(grid);
  return section;
}

/* ============================================================
   UI — Top categorias
   ============================================================ */

function computeTopCategories(collections, range) {
  const tasks = Array.isArray(collections.tasks) ? collections.tasks : [];
  const counts = {};
  for (const t of tasks) {
    if (t.status !== 'completed') continue;
    const ymd = (t.updatedAt || t.createdAt || '').split('T')[0];
    if (!ymd || ymd < range.start || ymd > range.end) continue;
    const cat = t.category || 'other';
    counts[cat] = (counts[cat] || 0) + 1;
  }
  return Object.entries(counts)
    .map(([cat, count]) => ({ cat, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);
}

function buildTopCategoriesSection(collections, stats) {
  const section = document.createElement('section');
  section.className = 'reports__section reports__section--top-cats';

  const header = document.createElement('header');
  header.className = 'reports__section-header';

  const title = document.createElement('h3');
  title.className = 'reports__section-title';
  title.textContent = 'Top categorias';
  header.appendChild(title);

  section.appendChild(header);

  const ranges = periodRanges(stats.period);
  const top = computeTopCategories(collections, ranges.current);

  if (top.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'reports__section-empty';
    empty.textContent = 'Sem tarefas concluidas neste periodo.';
    section.appendChild(empty);
    return section;
  }

  const maxCount = top[0].count;
  const list = document.createElement('div');
  list.className = 'reports__top-cats-list';

  top.forEach(item => {
    const pct = Math.round((item.count / maxCount) * 100);
    const row = document.createElement('div');
    row.className = 'reports__top-cat';

    const textWrap = document.createElement('div');
    textWrap.className = 'reports__top-cat-text';

    const nameEl = document.createElement('div');
    nameEl.className = 'reports__top-cat-name';
    nameEl.textContent = t('category', item.cat) || item.cat;
    textWrap.appendChild(nameEl);

    const barWrap = document.createElement('div');
    barWrap.className = 'reports__top-cat-bar-wrap';
    const bar = document.createElement('div');
    bar.className = 'reports__top-cat-bar';
    bar.style.width = pct + '%';
    barWrap.appendChild(bar);
    textWrap.appendChild(barWrap);

    row.appendChild(textWrap);

    const countEl = document.createElement('div');
    countEl.className = 'reports__top-cat-count';
    countEl.textContent = item.count + ' tarefa' + (item.count !== 1 ? 's' : '');
    row.appendChild(countEl);

    list.appendChild(row);
  });

  section.appendChild(list);
  return section;
}

/* ============================================================
   UI — Actividade mensal (ultimos 6 meses)
   ============================================================ */

function computeMonthlyActivity(collections) {
  const months = [];
  const labels = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  const today = new Date();

  for (let i = 5; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = d.getMonth();
    const start = new Date(y, m, 1).toISOString().split('T')[0];
    const end = new Date(y, m + 1, 0).toISOString().split('T')[0];

    const windowCollections = filterCollectionsByRange(collections, start, end);
    const idx = lumiereIndex.calculate(windowCollections);

    months.push({
      label: labels[m],
      value: typeof idx.score === 'number' ? idx.score : 0
    });
  }

  return months;
}

function buildMonthlyActivitySection(collections) {
  const section = document.createElement('section');
  section.className = 'reports__section reports__section--monthly';

  const header = document.createElement('header');
  header.className = 'reports__section-header';

  const title = document.createElement('h3');
  title.className = 'reports__section-title';
  title.textContent = 'Actividade mensal';
  header.appendChild(title);

  section.appendChild(header);

  const points = computeMonthlyActivity(collections);

  if (points.every(p => p.value === 0)) {
    const empty = document.createElement('p');
    empty.className = 'reports__section-empty';
    empty.textContent = 'Sem dados suficientes para mostrar actividade mensal.';
    section.appendChild(empty);
    return section;
  }

  const chartWrap = document.createElement('div');
  chartWrap.className = 'reports__chart-wrap';

  const chart = createBarChart({
    points,
    variant: 'default',
    animate: true
  });
  chartWrap.appendChild(chart);

  section.appendChild(chartWrap);
  return section;
}

/* ============================================================
   UI — Estado vazio
   ============================================================ */

function buildEmptyCard() {
  const card = document.createElement('section');
  card.className = 'reports__empty-card';

  const iconWrap = document.createElement('div');
  iconWrap.className = 'reports__empty-icon';
  iconWrap.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="6" y1="20" x2="6" y2="14"/><line x1="12" y1="20" x2="12" y2="8"/><line x1="18" y1="20" x2="18" y2="4"/></svg>';
  card.appendChild(iconWrap);

  const title = document.createElement('h2');
  title.className = 'reports__empty-title';
  title.textContent = 'Sem historico ainda';
  card.appendChild(title);

  const text = document.createElement('p');
  text.className = 'reports__empty-text';
  text.textContent = 'Continua a usar o Lumiere. Quando tiveres alguns meses de dados, vais ver aqui a tua evolucao.';
  card.appendChild(text);

  return card;
}

function buildInfoTile(iconSvg, title, subtitle) {
  const tile = document.createElement('div');
  tile.className = 'reports__info-tile';

  const iconWrap = document.createElement('span');
  iconWrap.className = 'reports__info-icon';
  iconWrap.innerHTML = iconSvg;
  tile.appendChild(iconWrap);

  const textWrap = document.createElement('div');
  textWrap.className = 'reports__info-text';

  const titleEl = document.createElement('div');
  titleEl.className = 'reports__info-title';
  titleEl.textContent = title;
  textWrap.appendChild(titleEl);

  const subEl = document.createElement('div');
  subEl.className = 'reports__info-sub';
  subEl.textContent = subtitle;
  textWrap.appendChild(subEl);

  tile.appendChild(textWrap);
  return tile;
}

function buildInfoSection() {
  const section = document.createElement('section');
  section.className = 'reports__info';

  const header = document.createElement('header');
  header.className = 'reports__info-header';

  const title = document.createElement('h3');
  title.className = 'reports__info-header-title';
  title.textContent = 'O que vais ver aqui';
  header.appendChild(title);

  section.appendChild(header);

  const list = document.createElement('div');
  list.className = 'reports__info-list';

  const iconBars = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="6" y1="20" x2="6" y2="14"/><line x1="12" y1="20" x2="12" y2="8"/><line x1="18" y1="20" x2="18" y2="4"/></svg>';
  const iconTrend = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 17 9 11 13 15 21 7"/><polyline points="14 7 21 7 21 14"/></svg>';
  const iconLayers = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>';
  const iconGrid = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="6" cy="6" r="3"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="18" r="3"/></svg>';

  list.appendChild(buildInfoTile(iconBars, 'Resumo do periodo', 'Tarefas, habitos, estudos e financas'));
  list.appendChild(buildInfoTile(iconTrend, 'Evolucao', 'Como o teu indice mudou'));
  list.appendChild(buildInfoTile(iconLayers, 'Por area', 'Comparacao entre modulos'));
  list.appendChild(buildInfoTile(iconGrid, 'Top categorias', 'Onde investiste mais tempo'));

  section.appendChild(list);
  return section;
}

function buildEmptyTip() {
  const tip = document.createElement('div');
  tip.className = 'reports__tip';

  const iconWrap = document.createElement('span');
  iconWrap.className = 'reports__tip-icon';
  iconWrap.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.2 1 2h6c0-.8.4-1.5 1-2A7 7 0 0 0 12 2z"/></svg>';
  tip.appendChild(iconWrap);

  const text = document.createElement('p');
  text.className = 'reports__tip-text';
  text.textContent = 'Toda a historia comeca com o primeiro registo.';
  tip.appendChild(text);

  return tip;
}

/* ============================================================
   Init
   ============================================================ */

let _state = { period: 30 };

export async function initReports(container) {
  if (!container) {
    console.warn('[Reports] container nao fornecido');
    return;
  }

  if (_unsubscribe) {
    try { _unsubscribe(); } catch (e) { /* noop */ }
    _unsubscribe = null;
  }

  container.innerHTML = '<p class="reports__loading">A carregar\u2026</p>';

  const collections = {};
  try {
    const results = await Promise.all(
      RELEVANT_COLLECTIONS.map(n => dataManager.list(n).catch(() => []))
    );
    RELEVANT_COLLECTIONS.forEach((n, i) => {
      collections[n] = Array.isArray(results[i]) ? results[i] : [];
    });
  } catch (err) {
    console.error('[Reports] Erro ao ler colecoes:', err);
  }

  const stats = calculateReports(collections, _state.period);

  const isFullyEmpty =
    stats.current.tasksCompleted === 0 &&
    stats.current.habitConsistency === 0 &&
    stats.current.studyMin === 0 &&
    stats.current.balance === 0 &&
    stats.current.salesCount === 0;

  container.innerHTML = '';

  const page = document.createElement('section');
  page.className = 'reports';

  page.appendChild(buildHeader());

  if (isFullyEmpty) {
    page.appendChild(buildEmptyCard());
    page.appendChild(buildInfoSection());
    page.appendChild(buildEmptyTip());
  } else {
    page.appendChild(buildPeriodTabs(_state.period, (days) => {
      _state.period = days;
      initReports(container);
    }));
    page.appendChild(buildSummaryCard(stats));
    page.appendChild(buildEvolutionSection(collections, stats));
    page.appendChild(buildAreasSection(stats));
    page.appendChild(buildTopCategoriesSection(collections, stats));
    page.appendChild(buildMonthlyActivitySection(collections));
  }

  container.appendChild(page);

  _unsubscribe = eventBus.on('data:changed', (payload) => {
    if (payload && RELEVANT_COLLECTIONS.includes(payload.collection)) {
      initReports(container);
    }
  });
}

export default {
  initReports,
  calculateReports
};
