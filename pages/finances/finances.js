/**
 * Finances Page
 *
 * 3 sub-entidades: Accounts (contas), Transactions (transações), Budgets (orçamentos).
 * Sistema de tabs.
 */
import { dataManager } from '../../core/dataManager.js';
import { eventBus } from '../../core/eventBus.js';
import { t, formatMoney } from '../../js/i18n.js';
import { createProgress } from '../../components/progress/progress.js';

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
  el.className = 'finances-item';
  el.textContent = '(placeholder)';
  return el;
}

function renderBudgetItem(b) {
  const el = document.createElement('article');
  el.className = 'finances-item';
  const cor = b.color || '#d4af37';
  el.style.borderTop = '0.5px solid ' + cor;
  el.style.borderRight = '0.5px solid ' + cor;
  el.style.borderBottom = '0.5px solid ' + cor;
  el.style.borderLeft = '4px solid ' + cor;

  const header = document.createElement('div');
  header.className = 'finances-item__header';

  const name = document.createElement('h3');
  name.className = 'finances-item__name';
  name.textContent = b.name || '(sem nome)';
  header.appendChild(name);

  const amount = document.createElement('span');
  amount.className = 'finances-item__amount finances-item__amount--neutral';
  amount.textContent = formatMoney(b.spent || 0, 'MZN') + ' / ' + formatMoney(b.amount || 0, 'MZN');
  header.appendChild(amount);

  el.appendChild(header);

  const meta = document.createElement('div');
  meta.className = 'finances-item__meta';
  if (b.category) meta.appendChild(metaTag(t('category', b.category)));
  meta.appendChild(metaTag(periodLabel(b.period)));
  el.appendChild(meta);

  // Barra de progresso
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
    value: pct,
    label: 'Utilizado',
    variant: variant,
    showPercent: variant === 'default',
    size: 'md'
  });
  progressWrap.appendChild(bar);
  el.appendChild(progressWrap);

  if (b.notes) {
    const desc = document.createElement('p');
    desc.className = 'finances-item__description';
    desc.textContent = b.notes;
    el.appendChild(desc);
  }

  const actions = document.createElement('div');
  actions.className = 'finances-item__actions';

  const btnEdit = document.createElement('button');
  btnEdit.type = 'button';
  btnEdit.textContent = '✎';
  btnEdit.title = 'Editar';
  btnEdit.setAttribute('aria-label', 'Editar');
  btnEdit.addEventListener('click', () => openForm(b.id));
  actions.appendChild(btnEdit);

  const btnDelete = document.createElement('button');
  btnDelete.type = 'button';
  btnDelete.textContent = '✕';
  btnDelete.title = 'Apagar';
  btnDelete.setAttribute('aria-label', 'Apagar');
  btnDelete.addEventListener('click', () => handleDeleteBudget(b));
  actions.appendChild(btnDelete);

  el.appendChild(actions);
  return el;
}

function periodLabel(period) {
  const map = { weekly: 'Semanal', monthly: 'Mensal', yearly: 'Anual' };
  return map[period] || period || '—';
}

function renderTransactionItem(trx) {
  const el = document.createElement('article');
  el.className = 'finances-item';
  if (trx.type === 'income') el.classList.add('finances-item--income');
  if (trx.type === 'expense') el.classList.add('finances-item--expense');
  if (trx.type === 'transfer') el.classList.add('finances-item--transfer');

  const header = document.createElement('div');
  header.className = 'finances-item__header';

  // Descrição ou Payee como título
  const name = document.createElement('h3');
  name.className = 'finances-item__name';
  name.textContent = trx.description || trx.payee || '(sem descrição)';
  header.appendChild(name);

  // Valor com sinal
  const amount = document.createElement('span');
  amount.className = 'finances-item__amount';
  if (trx.type === 'income') amount.classList.add('finances-item__amount--income');
  else if (trx.type === 'expense') amount.classList.add('finances-item__amount--expense');
  else amount.classList.add('finances-item__amount--neutral');

  const acc = _state.data.accounts.find(a => a.id === trx.accountId);
  const currency = acc ? acc.currency : 'MZN';
  const sign = trx.type === 'expense' ? '− ' : (trx.type === 'income' ? '+ ' : '⇄ ');
  amount.textContent = sign + formatMoney(trx.amount || 0, currency);
  header.appendChild(amount);

  el.appendChild(header);

  const meta = document.createElement('div');
  meta.className = 'finances-item__meta';
  if (acc) meta.appendChild(metaTag(acc.name || '(conta)'));
  meta.appendChild(metaTag(trx.date || '—'));
  if (trx.category) meta.appendChild(metaTag(t('category', trx.category)));
  if (Array.isArray(trx.tags)) {
    for (const tg of trx.tags) meta.appendChild(metaTag(tg));
  }
  el.appendChild(meta);

  const actions = document.createElement('div');
  actions.className = 'finances-item__actions';

  const btnEdit = document.createElement('button');
  btnEdit.type = 'button';
  btnEdit.textContent = '✎';
  btnEdit.title = 'Editar';
  btnEdit.setAttribute('aria-label', 'Editar');
  btnEdit.addEventListener('click', () => openForm(trx.id));
  actions.appendChild(btnEdit);

  const btnDelete = document.createElement('button');
  btnDelete.type = 'button';
  btnDelete.textContent = '✕';
  btnDelete.title = 'Apagar';
  btnDelete.setAttribute('aria-label', 'Apagar');
  btnDelete.addEventListener('click', () => handleDeleteTransaction(trx));
  actions.appendChild(btnDelete);

  el.appendChild(actions);
  return el;
}

function renderAccountItem(acc) {
  const el = document.createElement('article');
  el.className = 'finances-item';
  const cor = acc.color || '#d4af37';
  el.style.borderTop = '0.5px solid ' + cor;
  el.style.borderRight = '0.5px solid ' + cor;
  el.style.borderBottom = '0.5px solid ' + cor;
  el.style.borderLeft = '4px solid ' + cor;

  const header = document.createElement('div');
  header.className = 'finances-item__header';

  const name = document.createElement('h3');
  name.className = 'finances-item__name';
  name.textContent = acc.name || '(sem nome)';
  header.appendChild(name);

  const amount = document.createElement('span');
  amount.className = 'finances-item__amount finances-item__amount--neutral';
  amount.textContent = formatMoney(acc.balance || 0, acc.currency);
  header.appendChild(amount);

  el.appendChild(header);

  const meta = document.createElement('div');
  meta.className = 'finances-item__meta';
  meta.appendChild(metaTag(typeLabel(acc.type)));
  if (acc.institution) meta.appendChild(metaTag(acc.institution));
  el.appendChild(meta);

  if (acc.description) {
    const desc = document.createElement('p');
    desc.className = 'finances-item__description';
    desc.textContent = acc.description;
    el.appendChild(desc);
  }

  const actions = document.createElement('div');
  actions.className = 'finances-item__actions';

  const btnEdit = document.createElement('button');
  btnEdit.type = 'button';
  btnEdit.textContent = '✎';
  btnEdit.title = 'Editar';
  btnEdit.setAttribute('aria-label', 'Editar');
  btnEdit.addEventListener('click', () => openForm(acc.id));
  actions.appendChild(btnEdit);

  const btnDelete = document.createElement('button');
  btnDelete.type = 'button';
  btnDelete.textContent = '✕';
  btnDelete.title = 'Apagar';
  btnDelete.setAttribute('aria-label', 'Apagar');
  btnDelete.addEventListener('click', () => handleDeleteAccount(acc));
  actions.appendChild(btnDelete);

  el.appendChild(actions);
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
