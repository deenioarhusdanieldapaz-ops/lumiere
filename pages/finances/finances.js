/**
 * Finances Page
 *
 * 3 sub-entidades: Accounts (contas), Transactions (transações), Budgets (orçamentos).
 * Sistema de tabs.
 */
import { dataManager } from '../../core/dataManager.js';
import { requireAccess } from '../../core/auth.js';
import { eventBus } from '../../core/eventBus.js';
import { t, formatMoney } from '../../js/i18n.js';
import { createProgress } from '../../components/progress/progress.js';

function normalizeText(str) {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

// ============================================================
// Icones automaticos — Accounts + Budgets + Transactions
// ============================================================
const ACCOUNT_TYPE_EMOJI = {
  checking: '\u{1F3E6}', savings: '\u{1F416}', credit: '\u{1F4B3}',
  investment: '\u{1F4C8}', cash: '\u{1F4B5}'
};

const KEYWORD_EMOJI_ACCOUNTS = [
  { kw: ['banco', 'bci', 'millennium', 'bim', 'standard'], emoji: '\u{1F3E6}' },
  { kw: ['poupanca'], emoji: '\u{1F416}' },
  { kw: ['credito', 'cartao'], emoji: '\u{1F4B3}' },
  { kw: ['investimento', 'acoes'], emoji: '\u{1F4C8}' },
  { kw: ['dinheiro', 'carteira', 'cash'], emoji: '\u{1F4B5}' }
];

const CATEGORY_EMOJI_FINANCE = {
  personal: '\u{1F4B0}', work: '\u{1F4BC}', study: '\u{1F4DA}',
  health: '\u{1F3E5}', finance: '\u{1F4B0}', home: '\u{1F3E0}',
  lumiere: '\u{2728}', leisure: '\u{1F389}', other: '\u{1F4CA}',
  income: '\u{2B06}\u{FE0F}', food: '\u{1F37D}\u{FE0F}', transport: '\u{1F68C}',
  utilities: '\u{1F4A1}', shopping: '\u{1F6CD}\u{FE0F}', subscription: '\u{1F501}',
  savings: '\u{1F416}', investment: '\u{1F4C8}', debt: '\u{1F4B3}',
  insurance: '\u{1F6E1}\u{FE0F}', family: '\u{1F468}\u{200D}\u{1F469}\u{200D}\u{1F467}'
};

const KEYWORD_EMOJI_TRANSACTIONS = [
  { kw: ['supermercado', 'mercado', 'compras'], emoji: '\u{1F6D2}' },
  { kw: ['restaurante', 'almoco', 'jantar'], emoji: '\u{1F37D}\u{FE0F}' },
  { kw: ['gasolina', 'combustivel'], emoji: '\u{26FD}' },
  { kw: ['transporte', 'chapa', 'taxi', 'autocarro'], emoji: '\u{1F68C}' },
  { kw: ['electricidade', 'energia'], emoji: '\u{1F4A1}' },
  { kw: ['agua'], emoji: '\u{1F4A7}' },
  { kw: ['internet', 'wifi'], emoji: '\u{1F4F6}' },
  { kw: ['telefone', 'celular', 'telemovel'], emoji: '\u{1F4F1}' },
  { kw: ['medico', 'hospital', 'consulta'], emoji: '\u{1F3E5}' },
  { kw: ['farmacia', 'remedio', 'medicamento'], emoji: '\u{1F48A}' },
  { kw: ['roupa', 'camisa', 'vestido'], emoji: '\u{1F455}' },
  { kw: ['sapatos', 'tenis'], emoji: '\u{1F45F}' },
  { kw: ['salario', 'ordenado'], emoji: '\u{1F4BC}' },
  { kw: ['freelance', 'extra', 'bonus'], emoji: '\u{1F4B0}' },
  { kw: ['investimento'], emoji: '\u{1F4C8}' },
  { kw: ['poupanca'], emoji: '\u{1F416}' },
  { kw: ['presente', 'prenda'], emoji: '\u{1F381}' },
  { kw: ['escola', 'propinas', 'tuition'], emoji: '\u{1F393}' },
  { kw: ['aluguer', 'renda'], emoji: '\u{1F3E0}' },
  { kw: ['seguro'], emoji: '\u{1F6E1}\u{FE0F}' },
  { kw: ['viagem', 'voo'], emoji: '\u{2708}\u{FE0F}' },
  { kw: ['gasoleo'], emoji: '\u{26FD}' },
  { kw: ['transferencia', 'transfer'], emoji: '\u{21C4}' },
  { kw: ['imposto', 'taxa'], emoji: '\u{1F3E6}' }
];

function emojiForAccount(name, type) {
  const normalized = normalizeText(name);
  for (const item of KEYWORD_EMOJI_ACCOUNTS) {
    if (item.kw.some((k) => normalized.includes(normalizeText(k)))) return item.emoji;
  }
  return ACCOUNT_TYPE_EMOJI[type] || '\u{1F3E6}';
}

function emojiForBudget(name, category) {
  return CATEGORY_EMOJI_FINANCE[category] || '\u{1F4CA}';
}

function emojiForTransaction(description, category) {
  const normalized = normalizeText(description);
  for (const item of KEYWORD_EMOJI_TRANSACTIONS) {
    if (item.kw.some((k) => normalized.includes(normalizeText(k)))) return item.emoji;
  }
  return CATEGORY_EMOJI_FINANCE[category] || '\u{1F4CA}';
}

let _container = null;

const TABS = [
  { id: 'accounts',     label: 'Contas',      collection: 'financeAccounts' },
  { id: 'transactions', label: 'Transações',  collection: 'financeTransactions' },
  { id: 'budgets',      label: 'Orçamentos',  collection: 'budgets' }
];

let _state = {
  activeTab: 'accounts',
  data: { accounts: [], transactions: [], budgets: [] },
  loading: false,
  error: null,
  showForm: false,
  editingId: null
};

let _unsubscribe = null;


function setupReadMore(btn, wrap, desc) {
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isExpanded = wrap.classList.toggle('is-expanded');
    btn.textContent = isExpanded ? 'Mostrar menos' : 'Ler mais';
    if (!isExpanded) btn.style.display = (desc.scrollHeight > desc.clientHeight + 2) ? 'block' : 'none';
  });
  const observer = new ResizeObserver(() => {
    if (wrap.classList.contains('is-expanded')) {
      btn.style.display = 'block';
      return;
    }
    btn.style.display = (desc.scrollHeight > desc.clientHeight + 2) ? 'block' : 'none';
  });
  observer.observe(desc);
  const listObserver = new MutationObserver(() => {
    if (!document.body.contains(desc)) {
      observer.disconnect();
      listObserver.disconnect();
    }
  });
  listObserver.observe(document.body, { childList: true, subtree: true });
}

