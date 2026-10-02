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
  error: null,
  showForm: false,
  editingId: null
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

  if (_state.showForm) {
    page.appendChild(renderForm());
  } else {
    page.appendChild(renderFilters());
  }

  if (_state.loading) {
    page.appendChild(renderState('A carregar templates…'));
  } else if (_state.error) {
    page.appendChild(renderState(_state.error, true));
  } else {
    if (_state.showForm) {
      // Formulário aberto — não mostra lista
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
  btnNew.addEventListener('click', () => openForm());
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
        openForm(tpl.id);
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

// ============================================================
// Formulário — criar / editar template (Ecrã 2)
// ============================================================
const CATEGORIES = ['personal','work','study','health','finance','home','lumiere','leisure','other'];

function openForm(id) {
  _state.editingId = id || null;
  _state.showForm = true;
  render();
}

function closeForm() {
  _state.showForm = false;
  _state.editingId = null;
  render();
}

function renderForm() {
  const isEdit = Boolean(_state.editingId);
  const tpl = isEdit ? _state.templates.find(t => t.id === _state.editingId) : null;
  const payload = (tpl && tpl.payload) ? tpl.payload : {};

  const form = document.createElement('form');
  form.className = 'templates-form';
  form.noValidate = true;
  form.addEventListener('submit', handleSubmit);

  const title = document.createElement('h3');
  title.className = 'templates-form__title';
  title.textContent = isEdit ? 'Editar template' : 'Novo template';
  form.appendChild(title);

  const grid = document.createElement('div');
  grid.className = 'templates-form__grid';

  // --- Campos base ---
  grid.appendChild(field('Nome *', 'input', 'name', tpl ? tpl.name : '', { type: 'text', required: true, placeholder: 'Ex: Treino corrida fácil' }));
  grid.appendChild(field('Descrição', 'textarea', 'description', tpl ? tpl.description : '', { full: true }));
  grid.appendChild(field('Aplica-se a *', 'select', 'appliesTo', tpl ? tpl.appliesTo : 'tasks', {
    options: APPLIES_TO_ORDER,
    labels: APPLIES_TO_ORDER.map(k => APPLIES_TO_META[k].label)
  }));
  grid.appendChild(field('Categoria *', 'select', 'category', tpl ? tpl.category : 'personal', {
    options: CATEGORIES,
    translate: 'category'
  }));

  form.appendChild(grid);

  // --- Secção "O que pré-preencher?" ---
  const payloadSection = document.createElement('section');
  payloadSection.className = 'templates-form__payload';

  const payloadTitle = document.createElement('h4');
  payloadTitle.className = 'templates-form__payload-title';
  payloadTitle.textContent = 'O que pré-preencher?';
  payloadSection.appendChild(payloadTitle);

  const payloadHint = document.createElement('p');
  payloadHint.className = 'templates-form__payload-hint';
  payloadHint.textContent = 'Configura os detalhes que serão aplicados quando usares este template.';
  payloadSection.appendChild(payloadHint);

  const payloadGrid = document.createElement('div');
  payloadGrid.className = 'templates-form__grid';
  payloadGrid.id = 'templates-payload-grid';

  // Renderizar campos do módulo atual
  renderPayloadInto(payloadGrid, tpl ? tpl.appliesTo : 'tasks', payload);
  payloadSection.appendChild(payloadGrid);

  form.appendChild(payloadSection);

  // --- Erro + Ações ---
  const error = document.createElement('p');
  error.className = 'templates-form__error';
  error.hidden = true;
  form.appendChild(error);

  const actions = document.createElement('div');
  actions.className = 'templates-form__actions';

  const btnCancel = document.createElement('button');
  btnCancel.type = 'button';
  btnCancel.className = 'templates-btn';
  btnCancel.textContent = 'Cancelar';
  btnCancel.addEventListener('click', () => closeForm());
  actions.appendChild(btnCancel);

  const btnSave = document.createElement('button');
  btnSave.type = 'submit';
  btnSave.className = 'templates-btn templates-btn--primary';
  btnSave.textContent = isEdit ? 'Guardar' : 'Criar';
  actions.appendChild(btnSave);

  form.appendChild(actions);

  // --- Listener para trocar o módulo destino ---
  const selectAppliesTo = form.querySelector('select[name="appliesTo"]');
  if (selectAppliesTo) {
    selectAppliesTo.addEventListener('change', () => {
      renderPayloadInto(payloadGrid, selectAppliesTo.value, {});
    });
  }

  return form;
}

// ------------------------------------------------------------
// Renderiza os campos dinâmicos dentro do grid de payload
// ------------------------------------------------------------
function renderPayloadInto(grid, appliesTo, payload) {
  grid.innerHTML = '';
  payload = payload || {};

  if (appliesTo === 'tasks') {
    grid.appendChild(field('Nome da tarefa', 'input', 'payload.name', payload.name || '', { type: 'text' }));
    grid.appendChild(field('Descrição', 'textarea', 'payload.description', payload.description || '', { full: true }));
    grid.appendChild(field('Prioridade', 'select', 'payload.priority', payload.priority || 'medium', {
      options: ['low','medium','high','urgent'],
      translate: 'priority'
    }));
    grid.appendChild(field('Estado', 'select', 'payload.status', payload.status || 'pending', {
      options: ['pending','in-progress','completed','cancelled'],
      translate: 'status'
    }));
    grid.appendChild(field('Prazo', 'input', 'payload.dueDate', payload.dueDate || '', { type: 'date' }));
    grid.appendChild(field('Etiquetas', 'input', 'payload.tags', (payload.tags || []).join(', '), { type: 'text', full: true }));
    grid.appendChild(field('Notas', 'textarea', 'payload.notes', payload.notes || '', { full: true }));
  } else if (appliesTo === 'habits') {
    grid.appendChild(field('Nome do hábito', 'input', 'payload.name', payload.name || '', { type: 'text' }));
    grid.appendChild(field('Descrição', 'textarea', 'payload.description', payload.description || '', { full: true }));
    grid.appendChild(field('Frequência', 'select', 'payload.frequency', payload.frequency || 'daily', {
      options: ['daily','weekly','monthly'],
      translate: 'frequency'
    }));
    grid.appendChild(field('Meta', 'input', 'payload.target', payload.target || 1, { type: 'number', min: 1 }));
    grid.appendChild(field('Unidade', 'input', 'payload.unit', payload.unit || 'times', { type: 'text' }));
    grid.appendChild(field('Dias da semana', 'input', 'payload.daysOfWeek', (payload.daysOfWeek || []).join(', '), { type: 'text', full: true, placeholder: 'seg, ter, qua' }));
    grid.appendChild(field('Notas', 'textarea', 'payload.notes', payload.notes || '', { full: true }));
  } else if (appliesTo === 'studies') {
    grid.appendChild(field('Nome do estudo', 'input', 'payload.name', payload.name || '', { type: 'text' }));
    grid.appendChild(field('Descrição', 'textarea', 'payload.description', payload.description || '', { full: true }));
    grid.appendChild(field('Disciplina', 'input', 'payload.subject', payload.subject || '', { type: 'text', placeholder: 'Ex: Física' }));
    grid.appendChild(field('Duração (min)', 'input', 'payload.duration', payload.duration || 60, { type: 'number', min: 1 }));
    grid.appendChild(field('Notas', 'textarea', 'payload.notes', payload.notes || '', { full: true }));
  } else if (appliesTo === 'goals') {
    grid.appendChild(field('Nome do objetivo', 'input', 'payload.name', payload.name || '', { type: 'text' }));
    grid.appendChild(field('Descrição', 'textarea', 'payload.description', payload.description || '', { full: true }));
    grid.appendChild(field('Prazo', 'input', 'payload.targetDate', payload.targetDate || '', { type: 'date' }));
    grid.appendChild(field('Notas', 'textarea', 'payload.notes', payload.notes || '', { full: true }));
  } else if (appliesTo === 'notes') {
    grid.appendChild(field('Título', 'input', 'payload.title', payload.title || '', { type: 'text', required: false }));
    grid.appendChild(field('Conteúdo', 'textarea', 'payload.content', payload.content || '', { full: true }));
    grid.appendChild(field('Etiquetas', 'input', 'payload.tags', (payload.tags || []).join(', '), { type: 'text', full: true }));
  }
}

// ------------------------------------------------------------
// Helper: campo genérico
// ------------------------------------------------------------
function field(labelText, tag, name, value, opts = {}) {
  const wrap = document.createElement('div');
  wrap.className = 'templates-form__field' + (opts.full ? ' templates-form__field--full' : '');

  const label = document.createElement('label');
  const safeId = 'tpl-' + name.replace(/\./g, '-');
  label.setAttribute('for', safeId);
  label.textContent = labelText;
  wrap.appendChild(label);

  let input;
  if (tag === 'textarea') {
    input = document.createElement('textarea');
    input.value = value || '';
  } else if (tag === 'select') {
    input = document.createElement('select');
    const options = opts.options || [];
    const labels = opts.labels || null;
    options.forEach((opt, idx) => {
      const el = document.createElement('option');
      el.value = opt;
      let text = opt;
      if (opts.translate) text = t(opts.translate, opt);
      else if (labels) text = labels[idx];
      el.textContent = text;
      if (String(opt) === String(value)) el.selected = true;
      input.appendChild(el);
    });
  } else {
    input = document.createElement('input');
    input.type = opts.type || 'text';
    input.value = value !== undefined && value !== null ? String(value) : '';
  }

  input.id = safeId;
  input.name = name;
  if (opts.required) input.required = true;
  if (opts.placeholder) input.placeholder = opts.placeholder;
  if (opts.type === 'number') {
    if (opts.min !== undefined) input.min = opts.min;
    if (opts.max !== undefined) input.max = opts.max;
  }

  wrap.appendChild(input);
  return wrap;
}

// ------------------------------------------------------------
// Submissão do formulário
// ------------------------------------------------------------
async function handleSubmit(ev) {
  ev.preventDefault();
  const form = ev.target;
  const errorEl = form.querySelector('.templates-form__error');
  if (errorEl) { errorEl.hidden = true; errorEl.textContent = ''; }

  const fd = new FormData(form);

  const base = {
    name: (fd.get('name') || '').trim(),
    description: (fd.get('description') || '').trim(),
    appliesTo: fd.get('appliesTo') || 'tasks',
    category: fd.get('category') || 'personal'
  };

  if (!base.name) {
    showFormError(form, 'O nome do template é obrigatório.');
    return;
  }

  // Construir payload conforme o módulo
  const payload = {};
  const appliesTo = base.appliesTo;

  const getVal = (k) => {
    const v = fd.get('payload.' + k);
    if (v === null) return undefined;
    const s = String(v).trim();
    return s === '' ? undefined : s;
  };

  if (appliesTo === 'tasks') {
    const name = getVal('name'); if (name !== undefined) payload.name = name;
    const description = getVal('description'); if (description !== undefined) payload.description = description;
    const priority = getVal('priority'); if (priority !== undefined) payload.priority = priority;
    const status = getVal('status'); if (status !== undefined) payload.status = status;
    const dueDate = getVal('dueDate'); if (dueDate !== undefined) payload.dueDate = dueDate;
    const tags = getVal('tags'); if (tags !== undefined) payload.tags = tags.split(',').map(s => s.trim()).filter(Boolean);
    const notes = getVal('notes'); if (notes !== undefined) payload.notes = notes;
  } else if (appliesTo === 'habits') {
    const name = getVal('name'); if (name !== undefined) payload.name = name;
    const description = getVal('description'); if (description !== undefined) payload.description = description;
    const frequency = getVal('frequency'); if (frequency !== undefined) payload.frequency = frequency;
    const target = getVal('target'); if (target !== undefined) payload.target = Number(target);
    const unit = getVal('unit'); if (unit !== undefined) payload.unit = unit;
    const days = getVal('daysOfWeek'); if (days !== undefined) payload.daysOfWeek = days.split(',').map(s => s.trim()).filter(Boolean);
    const notes = getVal('notes'); if (notes !== undefined) payload.notes = notes;
  } else if (appliesTo === 'studies') {
    const name = getVal('name'); if (name !== undefined) payload.name = name;
    const description = getVal('description'); if (description !== undefined) payload.description = description;
    const subject = getVal('subject'); if (subject !== undefined) payload.subject = subject;
    const duration = getVal('duration'); if (duration !== undefined) payload.duration = Number(duration);
    const notes = getVal('notes'); if (notes !== undefined) payload.notes = notes;
  } else if (appliesTo === 'goals') {
    const name = getVal('name'); if (name !== undefined) payload.name = name;
    const description = getVal('description'); if (description !== undefined) payload.description = description;
    const targetDate = getVal('targetDate'); if (targetDate !== undefined) payload.targetDate = targetDate;
    const notes = getVal('notes'); if (notes !== undefined) payload.notes = notes;
  } else if (appliesTo === 'notes') {
    const title = getVal('title'); if (title !== undefined) payload.title = title;
    const content = getVal('content'); if (content !== undefined) payload.content = content;
    const tags = getVal('tags'); if (tags !== undefined) payload.tags = tags.split(',').map(s => s.trim()).filter(Boolean);
  }

  const data = Object.assign({}, base, { payload });

  const btnSave = form.querySelector('button[type="submit"]');
  if (btnSave) btnSave.disabled = true;

  try {
    if (_state.editingId) {
      data.updatedAt = new Date().toISOString();
      await dataManager.update('templates', _state.editingId, data);
      console.log('[Templates] Atualizado:', _state.editingId);
    } else {
      await dataManager.create('templates', data);
      console.log('[Templates] Criado');
    }
    _state.showForm = false;
    _state.editingId = null;
    loadTemplates();
  } catch (err) {
    console.error('[Templates] Erro ao guardar:', err);
    showFormError(form, err.message || 'Erro ao guardar.');
    if (btnSave) btnSave.disabled = false;
  }
}

function showFormError(form, msg) {
  const errorEl = form.querySelector('.templates-form__error');
  if (!errorEl) return;
  errorEl.textContent = msg;
  errorEl.hidden = false;
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
