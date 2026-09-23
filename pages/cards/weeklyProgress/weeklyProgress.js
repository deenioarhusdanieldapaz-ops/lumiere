/**
 * Card: Progresso Semanal (página completa)
 *
 * Score semanal = média do progresso diário dos últimos 7 dias.
 * Progresso diário = mesma fórmula do card Hoje:
 *   (tarefas concluídas + hábitos feitos + estudos feitos) / (totais)
 *
 * Fluxo: UI -> Core (DataManager) -> Storage -> EventBus
 */
import { dataManager } from '../../../core/dataManager.js';
import { eventBus } from '../../../core/eventBus.js';
import { ICONS } from '../../../js/icons.js';
import { createBarChart } from '../../../components/bar-chart/barChart.js';

const RELEVANT_COLLECTIONS = [
  'tasks', 'habits', 'habitLogs',
  'studySessions', 'studies',
  'calendarEvents'
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

/**
 * Últimos N dias (do mais antigo para hoje).
 */
function lastNDays(n) {
  const weekdays = ['D','S','T','Q','Q','S','S'];
  const result = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const ymd = d.toISOString().split('T')[0];
    const letter = weekdays[d.getDay()];
    result.push({ date: ymd, weekday: letter, letter });
  }
  return result;
}

/**
 * Calcula progresso de um dia específico (0-100).
 */
function dailyProgress(ymd, collections) {
  const tasks = Array.isArray(collections.tasks) ? collections.tasks : [];
  const habits = Array.isArray(collections.habits) ? collections.habits : [];
  const habitLogs = Array.isArray(collections.habitLogs) ? collections.habitLogs : [];
  const studySessions = Array.isArray(collections.studySessions) ? collections.studySessions : [];

  const tasksOfDay = tasks.filter(t => {
    const due = t.dueDate ? ymdOf(t.dueDate) : '';
    const start = t.startDate ? ymdOf(t.startDate) : '';
    return due === ymd || start === ymd;
  });
  const tasksDone = tasksOfDay.filter(t => t.status === 'completed').length;

  const activeHabits = habits.filter(h => h.status === 'active');
  const habitsDone = habitLogs.filter(l =>
    l.completed === true && ymdOf(l.date) === ymd
  ).length;

  const studyOfDay = studySessions.filter(s => ymdOf(s.date) === ymd);
  const studiesDone = studyOfDay.filter(s => Number(s.duration) > 0).length;

  const total = tasksOfDay.length + activeHabits.length + studyOfDay.length;
  const done = tasksDone + habitsDone + studiesDone;

  return {
    ymd,
    tasksDone,
    tasksTotal: tasksOfDay.length,
    habitsDone,
    habitsTotal: activeHabits.length,
    studiesDone,
    studiesTotal: studyOfDay.length,
    total,
    done,
    pct: total > 0 ? Math.round((done / total) * 100) : 0
  };
}


/* ============================================================
   Cálculo semanal
   ============================================================ */

function calculateWeeklyStats(collections) {
  const days = lastNDays(7);
  const dailyStats = days.map(d => ({
    ...d,
    ...dailyProgress(d.date, collections)
  }));

  const validDays = dailyStats.filter(d => d.total > 0);
  const score = validDays.length > 0
    ? Math.round(validDays.reduce((sum, d) => sum + d.pct, 0) / validDays.length)
    : 0;

  const activeDays = dailyStats.filter(d => d.pct > 0).length;
  const itemsDone = dailyStats.reduce((sum, d) => sum + d.done, 0);

  const studySessions = Array.isArray(collections.studySessions) ? collections.studySessions : [];
  const focusedMin = studySessions
    .filter(s => {
      const ymd = ymdOf(s.date);
      return ymd && days.some(d => d.date === ymd);
    })
    .reduce((sum, s) => sum + (Number(s.duration) || 0), 0);

  // Semana anterior (7 dias antes dos últimos 7)
  const daysPrev = [];
  for (let i = 13; i >= 7; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    daysPrev.push(d.toISOString().split('T')[0]);
  }
  const prevStats = daysPrev.map(ymd => dailyProgress(ymd, collections));
  const validPrev = prevStats.filter(d => d.total > 0);
  const prevScore = validPrev.length > 0
    ? Math.round(validPrev.reduce((sum, d) => sum + d.pct, 0) / validPrev.length)
    : 0;

  let comparison = null;
  if (prevScore > 0) {
    comparison = Math.round(((score - prevScore) / prevScore) * 100);
  }

  const avg = validDays.length > 0
    ? Math.round(validDays.reduce((sum, d) => sum + d.pct, 0) / validDays.length)
    : 0;

  let bestDay = null;
  if (dailyStats.length > 0) {
    bestDay = dailyStats.reduce((best, d) => d.pct > best.pct ? d : best, dailyStats[0]);
  }

  return {
    score,
    activeDays,
    totalDays: 7,
    itemsDone,
    focusedMin,
    comparison,
    dailyStats,
    avg,
    bestDay,
    hasAnyData: validDays.length > 0,
    prevScore
  };
}