export function initFinances(container) {
  if (!container) {
    console.warn('[Finances] container inválido.');
    return;
  }
  _container = container;

  if (_unsubscribe) _unsubscribe();
  _unsubscribe = eventBus.on('data:changed', (payload) => {
    if (!payload) return;
    if (['financeAccounts','financeTransactions','budgets'].includes(payload.collection)) {
      loadAll();
    }
  });

  loadAll();
}

async function loadAll() {
  _state.loading = true;
  _state.error = null;
  render();

  try {
    const [accounts, transactions, budgets] = await Promise.all([
      dataManager.list('financeAccounts'),
      dataManager.list('financeTransactions'),
      dataManager.list('budgets')
    ]);
    _state.data = {
      accounts:     Array.isArray(accounts)     ? accounts     : [],
      transactions: Array.isArray(transactions) ? transactions : [],
      budgets:      Array.isArray(budgets)      ? budgets      : []
    };
  } catch (err) {
    console.error('[Finances] Erro ao carregar:', err);
    _state.error = err.message || 'Erro ao carregar dados.';
  } finally {
    _state.loading = false;
    render();
  }
}

function render() {
  if (!_container) return;
  _container.innerHTML = '';

  const page = document.createElement('div');
  page.className = 'finances-page';

  page.appendChild(renderHeader());
  page.appendChild(renderTabs());

  if (_state.showForm && ['accounts','transactions','budgets'].includes(_state.activeTab)) {
    page.appendChild(renderForm());
  }

  page.appendChild(renderPanel());

  _container.appendChild(page);
}

function renderHeader() {
  const header = document.createElement('header');
  header.className = 'finances-header';

  const title = document.createElement('h2');
  title.className = 'finances-header__title';
  title.textContent = 'Finanças';
  header.appendChild(title);

  const actions = document.createElement('div');
  actions.className = 'finances-header__actions';

  const btnNew = document.createElement('button');
  btnNew.type = 'button';
  btnNew.className = 'finances-btn finances-btn--primary';

  const labels = {
    accounts: 'Nova conta',
    transactions: 'Nova transação',
    budgets: 'Novo orçamento'
  };
  btnNew.textContent = labels[_state.activeTab] || 'Novo';
  if (['accounts','transactions','budgets'].includes(_state.activeTab)) {
    btnNew.addEventListener('click', () => openForm());
  } else {
    btnNew.disabled = true;
    btnNew.title = 'Disponível no próximo bloco';
  }
  actions.appendChild(btnNew);

  header.appendChild(actions);
  return header;
}

