/**
 * Templates Page
 *
 * Lista de templates reutilizáveis (Tarefas, Hábitos, Estudos, Objetivos, Notas).
 * Consome dataManager.templates.* (Bloco 2.1).
 * NÃO contém regras de negócio.
 */
import { dataManager } from '../../core/dataManager.js';
import { eventBus } from '../../core/eventBus.js';
import { createMenu } from '../../components/menu/menu.js';
import { t } from '../../js/i18n.js';

// ============================================================
// Metadados dos módulos destino
// ============================================================
const APPLIES_TO_META = {
  tasks:    { label: 'Tarefas',   icon: '\u{1F4DD}' },
  habits:   { label: 'Hábitos',   icon: '\u{1F504}' },
  studies:  { label: 'Estudos',   icon: '\u{1F4DA}' },
  goals:    { label: 'Objetivos', icon: '\u{1F3AF}' },
  notes:    { label: 'Notas',     icon: '\u{1F4D6}' }
};

const APPLIES_TO_ORDER = ['tasks', 'habits', 'studies', 'goals', 'notes'];

let _container = null;
let _state = {
  templates: [],
  filterAppliesTo: 'all',
  loading: false,
  error: null
};
let _unsubscribe = null;

export function initTemplates(container) {
  if (!container) {
    console.warn('[Templates] container inválido.');
    return;
  }
  _container = container;

  if (_unsubscribe) _unsubscribe();
  _unsubscribe = eventBus.on('data:changed', (payload) => {
    if (payload && payload.collection === 'templates') {
      loadTemplates();
    }
  });

  loadTemplates();
}

async function loadTemplates() {
  _state.loading = true;
  _state.error = null;
  render();

  try {
    const list = await dataManager.list('templates');
    let arr = Array.isArray(list) ? list : [];
    arr = arr.slice().sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
    _state.templates = arr;
  } catch (err) {
    console.error('[Templates] Erro ao carregar:', err);
    _state.error = err.message || 'Erro ao carregar templates.';
    _state.templates = [];
  } finally {
    _state.loading = false;
    render();
  }
}

function render() {
  if (!_container) return;
  _container.innerHTML = '';

  const page = document.createElement('div');
  page.className = 'templates-page';

  page.appendChild(renderHeader());
  page.appendChild(renderFilters());

  if (_state.loading) {
    page.appendChild(renderState('A carregar templates…'));
  } else if (_state.error) {
    page.appendChild(renderState(_state.error, true));
  } else {
    const visible = getVisibleTemplates();
    if (visible.length === 0) {
      page.appendChild(renderState('Ainda não tens templates. Guarda um hábito/tarefa como template para começares.'));
    } else {
      const list = document.createElement('div');
      list.className = 'templates-list';
      for (const tpl of visible) list.appendChild(renderTemplateItem(tpl));
      page.appendChild(list);
    }
  }

  _container.appendChild(page);
}

function getVisibleTemplates() {
  if (_state.filterAppliesTo === 'all') return _state.templates;
  return _state.templates.filter((tpl) => tpl.appliesTo === _state.filterAppliesTo);
}

function renderHeader() {
  const header = document.createElement('header');
  header.className = 'templates-header';

  const wrap = document.createElement('div');
  wrap.className = 'templates-header__text';

  const title = document.createElement('h2');
  title.className = 'templates-header__title';
  title.textContent = 'Templates';
  wrap.appendChild(title);

  const sub = document.createElement('p');
  sub.className = 'templates-header__subtitle';
  sub.textContent = 'Poupa tempo. Repete o que funciona.';
  wrap.appendChild(sub);

  header.appendChild(wrap);

  const actions = document.createElement('div');
  actions.className = 'templates-header__actions';

  const btnNew = document.createElement('button');
  btnNew.type = 'button';
  btnNew.className = 'templates-btn templates-btn--primary';
  btnNew.textContent = '+ Novo';
  btnNew.addEventListener('click', () => {
    // Bloco 2.3 — formulário ainda não implementado
    alert('Formulário de criação chega no Bloco 2.3.');
  });
  actions.appendChild(btnNew);

  header.appendChild(actions);
  return header;
}

