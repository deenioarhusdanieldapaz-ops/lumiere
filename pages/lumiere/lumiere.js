/**
 * Lumière Page
 *
 * 4 sub-entidades interligadas: Businesses, Products, Customers, Sales.
 * Sistema de tabs: cada tab mostra a lista da sua coleção.
 */
import { dataManager } from '../../core/dataManager.js';
import { stateManager } from '../../core/stateManager.js';
import { requireAccess } from '../../core/auth.js';
import { eventBus } from '../../core/eventBus.js';
import { t, formatMoney } from '../../js/i18n.js';
import { getOnboardingRecommendation } from '../../core/intelligence/onboardingRecommendations.js';

// ============================================================
// Icones automaticos — 50 Products + 25 Customers
// ============================================================
const KEYWORD_EMOJI_PRODUCTS = [
  { kw: ['bolsa'], emoji: '\u{1F45C}' },
  { kw: ['camisola', 't-shirt', 'tshirt', 'hoodie', 'camisa'], emoji: '\u{1F455}' },
  { kw: ['caneca'], emoji: '\u{2615}' },
  { kw: ['poster'], emoji: '\u{1F5BC}\u{FE0F}' },
  { kw: ['colar'], emoji: '\u{1F4FF}' },
  { kw: ['brinco'], emoji: '\u{1F48E}' },
  { kw: ['pulseira'], emoji: '\u{231A}' },
  { kw: ['anel'], emoji: '\u{1F48D}' },
  { kw: ['relogio'], emoji: '\u{231A}' },
  { kw: ['oculos'], emoji: '\u{1F576}\u{FE0F}' },
  { kw: ['cinto'], emoji: '\u{1F94B}' },
  { kw: ['lenco'], emoji: '\u{1F9E3}' },
  { kw: ['bone'], emoji: '\u{1F9E2}' },
  { kw: ['sapato', 'tenis'], emoji: '\u{1F45F}' },
  { kw: ['carteira'], emoji: '\u{1F45B}' },
  { kw: ['perfume'], emoji: '\u{1F490}' },
  { kw: ['creme'], emoji: '\u{1F9F4}' },
  { kw: ['maquilhagem'], emoji: '\u{1F484}' },
  { kw: ['vela'], emoji: '\u{1F56F}\u{FE0F}' },
  { kw: ['almofada'], emoji: '\u{1F6CB}\u{FE0F}' },
  { kw: ['planta'], emoji: '\u{1FAB4}' },
  { kw: ['vaso'], emoji: '\u{1F3FA}' },
  { kw: ['sabonete'], emoji: '\u{1F9FC}' },
  { kw: ['espelho'], emoji: '\u{1FA9E}' },
  { kw: ['toalha'], emoji: '\u{1F9FB}' },
  { kw: ['caderno'], emoji: '\u{1F4D4}' },
  { kw: ['agenda'], emoji: '\u{1F4C5}' },
  { kw: ['caneta'], emoji: '\u{1F58A}\u{FE0F}' },
  { kw: ['livro'], emoji: '\u{1F4D5}' },
  { kw: ['marcador'], emoji: '\u{1F516}' },
  { kw: ['lapis'], emoji: '\u{270F}\u{FE0F}' },
  { kw: ['bolo'], emoji: '\u{1F382}' },
  { kw: ['doce'], emoji: '\u{1F36C}' },
  { kw: ['cafe'], emoji: '\u{2615}' },
  { kw: ['cha'], emoji: '\u{1F375}' },
  { kw: ['vinho'], emoji: '\u{1F377}' },
  { kw: ['sumo'], emoji: '\u{1F9C3}' },
  { kw: ['pao'], emoji: '\u{1F35E}' },
  { kw: ['comida'], emoji: '\u{1F37D}\u{FE0F}' },
  { kw: ['telemovel', 'telefone'], emoji: '\u{1F4F1}' },
  { kw: ['computador'], emoji: '\u{1F4BB}' },
  { kw: ['fone'], emoji: '\u{1F3A7}' },
  { kw: ['carregador'], emoji: '\u{1F50C}' },
  { kw: ['consultoria'], emoji: '\u{1F4BC}' },
  { kw: ['formacao'], emoji: '\u{1F393}' },
  { kw: ['design'], emoji: '\u{1F3A8}' },
  { kw: ['fotografia'], emoji: '\u{1F4F7}' },
  { kw: ['entrega'], emoji: '\u{1F4E6}' },
  { kw: ['chaveiro', 'porta-chave'], emoji: '\u{1F511}' },
  { kw: ['garrafa'], emoji: '\u{1F9F4}' }
];