function renderTabs() {
  const nav = document.createElement('nav');
  nav.className = 'finances-tabs';
  nav.setAttribute('role', 'tablist');

  for (const tab of TABS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'finances-tab' + (tab.id === _state.activeTab ? ' is-active' : '');
    btn.textContent = tab.label;
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-selected', tab.id === _state.activeTab ? 'true' : 'false');
    btn.addEventListener('click', () => switchTab(tab.id));
    nav.appendChild(btn);
  }

  return nav;
}

function switchTab(tabId) {
  if (!TABS.find(t => t.id === tabId)) return;
  _state.activeTab = tabId;
  _state.showForm = false;
  _state.editingId = null;
  render();
}

function renderPanel() {
  const panel = document.createElement('div');
  panel.className = 'finances-panel';
  panel.setAttribute('role', 'tabpanel');

  if (_state.loading) {
    panel.appendChild(renderState('A carregar dados…'));
    return panel;
  }
  if (_state.error) {
    panel.appendChild(renderState(_state.error, true));
    return panel;
  }

  const items = _state.data[_state.activeTab] || [];
  if (items.length === 0) {
    const tab = TABS.find(t => t.id === _state.activeTab);
    panel.appendChild(renderState('Sem ' + tab.label.toLowerCase() + '. Toque em "Novo" para criar.'));
    return panel;
  }

  const list = document.createElement('div');
  list.className = 'finances-list';
  for (const item of items) {
    list.appendChild(renderItem(item, _state.activeTab));
  }
  panel.appendChild(list);
  return panel;
}

function renderItem(item, tabId) {
  if (tabId === 'accounts') return renderAccountItem(item);
  if (tabId === 'transactions') return renderTransactionItem(item);
  if (tabId === 'budgets') return renderBudgetItem(item);
  const el = document.createElement('article');
  el.className = 'lum-card lum-card--finance finances-item';
  el.textContent = '(placeholder)';
  return el;
}

function renderBudgetItem(b) {
  const el = document.createElement('article');
  el.className = 'lum-card lum-card--finance finances-item';

  const header = document.createElement('div');
  header.className = 'lum-card__header finances-item__header';
  const headerLeft = document.createElement('div');
  headerLeft.className = 'lum-card__header-left finances-item__header-left';

  const icon = document.createElement('span');
  icon.className = 'lum-card__icon finances-item__icon';
  if (b.icon) icon.textContent = b.icon;
  else icon.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"></path><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"></path><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"></path></svg>';
  icon.setAttribute('aria-hidden', 'true');
  headerLeft.appendChild(icon);

  const name = document.createElement('h3');
  name.className = 'lum-card__title finances-item__name';
  name.textContent = b.name || '(sem nome)';
  headerLeft.appendChild(name);
  header.appendChild(headerLeft);

  const actions = document.createElement('details');
  actions.className = 'lum-card__actions finances-item__actions';
  const summary = document.createElement('summary');
  summary.className = 'finances-item__menu-btn';
  summary.innerHTML = '⋮';
  actions.appendChild(summary);
  const menuDropdown = document.createElement('div');
  menuDropdown.className = 'finances-item__menu-dropdown';
  const btnEdit = document.createElement('button');
  btnEdit.type = 'button';
  btnEdit.innerHTML = '✎ Editar';
  btnEdit.addEventListener('click', (e) => { e.preventDefault(); actions.removeAttribute('open'); openForm(b.id); });
  menuDropdown.appendChild(btnEdit);
  const btnDelete = document.createElement('button');
  btnDelete.type = 'button';
  btnDelete.innerHTML = '✕ Apagar';
  btnDelete.addEventListener('click', (e) => { e.preventDefault(); actions.removeAttribute('open'); handleDeleteBudget(b); });
  menuDropdown.appendChild(btnDelete);
  actions.appendChild(menuDropdown);
  header.appendChild(actions);
  el.appendChild(header);

  const details = document.createElement('div');
  details.className = 'finances-item__details';

  const amount = document.createElement('span');
  amount.className = 'finances-item__amount-block is-neutral';
  amount.textContent = formatMoney(b.spent || 0, 'MZN') + ' / ' + formatMoney(b.amount || 0, 'MZN');
  details.appendChild(amount);

  const meta = document.createElement('div');
  meta.className = 'finances-item__meta';
  if (b.category) meta.appendChild(metaTag(t('category', b.category)));
  meta.appendChild(metaTag(periodLabel(b.period)));
  details.appendChild(meta);
  el.appendChild(details);

  // Progresso
  const progressWrap = document.createElement('div');
  progressWrap.className = 'finances-item__progress';
  const amountVal = Number(b.amount) || 0;
  const spentVal = Number(b.spent) || 0;
  let pct = 0;
  let variant = 'empty';
  if (amountVal > 0) {
    pct = Math.min(100, Math.round((spentVal / amountVal) * 100));
    variant = 'default';
  }
  const bar = createProgress({
    value: pct, label: 'Utilizado', variant: variant, showPercent: variant === 'default', size: 'md'
  });
  progressWrap.appendChild(bar);
  el.appendChild(progressWrap);

  // Descrição Expansível
  if (b.notes) {
    const descWrap = document.createElement('div');
    descWrap.className = 'finances-item__desc-wrap';
    const desc = document.createElement('p');
    desc.className = 'finances-item__description';
    desc.textContent = b.notes;
    descWrap.appendChild(desc);
    
    const btnReadMore = document.createElement('button');
    btnReadMore.type = 'button';
    btnReadMore.className = 'finances-item__read-more';
    btnReadMore.textContent = 'Ler mais';
    btnReadMore.style.display = 'none';
    descWrap.appendChild(btnReadMore);
    el.appendChild(descWrap);
    
    setupReadMore(btnReadMore, descWrap, desc);
  }

  // Rodapé
  const footer = document.createElement('div');
  footer.className = 'finances-item__footer';
  const dateSpan = document.createElement('span');
  dateSpan.className = 'finances-item__footer-info';
  dateSpan.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px; vertical-align:text-bottom;"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg> ' + (periodLabel(b.period) || 'Mensal');
  footer.appendChild(dateSpan);
  const arrowSpan = document.createElement('span');
  arrowSpan.className = 'finances-item__arrow';
  arrowSpan.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>';
  footer.appendChild(arrowSpan);
  el.appendChild(footer);

  return el;
}

