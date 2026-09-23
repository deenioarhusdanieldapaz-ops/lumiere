/**
 * Card: Progresso (página completa)
 *
 * Dois estados:
 *  - Vazio: mostra os 6 sinais como placeholders + CTA
 *  - Com dados: mostra score + card evolução + sinais detalhados
 *
 * Fluxo: UI -> Core (DataManager, lumiereIndex) -> Storage -> EventBus
 */
import { dataManager } from '../../../core/dataManager.js';
import { eventBus } from '../../../core/eventBus.js';
import { lumiereIndex } from '../../../core/intelligence/lumiereIndex.js';
import { createProgressRing } from '../../../components/progress-ring/progressRing.js';
import { createContextLine } from '../../../components/context-line/contextLine.js';
import { ICONS } from '../../../js/icons.js';

const SIGNAL_DEFS = [
  { id: 'tasks',      icon: 'check',   label: 'Tarefas',   emptyHint: 'Começa hoje' },
  { id: 'habits',     icon: 'refresh', label: 'Hábitos',   emptyHint: 'Começa hoje' },
  { id: 'goals',      icon: 'target',  label: 'Objetivos', emptyHint: 'Começa hoje' },
  { id: 'finances',   icon: 'dollar',  label: 'Finanças',  emptyHint: 'Começa hoje' },
  { id: 'studies',    icon: 'book',    label: 'Estudos',   emptyHint: 'Começa hoje' },
  { id: 'reflection', icon: 'note',    label: 'Reflexão',  emptyHint: 'Começa hoje' }
];

const STATUS_LABEL = {
  tasks:      { good: 'Em dia',        warning: 'Em progresso', bad: 'Atrasado', empty: 'Sem dados' },
  habits:     { good: 'Consistência',  warning: 'Regular',     bad: 'Baixa',    empty: 'Sem dados' },
  goals:      { good: 'No caminho',    warning: 'A melhorar',  bad: 'Atrasado', empty: 'Sem dados' },
  finances:   { good: 'Equilibrado',   warning: 'Apertado',    bad: 'Atenção',  empty: 'Sem dados' },
  studies:    { good: 'Em progresso',  warning: 'Recente',     bad: 'Parado',   empty: 'Sem dados' },
  reflection: { good: 'Activo',        warning: 'Regular',     bad: 'Inactivo', empty: 'Sem dados' }
};

const RELEVANT_COLLECTIONS = [
  'tasks', 'habits', 'habitLogs', 'goals',
  'financeTransactions', 'studySessions', 'notes'
];

let _unsubscribe = null;

function statusFromValue(v) {
  if (v === null || v === undefined) return 'empty';
  if (v >= 70) return 'good';
  if (v >= 40) return 'warning';
  return 'bad';
}

function badgeSymbol(status) {
  return { good: '\u2713', warning: '\u2191', bad: '!', empty: '\u2014' }[status];
}

function buildSignalTile(def, signal) {
  const status = signal ? statusFromValue(signal.value) : 'empty';
  const labelText = signal ? (STATUS_LABEL[def.id]?.[status] || '') : 'Sem dados';
  const footerText = signal && signal.raw ? signal.raw : def.emptyHint;
  const pct = signal && typeof signal.value === 'number'
    ? Math.max(0, Math.min(100, signal.value))
    : 0;

  const tile = document.createElement('button');
  tile.type = 'button';
  tile.className = 'progress__signal progress__signal--' + status;

  // Top row: icon + badge
  const top = document.createElement('div');
  top.className = 'progress__signal-top';

  const iconWrap = document.createElement('span');
  iconWrap.className = 'progress__signal-icon';
  if (ICONS[def.icon]) iconWrap.innerHTML = ICONS[def.icon];
  top.appendChild(iconWrap);

  const badge = document.createElement('span');
  badge.className = 'progress__signal-badge progress__signal-badge--' + status;
  badge.textContent = badgeSymbol(status);
  badge.setAttribute('aria-hidden', 'true');
  top.appendChild(badge);

  tile.appendChild(top);

  // Name
  const name = document.createElement('span');
  name.className = 'progress__signal-name';
  name.textContent = def.label;
  tile.appendChild(name);

  // Status text
  const statusEl = document.createElement('span');
  statusEl.className = 'progress__signal-status progress__signal-status--' + status;
  statusEl.textContent = labelText;
  tile.appendChild(statusEl);

  // Bar
  const barWrap = document.createElement('div');
  barWrap.className = 'progress__signal-bar-wrap';
  const bar = document.createElement('div');
  bar.className = 'progress__signal-bar progress__signal-bar--' + status;
  bar.style.width = pct + '%';
  barWrap.appendChild(bar);
  tile.appendChild(barWrap);

  // Footer
  const footer = document.createElement('span');
  footer.className = 'progress__signal-footer';
  footer.textContent = footerText;
  tile.appendChild(footer);

  // Click: navega para a página da área
  const PAGE_BY_ID = {
    tasks: 'tasks', habits: 'habits', goals: 'goals',
    finances: 'finances', studies: 'studies', reflection: 'notes'
  };
  tile.addEventListener('click', () => {
    eventBus.emit('navigation:changed', { page: PAGE_BY_ID[def.id] });
  });

  return tile;
}