function renderFilters() {
  const nav = document.createElement('nav');
  nav.className = 'templates-filters';

  const items = [{ id: 'all', label: 'Todas' }];
  for (const key of APPLIES_TO_ORDER) {
    items.push({ id: key, label: APPLIES_TO_META[key].label });
  }

  for (const item of items) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'templates-filter';
    if (item.id === _state.filterAppliesTo) btn.classList.add('is-active');
    btn.textContent = item.label;
    btn.addEventListener('click', () => {
      _state.filterAppliesTo = item.id;
      render();
    });
    nav.appendChild(btn);
  }

  return nav;
}

function renderTemplateItem(tpl) {
  const item = document.createElement('article');
  item.className = 'templates-item';

  const meta = APPLIES_TO_META[tpl.appliesTo] || { label: '—', icon: '\u{1F4CC}' };

  const header = document.createElement('div');
  header.className = 'templates-item__header';

  const headerLeft = document.createElement('div');
  headerLeft.className = 'templates-item__header-left';

  const icon = document.createElement('span');
  icon.className = 'templates-item__icon';
  icon.textContent = tpl.icon || meta.icon;
  icon.setAttribute('aria-hidden', 'true');
  headerLeft.appendChild(icon);

  const name = document.createElement('h3');
  name.className = 'templates-item__name';
  name.textContent = tpl.name || '(sem nome)';
  headerLeft.appendChild(name);

  header.appendChild(headerLeft);

  const menuWrap = document.createElement('div');
  menuWrap.className = 'templates-item__menu';
  const menu = createMenu({
    items: [
      { id: 'edit', label: 'Editar' },
      { id: 'duplicate', label: 'Duplicar' },
      { id: 'delete', label: 'Eliminar' }
    ],
    triggerLabel: '⋮',
    triggerAriaLabel: 'Opções do template',
    align: 'right',
    onSelect: (id) => {
      if (id === 'edit') {
        alert('Edição chega no Bloco 2.3.');
      } else if (id === 'duplicate') {
        handleDuplicate(tpl);
      } else if (id === 'delete') {
        handleDelete(tpl);
      }
    }
  });
  menuWrap.appendChild(menu);
  header.appendChild(menuWrap);

  item.appendChild(header);

  const meta_row = document.createElement('div');
  meta_row.className = 'templates-item__meta';

  if (tpl.appliesTo && APPLIES_TO_META[tpl.appliesTo]) {
    meta_row.appendChild(metaTag(meta.label));
  }
  if (tpl.category) {
    meta_row.appendChild(metaTag(t('category', tpl.category)));
  }
  if (tpl.usageCount && tpl.usageCount > 0) {
    meta_row.appendChild(metaTag('Usado ' + tpl.usageCount + 'x'));
  }
  item.appendChild(meta_row);

  if (tpl.description) {
    const desc = document.createElement('p');
    desc.className = 'templates-item__description';
    desc.textContent = tpl.description;
    item.appendChild(desc);
  }

  return item;
}

function metaTag(text) {
  const span = document.createElement('span');
  span.className = 'templates-item__tag';
  span.textContent = text;
  return span;
}

function renderState(message, isError = false) {
  const el = document.createElement('div');
  el.className = 'templates-state' + (isError ? ' templates-state--error' : '');
  el.textContent = message;
  return el;
}

async function handleDelete(tpl) {
  const name = tpl.name || '(sem nome)';
  if (!confirm('Apagar o template "' + name + '"?')) return;
  try {
    await dataManager.delete('templates', tpl.id);
    console.log('[Templates] Eliminado:', tpl.id);
  } catch (err) {
    console.error('[Templates] Erro ao eliminar:', err);
    alert('Erro ao eliminar: ' + (err.message || 'desconhecido'));
  }
}

async function handleDuplicate(tpl) {
  try {
    const copy = Object.assign({}, tpl);
    delete copy.id;
    delete copy.createdAt;
    delete copy.updatedAt;
    copy.name = (tpl.name || 'Template') + ' (cópia)';
    await dataManager.create('templates', copy);
    console.log('[Templates] Duplicado:', tpl.id);
  } catch (err) {
    console.error('[Templates] Erro ao duplicar:', err);
    alert('Erro ao duplicar: ' + (err.message || 'desconhecido'));
  }
}

export const templatesPage = { init: initTemplates };
export default templatesPage;