function periodLabel(period) {
  const map = { weekly: 'Semanal', monthly: 'Mensal', yearly: 'Anual' };
  return map[period] || period || '—';
}

function renderTransactionItem(trx) {
  const el = document.createElement('article');
  el.className = 'lum-card lum-card--finance finances-item';
  if (trx.type === 'income') el.classList.add('finances-item--income');
  if (trx.type === 'expense') el.classList.add('finances-item--expense');
  if (trx.type === 'transfer') el.classList.add('finances-item--transfer');

  const header = document.createElement('div');
  header.className = 'lum-card__header finances-item__header';
  const headerLeft = document.createElement('div');
  headerLeft.className = 'lum-card__header-left finances-item__header-left';

  const icon = document.createElement('span');
  icon.className = 'lum-card__icon finances-item__icon';
  if (trx.icon) icon.textContent = trx.icon;
  else icon.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"></path><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"></path><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"></path></svg>';
  icon.setAttribute('aria-hidden', 'true');
  headerLeft.appendChild(icon);

  const name = document.createElement('h3');
  name.className = 'lum-card__title finances-item__name';
  name.textContent = trx.description || trx.payee || '(sem descrição)';
  headerLeft.appendChild(name);
  header.appendChild(headerLeft);

  const actions = document.createElement('details');
  actions.className = 'lum-card__actions finances-item__actions';
  const summary = document.createElement('summary');
  summary.className = 'finances-item__menu-btn';
  summary.innerHTML = '⋮';
  actions.appendChild(summary);
  const menuDropdown = document.createElement('div');
  menuDropdown.className = 'finances-item__menu-dropdown';
  const btnEdit = document.createElement('button');
  btnEdit.type = 'button';
  btnEdit.innerHTML = '✎ Editar';
  btnEdit.addEventListener('click', (e) => { e.preventDefault(); actions.removeAttribute('open'); openForm(trx.id); });
  menuDropdown.appendChild(btnEdit);
  const btnDelete = document.createElement('button');
  btnDelete.type = 'button';
  btnDelete.innerHTML = '✕ Apagar';
  btnDelete.addEventListener('click', (e) => { e.preventDefault(); actions.removeAttribute('open'); handleDeleteTransaction(trx); });
  menuDropdown.appendChild(btnDelete);
  actions.appendChild(menuDropdown);
  header.appendChild(actions);
  el.appendChild(header);

  const details = document.createElement('div');
  details.className = 'finances-item__details';

  const acc = _state.data.accounts.find(a => a.id === trx.accountId);
  const currency = acc ? acc.currency : 'MZN';
  const sign = trx.type === 'expense' ? '− ' : (trx.type === 'income' ? '+ ' : '⇄ ');
  
  const amount = document.createElement('span');
  amount.className = 'finances-item__amount-block';
  if (trx.type === 'income') amount.classList.add('is-income');
  else if (trx.type === 'expense') amount.classList.add('is-expense');
  else amount.classList.add('is-neutral');
  amount.textContent = sign + formatMoney(trx.amount || 0, currency);
  details.appendChild(amount);

  const meta = document.createElement('div');
  meta.className = 'finances-item__meta';
  if (acc) meta.appendChild(metaTag(acc.name || '(conta)'));
  if (trx.category) meta.appendChild(metaTag(t('category', trx.category)));
  if (Array.isArray(trx.tags)) {
    for (const tg of trx.tags) meta.appendChild(metaTag(tg));
  }
  details.appendChild(meta);
  el.appendChild(details);

  // Descrição Expansível (usando trx.payee ou notes, se houver)
  if (trx.notes) {
    const descWrap = document.createElement('div');
    descWrap.className = 'finances-item__desc-wrap';
    const desc = document.createElement('p');
    desc.className = 'finances-item__description';
    desc.textContent = trx.notes;
    descWrap.appendChild(desc);
    
    const btnReadMore = document.createElement('button');
    btnReadMore.type = 'button';
    btnReadMore.className = 'finances-item__read-more';
    btnReadMore.textContent = 'Ler mais';
    btnReadMore.style.display = 'none';
    descWrap.appendChild(btnReadMore);
    el.appendChild(descWrap);
    
    setupReadMore(btnReadMore, descWrap, desc);
  }

  // Rodapé
  const footer = document.createElement('div');
  footer.className = 'finances-item__footer';
  const dateSpan = document.createElement('span');
  dateSpan.className = 'finances-item__footer-info';
  dateSpan.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px; vertical-align:text-bottom;"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg> ' + (trx.date || 'Hoje');
  footer.appendChild(dateSpan);
  const arrowSpan = document.createElement('span');
  arrowSpan.className = 'finances-item__arrow';
  arrowSpan.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>';
  footer.appendChild(arrowSpan);
  el.appendChild(footer);

  return el;
}