function buildSignalsSection(defs, signalsMap, titleSub) {
  const section = document.createElement('section');
  section.className = 'progress__signals-section';

  const header = document.createElement('header');
  header.className = 'progress__signals-header';

  const headerLeft = document.createElement('div');
  headerLeft.className = 'progress__signals-header-left';

  const headerIcon = document.createElement('span');
  headerIcon.className = 'progress__signals-header-icon';
  headerIcon.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><line x1="6" y1="20" x2="6" y2="14"/><line x1="12" y1="20" x2="12" y2="8"/><line x1="18" y1="20" x2="18" y2="4"/></svg>';
  headerLeft.appendChild(headerIcon);

  const headerText = document.createElement('div');
  headerText.className = 'progress__signals-header-text';

  const h2 = document.createElement('h2');
  h2.className = 'progress__signals-title';
  h2.textContent = 'Os 6 sinais da tua evolução';
  headerText.appendChild(h2);

  const sub = document.createElement('p');
  sub.className = 'progress__signals-sub';
  sub.textContent = titleSub;
  headerText.appendChild(sub);

  headerLeft.appendChild(headerText);
  header.appendChild(headerLeft);

  section.appendChild(header);

  const grid = document.createElement('div');
  grid.className = 'progress__signals-grid';

  defs.forEach(def => {
    grid.appendChild(buildSignalTile(def, signalsMap[def.id]));
  });

  section.appendChild(grid);
  return section;
}

function buildHeader() {
  const header = document.createElement('header');
  header.className = 'progress__header';

  const title = document.createElement('h1');
  title.className = 'progress__title';
  title.textContent = 'Progresso';
  header.appendChild(title);

  const sub = document.createElement('p');
  sub.className = 'progress__sub';
  sub.textContent = 'A tua evolução em detalhe';
  header.appendChild(sub);

  return header;
}

function buildEmptyState() {
  const wrap = document.createElement('div');
  wrap.className = 'progress__empty-state';

  const ringWrap = document.createElement('div');
  ringWrap.className = 'progress__empty-ring';
  const ring = createProgressRing({
    value: 0,
    variant: 'empty',
    size: 130,
    stroke: 9,
    label: 'Índice de Evolução'
  });
  ringWrap.appendChild(ring);
  wrap.appendChild(ringWrap);

  const msg = document.createElement('p');
  msg.className = 'progress__empty-message';
  msg.textContent = 'Ainda não tens dados suficientes para calcular a tua evolução.';
  wrap.appendChild(msg);

  const hint = document.createElement('p');
  hint.className = 'progress__empty-hint';
  hint.textContent = 'Começa por registar uma tarefa, hábito, objetivo ou estudo.';
  wrap.appendChild(hint);

  const cta = document.createElement('button');
  cta.type = 'button';
  cta.className = 'progress__cta';
  cta.innerHTML = '<span class="progress__cta-plus" aria-hidden="true">+</span> Começar a registar';
  cta.addEventListener('click', () => {
    eventBus.emit('navigation:changed', { page: 'tasks' });
  });
  wrap.appendChild(cta);

  return wrap;
}