/* ============================================================
   UI — Header
   ============================================================ */

function buildHeader() {
  const header = document.createElement('header');
  header.className = 'weekly__header';

  const title = document.createElement('h1');
  title.className = 'weekly__title';
  title.textContent = 'Progresso Semanal';
  header.appendChild(title);

  const sub = document.createElement('p');
  sub.className = 'weekly__sub';
  sub.textContent = 'A tua semana em detalhe';
  header.appendChild(sub);

  return header;
}

/* ============================================================
   UI — Hero card (score + 4 métricas)
   ============================================================ */

function formatMinutes(min) {
  const m = Number(min) || 0;
  if (m < 60) return m + 'min';
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest === 0 ? h + 'h' : h + 'h' + rest;
}

function buildMetric(value, label, variant) {
  const metric = document.createElement('div');
  metric.className = 'weekly__hero-metric';
  if (variant) metric.classList.add('weekly__hero-metric--' + variant);

  const valueEl = document.createElement('div');
  valueEl.className = 'weekly__hero-metric-value';
  valueEl.textContent = String(value);
  metric.appendChild(valueEl);

  const labelEl = document.createElement('div');
  labelEl.className = 'weekly__hero-metric-label';
  labelEl.textContent = label;
  metric.appendChild(labelEl);

  return metric;
}

function buildHeroCard(stats) {
  const card = document.createElement('section');
  card.className = 'weekly__hero';

  // Top: ícone + label
  const top = document.createElement('div');
  top.className = 'weekly__hero-top';

  const iconWrap = document.createElement('span');
  iconWrap.className = 'weekly__hero-icon';
  iconWrap.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="6" y1="20" x2="6" y2="14"/><line x1="12" y1="20" x2="12" y2="8"/><line x1="18" y1="20" x2="18" y2="4"/></svg>';
  top.appendChild(iconWrap);

  const label = document.createElement('span');
  label.className = 'weekly__hero-label';
  label.textContent = 'Esta semana';
  top.appendChild(label);

  card.appendChild(top);

  // Score grande
  const scoreWrap = document.createElement('div');
  scoreWrap.className = 'weekly__hero-score';

  const scoreValue = document.createElement('div');
  scoreValue.className = 'weekly__hero-score-value';
  scoreValue.textContent = stats.score + '%';
  scoreWrap.appendChild(scoreValue);

  const scoreLabel = document.createElement('div');
  scoreLabel.className = 'weekly__hero-score-label';
  scoreLabel.textContent = 'score semanal';
  scoreWrap.appendChild(scoreLabel);

  card.appendChild(scoreWrap);

  // 4 métricas
  const metrics = document.createElement('div');
  metrics.className = 'weekly__hero-metrics';

  metrics.appendChild(buildMetric(
    stats.activeDays + '/' + stats.totalDays,
    'dias activos'
  ));

  const compVariant = stats.comparison === null
    ? 'empty'
    : (stats.comparison >= 0 ? 'up' : 'down');
  metrics.appendChild(buildMetric(
    stats.comparison === null ? '—' : ((stats.comparison >= 0 ? '+' : '') + stats.comparison + '%'),
    'vs semana passada',
    compVariant
  ));

  metrics.appendChild(buildMetric(
    stats.itemsDone,
    'itens concluídos'
  ));

  metrics.appendChild(buildMetric(
    formatMinutes(stats.focusedMin),
    'tempo focado'
  ));

  card.appendChild(metrics);

  return card;
}