function renderAccountItem(acc) {
  const el = document.createElement('article');
  el.className = 'lum-card lum-card--finance finances-item';

  const header = document.createElement('div');
  header.className = 'lum-card__header finances-item__header';
  const headerLeft = document.createElement('div');
  headerLeft.className = 'lum-card__header-left finances-item__header-left';

  const icon = document.createElement('span');
  icon.className = 'lum-card__icon finances-item__icon';
  if (acc.icon) icon.textContent = acc.icon;
  else icon.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"></path><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"></path><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"></path></svg>';
  icon.setAttribute('aria-hidden', 'true');
  headerLeft.appendChild(icon);

  const name = document.createElement('h3');
  name.className = 'lum-card__title finances-item__name';
  name.textContent = acc.name || '(sem nome)';
  headerLeft.appendChild(name);
  header.appendChild(headerLeft);

  const actions = document.createElement('details');
  actions.className = 'lum-card__actions finances-item__actions';
  const summary = document.createElement('summary');
  summary.className = 'finances-item__menu-btn';
  summary.innerHTML = '⋮';
  actions.appendChild(summary);
  const menuDropdown = document.createElement('div');
  menuDropdown.className = 'finances-item__menu-dropdown';
  const btnEdit = document.createElement('button');
  btnEdit.type = 'button';
  btnEdit.innerHTML = '✎ Editar';
  btnEdit.addEventListener('click', (e) => { e.preventDefault(); actions.removeAttribute('open'); openForm(acc.id); });
  menuDropdown.appendChild(btnEdit);
  const btnDelete = document.createElement('button');
  btnDelete.type = 'button';
  btnDelete.innerHTML = '✕ Apagar';
  btnDelete.addEventListener('click', (e) => { e.preventDefault(); actions.removeAttribute('open'); handleDeleteAccount(acc); });
  menuDropdown.appendChild(btnDelete);
  actions.appendChild(menuDropdown);
  header.appendChild(actions);
  el.appendChild(header);

  const details = document.createElement('div');
  details.className = 'finances-item__details';

  const amount = document.createElement('span');
  amount.className = 'finances-item__amount-block is-neutral';
  amount.textContent = formatMoney(acc.balance || 0, acc.currency);
  details.appendChild(amount);

  const meta = document.createElement('div');
  meta.className = 'finances-item__meta';
  meta.appendChild(metaTag(typeLabel(acc.type)));
  if (acc.institution) meta.appendChild(metaTag(acc.institution));
  details.appendChild(meta);
  el.appendChild(details);

  // Descrição Expansível
  if (acc.description) {
    const descWrap = document.createElement('div');
    descWrap.className = 'finances-item__desc-wrap';
    const desc = document.createElement('p');
    desc.className = 'finances-item__description';
    desc.textContent = acc.description;
    descWrap.appendChild(desc);
    
    const btnReadMore = document.createElement('button');
    btnReadMore.type = 'button';
    btnReadMore.className = 'finances-item__read-more';
    btnReadMore.textContent = 'Ler mais';
    btnReadMore.style.display = 'none';
    descWrap.appendChild(btnReadMore);
    el.appendChild(descWrap);
    
    setupReadMore(btnReadMore, descWrap, desc);
  }

  // Rodapé
  const footer = document.createElement('div');
  footer.className = 'finances-item__footer';
  const dateSpan = document.createElement('span');
  dateSpan.className = 'finances-item__footer-info';
  dateSpan.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px; vertical-align:text-bottom;"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg> ' + (acc.createdAt ? new Date(acc.createdAt).toLocaleDateString('pt-PT') : 'Hoje');
  footer.appendChild(dateSpan);
  const arrowSpan = document.createElement('span');
  arrowSpan.className = 'finances-item__arrow';
  arrowSpan.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>';
  footer.appendChild(arrowSpan);
  el.appendChild(footer);

  return el;
}