function buildWithDataState(result) {
  const wrap = document.createElement('div');
  wrap.className = 'progress__data-state';

  const card = document.createElement('section');
  card.className = 'progress__hero';

  const ringWrap = document.createElement('div');
  ringWrap.className = 'progress__hero-ring';
  const ring = createProgressRing({
    value: result.score,
    variant: 'default',
    size: 110,
    stroke: 8,
    label: 'Índice de Evolução'
  });
  ringWrap.appendChild(ring);
  card.appendChild(ringWrap);

  const divider = document.createElement('div');
  divider.className = 'progress__hero-divider';
  card.appendChild(divider);

  const right = document.createElement('div');
  right.className = 'progress__hero-right';

  const pill = document.createElement('div');
  pill.className = 'progress__hero-pill';
  pill.innerHTML = '<span class="progress__hero-pill-arrow" aria-hidden="true">\u2191</span> \u2014 esta semana';
  right.appendChild(pill);

  const quote = document.createElement('p');
  quote.className = 'progress__hero-quote';
  quote.innerHTML = 'Disciplina hoje,<br>liberdade amanhã.';
  right.appendChild(quote);

  const text = document.createElement('p');
  text.className = 'progress__hero-text';
  text.textContent = 'A tua evolução é o resultado das pequenas escolhas que fazes todos os dias.';
  right.appendChild(text);

  card.appendChild(right);
  wrap.appendChild(card);

  return wrap;
}

/* Contexto inteligente */
function buildProgressContext(result) {
  if (!result || !Array.isArray(result.signals) || result.signals.length === 0) return null;
  const weakest = result.signals.reduce((min, sig) => sig.value < min.value ? sig : min, result.signals[0]);
  if (weakest.value >= 70) return null;
  let variant = 'info';
  if (weakest.value < 40) variant = 'bad';
  else if (weakest.value < 70) variant = 'warning';
  return createContextLine({
    text: 'Ponto fraco: ' + weakest.label + ' — ' + weakest.value + '/100. Melhora aqui para subir o indice.',
    variant
  });
}

export async function initProgress(container) {
  if (!container) {
    console.warn('[Progress] container nao fornecido');
    return;
  }

  if (_unsubscribe) {
    try { _unsubscribe(); } catch (e) { /* noop */ }
    _unsubscribe = null;
  }

  container.innerHTML = '<p class="progress__loading">A carregar\u2026</p>';

  const collections = {};
  try {
    const results = await Promise.all(
      RELEVANT_COLLECTIONS.map(n => dataManager.list(n).catch(() => []))
    );
    RELEVANT_COLLECTIONS.forEach((n, i) => {
      collections[n] = Array.isArray(results[i]) ? results[i] : [];
    });
  } catch (err) {
    console.error('[Progress] Erro ao ler colecoes:', err);
  }

  container.innerHTML = '';

  const result = lumiereIndex.calculate(collections);
  const hasScore = typeof result.score === 'number';

  // Mapa de sinais por id
  const signalsMap = {};
  if (Array.isArray(result.signals)) {
    result.signals.forEach(s => { signalsMap[s.id] = s; });
  }

  const page = document.createElement('section');
  page.className = 'progress';

  page.appendChild(buildHeader());

  const ctx = buildProgressContext(result);
  if (ctx) page.appendChild(ctx);

  if (hasScore) {
    page.appendChild(buildWithDataState(result));
    page.appendChild(buildSignalsSection(
      SIGNAL_DEFS,
      signalsMap,
      'Cada área contribui para o teu índice geral.'
    ));
  } else {
    page.appendChild(buildEmptyState());
    page.appendChild(buildSignalsSection(
      SIGNAL_DEFS,
      signalsMap,
      'A tua evolução será construída a partir de:'
    ));
  }

  container.appendChild(page);

  _unsubscribe = eventBus.on('data:changed', (payload) => {
    if (payload && RELEVANT_COLLECTIONS.includes(payload.collection)) {
      initProgress(container);
    }
  });
}

export default { initProgress };
