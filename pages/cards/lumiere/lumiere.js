/**
 * Card: Lumière (página completa)
 *
 * Mostra o desempenho do negócio Lumière do utilizador:
 *  - Vendas do mês vs meta mensal
 *  - Comparação com mês anterior
 *  - Receita, ticket médio, clientes, produtos
 *  - Vendas recentes
 *  - Produtos mais vendidos
 *
 * Fluxo: UI -> Core (DataManager) -> Storage -> EventBus
 */
import { dataManager } from '../../../core/dataManager.js';
import { eventBus } from '../../../core/eventBus.js';
import { ICONS } from '../../../js/icons.js';
import { formatMoney } from '../../../js/i18n.js';
import { createContextLine } from '../../../components/context-line/contextLine.js';

const RELEVANT_COLLECTIONS = [
  'lumiereBusinesses',
  'lumiereProducts',
  'lumiereCustomers',
  'lumiereSales'
];

let _unsubscribe = null;

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

function monthStart(ymd) {
  return ymd.slice(0, 8) + '01';
}

/**
 * Devolve o primeiro e último dia do mês anterior ao ymd dado.
 * @param {string} ymd — ex: '2026-09-20'
 * @returns {{ start: string, end: string }}
 */
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

/* ============================================================
   Cálculos
   ============================================================ */

/**
 * Vendas do mês actual.
 * @param {Array} sales
 * @returns {Array}
 */
function salesThisMonth(sales) {
  const today = todayYMD();
  const start = monthStart(today);
  return sales.filter(s => {
    const d = ymdOf(s.date);
    return d && d >= start && d <= today;
  });
}

/**
 * Vendas do mês anterior.
 * @param {Array} sales
 * @returns {Array}
 */
function salesPreviousMonth(sales) {
  const today = todayYMD();
  const { start, end } = previousMonthRange(today);
  return sales.filter(s => {
    const d = ymdOf(s.date);
    return d && d >= start && d <= end;
  });
}

/**
 * Calcula todos os números que o card precisa.
 * @param {Object} collections
 * @returns {Object}
 */
function calculateLumiereStats(collections) {
  const businesses = Array.isArray(collections.lumiereBusinesses) ? collections.lumiereBusinesses : [];
  const sales = Array.isArray(collections.lumiereSales) ? collections.lumiereSales : [];
  const products = Array.isArray(collections.lumiereProducts) ? collections.lumiereProducts : [];
  const customers = Array.isArray(collections.lumiereCustomers) ? collections.lumiereCustomers : [];

  const business = businesses[0] || null;
  const monthlyGoal = business && typeof business.monthlyGoal === 'number'
    ? business.monthlyGoal
    : 10;

  const thisMonth = salesThisMonth(sales);
  const prevMonth = salesPreviousMonth(sales);

  const thisCount = thisMonth.length;
  const prevCount = prevMonth.length;

  const goalPct = monthlyGoal > 0
    ? Math.round((thisCount / monthlyGoal) * 100)
    : 0;

  // Comparação: só faz sentido se houver mês anterior válido
  let comparison = null;
  if (prevCount > 0) {
    comparison = Math.round(((thisCount - prevCount) / prevCount) * 100);
  }

  // Receita do mês (só vendas pagas)
  const paidSales = thisMonth.filter(s => s.status === 'paid');
  const revenue = paidSales.reduce((sum, s) => sum + (Number(s.total) || 0), 0);
  const ticketMedio = paidSales.length > 0
    ? Math.round(revenue / paidSales.length)
    : 0;

  // Lucro: total − (cost × quantity) para cada venda paga
  const productMap = new Map(products.map(p => [p.id, p]));
  const totalProfit = paidSales.reduce((sum, sale) => {
    const product = productMap.get(sale.productId);
    const cost = product && typeof product.cost === 'number' ? product.cost : 0;
    const qty = Number(sale.quantity) || 0;
    const lineTotal = Number(sale.total) || 0;
    return sum + (lineTotal - cost * qty);
  }, 0);

  // Clientes e produtos únicos nas vendas do mês
  const uniqueCustomers = new Set(thisMonth.map(s => s.customerId).filter(Boolean));
  const uniqueProducts = new Set(thisMonth.map(s => s.productId).filter(Boolean));

  return {
    monthlyGoal,
    thisCount,
    prevCount,
    goalPct,
    comparison,
    revenue,
    totalProfit,
    activeCustomers: uniqueCustomers.size,
    productsSold: uniqueProducts.size,
    totalSales: sales.length,
    totalProducts: products.length,
    totalCustomers: customers.length
  };
}