const KEYWORD_EMOJI_CUSTOMERS = [
  { kw: ['vip'], emoji: '\u{2B50}' },
  { kw: ['premium'], emoji: '\u{1F48E}' },
  { kw: ['regular'], emoji: '\u{1F504}' },
  { kw: ['novo'], emoji: '\u{1F195}' },
  { kw: ['recorrente'], emoji: '\u{1F501}' },
  { kw: ['empresa'], emoji: '\u{1F3E2}' },
  { kw: ['particular'], emoji: '\u{1F464}' },
  { kw: ['atacado'], emoji: '\u{1F4E6}' },
  { kw: ['retalho'], emoji: '\u{1F3EA}' },
  { kw: ['revendedor'], emoji: '\u{1F91D}' },
  { kw: ['influencer'], emoji: '\u{1F4F8}' },
  { kw: ['parceiro'], emoji: '\u{1F91D}' },
  { kw: ['corporativo'], emoji: '\u{1F3DB}\u{FE0F}' },
  { kw: ['individual'], emoji: '\u{1F9D1}' },
  { kw: ['estudante'], emoji: '\u{1F393}' },
  { kw: ['profissional'], emoji: '\u{1F454}' },
  { kw: ['loja'], emoji: '\u{1F3EA}' },
  { kw: ['hotel'], emoji: '\u{1F3E8}' },
  { kw: ['restaurante'], emoji: '\u{1F37D}\u{FE0F}' },
  { kw: ['online'], emoji: '\u{1F310}' },
  { kw: ['presencial'], emoji: '\u{1F4CD}' },
  { kw: ['estrangeiro'], emoji: '\u{1F30D}' },
  { kw: ['local'], emoji: '\u{1F3E0}' },
  { kw: ['fiel'], emoji: '\u{2764}\u{FE0F}' },
  { kw: ['cliente'], emoji: '\u{1F464}' }
];

