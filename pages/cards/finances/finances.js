/**
 * Card: Finanças (página completa)
 *
 * Fluxo: UI -> Core (DataManager) -> Storage -> EventBus
 */
import { dataManager } from '../../../core/dataManager.js';
import { eventBus } from '../../../core/eventBus.js';
import { ICONS } from '../../../js/icons.js';
import { formatMoney, t } from '../../../js/i18n.js';
import { createContextLine } from '../../../components/context-line/contextLine.js';

const RELEVANT_COLLECTIONS = [
  'financeAccounts',
  'financeTransactions',
  'budgets'
];

let _unsubscribe = null;

/* Helpers de data */
function todayYMD() {
  return new Date().toISOString().split('T')[0];
}

function ymdOf(iso) {
  if (!iso) return '';
  return String(iso).split('T')[0];
}

function monthStart(ymd) {
  return ymd.slice(0, 8) + '01';
}

function previousMonthRange(ymd) {
  const d = new Date(ymd);
  const prev = new Date(d.getFullYear(), d.getMonth() - 1, 1);
  const lastDay = new Date(d.getFullYear(), d.getMonth(), 0);
  const pad = (n) => String(n).padStart(2, '0');
  return {
    start: prev.getFullYear() + '-' + pad(prev.getMonth() + 1) + '-01',
    end:   lastDay.getFullYear() + '-' + pad(lastDay.getMonth() + 1) + '-' + pad(lastDay.getDate())
  };
}

function shortDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  return d.getDate() + ' ' + months[d.getMonth()];
}

function categoryLabel(cat) {
  return t('category', cat) || cat || '—';
}

/* Cálculos */
function transactionsThisMonth(trx) {
  const today = todayYMD();
  const start = monthStart(today);
  return trx.filter(t => {
    const d = ymdOf(t.date);
    return d && d >= start && d <= today;
  });
}

function transactionsPreviousMonth(trx) {
  const today = todayYMD();
  const { start, end } = previousMonthRange(today);
  return trx.filter(t => {
    const d = ymdOf(t.date);
    return d && d >= start && d <= end;
  });
}

function sumByType(list, type) {
  return list
    .filter(t => t.type === type)
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
}