/* ============================================================
   UI — Helpers
   ============================================================ */

function shortDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  return d.getDate() + ' ' + months[d.getMonth()];
}

function buildHeader() {
  const header = document.createElement('header');
  header.className = 'lumiere-card__header';

  const title = document.createElement('h1');
  title.className = 'lumiere-card__title';
  title.textContent = 'Lumière';
  header.appendChild(title);

  const sub = document.createElement('p');
  sub.className = 'lumiere-card__sub';
  sub.textContent = 'O teu negócio em números';
  header.appendChild(sub);

  return header;
}

/* ============================================================
   UI — Barra segmentada (10 segmentos)
   ============================================================ */

function buildSegmentedBar(pct) {
  const SEGMENTS = 10;
  const filled = Math.round((Math.max(0, Math.min(100, pct)) / 100) * SEGMENTS);

  const bar = document.createElement('div');
  bar.className = 'lumiere-card__seg-bar';
  bar.setAttribute('role', 'progressbar');
  bar.setAttribute('aria-valuenow', String(pct));
  bar.setAttribute('aria-valuemin', '0');
  bar.setAttribute('aria-valuemax', '100');

  for (let i = 0; i < SEGMENTS; i++) {
    const seg = document.createElement('span');
    seg.className = 'lumiere-card__seg';
    if (i < filled) seg.classList.add('is-filled');
    bar.appendChild(seg);
  }

  return bar;
}

/* ============================================================
   UI — Pill de comparação
   ============================================================ */

function buildComparisonPill(comparison) {
  // Se não houver período anterior válido, não mostra pill
  if (comparison === null || comparison === undefined) {
    const pill = document.createElement('div');
    pill.className = 'lumiere-card__pill lumiere-card__pill--empty';
    pill.textContent = 'Sem histórico';
    return pill;
  }

  const isPositive = comparison >= 0;
  const pill = document.createElement('div');
  pill.className = 'lumiere-card__pill';
  if (isPositive) pill.classList.add('lumiere-card__pill--up');
  else pill.classList.add('lumiere-card__pill--down');

  const arrow = document.createElement('span');
  arrow.className = 'lumiere-card__pill-arrow';
  arrow.setAttribute('aria-hidden', 'true');
  arrow.textContent = isPositive ? '\u2191' : '\u2193';
  pill.appendChild(arrow);

  const text = document.createElement('span');
  text.className = 'lumiere-card__pill-text';
  text.textContent = (isPositive ? '+' : '') + comparison + '% vs mês passado';
  pill.appendChild(text);

  return pill;
}

/* ============================================================
   UI — Hero card
   ============================================================ */

