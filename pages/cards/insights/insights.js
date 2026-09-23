/**
 * Card: Insights (página completa)
 *
 * Combina 3 fontes da camada Intelligence:
 *  - priorities.rank()          — o que merece atencao agora
 *  - insights.generate()        — observacoes sobre dados reais
 *  - recommendations.generate() — sugestoes acionaveis
 *
 * Fluxo: UI -> Core (DataManager + intelligence) -> Storage -> EventBus
 */
import { dataManager } from '../../../core/dataManager.js';
import { eventBus } from '../../../core/eventBus.js';
import { ICONS } from '../../../js/icons.js';
import { insights } from '../../../core/intelligence/insights.js';
import { recommendations } from '../../../core/intelligence/recommendations.js';
import { priorities } from '../../../core/intelligence/priorities.js';

const RELEVANT_COLLECTIONS = [
  'tasks', 'habits', 'habitLogs', 'goals',
  'goalMilestones', 'studySessions', 'studies',
  'calendarEvents', 'financeAccounts',
  'financeTransactions', 'budgets',
  'lumiereSales', 'lumiereProducts',
  'notes'
];

let _unsubscribe = null;

/* ============================================================
   Calculo
   ============================================================ */

function calculateInsightsStats(collections) {
  const ins = insights.generate(collections);
  const recs = recommendations.generate(collections, ins);
  const prios = priorities.rank(collections, 5);

  return {
    insights: ins,
    recommendations: recs,
    priorities: prios,
    hasAnyData: ins.length > 0 || recs.length > 0 || prios.length > 0
  };
}

/* ============================================================
   UI — Header
   ============================================================ */

function buildHeader() {
  const header = document.createElement('header');
  header.className = 'insights__header';

  const title = document.createElement('h1');
  title.className = 'insights__title';
  title.textContent = 'Insights';
  header.appendChild(title);

  const sub = document.createElement('p');
  sub.className = 'insights__sub';
  sub.textContent = 'O que merece a tua atenção';
  header.appendChild(sub);

  return header;
}

/* ============================================================
   UI — Hero (contadores)
   ============================================================ */

function buildHeroCard(stats) {
  const total = stats.priorities.length + stats.insights.length + stats.recommendations.length;

  const card = document.createElement('section');
  card.className = 'insights__hero';

  // Topo: ícone + label
  const top = document.createElement('div');
  top.className = 'insights__hero-top';

  const iconWrap = document.createElement('span');
  iconWrap.className = 'insights__hero-icon';
  iconWrap.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.2 1 2h6c0-.8.4-1.5 1-2A7 7 0 0 0 12 2z"/></svg>';
  top.appendChild(iconWrap);

  const label = document.createElement('span');
  label.className = 'insights__hero-label';
  label.textContent = 'Estado actual';
  top.appendChild(label);

  card.appendChild(top);

  // Número grande
  const heroNum = document.createElement('div');
  heroNum.className = 'insights__hero-number';
  heroNum.textContent = String(total);
  card.appendChild(heroNum);

  const heroNumLabel = document.createElement('div');
  heroNumLabel.className = 'insights__hero-number-label';
  heroNumLabel.textContent = total === 1 ? 'item para a tua atenção' : 'itens para a tua atenção';
  card.appendChild(heroNumLabel);

  // 3 contadores em linha
  const counters = document.createElement('div');
  counters.className = 'insights__hero-counters';

  const metric = (label, value) => {
    const el = document.createElement('div');
    el.className = 'insights__hero-counter';
    const v = document.createElement('div');
    v.className = 'insights__hero-counter-value';
    v.textContent = String(value);
    el.appendChild(v);
    const l = document.createElement('div');
    l.className = 'insights__hero-counter-label';
    l.textContent = label;
    el.appendChild(l);
    return el;
  };

  counters.appendChild(metric('prioridades', stats.priorities.length));
  counters.appendChild(metric('insights', stats.insights.length));
  counters.appendChild(metric('recomendações', stats.recommendations.length));

  card.appendChild(counters);
  return card;
}

/* ============================================================
   UI — Secção PRIORIDADES
   ============================================================ */