function typeLabel(type) {
  const map = { checking: 'Corrente', savings: 'Poupança', credit: 'Crédito', investment: 'Investimento', cash: 'Dinheiro' };
  return map[type] || type || '—';
}

function metaTag(text) {
  const span = document.createElement('span');
  span.className = 'finances-item__tag';
  span.textContent = text;
  return span;
}

function renderState(message, isError = false) {
  const div = document.createElement('div');
  div.className = 'finances-state' + (isError ? ' finances-state--error' : '');
  div.textContent = message;
  return div;
}

/* __FIN_ACCOUNTS_FORM__ */
function openForm(accountId = null) {
  if (!requireAccess()) return;
  _state.editingId = accountId;
  _state.showForm = true;
  render();
}

function closeForm() {
  _state.editingId = null;
  _state.showForm = false;
  render();
}

function updateFormError(message) {
  const el = _container ? _container.querySelector('.finances-form__error') : null;
  if (el) {
    el.textContent = message || '';
    el.hidden = !message;
  }
}

function renderForm() {
  const isEdit = Boolean(_state.editingId);
  const tab = _state.activeTab;

  const form = document.createElement('form');
  form.className = 'finances-form';
  form.noValidate = true;
  form.addEventListener('submit', handleSubmit);

  const title = document.createElement('h3');
  title.className = 'finances-form__title';
  form.appendChild(title);

  const grid = document.createElement('div');
  grid.className = 'finances-form__grid';

  if (tab === 'budgets') {
    const b = isEdit ? _state.data.budgets.find(x => x.id === _state.editingId) : null;
    title.textContent = isEdit ? 'Editar orçamento' : 'Novo orçamento';

    grid.appendChild(field('Nome *', 'input', 'name', b ? b.name : '', { type: 'text', required: true }));
    grid.appendChild(field('Categoria *', 'select', 'category', b ? b.category : 'finance', {
      options: ['personal','work','study','health','finance','home','lumiere','leisure','other','income','food','transport','utilities','shopping','subscription','savings','investment','debt','insurance','family'],
      translate: 'category'
    }));
    grid.appendChild(field('Valor orçamentado *', 'input', 'amount', b ? b.amount : 0, { type: 'number', required: true }));
    grid.appendChild(field('Gasto', 'input', 'spent', b ? b.spent : 0, { type: 'number' }));
    grid.appendChild(field('Período *', 'select', 'period', b ? b.period : 'monthly', {
      options: ['weekly','monthly','yearly'],
      labels: { weekly: 'Semanal', monthly: 'Mensal', yearly: 'Anual' }
    }));
    grid.appendChild(field('Data início', 'input', 'startDate', b ? b.startDate : '', { type: 'date' }));
    grid.appendChild(field('Data fim', 'input', 'endDate', b ? b.endDate : '', { type: 'date' }));
    grid.appendChild(field('Cor', 'input', 'color', b ? b.color : '', { type: 'color' }));
    grid.appendChild(field('Notas', 'textarea', 'notes', b ? b.notes : '', { full: true }));
  } else if (tab === 'transactions') {
    const trx = isEdit ? _state.data.transactions.find(x => x.id === _state.editingId) : null;
    const accounts = _state.data.accounts;
    title.textContent = isEdit ? 'Editar transação' : 'Nova transação';

    if (accounts.length === 0 && !isEdit) {
      const warn = document.createElement('p');
      warn.className = 'finances-form__error';
      warn.textContent = 'É necessário ter pelo menos 1 conta (tab Contas).';
      grid.appendChild(warn);
    } else {
      const opts = accounts.map(a => ({ value: a.id, label: a.name || '(sem nome)' }));
      grid.appendChild(field('Conta *', 'select-dynamic', 'accountId', trx ? trx.accountId : (accounts[0] ? accounts[0].id : ''), {
        options: opts, required: true
      }));
    }

    grid.appendChild(field('Tipo *', 'select', 'type', trx ? trx.type : 'expense', {
      options: ['income','expense','transfer'],
      labels: { income: 'Receita', expense: 'Despesa', transfer: 'Transferência' }
    }));
    grid.appendChild(field('Valor *', 'input', 'amount', trx ? trx.amount : 0, { type: 'number', required: true }));
    grid.appendChild(field('Data *', 'input', 'date', trx ? trx.date : new Date().toISOString().split('T')[0], { type: 'date', required: true }));
    grid.appendChild(field('Categoria', 'select', 'category', trx ? trx.category : 'finance', {
      options: ['personal','work','study','health','finance','home','lumiere','leisure','other','income','food','transport','utilities','shopping','subscription','savings','investment','debt','insurance','family'],
      translate: 'category'
    }));
    grid.appendChild(field('Payee', 'input', 'payee', trx ? trx.payee : '', { type: 'text' }));
    grid.appendChild(field('Etiquetas (separadas por vírgula)', 'input', 'tagsRaw', trx && Array.isArray(trx.tags) ? trx.tags.join(', ') : '', { full: true, type: 'text' }));
    grid.appendChild(field('Descrição', 'input', 'description', trx ? trx.description : '', { full: true, type: 'text' }));
    grid.appendChild(field('Notas', 'textarea', 'notes', trx ? trx.notes : '', { full: true }));
  } else {
    const acc = isEdit ? _state.data.accounts.find(a => a.id === _state.editingId) : null;
    title.textContent = isEdit ? 'Editar conta' : 'Nova conta';
    grid.appendChild(field('Nome *', 'input', 'name', acc ? acc.name : '', { type: 'text', required: true }));
    grid.appendChild(field('Tipo *', 'select', 'type', acc ? acc.type : 'checking', {
      options: ['checking','savings','credit','investment','cash'],
      labels: { checking: 'Corrente', savings: 'Poupança', credit: 'Crédito', investment: 'Investimento', cash: 'Dinheiro' }
    }));
    grid.appendChild(field('Saldo inicial *', 'input', 'balance', acc ? acc.balance : 0, { type: 'number', required: true }));
    grid.appendChild(field('Moeda *', 'select', 'currency', acc ? acc.currency : 'MZN', {
      options: ['MZN','USD'],
      labels: { MZN: 'Mts (Meticais)', USD: '$ (Dólar)' }
    }));
    grid.appendChild(field('Instituição', 'input', 'institution', acc ? acc.institution : '', { type: 'text' }));
    grid.appendChild(field('Cor', 'input', 'color', acc ? acc.color : '', { type: 'color' }));
    grid.appendChild(field('Descrição', 'textarea', 'description', acc ? acc.description : '', { full: true }));
  }

  form.appendChild(grid);

  const error = document.createElement('p');
  error.className = 'finances-form__error';
  error.hidden = true;
  form.appendChild(error);

  const actions = document.createElement('div');
  actions.className = 'finances-form__actions';

  const btnCancel = document.createElement('button');
  btnCancel.type = 'button';
  btnCancel.className = 'finances-btn';
  btnCancel.textContent = 'Cancelar';
  btnCancel.addEventListener('click', () => closeForm());
  actions.appendChild(btnCancel);

  const btnSave = document.createElement('button');
  btnSave.type = 'submit';
  btnSave.className = 'finances-btn finances-btn--primary';
  btnSave.textContent = isEdit ? 'Guardar' : 'Criar';
  actions.appendChild(btnSave);

  form.appendChild(actions);
  return form;
}