/* ============================================================
   UI — Gráfico de dias da semana
   ============================================================ */

function buildChartSection(stats) {
  const section = document.createElement('section');
  section.className = 'weekly__section weekly__section--chart';

  const header = document.createElement('header');
  header.className = 'weekly__section-header';

  const title = document.createElement('h3');
  title.className = 'weekly__section-title';
  title.textContent = 'Dias da semana';
  header.appendChild(title);

  const avg = document.createElement('span');
  avg.className = 'weekly__section-total';
  avg.textContent = 'Média: ' + stats.avg + '%';
  header.appendChild(avg);

  section.appendChild(header);

  // Preparar pontos para o barChart
  const points = stats.dailyStats.map((d, i) => ({
    label: d.weekday,
    value: d.pct,
    sublabel: d.pct + '%'
  }));

  // Índice do dia actual (último item)
  const todayIndex = stats.dailyStats.length - 1;

  const chartWrap = document.createElement('div');
  chartWrap.className = 'weekly__chart-wrap';

  const chart = createBarChart({
    points,
    variant: 'default',
    highlightIndex: todayIndex,
    averageValue: stats.avg,
    animate: true
  });
  chartWrap.appendChild(chart);

  section.appendChild(chartWrap);
  return section;
}

/* ============================================================
   UI — Maior actividade da semana
   ============================================================ */

const WEEKDAY_LONG = {
  'D': 'Domingo',
  'S': 'Segunda',  // Ambíguo — o array tem 2 S
  'T': 'Terça',
  'Q': 'Quarta',   // Ambíguo — 2 Q
};

function weekdayLongName(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  const days = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
  return days[d.getDay()];
}

function buildBestDaySection(stats) {
  const section = document.createElement('section');
  section.className = 'weekly__section weekly__section--best';

  const header = document.createElement('header');
  header.className = 'weekly__section-header';

  const title = document.createElement('h3');
  title.className = 'weekly__section-title';
  title.textContent = 'Maior actividade';
  header.appendChild(title);

  section.appendChild(header);

  if (!stats.bestDay || stats.bestDay.pct === 0) {
    const empty = document.createElement('p');
    empty.className = 'weekly__section-empty';
    empty.textContent = 'Sem actividade registada esta semana.';
    section.appendChild(empty);
    return section;
  }

  const card = document.createElement('div');
  card.className = 'weekly__best-card';

  const iconWrap = document.createElement('span');
  iconWrap.className = 'weekly__best-icon';
  iconWrap.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>';
  card.appendChild(iconWrap);

  const textWrap = document.createElement('div');
  textWrap.className = 'weekly__best-text';

  const dayName = document.createElement('div');
  dayName.className = 'weekly__best-day';
  dayName.textContent = weekdayLongName(stats.bestDay.date);
  textWrap.appendChild(dayName);

  const score = document.createElement('div');
  score.className = 'weekly__best-score';
  score.textContent = stats.bestDay.pct + '% de progresso';
  textWrap.appendChild(score);

  const hint = document.createElement('div');
  hint.className = 'weekly__best-hint';
  hint.textContent = 'Dia mais completo da semana';
  textWrap.appendChild(hint);

  card.appendChild(textWrap);

  const chev = document.createElement('span');
  chev.className = 'weekly__best-chevron';
  chev.setAttribute('aria-hidden', 'true');
  chev.textContent = '\u203A';
  card.appendChild(chev);

  section.appendChild(card);
  return section;
}

/* ============================================================
   UI — Resumo (3 mini barras)
   ============================================================ */