const PRIORITY_ICONS = {
  'task-overdue': 'check',
  'task-today':   'check',
  'event-today':  'calendar',
  'goal-near':    'target',
  'habit-today':  'refresh'
};

function priorityVariant(type) {
  if (type === 'task-overdue') return 'bad';
  if (type === 'task-today' || type === 'event-today') return 'warning';
  return 'info';
}

function buildPriorityRow(item) {
  const row = document.createElement('div');
  row.className = 'insights__priority';
  const variant = priorityVariant(item.type);
  row.classList.add('insights__priority--' + variant);

  const iconWrap = document.createElement('span');
  iconWrap.className = 'insights__priority-icon';
  const iconKey = PRIORITY_ICONS[item.type] || 'target';
  if (ICONS[iconKey]) iconWrap.innerHTML = ICONS[iconKey];
  row.appendChild(iconWrap);

  const textWrap = document.createElement('div');
  textWrap.className = 'insights__priority-text';

  const title = document.createElement('div');
  title.className = 'insights__priority-title';
  title.textContent = item.title || '(sem título)';
  textWrap.appendChild(title);

  const detail = document.createElement('div');
  detail.className = 'insights__priority-detail';
  detail.textContent = item.detail || '';
  textWrap.appendChild(detail);

  row.appendChild(textWrap);

  const score = document.createElement('span');
  score.className = 'insights__priority-score insights__priority-score--' + variant;
  score.textContent = item.score;
  row.appendChild(score);

  return row;
}

function buildPrioritiesSection(prios) {
  const section = document.createElement('section');
  section.className = 'insights__section insights__section--priorities';

  const header = document.createElement('header');
  header.className = 'insights__section-header';

  const title = document.createElement('h3');
  title.className = 'insights__section-title';
  title.textContent = 'Prioridades';
  header.appendChild(title);

  const count = document.createElement('span');
  count.className = 'insights__section-count';
  count.textContent = prios.length;
  header.appendChild(count);

  section.appendChild(header);

  if (prios.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'insights__section-empty';
    empty.textContent = 'Nada urgente nesta momento.';
    section.appendChild(empty);
    return section;
  }

  const list = document.createElement('div');
  list.className = 'insights__priorities-list';
  prios.forEach(p => list.appendChild(buildPriorityRow(p)));
  section.appendChild(list);

  return section;
}

/* ============================================================
   UI — Secção INSIGHTS
   ============================================================ */

const SEVERITY_VARIANT = {
  info:      'info',
  attention: 'warning',
  warning:   'bad'
};

const CATEGORY_ICONS = {
  tasks:      'check',
  habits:     'refresh',
  goals:      'target',
  studies:    'book',
  finances:   'dollar',
  events:     'calendar',
  lumiere:    'diamond',
  reflection: 'note'
};

function buildInsightRow(item) {
  const row = document.createElement('div');
  row.className = 'insights__item';
  const variant = SEVERITY_VARIANT[item.severity] || 'info';
  row.classList.add('insights__item--' + variant);

  const iconWrap = document.createElement('span');
  iconWrap.className = 'insights__item-icon';
  const iconKey = CATEGORY_ICONS[item.category] || 'target';
  if (ICONS[iconKey]) iconWrap.innerHTML = ICONS[iconKey];
  row.appendChild(iconWrap);

  const textWrap = document.createElement('div');
  textWrap.className = 'insights__item-text';

  const title = document.createElement('div');
  title.className = 'insights__item-title';
  title.textContent = item.title || '';
  textWrap.appendChild(title);

  if (item.description) {
    const desc = document.createElement('div');
    desc.className = 'insights__item-desc';
    desc.textContent = item.description;
    textWrap.appendChild(desc);
  }

  row.appendChild(textWrap);
  return row;
}