function field(labelText, tag, name, value, opts = {}) {
  const wrap = document.createElement('div');
  wrap.className = 'finances-form__field' + (opts.full ? ' finances-form__field--full' : '');

  const label = document.createElement('label');
  label.setAttribute('for', 'fin-' + name);
  label.textContent = labelText;
  wrap.appendChild(label);

  let input;
  if (tag === 'textarea') {
    input = document.createElement('textarea');
    input.rows = 2;
    input.value = value || '';
  } else if (tag === 'select') {
    input = document.createElement('select');
    for (const opt of (opts.options || [])) {
      const o = document.createElement('option');
      o.value = opt;
      o.textContent = (opts.labels && opts.labels[opt]) || (opts.translate ? t(opts.translate, opt) : opt);
      if (opt === value) o.selected = true;
      input.appendChild(o);
    }
  } else if (tag === 'select-dynamic') {
    input = document.createElement('select');
    for (const opt of (opts.options || [])) {
      const o = document.createElement('option');
      o.value = opt.value;
      o.textContent = opt.label;
      if (opt.value === value) o.selected = true;
      input.appendChild(o);
    }
  } else {
    input = document.createElement('input');
    input.type = opts.type || 'text';
    input.value = value === undefined || value === null ? '' : value;
  }
  input.id = 'fin-' + name;
  input.name = name;
  if (opts.required) input.required = true;

  wrap.appendChild(input);
  return wrap;
}

