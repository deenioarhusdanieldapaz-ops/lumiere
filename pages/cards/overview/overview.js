/**
 * Card: Visão Geral Rápida
 *
 * Mostra o estado das 5 áreas principais:
 *  - Hábitos (X ativos)
 *  - Estudos (estado: Em dia / Recente / Parado)
 *  - Objetivos (% média de progresso)
 *  - Finanças (saldo do mês, estado qualitativo)
 *  - Lumière (X vendas no mês)
 *
 * NÃO fala com o Core diretamente. Recebe tudo via context.
 */
import { createStatRow } from '../../../components/stat-row/statRow.js';
import { ICONS } from '../../../js/icons.js';
import { eventBus } from '../../../core/eventBus.js';
import { dataManager } from '../../../core/dataManager.js';
import { lumiereIndex } from '../../../core/intelligence/lumiereIndex.js';
import { createProgressRing } from '../../../components/progress-ring/progressRing.js';

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

function daysBetween(isoA, isoB) {
  const a = new Date(isoA);
  const b = new Date(isoB);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return 0;
  return Math.round((b - a) / 86400000);
}

function monthStart(ymd) {
  return ymd.slice(0, 8) + '01';
}

/* ============================================================
   Saudação contextual
   ============================================================ */

function getGreeting() {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 'Bom dia,';
  if (h >= 12 && h < 20) return 'Boa tarde,';
  return 'Boa noite,';
}

function getUserName(collections) {
  // 1. Tenta do Core (userProfiles)
  const profiles = collections && collections.userProfiles;
  if (Array.isArray(profiles) && profiles.length > 0 && profiles[0] && profiles[0].name) {
    return String(profiles[0].name).trim();
  }
  // 2. Fallback: pequena preferência local (mesmo padrão de js/app.js)
  try {
    return (localStorage.getItem('lumiereUserName') || '').trim();
  } catch (e) {
    return '';
  }
}

/* ============================================================
   Cálculo das 5 áreas
   ============================================================ */

function computeHabits(collections) {
  const habits = Array.isArray(collections.habits) ? collections.habits : [];
  const active = habits.filter(h => h.status === 'active');

  if (habits.length === 0) return { value: 'sem dados', variant: 'empty' };
  if (active.length === 0) return { value: 'nenhum ativo', variant: 'warning' };

  return {
    value: active.length + (active.length === 1 ? ' ativo' : ' ativos'),
    variant: 'good'
  };
}

function computeStudies(collections) {
  const sessions = Array.isArray(collections.studySessions) ? collections.studySessions : [];
  if (sessions.length === 0) return { value: 'sem dados', variant: 'empty' };

  const today = todayYMD();
  const recentDates = sessions
    .filter(s => s.date)
    .map(s => ymdOf(s.date))
    .filter(d => d);

  if (recentDates.length === 0) return { value: 'sem dados', variant: 'empty' };

  const lastDate = recentDates.sort().reverse()[0];
  const diff = daysBetween(lastDate, today);

  if (diff <= 0) return { value: 'Em dia', variant: 'good' };
  if (diff <= 3) return { value: 'Recente', variant: 'warning' };
  return { value: 'Parado', variant: 'bad' };
}

function computeGoals(collections) {
  const goals = Array.isArray(collections.goals) ? collections.goals : [];
  const active = goals.filter(g => g.status === 'active');

  if (goals.length === 0) return { value: 'sem dados', variant: 'empty' };
  if (active.length === 0) return { value: 'nenhum ativo', variant: 'warning' };

  const totalProgress = active.reduce((s, g) => s + (Number(g.progress) || 0), 0);
  const avg = Math.round(totalProgress / active.length);

  if (avg >= 70) return { value: avg + '%', variant: 'good' };
  if (avg >= 40) return { value: avg + '%', variant: 'warning' };
  return { value: avg + '%', variant: 'bad' };
}

function computeFinances(collections) {
  const transactions = Array.isArray(collections.financeTransactions) ? collections.financeTransactions : [];
  const today = todayYMD();
  const monthStartYmd = monthStart(today);

  const monthTrx = transactions.filter(t => t.date && t.date >= monthStartYmd && t.date <= today);

  if (monthTrx.length === 0) return { value: 'sem dados', variant: 'empty' };

  const income = monthTrx
    .filter(t => t.type === 'income')
    .reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const expense = monthTrx
    .filter(t => t.type === 'expense')
    .reduce((s, t) => s + (Number(t.amount) || 0), 0);

  const saldo = income - expense;

  // Estado qualitativo (regra B — sensível a %)
  if (income === 0 && expense === 0) {
    return { value: 'neutro', variant: 'warning' };
  }
  if (saldo < 0) {
    return { value: 'Défice', variant: 'bad' };
  }
  if (income > 0 && saldo / income < 0.1) {
    return { value: 'Apertado', variant: 'warning' };
  }
  return { value: 'Equilibrado', variant: 'good' };
}