function buildHeroCard(stats) {
  const card = document.createElement('section');
  card.className = 'lumiere-card__hero';

  // Top: ícone + label
  const top = document.createElement('div');
  top.className = 'lumiere-card__hero-top';

  const iconWrap = document.createElement('span');
  iconWrap.className = 'lumiere-card__hero-icon';
  if (ICONS.diamond) iconWrap.innerHTML = ICONS.diamond;
  top.appendChild(iconWrap);

  const label = document.createElement('span');
  label.className = 'lumiere-card__hero-label';
  label.textContent = 'Negócio Lumière';
  top.appendChild(label);

  card.appendChild(top);

  // Corpo: número + pill
  const body = document.createElement('div');
  body.className = 'lumiere-card__hero-body';

  const numberWrap = document.createElement('div');
  numberWrap.className = 'lumiere-card__hero-number-wrap';

  const number = document.createElement('span');
  number.className = 'lumiere-card__hero-number';
  number.textContent = String(stats.thisCount);
  numberWrap.appendChild(number);

  const unit = document.createElement('span');
  unit.className = 'lumiere-card__hero-unit';
  unit.textContent = stats.thisCount === 1 ? 'venda' : 'vendas';
  numberWrap.appendChild(unit);

  body.appendChild(numberWrap);

  body.appendChild(buildComparisonPill(stats.comparison));

  card.appendChild(body);

  // "este mês"
  const period = document.createElement('p');
  period.className = 'lumiere-card__hero-period';
  period.textContent = 'este mês';
  card.appendChild(period);

  // Barra segmentada
  card.appendChild(buildSegmentedBar(stats.goalPct));

  // Legenda meta
  const meta = document.createElement('p');
  meta.className = 'lumiere-card__hero-meta';
  meta.textContent = 'Meta: ' + stats.monthlyGoal + ' ' + (stats.monthlyGoal === 1 ? 'venda' : 'vendas') + ' · ' + stats.goalPct + '%';
  card.appendChild(meta);

  return card;
}

/* ============================================================
   UI — Receita do mês
   ============================================================ */

function buildRevenueCard(stats) {
  const card = document.createElement('section');
  card.className = 'lumiere-card__revenue';

  // Header: ícone cofre + label
  const header = document.createElement('div');
  header.className = 'lumiere-card__revenue-header';

  const iconWrap = document.createElement('span');
  iconWrap.className = 'lumiere-card__revenue-icon';
  iconWrap.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="6" width="18" height="14" rx="2"/><path d="M3 10h18"/><circle cx="12" cy="15" r="2"/></svg>';
  header.appendChild(iconWrap);

  const label = document.createElement('span');
  label.className = 'lumiere-card__revenue-label';
  label.textContent = 'Receita do mês';
  header.appendChild(label);

  card.appendChild(header);

  // Body: 2 colunas
  const body = document.createElement('div');
  body.className = 'lumiere-card__revenue-body';

  // Coluna esquerda — Receita
  const colLeft = document.createElement('div');
  colLeft.className = 'lumiere-card__revenue-col';

  const labelLeft = document.createElement('div');
  labelLeft.className = 'lumiere-card__revenue-col-label';
  labelLeft.textContent = 'Receita';
  colLeft.appendChild(labelLeft);

  const valueLeft = document.createElement('div');
  valueLeft.className = 'lumiere-card__revenue-col-value';
  valueLeft.textContent = formatMoney(stats.revenue, 'MZN');
  colLeft.appendChild(valueLeft);

  body.appendChild(colLeft);

  // Divisor
  const divider = document.createElement('div');
  divider.className = 'lumiere-card__revenue-divider';
  body.appendChild(divider);

  // Coluna direita — Ticket médio
  const colRight = document.createElement('div');
  colRight.className = 'lumiere-card__revenue-col';

  const labelRight = document.createElement('div');
  labelRight.className = 'lumiere-card__revenue-col-label';
  labelRight.textContent = 'Lucro';
  colRight.appendChild(labelRight);

  const valueRight = document.createElement('div');
  valueRight.className = 'lumiere-card__revenue-col-value';
  valueRight.textContent = formatMoney(stats.totalProfit, 'MZN');
  colRight.appendChild(valueRight);

  body.appendChild(colRight);

  card.appendChild(body);

  // Legenda: clientes + produtos
  const legend = document.createElement('p');
  legend.className = 'lumiere-card__revenue-legend';
  const custText = stats.activeCustomers === 1 ? '1 cliente activo' : stats.activeCustomers + ' clientes activos';
  const prodText = stats.productsSold === 1 ? '1 produto vendido' : stats.productsSold + ' produtos vendidos';
  legend.textContent = custText + ' · ' + prodText;
  card.appendChild(legend);

  return card;
}

/* ============================================================
   UI — Vendas recentes
   ============================================================ */