/* __FIN_ACCOUNTS_ACTIONS__ */
async function handleSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const formData = new FormData(form);
  const data = Object.fromEntries(formData.entries());

  for (const k of Object.keys(data)) {
    if (typeof data[k] === 'string') data[k] = data[k].trim();
  }

  const tab = _state.activeTab;
  let collection, kind;

  if (tab === 'budgets') {
    collection = 'budgets';
    kind = 'orçamento';
    if (!data.name) { updateFormError('O nome é obrigatório.'); return; }
    if (!data.category) { updateFormError('A categoria é obrigatória.'); return; }
    if (data.amount === undefined || data.amount === '') { updateFormError('O valor é obrigatório.'); return; }
    data.amount = Number(data.amount);
    if (Number.isNaN(data.amount) || data.amount < 0) { updateFormError('O valor deve ser um número positivo.'); return; }
    if (data.spent !== undefined && data.spent !== '') {
      data.spent = Number(data.spent);
      if (Number.isNaN(data.spent)) { updateFormError('O gasto deve ser um número.'); return; }
    } else {
      data.spent = 0;
    }
    if (!data.period) { updateFormError('O período é obrigatório.'); return; }
  } else if (tab === 'transactions') {
    collection = 'financeTransactions';
    kind = 'transação';
    if (!data.accountId) { updateFormError('Escolha uma conta.'); return; }
    if (!data.type) { updateFormError('O tipo é obrigatório.'); return; }
    if (data.amount === undefined || data.amount === '') { updateFormError('O valor é obrigatório.'); return; }
    data.amount = Number(data.amount);
    if (Number.isNaN(data.amount) || data.amount < 0) { updateFormError('O valor deve ser um número positivo.'); return; }
    if (!data.date) { updateFormError('A data é obrigatória.'); return; }
    if (data.tagsRaw !== undefined) {
      const raw = data.tagsRaw || '';
      data.tags = raw ? raw.split(',').map(s => s.trim()).filter(Boolean) : [];
      delete data.tagsRaw;
    }
  } else {
    collection = 'financeAccounts';
    kind = 'conta';
    if (!data.name) { updateFormError('O nome é obrigatório.'); return; }
    if (!data.type) { updateFormError('O tipo é obrigatório.'); return; }
    if (data.balance === undefined || data.balance === '') { updateFormError('O saldo é obrigatório.'); return; }
    data.balance = Number(data.balance);
    if (Number.isNaN(data.balance)) { updateFormError('O saldo deve ser um número.'); return; }
  }

  const btn = form.querySelector('button[type="submit"]');
  if (btn) btn.disabled = true;

  try {
    if (_state.editingId) {
      await dataManager.update(collection, _state.editingId, data);
      console.log('[Finances] ' + kind + ' atualizada:', _state.editingId);
    } else {
      const created = await dataManager.create(collection, data);
      console.log('[Finances] ' + kind + ' criada:', created.id);
    }
    _state.showForm = false;
    _state.editingId = null;
  } catch (err) {
    console.error('[Finances] Erro ao guardar ' + kind + ':', err);
    updateFormError(err.message || 'Erro ao guardar.');
    if (btn) btn.disabled = false;
  }
}

async function handleDeleteAccount(acc) {
  const name = acc.name || '(sem nome)';
  if (!confirm('Apagar a conta "' + name + '"?')) return;
  try {
    await dataManager.delete('financeAccounts', acc.id);
    console.log('[Finances] Conta apagada:', acc.id);
  } catch (err) {
    console.error('[Finances] Erro ao apagar conta:', err);
  }
}

/* __FIN_TRANSACTIONS_ACTIONS__ */
async function handleDeleteTransaction(trx) {
  const name = trx.description || trx.payee || '(sem descrição)';
  if (!confirm('Apagar a transação "' + name + '"?')) return;
  try {
    await dataManager.delete('financeTransactions', trx.id);
    console.log('[Finances] Transação apagada:', trx.id);
  } catch (err) {
    console.error('[Finances] Erro ao apagar transação:', err);
  }
}

/* __FIN_BUDGETS_ACTIONS__ */
async function handleDeleteBudget(b) {
  const name = b.name || '(sem nome)';
  if (!confirm('Apagar o orçamento "' + name + '"?')) return;
  try {
    await dataManager.delete('budgets', b.id);
    console.log('[Finances] Orçamento apagado:', b.id);
  } catch (err) {
    console.error('[Finances] Erro ao apagar orçamento:', err);
  }
}

export const financesPage = { init: initFinances };
export default financesPage;