function computeLumiere(collections) {
  const sales = Array.isArray(collections.lumiereSales) ? collections.lumiereSales : [];
  const today = todayYMD();
  const monthStartYmd = monthStart(today);

  const monthSales = sales.filter(s => s.date && s.date >= monthStartYmd && s.date <= today);

  if (sales.length === 0) return { value: 'sem dados', variant: 'empty' };

  const count = monthSales.length;
  const label = count === 1 ? '1 venda' : count + ' vendas';

  if (count === 0) return { value: 'sem vendas', variant: 'warning' };
  return { value: label, variant: 'good' };
}

/* ============================================================
   Hoje — tarefas do dia
   ============================================================ */

function categoryIconKey(cat) {
  const map = {
    personal: 'target',
    work:     'book',
    study:    'book',
    health:   'refresh',
    finance:  'dollar',
    home:     'target',
    lumiere:  'diamond',
    leisure:  'refresh',
    other:    'target'
  };
  return map[cat] || 'target';
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

function computeTodayTasks(collections) {
  const tasks = Array.isArray(collections.tasks) ? collections.tasks : [];
  const today = todayYMD();

  const todays = tasks.filter(t => {
    const due = t.dueDate ? ymdOf(t.dueDate) : '';
    const start = t.startDate ? ymdOf(t.startDate) : '';
    return due === today || start === today;
  });

  const order = { urgent: 0, high: 1, medium: 2, low: 3 };
  todays.sort((a, b) => {
    const aDone = a.status === 'completed' ? 1 : 0;
    const bDone = b.status === 'completed' ? 1 : 0;
    if (aDone !== bDone) return aDone - bDone;
    const pa = order[a.priority] ?? 9;
    const pb = order[b.priority] ?? 9;
    if (pa !== pb) return pa - pb;
    return (a.startTime || '').localeCompare(b.startTime || '');
  });

  return todays.slice(0, 3);
}

function buildTodayRow(task) {
  const row = document.createElement('div');
  row.className = 'overview__today-row';
  if (task.status === 'completed') row.classList.add('is-completed');

  // Toggle (checkbox role)
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'overview__today-toggle';
  toggle.setAttribute('role', 'checkbox');
  toggle.setAttribute('aria-checked', task.status === 'completed' ? 'true' : 'false');
  toggle.setAttribute('aria-label',
    task.status === 'completed' ? 'Marcar como pendente' : 'Marcar como concluída');

  toggle.addEventListener('click', async () => {
    const next = task.status === 'completed' ? 'pending' : 'completed';
    try {
      await dataManager.update('tasks', task.id, { status: next });
    } catch (err) {
      console.error('[Overview/Hoje] Erro ao alternar tarefa:', err);
    }
  });
  row.appendChild(toggle);

  // Ícone da categoria
  const iconWrap = document.createElement('span');
  iconWrap.className = 'overview__today-icon';
  const iconKey = categoryIconKey(task.category);
  if (ICONS[iconKey]) iconWrap.innerHTML = ICONS[iconKey];
  row.appendChild(iconWrap);

  // Texto
  const textWrap = document.createElement('div');
  textWrap.className = 'overview__today-text';

  const title = document.createElement('div');
  title.className = 'overview__today-title';
  title.textContent = task.name || 'Sem título';
  textWrap.appendChild(title);

  const meta = document.createElement('div');
  meta.className = 'overview__today-meta';
  meta.textContent = categoryLabel(task.category) + ' · Hoje';
  textWrap.appendChild(meta);

  row.appendChild(textWrap);

  // Prioridade
  const badge = document.createElement('span');
  const prio = task.priority || 'medium';
  badge.className = 'overview__today-badge overview__today-badge--' + prio;
  badge.textContent = priorityLabel(prio);
  row.appendChild(badge);

  // Hora
  const time = document.createElement('span');
  time.className = 'overview__today-time';
  time.textContent = task.startTime || '';
  row.appendChild(time);

  // Chevron
  const chev = document.createElement('span');
  chev.className = 'overview__today-chevron';
  chev.setAttribute('aria-hidden', 'true');
  chev.textContent = '\u203A';
  row.appendChild(chev);

  return row;
}

function buildTodayCard(collections) {
  const card = document.createElement('section');
  card.className = 'overview__today-card';

  const header = document.createElement('header');
  header.className = 'overview__today-header';

  const headerLeft = document.createElement('div');
  headerLeft.className = 'overview__today-header-left';

  const calIcon = document.createElement('span');
  calIcon.className = 'overview__today-header-icon';
  if (ICONS.calendar) calIcon.innerHTML = ICONS.calendar;
  headerLeft.appendChild(calIcon);

  const headerTitle = document.createElement('h2');
  headerTitle.className = 'overview__today-header-title';
  headerTitle.textContent = 'Hoje';
  headerLeft.appendChild(headerTitle);
  header.appendChild(headerLeft);

  const seeAll = document.createElement('button');
  seeAll.type = 'button';
  seeAll.className = 'overview__today-see-all';
  seeAll.textContent = 'Ver todas \u2192';
  seeAll.addEventListener('click', () => {
    eventBus.emit('navigation:changed', { page: 'tasks' });
  });
  header.appendChild(seeAll);

  card.appendChild(header);

  const tasks = computeTodayTasks(collections);
  if (tasks.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'overview__today-empty';
    empty.textContent = 'Sem tarefas para hoje.';
    card.appendChild(empty);
  } else {
    const list = document.createElement('div');
    list.className = 'overview__today-list';
    tasks.forEach(t => list.appendChild(buildTodayRow(t)));
    card.appendChild(list);
  }

  return card;
}

/* ============================================================
   Visão das áreas — grid 2×3
   ============================================================ */

const AREA_ICON_GRID = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <rect x="3" y="3" width="7" height="7" rx="1"/>
  <rect x="14" y="3" width="7" height="7" rx="1"/>
  <rect x="3" y="14" width="7" height="7" rx="1"/>
  <rect x="14" y="14" width="7" height="7" rx="1"/>
</svg>`;

const AREA_ICON_ARROW = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <line x1="5" y1="12" x2="19" y2="12"/>
  <polyline points="12 5 19 12 12 19"/>
</svg>`;

function computeStudiesToday(collections) {
  const sessions = Array.isArray(collections.studySessions) ? collections.studySessions : [];
  if (sessions.length === 0) return { value: 'sem dados', variant: 'empty' };
  const today = todayYMD();
  const count = sessions.filter(s => s.date && ymdOf(s.date) === today).length;
  if (count === 0) return { value: 'nenhuma hoje', variant: 'warning' };
  return { value: count + ' hoje', variant: 'good' };
}

function computeGoalsCount(collections) {
  const goals = Array.isArray(collections.goals) ? collections.goals : [];
  if (goals.length === 0) return { value: 'sem dados', variant: 'empty' };
  const active = goals.filter(g => g.status === 'active');
  if (active.length === 0) return { value: 'nenhum ativo', variant: 'warning' };
  return {
    value: active.length + (active.length === 1 ? ' em progresso' : ' em progresso'),
    variant: 'good'
  };
}

function buildAreaTile({ iconHtml, name, value, variant, page }) {
  const tile = document.createElement('button');
  tile.type = 'button';
  tile.className = 'overview__area-tile';
  if (page) tile.dataset.page = page;

  const iconWrap = document.createElement('span');
  iconWrap.className = 'overview__area-tile-icon';
  iconWrap.innerHTML = iconHtml;
  tile.appendChild(iconWrap);

  const textWrap = document.createElement('span');
  textWrap.className = 'overview__area-tile-text';

  const nameEl = document.createElement('span');
  nameEl.className = 'overview__area-tile-name';
  nameEl.textContent = name;
  textWrap.appendChild(nameEl);

  const valueEl = document.createElement('span');
  valueEl.className = 'overview__area-tile-value overview__area-tile-value--' + variant;
  valueEl.textContent = value;
  textWrap.appendChild(valueEl);

  tile.appendChild(textWrap);

  const chev = document.createElement('span');
  chev.className = 'overview__area-tile-chevron';
  chev.setAttribute('aria-hidden', 'true');
  chev.textContent = '\u203A';
  tile.appendChild(chev);

  tile.addEventListener('click', () => {
    if (page) eventBus.emit('navigation:changed', { page });
  });

  return tile;
}

function buildAreasGrid(collections) {
  const section = document.createElement('section');
  section.className = 'overview__areas';

  // Header
  const header = document.createElement('header');
  header.className = 'overview__areas-header';

  const headerLeft = document.createElement('div');
  headerLeft.className = 'overview__areas-header-left';

  const headerIcon = document.createElement('span');
  headerIcon.className = 'overview__areas-header-icon';
  headerIcon.innerHTML = AREA_ICON_GRID;
  headerLeft.appendChild(headerIcon);

  const headerTitle = document.createElement('h2');
  headerTitle.className = 'overview__areas-header-title';
  headerTitle.textContent = 'Visão das áreas';
  headerLeft.appendChild(headerTitle);

  header.appendChild(headerLeft);

  const seeAll = document.createElement('button');
  seeAll.type = 'button';
  seeAll.className = 'overview__areas-see-all';
  seeAll.textContent = 'Ver todas \u2192';
  seeAll.addEventListener('click', () => {
    eventBus.emit('navigation:changed', { page: 'tasks' });
  });
  header.appendChild(seeAll);

  section.appendChild(header);

  // Grid
  const grid = document.createElement('div');
  grid.className = 'overview__areas-grid';

  const habits = computeHabits(collections);
  const studies = computeStudiesToday(collections);
  const goals = computeGoalsCount(collections);
  const finances = computeFinances(collections);
  const lumiere = computeLumiere(collections);

  const financeLabel = finances.variant === 'good'
    ? 'OK'
    : (finances.variant === 'empty' ? 'sem dados' : 'Atenção');

  grid.appendChild(buildAreaTile({
    iconHtml: ICONS.refresh,
    name: 'Hábitos',
    value: habits.value,
    variant: habits.variant,
    page: 'habits'
  }));

  grid.appendChild(buildAreaTile({
    iconHtml: ICONS.book,
    name: 'Estudos',
    value: studies.value,
    variant: studies.variant,
    page: 'studies'
  }));

  grid.appendChild(buildAreaTile({
    iconHtml: ICONS.target,
    name: 'Objetivos',
    value: goals.value,
    variant: goals.variant,
    page: 'goals'
  }));

  grid.appendChild(buildAreaTile({
    iconHtml: ICONS.dollar,
    name: 'Finanças',
    value: financeLabel,
    variant: finances.variant,
    page: 'finances'
  }));

  grid.appendChild(buildAreaTile({
    iconHtml: ICONS.diamond,
    name: 'Lumière',
    value: lumiere.value,
    variant: lumiere.variant,
    page: 'lumiere'
  }));

  grid.appendChild(buildAreaTile({
    iconHtml: AREA_ICON_ARROW,
    name: 'Todas as áreas',
    value: 'Explorar',
    variant: 'empty',
    page: null  // TODO: definir destino quando existir página "áreas"
  }));

  section.appendChild(grid);
  return section;
}

/* ============================================================
   Render
   ============================================================ */

function buildAreaRow(area, collections) {
  const config = {
    habits:   { icon: 'refresh',  label: 'Hábitos',   page: 'habits' },
    studies:  { icon: 'book',     label: 'Estudos',   page: 'studies' },
    goals:    { icon: 'target',   label: 'Objetivos', page: 'goals' },
    finances: { icon: 'dollar',   label: 'Finanças',  page: 'finances' },
    lumiere:  { icon: 'diamond',  label: 'Lumière',   page: 'lumiere' }
  }[area];

  const computed = {
    habits:   computeHabits(collections),
    studies:  computeStudies(collections),
    goals:    computeGoals(collections),
    finances: computeFinances(collections),
    lumiere:  computeLumiere(collections)
  }[area];

  return createStatRow({
    icon: config.icon,
    label: config.label,
    value: computed.value,
    variant: computed.variant,
    page: config.page,
    onClick: (page) => eventBus.emit('navigation:changed', { page })
  });
}

export async function initOverview(container) {
  if (!container) {
    console.warn('[Overview] container nao fornecido');
    return;
  }

  // Evita subscrições duplicadas
  if (initOverview._unsub) {
    try { initOverview._unsub(); } catch (e) { /* noop */ }
    initOverview._unsub = null;
  }

  container.innerHTML = '<p class="overview__loading">A carregar…</p>';

  // Ler coleções necessárias
  const collections = {};
  const needed = ['userProfiles', 'tasks', 'habits', 'habitLogs', 'studySessions', 'goals', 'financeTransactions', 'lumiereSales', 'notes'];
  try {
    const results = await Promise.all(
      needed.map(n => dataManager.list(n).catch(() => []))
    );
    needed.forEach((n, i) => {
      collections[n] = Array.isArray(results[i]) ? results[i] : [];
    });
  } catch (err) {
    console.error('[Overview] Erro ao ler coleções:', err);
  }

  // Construir o card
  container.innerHTML = '';

  const section = document.createElement('section');
  section.className = 'overview';

  // Header — saudação premium
  const header = document.createElement('header');
  header.className = 'overview__greeting';

  const greetingText = document.createElement('div');
  greetingText.className = 'overview__greeting-text';

  const greetingTitle = document.createElement('h1');
  greetingTitle.className = 'overview__greeting-title';

  const hello = document.createElement('span');
  hello.className = 'overview__greeting-hello';
  greetingTitle.appendChild(hello);

  const userName = getUserName(collections);
  if (userName) {
    hello.textContent = getGreeting() + ' ';
    const nameEl = document.createElement('span');
    nameEl.className = 'overview__greeting-name';
    nameEl.textContent = userName + '!';
    greetingTitle.appendChild(nameEl);
  } else {
    // Sem nome configurado: mantém só a saudação
    hello.textContent = getGreeting().replace(/,$/, '!');
  }

  greetingText.appendChild(greetingTitle);

  const greetingSub = document.createElement('p');
  greetingSub.className = 'overview__greeting-sub';
  greetingSub.textContent = 'Grandes conquistas começam com pequenos passos.';
  greetingText.appendChild(greetingSub);

  header.appendChild(greetingText);

  const quote = document.createElement('div');
  quote.className = 'overview__greeting-quote';
  quote.innerHTML = 'Disciplina hoje,<br>liberdade amanhã.';
  header.appendChild(quote);

  section.appendChild(header);

  // Card — A TUA EVOLUÇÃO
  const evoCard = document.createElement('section');
  evoCard.className = 'overview__evolution';

  const evoHeader = document.createElement('header');
  evoHeader.className = 'overview__evolution-header';
  const evoTitle = document.createElement('h2');
  evoTitle.className = 'overview__evolution-title';
  evoTitle.textContent = 'A tua evolução';
  evoHeader.appendChild(evoTitle);
  evoCard.appendChild(evoHeader);

  const evoBody = document.createElement('div');
  evoBody.className = 'overview__evolution-body';

  const evoResult = lumiereIndex.calculate(collections);
  const hasScore = typeof evoResult.score === 'number';

  // [BLOCO 3] Componente createProgressRing (size explícito)
  const ring = createProgressRing({
    value: hasScore ? evoResult.score : 0,
    variant: hasScore ? 'default' : 'empty',
    size: 120,
    stroke: 7,
    animate: true
  });
  ring.classList.add('overview__evolution-ring');
  ring.style.cursor = 'pointer';
  ring.setAttribute('role', 'button');
  ring.setAttribute('tabindex', '0');
  ring.setAttribute('aria-label', 'Ver detalhes do progresso');
  ring.addEventListener('click', () => {
    eventBus.emit('navigation:changed', { page: 'progress' });
  });
  ring.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      eventBus.emit('navigation:changed', { page: 'progress' });
    }
  });
  evoBody.appendChild(ring);

  const divider = document.createElement('div');
  divider.className = 'overview__evolution-divider';
  evoBody.appendChild(divider);

  const evoRight = document.createElement('div');
  evoRight.className = 'overview__evolution-right';

  const evoText = document.createElement('p');
  evoText.className = 'overview__evolution-text';
  evoText.textContent = hasScore
    ? 'Consistência é o que transforma planos em resultados.'
    : 'Sem base de dados ainda.';
  evoRight.appendChild(evoText);

  // Pill de variação semanal: escondida até existir comparação válida
  // (cálculo a adicionar na Fase 9 — Intelligence).

  evoBody.appendChild(evoRight);
  evoCard.appendChild(evoBody);
  section.appendChild(evoCard);

  // Card — HOJE
  section.appendChild(buildTodayCard(collections));

  // Card — VISÃO DAS ÁREAS (grid 2×3)
  section.appendChild(buildAreasGrid(collections));

  container.appendChild(section);

  // Injetar ícones (o statRow cria elementos [data-icon] após o bootstrap)
  requestAnimationFrame(() => {
    section.querySelectorAll('[data-icon]').forEach(el => {
      const name = el.getAttribute('data-icon');
      if (ICONS[name] && !el.innerHTML.trim()) {
        el.innerHTML = ICONS[name];
      }
    });
  });

  // Reactividade: re-renderiza quando coleções relevantes mudarem
  const RELEVANT = ['tasks', 'habits', 'habitLogs', 'goals',
                    'financeTransactions', 'lumiereSales', 'notes'];
  initOverview._unsub = eventBus.on('data:changed', (payload) => {
    if (payload && RELEVANT.includes(payload.collection)) {
      initOverview(container);
    }
  });
}

export default { initOverview };