function buildInsightsSection(ins) {
  const section = document.createElement('section');
  section.className = 'insights__section insights__section--insights';

  const header = document.createElement('header');
  header.className = 'insights__section-header';

  const title = document.createElement('h3');
  title.className = 'insights__section-title';
  title.textContent = 'Insights';
  header.appendChild(title);

  const count = document.createElement('span');
  count.className = 'insights__section-count';
  count.textContent = ins.length;
  header.appendChild(count);

  section.appendChild(header);

  if (ins.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'insights__section-empty';
    empty.textContent = 'Tudo em ordem por aqui.';
    section.appendChild(empty);
    return section;
  }

  const list = document.createElement('div');
  list.className = 'insights__items-list';
  ins.forEach(i => list.appendChild(buildInsightRow(i)));
  section.appendChild(list);

  return section;
}

/* ============================================================
   UI — Secção RECOMENDAÇÕES
   ============================================================ */

const REC_PRIORITY_VARIANT = {
  high:   'bad',
  medium: 'warning',
  low:    'info'
};

function buildRecommendationRow(item) {
  const row = document.createElement('div');
  row.className = 'insights__item';
  const variant = REC_PRIORITY_VARIANT[item.priority] || 'info';
  row.classList.add('insights__item--' + variant);

  const iconWrap = document.createElement('span');
  iconWrap.className = 'insights__item-icon';
  iconWrap.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.2 1 2h6c0-.8.4-1.5 1-2A7 7 0 0 0 12 2z"/></svg>';
  row.appendChild(iconWrap);

  const textWrap = document.createElement('div');
  textWrap.className = 'insights__item-text';

  const title = document.createElement('div');
  title.className = 'insights__item-title';
  title.textContent = item.title || '';
  textWrap.appendChild(title);

  if (item.action) {
    const desc = document.createElement('div');
    desc.className = 'insights__item-desc';
    desc.textContent = item.action;
    textWrap.appendChild(desc);
  }

  row.appendChild(textWrap);
  return row;
}

function buildRecommendationsSection(recs) {
  const section = document.createElement('section');
  section.className = 'insights__section insights__section--recs';

  const header = document.createElement('header');
  header.className = 'insights__section-header';

  const title = document.createElement('h3');
  title.className = 'insights__section-title';
  title.textContent = 'Recomendações';
  header.appendChild(title);

  const count = document.createElement('span');
  count.className = 'insights__section-count';
  count.textContent = recs.length;
  header.appendChild(count);

  section.appendChild(header);

  if (recs.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'insights__section-empty';
    empty.textContent = 'Sem sugestões neste momento.';
    section.appendChild(empty);
    return section;
  }

  const list = document.createElement('div');
  list.className = 'insights__items-list';
  recs.forEach(r => list.appendChild(buildRecommendationRow(r)));
  section.appendChild(list);

  return section;
}

/* ============================================================
   Init
   ============================================================ */

export async function initInsightsCard(container) {
  if (!container) {
    console.warn('[InsightsCard] container nao fornecido');
    return;
  }

  if (_unsubscribe) {
    try { _unsubscribe(); } catch (e) { /* noop */ }
    _unsubscribe = null;
  }

  container.innerHTML = '<p class="insights__loading">A carregar\u2026</p>';

  const collections = {};
  try {
    const results = await Promise.all(
      RELEVANT_COLLECTIONS.map(n => dataManager.list(n).catch(() => []))
    );
    RELEVANT_COLLECTIONS.forEach((n, i) => {
      collections[n] = Array.isArray(results[i]) ? results[i] : [];
    });
  } catch (err) {
    console.error('[InsightsCard] Erro ao ler colecoes:', err);
  }

  const stats = calculateInsightsStats(collections);

  container.innerHTML = '';

  const page = document.createElement('section');
  page.className = 'insights';

  page.appendChild(buildHeader());
  page.appendChild(buildHeroCard(stats));
  page.appendChild(buildPrioritiesSection(stats.priorities));
  page.appendChild(buildInsightsSection(stats.insights));
  page.appendChild(buildRecommendationsSection(stats.recommendations));

  container.appendChild(page);

  _unsubscribe = eventBus.on('data:changed', (payload) => {
    if (payload && RELEVANT_COLLECTIONS.includes(payload.collection)) {
      initInsightsCard(container);
    }
  });
}

export default {
  initInsightsCard,
  calculateInsightsStats
};