function normalizeText(str) {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function emojiForProduct(name, category) {
  const normalized = normalizeText(name);
  for (const item of KEYWORD_EMOJI_PRODUCTS) {
    if (item.kw.some((k) => normalized.includes(normalizeText(k)))) return item.emoji;
  }
  return '\u{1F4E6}';
}

const CATEGORY_EMOJI_BUSINESSES = {
  personal: '\u{1F4E6}', work: '\u{1F4BC}', study: '\u{1F4DA}',
  health: '\u{2764}\u{FE0F}', finance: '\u{1F4B0}', home: '\u{1F3E0}',
  lumiere: '\u{2728}', leisure: '\u{1F3AF}', other: '\u{1F4CC}'
};

const KEYWORD_EMOJI_BUSINESSES = [
  { kw: ['moda'], emoji: '\u{1F457}' },
  { kw: ['acessorios'], emoji: '\u{1F45B}' },
  { kw: ['joalharia', 'joias', 'joalheria'], emoji: '\u{1F48E}' },
  { kw: ['cosmetica', 'beleza'], emoji: '\u{1F484}' },
  { kw: ['alimentacao', 'comida'], emoji: '\u{1F37D}\u{FE0F}' },
  { kw: ['cafe', 'cafeteria'], emoji: '\u{2615}' },
  { kw: ['tecnologia', 'informatica', 'tech'], emoji: '\u{1F4BB}' },
  { kw: ['servico'], emoji: '\u{1F527}' },
  { kw: ['consultoria'], emoji: '\u{1F4BC}' },
  { kw: ['design'], emoji: '\u{1F3A8}' },
  { kw: ['marketing', 'publicidade'], emoji: '\u{1F4E3}' },
  { kw: ['arte', 'artesanato'], emoji: '\u{1F3AD}' },
  { kw: ['fotografia'], emoji: '\u{1F4F7}' },
  { kw: ['educacao', 'escola'], emoji: '\u{1F393}' },
  { kw: ['saude', 'clinica'], emoji: '\u{1F3E5}' },
  { kw: ['fitness', 'ginasio'], emoji: '\u{1F4AA}' },
  { kw: ['transporte', 'entrega'], emoji: '\u{1F69A}' },
  { kw: ['comercio', 'loja'], emoji: '\u{1F3EA}' },
  { kw: ['e-commerce', 'ecommerce', 'online'], emoji: '\u{1F6D2}' },
  { kw: ['producao', 'fabrica'], emoji: '\u{1F3ED}' },
  { kw: ['agricultura', 'agro'], emoji: '\u{1F33E}' },
  { kw: ['construcao', 'obras'], emoji: '\u{1F3D7}\u{FE0F}' },
  { kw: ['pets', 'animais'], emoji: '\u{1F43E}' },
  { kw: ['restaurante'], emoji: '\u{1F374}' },
  { kw: ['barbeiro', 'barbearia'], emoji: '\u{1F488}' }
];

function emojiForBusiness(name, category) {
  const normalized = normalizeText(name);
  for (const item of KEYWORD_EMOJI_BUSINESSES) {
    if (item.kw.some((k) => normalized.includes(normalizeText(k)))) return item.emoji;
  }
  return CATEGORY_EMOJI_BUSINESSES[category] || '\u{2728}';
}

function emojiForCustomer(name) {
  const normalized = normalizeText(name);
  for (const item of KEYWORD_EMOJI_CUSTOMERS) {
    if (item.kw.some((k) => normalized.includes(normalizeText(k)))) return item.emoji;
  }
  return '\u{1F464}';
}

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
    const [businesses, products, customers, sales, tasks, habits, goals, financeTransactions] = await Promise.all([
      dataManager.list('lumiereBusinesses'),
      dataManager.list('lumiereProducts'),
      dataManager.list('lumiereCustomers'),
      dataManager.list('lumiereSales'),
      dataManager.list('tasks').catch(() => []),
      dataManager.list('habits').catch(() => []),
      dataManager.list('goals').catch(() => []),
      dataManager.list('financeTransactions').catch(() => [])
    ]);
    _state.data = {
      businesses: Array.isArray(businesses) ? businesses : [],
      products:   Array.isArray(products)   ? products   : [],
      customers:  Array.isArray(customers)  ? customers  : [],
      sales:      Array.isArray(sales)      ? sales      : []
    };
    _state.recommendation = getOnboardingRecommendation({
      tasks, habits, goals, financeTransactions
    });
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

  // Cartão de Recomendação
  if (_state.recommendation) {
    const recCard = document.createElement('div');
    recCard.className = 'lum-card';
    recCard.style.cssText = 'margin-bottom: 16px; padding: 16px; border: 1px solid #D4AF37; border-radius: 12px; background: var(--color-surface); display: flex; flex-direction: column; gap: 8px;';

    const recTitle = document.createElement('h3');
    recTitle.style.cssText = 'font-family: "Playfair Display", serif; font-size: 1.1rem; color: var(--color-gold); margin: 0;';
    recTitle.textContent = _state.recommendation.title;

    const recText = document.createElement('p');
    recText.style.cssText = 'font-size: 0.85rem; color: #F5F0EB; margin: 0; line-height: 1.4;';
    recText.textContent = _state.recommendation.text;

    recCard.append(recTitle, recText);
    page.appendChild(recCard);
  }

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
  el.className = 'lum-card lum-card--lumiere lumiere-item';

  const header = document.createElement('div');
  header.className = 'lum-card__header lumiere-item__header';
  const headerLeft = document.createElement('div');
  headerLeft.className = 'lum-card__header-left lumiere-item__header-left';

  // Ícone (SVG ou Emoji se customizado)
  const icon = document.createElement('span');
  icon.className = 'lum-card__icon lumiere-item__icon';
  const svgIcon = '<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>';

  let emojiFallback = null;
  if (tabId === 'products') emojiFallback = emojiForProduct(item.name, item.category);
  else if (tabId === 'customers') emojiFallback = emojiForCustomer(item.name);
  else if (tabId === 'businesses') emojiFallback = emojiForBusiness(item.name, item.category);
  else if (tabId === 'sales') {
    const prod = _state.data.products.find(p => p.id === item.productId);
    emojiFallback = prod ? emojiForProduct(prod.name, prod.category) : '💵';
  }

  if (item.icon) {
    icon.textContent = item.icon;
  } else if (emojiFallback) {
    icon.textContent = emojiFallback;
  } else {
    icon.innerHTML = svgIcon;
  }
  icon.setAttribute('aria-hidden', 'true');
  headerLeft.appendChild(icon);

  const name = document.createElement('h3');
  name.className = 'lum-card__title lumiere-item__name';

  if (tabId === 'sales') {
    const prod = _state.data.products.find(p => p.id === item.productId);
    const prodName = prod ? (prod.name || 'produto') : 'produto';
    const qty = item.quantity || 1;
    name.textContent = qty + '× ' + prodName;
  } else {
    name.textContent = item.name || '(sem nome)';
  }
  headerLeft.appendChild(name);
  header.appendChild(headerLeft);

  if (['businesses','customers','products','sales'].includes(tabId)) {
    const actions = document.createElement('details');
    actions.className = 'lum-card__actions lumiere-item__actions';
    const summary = document.createElement('summary');
    summary.className = 'lumiere-item__menu-btn';
    summary.innerHTML = '⋮';
    summary.setAttribute('aria-label', 'Mais ações');
    actions.appendChild(summary);

    const menuDropdown = document.createElement('div');
    menuDropdown.className = 'lumiere-item__menu-dropdown';

    const btnEdit = document.createElement('button');
    btnEdit.type = 'button';
    btnEdit.innerHTML = '✎ Editar';
    btnEdit.addEventListener('click', (e) => { e.preventDefault(); actions.removeAttribute('open'); openForm(item.id); });
    menuDropdown.appendChild(btnEdit);

    const btnDelete = document.createElement('button');
    btnDelete.type = 'button';
    btnDelete.innerHTML = '✕ Apagar';
    btnDelete.addEventListener('click', (e) => { e.preventDefault(); actions.removeAttribute('open'); handleDelete(item); });
    menuDropdown.appendChild(btnDelete);

    actions.appendChild(menuDropdown);
    header.appendChild(actions);
  }

  el.appendChild(header);

  // Tags (Mantidas intactas)
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

  // Rodapé
  const footer = document.createElement('div');
  footer.className = 'lumiere-item__footer';

  let dateStr = 'Hoje';
  if (item.createdAt) {
    const d = new Date(item.createdAt);
    const timeStr = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
    dateStr = `Hoje, ${timeStr}`;
  }

  const dateSpan = document.createElement('span');
  dateSpan.className = 'lumiere-item__footer-info';
  const calIcon = '<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px; vertical-align:text-bottom;"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>';
  dateSpan.innerHTML = calIcon;
  dateSpan.appendChild(document.createTextNode(' ' + dateStr));
  footer.appendChild(dateSpan);

  const arrowIcon = document.createElement('span');
  arrowIcon.className = 'lumiere-item__arrow';
  arrowIcon.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>';
  footer.appendChild(arrowIcon);

  el.appendChild(footer);

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
  if (!requireAccess()) return;
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