function buildResumoRow(iconSvg, label, done, total) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  const row = document.createElement('div');
  row.className = 'weekly__resumo-row';

  const iconWrap = document.createElement('span');
  iconWrap.className = 'weekly__resumo-icon';
  iconWrap.innerHTML = iconSvg;
  row.appendChild(iconWrap);

  const textWrap = document.createElement('div');
  textWrap.className = 'weekly__resumo-text';

  const labelEl = document.createElement('div');
  labelEl.className = 'weekly__resumo-label';
  labelEl.textContent = label;
  textWrap.appendChild(labelEl);

  const barWrap = document.createElement('div');
  barWrap.className = 'weekly__resumo-bar-wrap';
  const bar = document.createElement('div');
  bar.className = 'weekly__resumo-bar';
  bar.style.width = pct + '%';
  barWrap.appendChild(bar);
  textWrap.appendChild(barWrap);

  row.appendChild(textWrap);

  const pctEl = document.createElement('span');
  pctEl.className = 'weekly__resumo-pct';
  pctEl.textContent = pct + '%';
  row.appendChild(pctEl);

  const countEl = document.createElement('span');
  countEl.className = 'weekly__resumo-count';
  countEl.textContent = done + ' de ' + total;
  row.appendChild(countEl);

  return row;
}

function buildResumoSection(stats) {
  const section = document.createElement('section');
  section.className = 'weekly__section weekly__section--resumo';

  const header = document.createElement('header');
  header.className = 'weekly__section-header';

  const title = document.createElement('h3');
  title.className = 'weekly__section-title';
  title.textContent = 'Resumo';
  header.appendChild(title);

  section.appendChild(header);

  // Somar totais dos 7 dias
  const totals = stats.dailyStats.reduce((acc, d) => ({
    tasksDone: acc.tasksDone + d.tasksDone,
    tasksTotal: acc.tasksTotal + d.tasksTotal,
    habitsDone: acc.habitsDone + d.habitsDone,
    habitsTotal: acc.habitsTotal + d.habitsTotal,
    studiesDone: acc.studiesDone + d.studiesDone,
    studiesTotal: acc.studiesTotal + d.studiesTotal
  }), {
    tasksDone: 0, tasksTotal: 0,
    habitsDone: 0, habitsTotal: 0,
    studiesDone: 0, studiesTotal: 0
  });

  const iconCheck = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>';
  const iconHeart = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>';
  const iconGrad = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>';

  const list = document.createElement('div');
  list.className = 'weekly__resumo-list';

  list.appendChild(buildResumoRow(iconCheck, 'Tarefas concluídas', totals.tasksDone, totals.tasksTotal));
  list.appendChild(buildResumoRow(iconHeart, 'Hábitos mantidos', totals.habitsDone, totals.habitsTotal));
  list.appendChild(buildResumoRow(iconGrad, 'Sessões de estudo', totals.studiesDone, totals.studiesTotal));

  section.appendChild(list);
  return section;
}

/* ============================================================
   UI — Estado vazio
   ============================================================ */

function buildEmptyCard() {
  const card = document.createElement('section');
  card.className = 'weekly__empty-card';

  const iconWrap = document.createElement('div');
  iconWrap.className = 'weekly__empty-icon';
  iconWrap.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 17l6-6 4 4 8-8"/><path d="M14 7h7v7"/></svg>';
  card.appendChild(iconWrap);

  const title = document.createElement('h2');
  title.className = 'weekly__empty-title';
  title.textContent = 'Semana sem registos';
  card.appendChild(title);

  const text = document.createElement('p');
  text.className = 'weekly__empty-text';
  text.textContent = 'Ainda não há histórico suficiente para calcular o teu progresso semanal.';
  card.appendChild(text);

  const hint = document.createElement('p');
  hint.className = 'weekly__empty-hint';
  hint.textContent = 'Começa a usar os cards de Hoje e Progresso.';
  card.appendChild(hint);

  return card;
}