function buildSaleRow(sale, products) {
  const row = document.createElement('div');
  row.className = 'lumiere-card__sale';

  const status = sale.status || 'pending';
  if (status === 'paid') row.classList.add('is-paid');
  if (status === 'cancelled') row.classList.add('is-cancelled');

  const toggle = document.createElement('span');
  toggle.className = 'lumiere-card__sale-toggle';
  toggle.setAttribute('aria-hidden', 'true');
  row.appendChild(toggle);

  const textWrap = document.createElement('div');
  textWrap.className = 'lumiere-card__sale-text';

  const nameEl = document.createElement('div');
  nameEl.className = 'lumiere-card__sale-name';
  nameEl.textContent = 'Venda #' + (sale.id ? String(sale.id).slice(-4) : '----');
  textWrap.appendChild(nameEl);

  const dateEl = document.createElement('div');
  dateEl.className = 'lumiere-card__sale-date';
  dateEl.textContent = shortDate(sale.date);
  textWrap.appendChild(dateEl);

  row.appendChild(textWrap);

  const total = document.createElement('div');
  total.className = 'lumiere-card__sale-total';
  total.textContent = formatMoney(Number(sale.total) || 0, sale.currency || 'MZN');
  row.appendChild(total);

  const badge = document.createElement('span');
  badge.className = 'lumiere-card__sale-badge lumiere-card__sale-badge--' + status;
  const labelMap = { paid: 'Pago', pending: 'Pendente', cancelled: 'Cancelada' };
  badge.textContent = labelMap[status] || 'Pendente';
  row.appendChild(badge);

  return row;
}

function buildRecentSalesSection(sales) {
  const section = document.createElement('section');
  section.className = 'lumiere-card__section lumiere-card__section--sales';

  const header = document.createElement('header');
  header.className = 'lumiere-card__section-header';

  const title = document.createElement('h3');
  title.className = 'lumiere-card__section-title';
  title.textContent = 'Vendas recentes';
  header.appendChild(title);

  const seeAll = document.createElement('button');
  seeAll.type = 'button';
  seeAll.className = 'lumiere-card__section-see-all';
  seeAll.textContent = 'Ver todas \u2192';
  seeAll.addEventListener('click', () => {
    eventBus.emit('navigation:changed', { page: 'lumiere' });
  });
  header.appendChild(seeAll);

  section.appendChild(header);

  if (sales.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'lumiere-card__section-empty';
    empty.textContent = 'Sem vendas registadas.';
    section.appendChild(empty);
    return section;
  }

  // Ordenar por data descendente e pegar últimas 3
  const recent = [...sales]
    .sort((a, b) => (ymdOf(b.date) || '').localeCompare(ymdOf(a.date) || ''))
    .slice(0, 3);

  const list = document.createElement('div');
  list.className = 'lumiere-card__sales-list';
  recent.forEach(s => list.appendChild(buildSaleRow(s)));
  section.appendChild(list);

  return section;
}

/* ============================================================
   UI — Produtos mais vendidos
   ============================================================ */

