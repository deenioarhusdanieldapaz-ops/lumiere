/**
 * Lumière Page
 *
 * 4 sub-entidades interligadas: Businesses, Products, Customers, Sales.
 * Sistema de tabs: cada tab mostra a lista da sua coleção.
 */
import { dataManager } from '../../core/dataManager.js';
import { eventBus } from '../../core/eventBus.js';
import { t, formatMoney } from '../../js/i18n.js';

let _container = null;

const TABS = [
  { id: 'businesses', label: 'Negócios', collection: 'lumiereBusinesses' },
  { id: 'products',   label: 'Produtos', collection: 'lumiereProducts' },
  { id: 'customers',  label: 'Clientes', collection: 'lumiereCustomers' },
  { id: 'sales',      label: 'Vendas',   collection: 'lumiereSales' }
];

let _state = {
  activeTab: 'businesses',
  data: { businesses: [], products: [], customers: [], sales: [] },
  loading: false,
  error: null,
  showForm: false,
  editingId: null
};

let _unsubscribe = null;

export function initLumiere(container) {
  if (!container) {
    console.warn('[Lumière] container inválido.');
    return;
  }
  _container = container;

  if (_unsubscribe) _unsubscribe();
  _unsubscribe = eventBus.on('data:changed', (payload) => {
    if (!payload) return;
    if (['lumiereBusinesses','lumiereProducts','lumiereCustomers','lumiereSales'].includes(payload.collection)) {
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
    const [businesses, products, customers, sales] = await Promise.all([
      dataManager.list('lumiereBusinesses'),
      dataManager.list('lumiereProducts'),
      dataManager.list('lumiereCustomers'),
      dataManager.list('lumiereSales')
    ]);
    _state.data = {
      businesses: Array.isArray(businesses) ? businesses : [],
      products:   Array.isArray(products)   ? products   : [],
      customers:  Array.isArray(customers)  ? customers  : [],
      sales:      Array.isArray(sales)      ? sales      : []
    };
  } catch (err) {
    console.error('[Lumière] Erro ao carregar:', err);
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
  page.className = 'lumiere-page';

  page.appendChild(renderHeader());
  page.appendChild(renderTabs());

  if (_state.showForm && ['businesses','customers','products','sales'].includes(_state.activeTab)) {
    page.appendChild(renderForm());
  }

  page.appendChild(renderPanel());

  _container.appendChild(page);
}

function renderHeader() {
  const header = document.createElement('header');
  header.className = 'lumiere-header';

  const title = document.createElement('h2');
  title.className = 'lumiere-header__title';
  title.textContent = 'Lumière';
  header.appendChild(title);

  const actions = document.createElement('div');
  actions.className = 'lumiere-header__actions';

  const btnNew = document.createElement('button');
  btnNew.type = 'button';
  btnNew.className = 'lumiere-btn lumiere-btn--primary';

  const labels = {
    businesses: 'Novo negócio',
    products:   'Novo produto',
    customers:  'Novo cliente',
    sales:      'Nova venda'
  };
  btnNew.textContent = labels[_state.activeTab] || 'Novo';

  if (['businesses','customers','products','sales'].includes(_state.activeTab)) {
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
  nav.className = 'lumiere-tabs';
  nav.setAttribute('role', 'tablist');

  for (const tab of TABS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'lumiere-tab' + (tab.id === _state.activeTab ? ' is-active' : '');
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
  render();
}

function renderPanel() {
  const panel = document.createElement('div');
  panel.className = 'lumiere-panel';
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
  list.className = 'lumiere-list';
  for (const item of items) {
    list.appendChild(renderItem(item, _state.activeTab));
  }
  panel.appendChild(list);
  return panel;
}

function renderItem(item, tabId) {
  const el = document.createElement('article');
  el.className = 'lumiere-item';

  const header = document.createElement('div');
  header.className = 'lumiere-item__header';

  const name = document.createElement('h3');
  name.className = 'lumiere-item__name';

  if (tabId === 'sales') {
    // Para vendas, mostrar o nome do produto (via productId) ou fallback
    const prod = _state.data.products.find(p => p.id === item.productId);
    const prodName = prod ? (prod.name || 'produto') : 'produto';
    const qty = item.quantity || 1;
    name.textContent = qty + '× ' + prodName;
  } else {
    name.textContent = item.name || '(sem nome)';
  }
  header.appendChild(name);

  if (['businesses','customers','products','sales'].includes(tabId)) {
    const actions = document.createElement('div');
    actions.className = 'lumiere-item__actions';

    const btnEdit = document.createElement('button');
    btnEdit.type = 'button';
    btnEdit.textContent = '✎';
    btnEdit.title = 'Editar';
    btnEdit.setAttribute('aria-label', 'Editar');
    btnEdit.addEventListener('click', () => openForm(item.id));
    actions.appendChild(btnEdit);

    const btnDelete = document.createElement('button');
    btnDelete.type = 'button';
    btnDelete.textContent = '✕';
    btnDelete.title = 'Apagar';
    btnDelete.setAttribute('aria-label', 'Apagar');
    btnDelete.addEventListener('click', () => handleDelete(item));
    actions.appendChild(btnDelete);

    header.appendChild(actions);
  }

  el.appendChild(header);

  const meta = document.createElement('div');
  meta.className = 'lumiere-item__meta';

  if (tabId === 'businesses' && item.status) meta.appendChild(metaTag(t('businessStatus', item.status)));
  if (tabId === 'products' && item.price !== undefined) meta.appendChild(metaTag(formatMoney(item.price, item.currency)));
  if (tabId === 'products' && item.stock !== undefined) meta.appendChild(metaTag('Stock: ' + item.stock));
  if (tabId === 'customers' && item.email) meta.appendChild(metaTag(item.email));
  if (tabId === 'sales' && item.total !== undefined) meta.appendChild(metaTag(formatMoney(item.total, item.currency)));
  if (tabId === 'sales' && item.status) {
    const statusLabels = { pending: 'Pendente', paid: 'Pago', cancelled: 'Cancelado' };
    meta.appendChild(metaTag(statusLabels[item.status] || item.status));
  }

  if (meta.children.length > 0) el.appendChild(meta);

  if (item.description) {
    const desc = document.createElement('p');
    desc.className = 'lumiere-item__description';
    desc.textContent = item.description;
    el.appendChild(desc);
  }

  return el;
}

function metaTag(text) {
  const span = document.createElement('span');
  span.className = 'lumiere-item__tag';
  span.textContent = text;
  return span;
}

function renderState(message, isError = false) {
  const div = document.createElement('div');
  div.className = 'lumiere-state' + (isError ? ' lumiere-state--error' : '');
  div.textContent = message;
  return div;
}

/* __LUMIERE_BUSINESSES_FORM__ */
function openForm(businessId = null) {
  _state.editingId = businessId;
  _state.showForm = true;
  render();
}

function closeForm() {
  _state.editingId = null;
  _state.showForm = false;
  render();
}

function updateFormError(message) {
  const el = _container ? _container.querySelector('.lumiere-form__error') : null;
  if (el) {
    el.textContent = message || '';
    el.hidden = !message;
  }
}

function renderForm() {
  const isEdit = Boolean(_state.editingId);
  const tab = _state.activeTab;

  const form = document.createElement('form');
  form.className = 'lumiere-form';
  form.noValidate = true;
  form.addEventListener('submit', handleSubmit);

  const title = document.createElement('h3');
  title.className = 'lumiere-form__title';
  form.appendChild(title);

  const grid = document.createElement('div');
  grid.className = 'lumiere-form__grid';

  if (tab === 'sales') {
    const s = isEdit ? _state.data.sales.find(x => x.id === _state.editingId) : null;
    title.textContent = isEdit ? 'Editar venda' : 'Nova venda';

    const products = _state.data.products;
    const customers = _state.data.customers;

    if ((products.length === 0 || customers.length === 0) && !isEdit) {
      const warn = document.createElement('p');
      warn.className = 'lumiere-form__error';
      warn.textContent = 'É necessário ter pelo menos 1 produto (tab Produtos) e 1 cliente (tab Clientes).';
      grid.appendChild(warn);
    } else {
      const productOpts = products.map(p => ({ value: p.id, label: (p.name || 'sem nome') + (p.price ? ' — ' + p.price + ' €' : '') }));
      const customerOpts = customers.map(c => ({ value: c.id, label: c.name || 'sem nome' }));

      grid.appendChild(field('Produto *', 'select-dynamic', 'productId', s ? s.productId : (products[0] ? products[0].id : ''), {
        options: productOpts, required: true
      }));
      grid.appendChild(field('Cliente *', 'select-dynamic', 'customerId', s ? s.customerId : (customers[0] ? customers[0].id : ''), {
        options: customerOpts, required: true
      }));
    }

    grid.appendChild(field('Quantidade *', 'input', 'quantity', s ? s.quantity : 1, { type: 'number', required: true }));
    grid.appendChild(field('Preço unitário *', 'input', 'unitPrice', s ? s.unitPrice : 0, { type: 'number', required: true }));
    grid.appendChild(field('Moeda *', 'select', 'currency', s ? s.currency : 'MZN', {
      options: ['MZN','USD'],
      labels: { MZN: 'Mts (Meticais)', USD: '$ (Dolar)' }
    }));
    grid.appendChild(field('Total *', 'input', 'total', s ? s.total : 0, { type: 'number', required: true }));
    grid.appendChild(field('Data *', 'input', 'date', s ? s.date : new Date().toISOString().split('T')[0], { type: 'date', required: true }));
    grid.appendChild(field('Estado *', 'select', 'status', s ? s.status : 'pending', {
      options: ['pending','paid','cancelled'],
      labels: { pending: 'Pendente', paid: 'Pago', cancelled: 'Cancelado' }
    }));
    grid.appendChild(field('Notas', 'textarea', 'notes', s ? s.notes : '', { full: true }));

    // Cálculo automático do total
    form.addEventListener('input', () => {
      const q = Number(form.querySelector('#lum-quantity')?.value || 0);
      const p = Number(form.querySelector('#lum-unitPrice')?.value || 0);
      const tEl = form.querySelector('#lum-total');
      if (tEl && q > 0 && p >= 0) {
        tEl.value = (q * p).toFixed(2);
      }
    });
  } else if (tab === 'products') {
    const p = isEdit ? _state.data.products.find(x => x.id === _state.editingId) : null;
    title.textContent = isEdit ? 'Editar produto' : 'Novo produto';

    // Select dinâmico de negócios
    const businesses = _state.data.businesses;
    if (businesses.length === 0 && !isEdit) {
      const warn = document.createElement('p');
      warn.className = 'lumiere-form__error';
      warn.textContent = 'É necessário criar um negócio primeiro (tab "Negócios").';
      grid.appendChild(warn);
    } else {
      const options = businesses.map(b => ({ value: b.id, label: b.name || '(sem nome)' }));
      grid.appendChild(field('Negócio *', 'select-dynamic', 'businessId', p ? p.businessId : (businesses[0] ? businesses[0].id : ''), {
        options: options,
        required: true
      }));
    }

    grid.appendChild(field('Nome *', 'input', 'name', p ? p.name : '', { type: 'text', required: true }));
    grid.appendChild(field('Descrição', 'textarea', 'description', p ? p.description : '', { full: true }));
    grid.appendChild(field('Categoria *', 'select', 'category', p ? p.category : 'lumiere', {
      options: ['personal','work','study','health','finance','home','lumiere','leisure','other'],
      labels: {
        personal: 'Pessoal', work: 'Trabalho', study: 'Estudo', health: 'Saúde',
        finance: 'Finanças', home: 'Casa', lumiere: 'Lumière', leisure: 'Lazer', other: 'Outro'
      }
    }));
    grid.appendChild(field('Preço *', 'input', 'price', p ? p.price : 0, { type: 'number', required: true }));
    grid.appendChild(field('Moeda *', 'select', 'currency', p ? p.currency : 'MZN', {
      options: ['MZN','USD'],
      labels: { MZN: 'Mts (Meticais)', USD: '$ (Dolar)' }
    }));
    grid.appendChild(field('Custo', 'input', 'cost', p ? p.cost : 0, { type: 'number' }));
    grid.appendChild(field('Stock', 'input', 'stock', p ? p.stock : 0, { type: 'number' }));
    grid.appendChild(field('SKU', 'input', 'sku', p ? p.sku : '', { type: 'text' }));
    grid.appendChild(field('Notas', 'textarea', 'notes', p ? p.notes : '', { full: true }));
  } else if (tab === 'customers') {
    const c = isEdit ? _state.data.customers.find(x => x.id === _state.editingId) : null;
    title.textContent = isEdit ? 'Editar cliente' : 'Novo cliente';
    grid.appendChild(field('Nome *', 'input', 'name', c ? c.name : '', { type: 'text', required: true }));
    grid.appendChild(field('Email', 'input', 'email', c ? c.email : '', { type: 'email' }));
    grid.appendChild(field('Telefone', 'input', 'phone', c ? c.phone : '', { type: 'tel' }));
    grid.appendChild(field('Morada', 'input', 'address', c ? c.address : '', { full: true, type: 'text' }));
    grid.appendChild(field('Notas', 'textarea', 'notes', c ? c.notes : '', { full: true }));
  } else {
    const business = isEdit
      ? _state.data.businesses.find(b => b.id === _state.editingId)
      : null;
    title.textContent = isEdit ? 'Editar negócio' : 'Novo negócio';
    grid.appendChild(field('Nome *', 'input', 'name', business ? business.name : '', { type: 'text', required: true }));
    grid.appendChild(field('Descrição', 'textarea', 'description', business ? business.description : '', { full: true }));
    grid.appendChild(field('Estado *', 'select', 'status', business ? business.status : 'active', {
      options: ['active','inactive','archived'],
      labels: { active: 'Ativo', inactive: 'Inativo', archived: 'Arquivado' }
    }));
    grid.appendChild(field('Meta mensal de vendas', 'input', 'monthlyGoal', business ? (business.monthlyGoal ?? 10) : 10, { type: 'number' }));
    grid.appendChild(field('Contacto', 'input', 'contact', business ? business.contact : '', { type: 'text' }));
    grid.appendChild(field('Email', 'input', 'email', business ? business.email : '', { type: 'email' }));
    grid.appendChild(field('Telefone', 'input', 'phone', business ? business.phone : '', { type: 'tel' }));
    grid.appendChild(field('Website', 'input', 'website', business ? business.website : '', { type: 'url' }));
    grid.appendChild(field('Notas', 'textarea', 'notes', business ? business.notes : '', { full: true }));
  }

  form.appendChild(grid);

  const error = document.createElement('p');
  error.className = 'lumiere-form__error';
  error.hidden = true;
  form.appendChild(error);

  const actions = document.createElement('div');
  actions.className = 'lumiere-form__actions';

  const btnCancel = document.createElement('button');
  btnCancel.type = 'button';
  btnCancel.className = 'lumiere-btn';
  btnCancel.textContent = 'Cancelar';
  btnCancel.addEventListener('click', () => closeForm());
  actions.appendChild(btnCancel);

  const btnSave = document.createElement('button');
  btnSave.type = 'submit';
  btnSave.className = 'lumiere-btn lumiere-btn--primary';
  btnSave.textContent = isEdit ? 'Guardar' : 'Criar';
  actions.appendChild(btnSave);

  form.appendChild(actions);
  return form;
}

function field(labelText, tag, name, value, opts = {}) {
  const wrap = document.createElement('div');
  wrap.className = 'lumiere-form__field' + (opts.full ? ' lumiere-form__field--full' : '');

  const label = document.createElement('label');
  label.setAttribute('for', 'lum-' + name);
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
      o.textContent = (opts.labels && opts.labels[opt]) || opt;
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
  input.id = 'lum-' + name;
  input.name = name;
  if (opts.required) input.required = true;

  wrap.appendChild(input);
  return wrap;
}

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

  // Validação do nome: só para businesses, products e customers (não para sales)
  if (tab !== 'sales' && !data.name) {
    updateFormError('O nome é obrigatório.');
    return;
  }

  if (tab === 'sales') {
    collection = 'lumiereSales';
    kind = 'venda';
    if (!data.productId) { updateFormError('Escolha um produto.'); return; }
    if (!data.customerId) { updateFormError('Escolha um cliente.'); return; }
    if (!data.quantity || Number(data.quantity) < 1) { updateFormError('Quantidade inválida.'); return; }
    if (data.unitPrice === undefined || data.unitPrice === '') { updateFormError('O preço unitário é obrigatório.'); return; }
    data.quantity = Number(data.quantity);
    data.unitPrice = Number(data.unitPrice);
    data.total = Number(data.total) || (data.quantity * data.unitPrice);
    if (!data.date) { updateFormError('A data é obrigatória.'); return; }
    if (!data.status) { updateFormError('O estado é obrigatório.'); return; }
  } else if (tab === 'products') {
    collection = 'lumiereProducts';
    kind = 'produto';
    if (!data.businessId) { updateFormError('Escolha um negócio.'); return; }
    if (!data.category) { updateFormError('A categoria é obrigatória.'); return; }
    if (data.price === undefined || data.price === '') {
      updateFormError('O preço é obrigatório.');
      return;
    }
    data.price = Number(data.price);
    if (Number.isNaN(data.price) || data.price < 0) {
      updateFormError('O preço deve ser um número positivo.');
      return;
    }
    if (data.cost !== undefined && data.cost !== '') data.cost = Number(data.cost);
    if (data.stock !== undefined && data.stock !== '') data.stock = Number(data.stock);
  } else if (tab === 'customers') {
    collection = 'lumiereCustomers';
    kind = 'cliente';
  } else {
    collection = 'lumiereBusinesses';
    kind = 'negócio';
    if (!data.status) { updateFormError('O estado é obrigatório.'); return; }
    data.category = 'lumiere';
  }

  const btn = form.querySelector('button[type="submit"]');
  if (btn) btn.disabled = true;

  try {
    if (_state.editingId) {
      await dataManager.update(collection, _state.editingId, data);
      console.log('[Lumière] ' + kind + ' atualizado:', _state.editingId);
    } else {
      const created = await dataManager.create(collection, data);
      console.log('[Lumière] ' + kind + ' criado:', created.id);
    }
    _state.showForm = false;
    _state.editingId = null;
  } catch (err) {
    console.error('[Lumière] Erro ao guardar ' + kind + ':', err);
    updateFormError(err.message || 'Erro ao guardar.');
    if (btn) btn.disabled = false;
  }
}

async function handleDelete(item) {
  const name = item.name || '(sem nome)';
  const tab = _state.activeTab;
  let collection, kind;
  if (tab === 'sales') { collection = 'lumiereSales'; kind = 'venda'; }
  else if (tab === 'products') { collection = 'lumiereProducts'; kind = 'produto'; }
  else if (tab === 'customers') { collection = 'lumiereCustomers'; kind = 'cliente'; }
  else { collection = 'lumiereBusinesses'; kind = 'negócio'; }
  if (!confirm('Apagar o ' + kind + ' "' + name + '"?')) return;
  try {
    await dataManager.delete(collection, item.id);
    console.log('[Lumière] ' + kind + ' apagado:', item.id);
  } catch (err) {
    console.error('[Lumière] Erro ao apagar ' + kind + ':', err);
  }
}

export const lumierePage = { init: initLumiere };
export default lumierePage;