function buildInfoTile(iconSvg, title, subtitle) {
  const tile = document.createElement('div');
  tile.className = 'weekly__info-tile';

  const iconWrap = document.createElement('span');
  iconWrap.className = 'weekly__info-icon';
  iconWrap.innerHTML = iconSvg;
  tile.appendChild(iconWrap);

  const textWrap = document.createElement('div');
  textWrap.className = 'weekly__info-text';

  const titleEl = document.createElement('div');
  titleEl.className = 'weekly__info-title';
  titleEl.textContent = title;
  textWrap.appendChild(titleEl);

  const subEl = document.createElement('div');
  subEl.className = 'weekly__info-sub';
  subEl.textContent = subtitle;
  textWrap.appendChild(subEl);

  tile.appendChild(textWrap);

  return tile;
}

function buildInfoSection() {
  const section = document.createElement('section');
  section.className = 'weekly__info';

  const header = document.createElement('header');
  header.className = 'weekly__info-header';

  const title = document.createElement('h3');
  title.className = 'weekly__info-header-title';
  title.textContent = 'O que vais ver aqui';
  header.appendChild(title);

  section.appendChild(header);

  const list = document.createElement('div');
  list.className = 'weekly__info-list';

  const iconBars = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="6" y1="20" x2="6" y2="14"/><line x1="12" y1="20" x2="12" y2="8"/><line x1="18" y1="20" x2="18" y2="4"/></svg>';
  const iconCheck = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="8 12 11 15 16 9"/></svg>';
  const iconCalendar = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="8" y1="3" x2="8" y2="7"/><line x1="16" y1="3" x2="16" y2="7"/></svg>';

  list.appendChild(buildInfoTile(iconBars, 'Score semanal', 'Média de progresso dos 7 dias'));
  list.appendChild(buildInfoTile(iconCheck, 'Dias activos', 'Quantos dias completaste'));
  list.appendChild(buildInfoTile(iconCalendar, 'Comparação', 'vs semana anterior'));

  section.appendChild(list);
  return section;
}

function buildEmptyTip() {
  const tip = document.createElement('div');
  tip.className = 'weekly__tip';

  const iconWrap = document.createElement('span');
  iconWrap.className = 'weekly__tip-icon';
  iconWrap.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.2 1 2h6c0-.8.4-1.5 1-2A7 7 0 0 0 12 2z"/></svg>';
  tip.appendChild(iconWrap);

  const text = document.createElement('p');
  text.className = 'weekly__tip-text';
  text.textContent = 'Toda a evolução começa com o primeiro dia.';
  tip.appendChild(text);

  return tip;
}

/* ============================================================
   Init
   ============================================================ */

export async function initWeeklyProgress(container) {
  if (!container) {
    console.warn('[WeeklyProgress] container nao fornecido');
    return;
  }

  if (_unsubscribe) {
    try { _unsubscribe(); } catch (e) { /* noop */ }
    _unsubscribe = null;
  }

  container.innerHTML = '<p class="weekly__loading">A carregar\u2026</p>';

  const collections = {};
  try {
    const results = await Promise.all(
      RELEVANT_COLLECTIONS.map(n => dataManager.list(n).catch(() => []))
    );
    RELEVANT_COLLECTIONS.forEach((n, i) => {
      collections[n] = Array.isArray(results[i]) ? results[i] : [];
    });
  } catch (err) {
    console.error('[WeeklyProgress] Erro ao ler colecoes:', err);
  }

  const stats = calculateWeeklyStats(collections);

  container.innerHTML = '';

  const page = document.createElement('section');
  page.className = 'weekly';

  page.appendChild(buildHeader());

  if (!stats.hasAnyData) {
    page.appendChild(buildEmptyCard());
    page.appendChild(buildInfoSection());
    page.appendChild(buildEmptyTip());
  } else {
    page.appendChild(buildHeroCard(stats));
    page.appendChild(buildChartSection(stats));
    page.appendChild(buildBestDaySection(stats));
    page.appendChild(buildResumoSection(stats));
  }

  container.appendChild(page);

  _unsubscribe = eventBus.on('data:changed', (payload) => {
    if (payload && RELEVANT_COLLECTIONS.includes(payload.collection)) {
      initWeeklyProgress(container);
    }
  });
}

export default {
  initWeeklyProgress,
  calculateWeeklyStats,
  dailyProgress
};