function buildTopProductsSection(sales, products) {
  const section = document.createElement('section');
  section.className = 'lumiere-card__section lumiere-card__section--top-products';

  const header = document.createElement('header');
  header.className = 'lumiere-card__section-header';

  const title = document.createElement('h3');
  title.className = 'lumiere-card__section-title';
  title.textContent = 'Produtos mais vendidos';
  header.appendChild(title);

  section.appendChild(header);

  // Agrupar vendas do mês por produto
  const thisMonth = salesThisMonth(sales);
  const counts = {};
  thisMonth.forEach(sale => {
    if (!sale.productId) return;
    counts[sale.productId] = (counts[sale.productId] || 0) + (Number(sale.quantity) || 0);
  });

  const ranked = Object.entries(counts)
    .map(([productId, count]) => {
      const product = products.find(p => p.id === productId);
      return {
        productId,
        count,
        name: product ? product.name : 'Produto removido'
      };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  if (ranked.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'lumiere-card__section-empty';
    empty.textContent = 'Sem produtos vendidos este mês.';
    section.appendChild(empty);
    return section;
  }

  // Maior count para calcular %
  const maxCount = ranked[0].count;

  const list = document.createElement('div');
  list.className = 'lumiere-card__top-products-list';

  ranked.forEach(item => {
    const pct = Math.round((item.count / maxCount) * 100);

    const row = document.createElement('div');
    row.className = 'lumiere-card__top-product';

    const textWrap = document.createElement('div');
    textWrap.className = 'lumiere-card__top-product-text';

    const nameEl = document.createElement('div');
    nameEl.className = 'lumiere-card__top-product-name';
    nameEl.textContent = item.name;
    textWrap.appendChild(nameEl);

    const barWrap = document.createElement('div');
    barWrap.className = 'lumiere-card__top-product-bar-wrap';
    const bar = document.createElement('div');
    bar.className = 'lumiere-card__top-product-bar';
    bar.style.width = pct + '%';
    barWrap.appendChild(bar);
    textWrap.appendChild(barWrap);

    row.appendChild(textWrap);

    const countEl = document.createElement('div');
    countEl.className = 'lumiere-card__top-product-count';
    countEl.textContent = item.count + (item.count === 1 ? ' venda' : ' vendas');
    row.appendChild(countEl);

    list.appendChild(row);
  });

  section.appendChild(list);
  return section;
}

/* ============================================================
   UI — Tip no fundo
   ============================================================ */

function buildTip() {
  const tip = document.createElement('div');
  tip.className = 'lumiere-card__tip';

  const iconWrap = document.createElement('span');
  iconWrap.className = 'lumiere-card__tip-icon';
  iconWrap.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.2 1 2h6c0-.8.4-1.5 1-2A7 7 0 0 0 12 2z"/></svg>';
  tip.appendChild(iconWrap);

  const text = document.createElement('p');
  text.className = 'lumiere-card__tip-text';
  text.textContent = 'Cada venda é um passo. Continua a construir.';
  tip.appendChild(text);

  return tip;
}

/* ============================================================
   UI — Estado vazio
   ============================================================ */

function buildEmptyCard() {
  const card = document.createElement('section');
  card.className = 'lumiere-card__empty-card';

  const iconWrap = document.createElement('div');
  iconWrap.className = 'lumiere-card__empty-icon';
  if (ICONS.diamond) iconWrap.innerHTML = ICONS.diamond;
  card.appendChild(iconWrap);

  const title = document.createElement('h2');
  title.className = 'lumiere-card__empty-title';
  title.textContent = 'Ainda sem vendas registadas';
  card.appendChild(title);

  const text = document.createElement('p');
  text.className = 'lumiere-card__empty-text';
  text.textContent = 'Começa a registar a tua primeira venda para acompanhar o desempenho do teu negócio.';
  card.appendChild(text);

  const cta = document.createElement('button');
  cta.type = 'button';
  cta.className = 'lumiere-card__empty-cta';
  cta.innerHTML = '<span class="lumiere-card__empty-cta-plus" aria-hidden="true">+</span> Registar primeira venda';
  cta.addEventListener('click', () => {
    eventBus.emit('navigation:changed', { page: 'lumiere' });
  });
  card.appendChild(cta);

  return card;
}

function buildSetupTile(iconKey, title, subtitle) {
  const tile = document.createElement('button');
  tile.type = 'button';
  tile.className = 'lumiere-card__setup-tile';

  const iconWrap = document.createElement('span');
  iconWrap.className = 'lumiere-card__setup-icon';
  if (ICONS[iconKey]) iconWrap.innerHTML = ICONS[iconKey];
  tile.appendChild(iconWrap);

  const textWrap = document.createElement('div');
  textWrap.className = 'lumiere-card__setup-text';

  const titleEl = document.createElement('div');
  titleEl.className = 'lumiere-card__setup-title';
  titleEl.textContent = title;
  textWrap.appendChild(titleEl);

  const subEl = document.createElement('div');
  subEl.className = 'lumiere-card__setup-sub';
  subEl.textContent = subtitle;
  textWrap.appendChild(subEl);

  tile.appendChild(textWrap);

  const chev = document.createElement('span');
  chev.className = 'lumiere-card__setup-chevron';
  chev.setAttribute('aria-hidden', 'true');
  chev.textContent = '\u203A';
  tile.appendChild(chev);

  tile.addEventListener('click', () => {
    eventBus.emit('navigation:changed', { page: 'lumiere' });
  });

  return tile;
}

function buildSetupSection() {
  const section = document.createElement('section');
  section.className = 'lumiere-card__setup';

  const header = document.createElement('header');
  header.className = 'lumiere-card__setup-header';

  const title = document.createElement('h3');
  title.className = 'lumiere-card__setup-header-title';
  title.textContent = 'Configurar o teu negócio';
  header.appendChild(title);

  section.appendChild(header);

  const list = document.createElement('div');
  list.className = 'lumiere-card__setup-list';

  list.appendChild(buildSetupTile(
    'diamond',
    'Definir meta mensal',
    'Escolhe quantas vendas queres atingir'
  ));

  list.appendChild(buildSetupTile(
    'target',
    'Adicionar produtos',
    'Cria o teu catálogo'
  ));

  list.appendChild(buildSetupTile(
    'user',
    'Adicionar clientes',
    'Registra os teus compradores'
  ));

  section.appendChild(list);
  return section;
}

/* ============================================================
   Init
   ============================================================ */

/* Contexto inteligente */
function buildLumiereContext(stats) {
  if (stats.monthlyGoal <= 0) return null;
  const remaining = stats.monthlyGoal - stats.thisCount;
  if (remaining <= 0) {
    return createContextLine({
      text: 'Meta do mes atingida. Continua a somar.',
      variant: 'good'
    });
  }
  const today = new Date();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const daysLeft = daysInMonth - today.getDate();
  let variant = 'info';
  if (remaining >= 5 && daysLeft <= 10) variant = 'bad';
  else if (remaining >= 3) variant = 'warning';
  return createContextLine({
    text: 'Faltam ' + remaining + ' venda' + (remaining !== 1 ? 's' : '') +
      ' para a meta (' + stats.thisCount + '/' + stats.monthlyGoal + ').',
    variant
  });
}

export async function initLumiereCard(container) {
  if (!container) {
    console.warn('[LumiereCard] container nao fornecido');
    return;
  }

  if (_unsubscribe) {
    try { _unsubscribe(); } catch (e) { /* noop */ }
    _unsubscribe = null;
  }

  container.innerHTML = '<p class="lumiere-card__loading">A carregar\u2026</p>';

  const collections = {};
  try {
    const results = await Promise.all(
      RELEVANT_COLLECTIONS.map(n => dataManager.list(n).catch(() => []))
    );
    RELEVANT_COLLECTIONS.forEach((n, i) => {
      collections[n] = Array.isArray(results[i]) ? results[i] : [];
    });
  } catch (err) {
    console.error('[LumiereCard] Erro ao ler colecoes:', err);
  }

  const stats = calculateLumiereStats(collections);

  const isFullyEmpty =
    stats.totalSales === 0 &&
    stats.totalProducts === 0 &&
    stats.totalCustomers === 0;

  container.innerHTML = '';

  const page = document.createElement('section');
  page.className = 'lumiere-card';

  page.appendChild(buildHeader());

  if (isFullyEmpty) {
    page.appendChild(buildEmptyCard());
    page.appendChild(buildSetupSection());
    page.appendChild(buildTip());
  } else {
    page.appendChild(buildHeroCard(stats));

    const ctx = buildLumiereContext(stats);
    if (ctx) page.appendChild(ctx);

    page.appendChild(buildRevenueCard(stats));
    page.appendChild(buildRecentSalesSection(collections.lumiereSales));
    page.appendChild(buildTopProductsSection(collections.lumiereSales, collections.lumiereProducts));
    page.appendChild(buildTip());
  }

  container.appendChild(page);

  _unsubscribe = eventBus.on('data:changed', (payload) => {
    if (payload && RELEVANT_COLLECTIONS.includes(payload.collection)) {
      initLumiereCard(container);
    }
  });
}

export default {
  initLumiereCard,
  calculateLumiereStats,
  salesThisMonth,
  salesPreviousMonth
};