function calculateFinanceStats(collections) {
  const accounts = Array.isArray(collections.financeAccounts) ? collections.financeAccounts : [];
  const trx = Array.isArray(collections.financeTransactions) ? collections.financeTransactions : [];
  const budgets = Array.isArray(collections.budgets) ? collections.budgets : [];

  const thisMonth = transactionsThisMonth(trx);
  const prevMonth = transactionsPreviousMonth(trx);

  const income = sumByType(thisMonth, 'income');
  const expense = sumByType(thisMonth, 'expense');
  const balance = income - expense;

  const prevIncome = sumByType(prevMonth, 'income');
  const prevExpense = sumByType(prevMonth, 'expense');
  const prevBalance = prevIncome - prevExpense;

  let comparison = null;
  if (prevBalance !== 0) {
    comparison = Math.round(((balance - prevBalance) / Math.abs(prevBalance)) * 100);
  }

  const totalFlow = income + expense;
  const incomePct = totalFlow > 0 ? Math.round((income / totalFlow) * 100) : 0;
  const expensePct = totalFlow > 0 ? 100 - incomePct : 0;

  const accountsTotal = accounts.reduce((sum, a) => sum + (Number(a.balance) || 0), 0);

  const expenseByCat = {};
  thisMonth
    .filter(t => t.type === 'expense')
    .forEach(t => {
      const cat = t.category || 'other';
      expenseByCat[cat] = (expenseByCat[cat] || 0) + (Number(t.amount) || 0);
    });

  const topCategories = Object.entries(expenseByCat)
    .map(([cat, amount]) => ({ cat, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 3);

  const maxCatAmount = topCategories.length > 0 ? topCategories[0].amount : 0;

  return {
    income,
    expense,
    balance,
    incomePct,
    expensePct,
    comparison,
    accounts,
    accountsTotal,
    topCategories,
    maxCatAmount,
    totalTransactions: trx.length,
    totalAccounts: accounts.length,
    totalBudgets: budgets.length
  };
}

/* ============================================================
   UI — Header
   ============================================================ */

function buildHeader() {
  const header = document.createElement('header');
  header.className = 'finances-card__header';

  const title = document.createElement('h1');
  title.className = 'finances-card__title';
  title.textContent = 'Finanças';
  header.appendChild(title);

  const sub = document.createElement('p');
  sub.className = 'finances-card__sub';
  sub.textContent = 'O teu dinheiro em ordem';
  header.appendChild(sub);

  return header;
}

/* ============================================================
   UI — Pill de comparação
   ============================================================ */

function buildComparisonPill(comparison) {
  const pill = document.createElement('div');
  pill.className = 'finances-card__pill';

  if (comparison === null || comparison === undefined) {
    pill.classList.add('finances-card__pill--empty');
    pill.textContent = 'Sem histórico';
    return pill;
  }

  const isPositive = comparison >= 0;
  if (isPositive) pill.classList.add('finances-card__pill--up');
  else pill.classList.add('finances-card__pill--down');

  const arrow = document.createElement('span');
  arrow.className = 'finances-card__pill-arrow';
  arrow.setAttribute('aria-hidden', 'true');
  arrow.textContent = isPositive ? '\u2191' : '\u2193';
  pill.appendChild(arrow);

  const text = document.createElement('span');
  text.className = 'finances-card__pill-text';
  text.textContent = (isPositive ? '+' : '') + comparison + '% vs mês passado';
  pill.appendChild(text);

  return pill;
}

/* ============================================================
   UI — Hero card (resultado do mês)
   ============================================================ */

function buildHeroCard(stats) {
  const card = document.createElement('section');
  card.className = 'finances-card__hero';

  // Topo: ícone + label
  const top = document.createElement('div');
  top.className = 'finances-card__hero-top';

  const iconWrap = document.createElement('span');
  iconWrap.className = 'finances-card__hero-icon';
  iconWrap.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="6" y1="20" x2="6" y2="14"/><line x1="12" y1="20" x2="12" y2="8"/><line x1="18" y1="20" x2="18" y2="4"/></svg>';
  top.appendChild(iconWrap);

  const label = document.createElement('span');
  label.className = 'finances-card__hero-label';
  label.textContent = 'Este mês';
  top.appendChild(label);

  card.appendChild(top);

  // Pill no canto (absoluta)
  card.appendChild(buildComparisonPill(stats.comparison));

  // Resultado grande
  const resultWrap = document.createElement('div');
  resultWrap.className = 'finances-card__hero-result';

  const resultLabel = document.createElement('div');
  resultLabel.className = 'finances-card__hero-result-label';
  resultLabel.textContent = 'Resultado do mês';
  resultWrap.appendChild(resultLabel);

  const resultValue = document.createElement('div');
  resultValue.className = 'finances-card__hero-result-value';
  resultValue.textContent = formatMoney(stats.balance, 'MZN');
  resultWrap.appendChild(resultValue);

  const resultSub = document.createElement('div');
  resultSub.className = 'finances-card__hero-result-sub';
  resultSub.textContent = 'no mês actual';
  resultWrap.appendChild(resultSub);

  card.appendChild(resultWrap);

  // 2 colunas: receitas | despesas
  const cols = document.createElement('div');
  cols.className = 'finances-card__hero-cols';

  const colIncome = document.createElement('div');
  colIncome.className = 'finances-card__hero-col';
  const labelIncome = document.createElement('div');
  labelIncome.className = 'finances-card__hero-col-label';
  labelIncome.textContent = 'Receitas';
  colIncome.appendChild(labelIncome);
  const valueIncome = document.createElement('div');
  valueIncome.className = 'finances-card__hero-col-value finances-card__hero-col-value--income';
  valueIncome.textContent = formatMoney(stats.income, 'MZN');
  colIncome.appendChild(valueIncome);
  cols.appendChild(colIncome);

  const colExpense = document.createElement('div');
  colExpense.className = 'finances-card__hero-col';
  const labelExpense = document.createElement('div');
  labelExpense.className = 'finances-card__hero-col-label';
  labelExpense.textContent = 'Despesas';
  colExpense.appendChild(labelExpense);
  const valueExpense = document.createElement('div');
  valueExpense.className = 'finances-card__hero-col-value finances-card__hero-col-value--expense';
  valueExpense.textContent = formatMoney(stats.expense, 'MZN');
  colExpense.appendChild(valueExpense);
  cols.appendChild(colExpense);

  card.appendChild(cols);

  // Barra de proporção
  const barWrap = document.createElement('div');
  barWrap.className = 'finances-card__hero-bar-wrap';

  const barIncome = document.createElement('div');
  barIncome.className = 'finances-card__hero-bar finances-card__hero-bar--income';
  barIncome.style.width = stats.incomePct + '%';
  barWrap.appendChild(barIncome);

  const barExpense = document.createElement('div');
  barExpense.className = 'finances-card__hero-bar finances-card__hero-bar--expense';
  barExpense.style.width = stats.expensePct + '%';
  barWrap.appendChild(barExpense);

  card.appendChild(barWrap);

  // Legenda
  const legend = document.createElement('p');
  legend.className = 'finances-card__hero-legend';
  legend.textContent = 'Receitas ' + stats.incomePct + '% · Despesas ' + stats.expensePct + '%';
  card.appendChild(legend);

  return card;
}

/* ============================================================
   UI — Saldo em contas
   ============================================================ */

const ACCOUNT_TYPE_LABELS = {
  checking: 'Conta corrente',
  savings: 'Guardar para o futuro',
  credit: 'Cartão de crédito',
  investment: 'Investimento',
  cash: 'Uso diário'
};

function buildAccountRow(account) {
  const row = document.createElement('button');
  row.type = 'button';
  row.className = 'finances-card__account';

  const iconWrap = document.createElement('span');
  iconWrap.className = 'finances-card__account-icon';
  iconWrap.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="6" width="20" height="14" rx="2"/><path d="M2 10h20"/><circle cx="16" cy="15" r="1.5" fill="currentColor" stroke="none"/></svg>';
  row.appendChild(iconWrap);

  const textWrap = document.createElement('div');
  textWrap.className = 'finances-card__account-text';

  const nameEl = document.createElement('div');
  nameEl.className = 'finances-card__account-name';
  nameEl.textContent = account.name || 'Sem nome';
  textWrap.appendChild(nameEl);

  const typeEl = document.createElement('div');
  typeEl.className = 'finances-card__account-type';
  typeEl.textContent = ACCOUNT_TYPE_LABELS[account.type] || account.type || '';
  textWrap.appendChild(typeEl);

  row.appendChild(textWrap);

  const valueEl = document.createElement('div');
  valueEl.className = 'finances-card__account-value';
  valueEl.textContent = formatMoney(Number(account.balance) || 0, account.currency || 'MZN');
  row.appendChild(valueEl);

  const chev = document.createElement('span');
  chev.className = 'finances-card__account-chevron';
  chev.setAttribute('aria-hidden', 'true');
  chev.textContent = '\u203A';
  row.appendChild(chev);

  row.addEventListener('click', () => {
    eventBus.emit('navigation:changed', { page: 'finances' });
  });

  return row;
}

function buildAccountsSection(stats) {
  const section = document.createElement('section');
  section.className = 'finances-card__section finances-card__section--accounts';

  const header = document.createElement('header');
  header.className = 'finances-card__section-header';

  const title = document.createElement('h3');
  title.className = 'finances-card__section-title';
  title.textContent = 'Saldo em contas';
  header.appendChild(title);

  const seeAll = document.createElement('button');
  seeAll.type = 'button';
  seeAll.className = 'finances-card__section-see-all';
  seeAll.textContent = 'Ver todas \u2192';
  seeAll.addEventListener('click', () => {
    eventBus.emit('navigation:changed', { page: 'finances' });
  });
  header.appendChild(seeAll);

  section.appendChild(header);

  if (stats.accounts.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'finances-card__section-empty';
    empty.textContent = 'Sem contas criadas.';
    section.appendChild(empty);
    return section;
  }

  const list = document.createElement('div');
  list.className = 'finances-card__accounts-list';
  stats.accounts.slice(0, 3).forEach(a => list.appendChild(buildAccountRow(a)));
  section.appendChild(list);

  const total = document.createElement('div');
  total.className = 'finances-card__accounts-total';

  const totalLabel = document.createElement('span');
  totalLabel.className = 'finances-card__accounts-total-label';
  totalLabel.textContent = 'Total em contas';
  total.appendChild(totalLabel);

  const totalValue = document.createElement('span');
  totalValue.className = 'finances-card__accounts-total-value';
  totalValue.textContent = formatMoney(stats.accountsTotal, 'MZN');
  total.appendChild(totalValue);

  section.appendChild(total);
  return section;
}

/* ============================================================
   UI — Top categorias de despesa
   ============================================================ */

function buildTopCategoriesSection(stats) {
  const section = document.createElement('section');
  section.className = 'finances-card__section finances-card__section--top-cats';

  const header = document.createElement('header');
  header.className = 'finances-card__section-header';

  const title = document.createElement('h3');
  title.className = 'finances-card__section-title';
  title.textContent = 'Top categorias de despesa';
  header.appendChild(title);

  const seeAll = document.createElement('button');
  seeAll.type = 'button';
  seeAll.className = 'finances-card__section-see-all';
  seeAll.textContent = 'Ver todas \u2192';
  seeAll.addEventListener('click', () => {
    eventBus.emit('navigation:changed', { page: 'finances' });
  });
  header.appendChild(seeAll);

  section.appendChild(header);

  if (stats.topCategories.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'finances-card__section-empty';
    empty.textContent = 'Sem despesas registadas este mês.';
    section.appendChild(empty);
    return section;
  }

  const list = document.createElement('div');
  list.className = 'finances-card__top-cats-list';

  stats.topCategories.forEach(item => {
    const pct = stats.maxCatAmount > 0
      ? Math.round((item.amount / stats.maxCatAmount) * 100)
      : 0;

    const row = document.createElement('div');
    row.className = 'finances-card__top-cat';

    const textWrap = document.createElement('div');
    textWrap.className = 'finances-card__top-cat-text';

    const nameEl = document.createElement('div');
    nameEl.className = 'finances-card__top-cat-name';
    nameEl.textContent = categoryLabel(item.cat);
    textWrap.appendChild(nameEl);

    const barWrap = document.createElement('div');
    barWrap.className = 'finances-card__top-cat-bar-wrap';
    const bar = document.createElement('div');
    bar.className = 'finances-card__top-cat-bar';
    bar.style.width = pct + '%';
    barWrap.appendChild(bar);
    textWrap.appendChild(barWrap);

    row.appendChild(textWrap);

    const pctEl = document.createElement('div');
    pctEl.className = 'finances-card__top-cat-pct';
    pctEl.textContent = pct + '%';
    row.appendChild(pctEl);

    const valueEl = document.createElement('div');
    valueEl.className = 'finances-card__top-cat-value';
    valueEl.textContent = formatMoney(item.amount, 'MZN');
    row.appendChild(valueEl);

    list.appendChild(row);
  });

  section.appendChild(list);
  return section;
}

/* ============================================================
   UI — Movimentos recentes
   ============================================================ */

function buildMovementRow(trx) {
  const row = document.createElement('div');
  row.className = 'finances-card__movement';

  const isIncome = trx.type === 'income';
  if (isIncome) row.classList.add('is-income');
  else if (trx.type === 'expense') row.classList.add('is-expense');

  const iconWrap = document.createElement('span');
  iconWrap.className = 'finances-card__movement-icon';
  if (isIncome) {
    iconWrap.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>';
  } else {
    iconWrap.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>';
  }
  row.appendChild(iconWrap);

  const textWrap = document.createElement('div');
  textWrap.className = 'finances-card__movement-text';

  const nameEl = document.createElement('div');
  nameEl.className = 'finances-card__movement-name';
  nameEl.textContent = trx.description || categoryLabel(trx.category) || 'Movimento';
  textWrap.appendChild(nameEl);

  const dateEl = document.createElement('div');
  dateEl.className = 'finances-card__movement-date';
  dateEl.textContent = shortDate(trx.date);
  textWrap.appendChild(dateEl);

  row.appendChild(textWrap);

  const valueEl = document.createElement('div');
  valueEl.className = 'finances-card__movement-value';
  const sign = isIncome ? '+' : '\u2212';
  valueEl.textContent = sign + ' ' + formatMoney(Number(trx.amount) || 0, 'MZN');
  row.appendChild(valueEl);

  const badge = document.createElement('span');
  badge.className = 'finances-card__movement-badge';
  if (isIncome) badge.classList.add('finances-card__movement-badge--income');
  else if (trx.type === 'expense') badge.classList.add('finances-card__movement-badge--expense');
  else badge.classList.add('finances-card__movement-badge--transfer');
  const labelMap = { income: 'Receita', expense: 'Despesa', transfer: 'Transferência' };
  badge.textContent = labelMap[trx.type] || '—';
  row.appendChild(badge);

  return row;
}

function buildRecentMovementsSection(trx) {
  const section = document.createElement('section');
  section.className = 'finances-card__section finances-card__section--movements';

  const header = document.createElement('header');
  header.className = 'finances-card__section-header';

  const title = document.createElement('h3');
  title.className = 'finances-card__section-title';
  title.textContent = 'Movimentos recentes';
  header.appendChild(title);

  const seeAll = document.createElement('button');
  seeAll.type = 'button';
  seeAll.className = 'finances-card__section-see-all';
  seeAll.textContent = 'Ver todas \u2192';
  seeAll.addEventListener('click', () => {
    eventBus.emit('navigation:changed', { page: 'finances' });
  });
  header.appendChild(seeAll);

  section.appendChild(header);

  if (trx.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'finances-card__section-empty';
    empty.textContent = 'Sem movimentos registados.';
    section.appendChild(empty);
    return section;
  }

  // Ordenar por data descendente, pegar últimas 3
  const recent = [...trx]
    .sort((a, b) => (ymdOf(b.date) || '').localeCompare(ymdOf(a.date) || ''))
    .slice(0, 3);

  const list = document.createElement('div');
  list.className = 'finances-card__movements-list';
  recent.forEach(t => list.appendChild(buildMovementRow(t)));
  section.appendChild(list);

  return section;
}

/* ============================================================
   UI — Tip no fundo
   ============================================================ */

function buildTip() {
  const tip = document.createElement('div');
  tip.className = 'finances-card__tip';

  const iconWrap = document.createElement('span');
  iconWrap.className = 'finances-card__tip-icon';
  iconWrap.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.2 1 2h6c0-.8.4-1.5 1-2A7 7 0 0 0 12 2z"/></svg>';
  tip.appendChild(iconWrap);

  const text = document.createElement('p');
  text.className = 'finances-card__tip-text';
  text.textContent = 'Pequenos gastos fazem grandes diferenças.';
  tip.appendChild(text);

  return tip;
}

/* ============================================================
   UI — Estado vazio
   ============================================================ */

function buildEmptyCard() {
  const card = document.createElement('section');
  card.className = 'finances-card__empty-card';

  const iconWrap = document.createElement('div');
  iconWrap.className = 'finances-card__empty-icon';
  iconWrap.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="6" width="20" height="14" rx="2"/><path d="M2 10h20"/><circle cx="16" cy="15" r="1.5" fill="currentColor" stroke="none"/></svg>';
  card.appendChild(iconWrap);

  const title = document.createElement('h2');
  title.className = 'finances-card__empty-title';
  title.textContent = 'Ainda sem movimentos';
  card.appendChild(title);

  const text = document.createElement('p');
  text.className = 'finances-card__empty-text';
  text.textContent = 'Regista as tuas primeiras transações para começar a acompanhar as tuas finanças.';
  card.appendChild(text);

  const cta = document.createElement('button');
  cta.type = 'button';
  cta.className = 'finances-card__empty-cta';
  cta.innerHTML = '<span class="finances-card__empty-cta-plus" aria-hidden="true">+</span> Registar primeira transação';
  cta.addEventListener('click', () => {
    eventBus.emit('navigation:changed', { page: 'finances' });
  });
  card.appendChild(cta);

  return card;
}

function buildSetupTile(iconSvg, title, subtitle) {
  const tile = document.createElement('button');
  tile.type = 'button';
  tile.className = 'finances-card__setup-tile';

  const iconWrap = document.createElement('span');
  iconWrap.className = 'finances-card__setup-icon';
  iconWrap.innerHTML = iconSvg;
  tile.appendChild(iconWrap);

  const textWrap = document.createElement('div');
  textWrap.className = 'finances-card__setup-text';

  const titleEl = document.createElement('div');
  titleEl.className = 'finances-card__setup-title';
  titleEl.textContent = title;
  textWrap.appendChild(titleEl);

  const subEl = document.createElement('div');
  subEl.className = 'finances-card__setup-sub';
  subEl.textContent = subtitle;
  textWrap.appendChild(subEl);

  tile.appendChild(textWrap);

  const chev = document.createElement('span');
  chev.className = 'finances-card__setup-chevron';
  chev.setAttribute('aria-hidden', 'true');
  chev.textContent = '\u203A';
  tile.appendChild(chev);

  tile.addEventListener('click', () => {
    eventBus.emit('navigation:changed', { page: 'finances' });
  });

  return tile;
}

function buildSetupSection() {
  const section = document.createElement('section');
  section.className = 'finances-card__setup';

  const header = document.createElement('header');
  header.className = 'finances-card__setup-header';

  const title = document.createElement('h3');
  title.className = 'finances-card__setup-header-title';
  title.textContent = 'Configurar';
  header.appendChild(title);

  section.appendChild(header);

  const list = document.createElement('div');
  list.className = 'finances-card__setup-list';

  const iconWallet = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="6" width="20" height="14" rx="2"/><path d="M2 10h20"/><circle cx="16" cy="15" r="1.5" fill="currentColor" stroke="none"/></svg>';

  const iconCalendar = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="8" y1="3" x2="8" y2="7"/><line x1="16" y1="3" x2="16" y2="7"/></svg>';

  const iconChart = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="6" y1="20" x2="6" y2="14"/><line x1="12" y1="20" x2="12" y2="8"/><line x1="18" y1="20" x2="18" y2="4"/></svg>';

  list.appendChild(buildSetupTile(
    iconWallet,
    'Criar conta',
    'Adiciona as tuas contas e carteiras'
  ));

  list.appendChild(buildSetupTile(
    iconCalendar,
    'Definir orçamento',
    'Escolhe limites por categoria'
  ));

  list.appendChild(buildSetupTile(
    iconChart,
    'Adicionar categorias',
    'Personaliza as tuas categorias'
  ));

  section.appendChild(list);
  return section;
}

/* Init — esqueleto. UI vem depois. */
/* Contexto inteligente */
function buildFinancesContext(stats) {
  if (stats.balance < 0) {
    return createContextLine({
      text: 'Saldo negativo neste mes. Despesas acima das receitas.',
      variant: 'bad'
    });
  }
  if (stats.income > 0 && stats.expense > stats.income * 0.8) {
    return createContextLine({
      text: 'Despesas a ' + stats.expensePct + '% do total. Cuida do equilibrio.',
      variant: 'warning'
    });
  }
  if (stats.balance > 0 && stats.income > 0 && stats.expense / stats.income < 0.5) {
    return createContextLine({
      text: 'Bom ritmo: ' + stats.incomePct + '% das entradas ficaram como saldo.',
      variant: 'good'
    });
  }
  return null;
}

export async function initFinancesCard(container) {
  if (!container) {
    console.warn('[FinancesCard] container nao fornecido');
    return;
  }

  if (_unsubscribe) {
    try { _unsubscribe(); } catch (e) { /* noop */ }
    _unsubscribe = null;
  }

  container.innerHTML = '<p class="finances-card__loading">A carregar\u2026</p>';

  const collections = {};
  try {
    const results = await Promise.all(
      RELEVANT_COLLECTIONS.map(n => dataManager.list(n).catch(() => []))
    );
    RELEVANT_COLLECTIONS.forEach((n, i) => {
      collections[n] = Array.isArray(results[i]) ? results[i] : [];
    });
  } catch (err) {
    console.error('[FinancesCard] Erro ao ler colecoes:', err);
  }

  const stats = calculateFinanceStats(collections);

  const isFullyEmpty =
    stats.totalTransactions === 0 &&
    stats.totalAccounts === 0;

  container.innerHTML = '';

  const page = document.createElement('section');
  page.className = 'finances-card';

  page.appendChild(buildHeader());

  if (isFullyEmpty) {
    page.appendChild(buildEmptyCard());
    page.appendChild(buildSetupSection());
    page.appendChild(buildTip());
  } else {
    page.appendChild(buildHeroCard(stats));

    const ctx = buildFinancesContext(stats);
    if (ctx) page.appendChild(ctx);

    page.appendChild(buildAccountsSection(stats));
    page.appendChild(buildTopCategoriesSection(stats));
    page.appendChild(buildRecentMovementsSection(collections.financeTransactions));
    page.appendChild(buildTip());
  }

  container.appendChild(page);

  _unsubscribe = eventBus.on('data:changed', (payload) => {
    if (payload && RELEVANT_COLLECTIONS.includes(payload.collection)) {
      initFinancesCard(container);
    }
  });
}

export default {
  initFinancesCard,
  calculateFinanceStats,
  transactionsThisMonth,
  transactionsPreviousMonth
};
