/**
 * Goals Page
 *
 * Estrutura inicial: init + load + render list/empty.
 */
import { dataManager } from '../../core/dataManager.js';
import { eventBus } from '../../core/eventBus.js';
import { t } from '../../js/i18n.js';
import { createProgress } from '../../components/progress/progress.js';

let _container = null;
let _state = {
  goals: [],
  editingId: null,
  showForm: false,
  loading: false,
  error: null
};

let _unsubscribe = null;

export function initGoals(container) {
  if (!container) {
    console.warn('[Goals] container inválido.');
    return;
  }
  _container = container;

  if (_unsubscribe) _unsubscribe();
  _unsubscribe = eventBus.on('data:changed', (payload) => {
    if (payload && payload.collection === 'goals') {
      loadGoals();
    }
  });

  loadGoals();
}

async function loadGoals() {
  _state.loading = true;
  _state.error = null;
  render();

  try {
    const goals = await dataManager.list('goals');
    _state.goals = Array.isArray(goals) ? goals : [];
  } catch (err) {
    console.error('[Goals] Erro ao carregar:', err);
    _state.error = err.message || 'Erro ao carregar objetivos.';
    _state.goals = [];
  } finally {
    _state.loading = false;
    render();
  }
}

function render() {
  if (!_container) return;
  _container.innerHTML = '';

  const page = document.createElement('div');
  page.className = 'goals-page';

  page.appendChild(renderHeader());

  if (_state.showForm) {
    page.appendChild(renderForm());
  }

  if (_state.loading) {
    page.appendChild(renderState('A carregar objetivos…'));
  } else if (_state.error) {
    page.appendChild(renderState(_state.error, true));
  } else if (_state.goals.length === 0) {
    page.appendChild(renderState('Sem objetivos. Toque em "Novo objetivo" para criar o primeiro.'));
  } else {
    page.appendChild(renderList());
  }

  _container.appendChild(page);
}

function renderHeader() {
  const header = document.createElement('header');
  header.className = 'goals-header';

  const title = document.createElement('h2');
  title.className = 'goals-header__title';
  title.textContent = 'Objetivos';
  header.appendChild(title);

  const actions = document.createElement('div');
  actions.className = 'goals-header__actions';

  const btnNew = document.createElement('button');
  btnNew.type = 'button';
  btnNew.className = 'goals-btn goals-btn--primary';
  btnNew.textContent = 'Novo objetivo';
  btnNew.addEventListener('click', () => openForm());
  actions.appendChild(btnNew);

  header.appendChild(actions);
  return header;
}

function renderList() {
  const list = document.createElement('div');
  list.className = 'goals-list';
  for (const goal of _state.goals) {
    list.appendChild(renderGoalItem(goal));
  }
  return list;
}

function renderGoalItem(goal) {
  const item = document.createElement('article');
  item.className = 'goal-item';
  if (goal.status === 'completed') item.classList.add('goal-item--completed');
  if (goal.status === 'abandoned') item.classList.add('goal-item--abandoned');

  const header = document.createElement('div');
  header.className = 'goal-item__header';

  const name = document.createElement('h3');
  name.className = 'goal-item__name';
  name.textContent = goal.name || '(sem nome)';
  header.appendChild(name);

  const actions = document.createElement('div');
  actions.className = 'goal-item__actions';

  // Marcar como principal
  const btnPrimary = document.createElement('button');
  btnPrimary.type = 'button';
  btnPrimary.textContent = goal.isPrimary ? '\u2605' : '\u2606';
  btnPrimary.title = goal.isPrimary ? 'Objetivo principal' : 'Marcar como principal';
  btnPrimary.setAttribute('aria-label', btnPrimary.title);
  btnPrimary.classList.add('goal-item__btn-primary');
  if (goal.isPrimary) btnPrimary.classList.add('is-active');
  btnPrimary.addEventListener('click', () => handleSetPrimary(goal));
  actions.appendChild(btnPrimary);

  // Alternar concluído
  const btnToggle = document.createElement('button');
  btnToggle.type = 'button';
  btnToggle.textContent = goal.status === 'completed' ? '↺' : '✓';
  btnToggle.title = goal.status === 'completed' ? 'Reabrir' : 'Marcar como concluído';
  btnToggle.setAttribute('aria-label', btnToggle.title);
  btnToggle.addEventListener('click', () => handleToggle(goal));
  actions.appendChild(btnToggle);

  // Editar
  const btnEdit = document.createElement('button');
  btnEdit.type = 'button';
  btnEdit.textContent = '✎';
  btnEdit.title = 'Editar';
  btnEdit.setAttribute('aria-label', 'Editar');
  btnEdit.addEventListener('click', () => openForm(goal.id));
  actions.appendChild(btnEdit);

  // Apagar
  const btnDelete = document.createElement('button');
  btnDelete.type = 'button';
  btnDelete.textContent = '✕';
  btnDelete.title = 'Apagar';
  btnDelete.setAttribute('aria-label', 'Apagar');
  btnDelete.addEventListener('click', () => handleDelete(goal));
  actions.appendChild(btnDelete);

  header.appendChild(actions);

  item.appendChild(header);

  const meta = document.createElement('div');
  meta.className = 'goal-item__meta';
  meta.appendChild(metaTag(goal.category ? t('category', goal.category) : '—'));
  meta.appendChild(metaTag(t('goalStatus', goal.status)));
  if (goal.priority) meta.appendChild(metaTag(t('priority', goal.priority)));
  if (goal.targetDate) meta.appendChild(metaTag(goal.targetDate));
  item.appendChild(meta);

  if (goal.description) {
    const desc = document.createElement('p');
    desc.className = 'goal-item__description';
    desc.textContent = goal.description;
    item.appendChild(desc);
  }

  // Barra de progresso (usa createProgress da Fase 5)
  const progressWrapper = document.createElement('div');
  progressWrapper.className = 'goal-item__progress';
  const progress = typeof goal.progress === 'number' ? goal.progress : 0;
  const bar = createProgress({
    value: progress,
    label: 'Progresso',
    variant: 'default',
    showPercent: true,
    size: 'md'
  });
  progressWrapper.appendChild(bar);
  item.appendChild(progressWrapper);

  return item;
}

function metaTag(text) {
  const span = document.createElement('span');
  span.className = 'goal-item__tag';
  span.textContent = text;
  return span;
}

function renderState(message, isError = false) {
  const div = document.createElement('div');
  div.className = 'goals-state' + (isError ? ' goals-state--error' : '');
  div.textContent = message;
  return div;
}

/* __GOALS_FORM_FUNCTIONS__ */
function openForm(goalId = null) {
  _state.editingId = goalId;
  _state.showForm = true;
  _state.error = null;
  render();
}

function closeForm() {
  _state.editingId = null;
  _state.showForm = false;
  _state.error = null;
  render();
}

function updateFormError(message) {
  const el = _container ? _container.querySelector('.goals-form__error') : null;
  if (el) {
    el.textContent = message || '';
    el.hidden = !message;
  }
}

function renderForm() {
  const isEdit = Boolean(_state.editingId);
  const goal = isEdit ? _state.goals.find(g => g.id === _state.editingId) : null;

  const form = document.createElement('form');
  form.className = 'goals-form';
  form.noValidate = true;
  form.addEventListener('submit', handleSubmit);

  const title = document.createElement('h3');
  title.className = 'goals-form__title';
  title.textContent = isEdit ? 'Editar objetivo' : 'Novo objetivo';
  form.appendChild(title);

  const grid = document.createElement('div');
  grid.className = 'goals-form__grid';

  grid.appendChild(field('Nome *', 'input', 'name', goal ? goal.name : '', { type: 'text', required: true }));
  grid.appendChild(field('Descrição', 'textarea', 'description', goal ? goal.description : '', { full: true }));
  grid.appendChild(field('Categoria *', 'select', 'category', goal ? goal.category : 'personal', {
    options: ['personal','work','study','health','finance','home','lumiere','leisure','other'],
    translate: 'category'
  }));
  grid.appendChild(field('Estado *', 'select', 'status', goal ? goal.status : 'draft', {
    options: ['draft','active','completed','abandoned'],
    translate: 'goalStatus'
  }));
  grid.appendChild(field('Prioridade', 'select', 'priority', goal ? goal.priority : 'medium', {
    options: ['low','medium','high','urgent'],
    translate: 'priority'
  }));
  grid.appendChild(field('Prazo', 'input', 'targetDate', goal ? goal.targetDate : '', { type: 'date' }));
  grid.appendChild(field('Progresso (0-100)', 'input', 'progress', goal ? goal.progress : 0, { type: 'number' }));
  grid.appendChild(field('Etiquetas (separadas por vírgula)', 'input', 'tagsRaw', goal && Array.isArray(goal.tags) ? goal.tags.join(', ') : '', { full: true, type: 'text' }));

  form.appendChild(grid);

  const error = document.createElement('p');
  error.className = 'goals-form__error';
  error.hidden = true;
  form.appendChild(error);

  const actions = document.createElement('div');
  actions.className = 'goals-form__actions';

  const btnCancel = document.createElement('button');
  btnCancel.type = 'button';
  btnCancel.className = 'goals-btn';
  btnCancel.textContent = 'Cancelar';
  btnCancel.addEventListener('click', () => closeForm());
  actions.appendChild(btnCancel);

  const btnSave = document.createElement('button');
  btnSave.type = 'submit';
  btnSave.className = 'goals-btn goals-btn--primary';
  btnSave.textContent = isEdit ? 'Guardar' : 'Criar';
  actions.appendChild(btnSave);

  form.appendChild(actions);
  return form;
}

function field(labelText, tag, name, value, opts = {}) {
  const wrap = document.createElement('div');
  wrap.className = 'goals-form__field' + (opts.full ? ' goals-form__field--full' : '');

  const label = document.createElement('label');
  label.setAttribute('for', 'goal-' + name);
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
      o.textContent = opts.translate ? t(opts.translate, opt) : opt;
      if (opt === value) o.selected = true;
      input.appendChild(o);
    }
  } else {
    input = document.createElement('input');
    input.type = opts.type || 'text';
    input.value = value === undefined || value === null ? '' : value;
  }
  input.id = 'goal-' + name;
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

  if (!data.name) { updateFormError('O nome é obrigatório.'); return; }
  if (!data.category) { updateFormError('A categoria é obrigatória.'); return; }
  if (!data.status) { updateFormError('O estado é obrigatório.'); return; }

  // Processar tags (string -> array)
  if (data.tagsRaw !== undefined) {
    const raw = data.tagsRaw || '';
    data.tags = raw ? raw.split(',').map(s => s.trim()).filter(Boolean) : [];
    delete data.tagsRaw;
  }

  // Converter progresso
  if (data.progress !== undefined && data.progress !== '') {
    data.progress = Number(data.progress);
    if (Number.isNaN(data.progress) || data.progress < 0 || data.progress > 100) {
      updateFormError('O progresso deve ser um número entre 0 e 100.');
      return;
    }
  } else {
    delete data.progress;
  }

  const btn = form.querySelector('button[type="submit"]');
  if (btn) btn.disabled = true;

  try {
    if (_state.editingId) {
      await dataManager.update('goals', _state.editingId, data);
      console.log('[Goals] Atualizado:', _state.editingId);
    } else {
      const created = await dataManager.create('goals', data);
      console.log('[Goals] Criado:', created.id);
    }
    _state.showForm = false;
    _state.editingId = null;
  } catch (err) {
    console.error('[Goals] Erro ao guardar:', err);
    updateFormError(err.message || 'Erro ao guardar.');
    if (btn) btn.disabled = false;
  }
}

/* __GOALS_ACTIONS_83D__ */
/**
 * Marca um objetivo como principal (e desmarca todos os outros).
 * Só pode haver 1 principal de cada vez.
 */
async function handleSetPrimary(goal) {
  try {
    if (goal.isPrimary) {
      // Se já é principal, apenas desmarca
      await dataManager.update('goals', goal.id, { isPrimary: false });
    } else {
      // Desmarca todos os outros
      for (const g of _state.goals) {
        if (g.isPrimary && g.id !== goal.id) {
          await dataManager.update('goals', g.id, { isPrimary: false });
        }
      }
      // Marca este
      await dataManager.update('goals', goal.id, { isPrimary: true });
    }
    // A lista é recarregada pelo data:changed do DataManager
  } catch (err) {
    console.error('[Goals] Erro ao marcar como principal:', err);
  }
}

async function handleToggle(goal) {
  const newStatus = goal.status === 'completed' ? 'active' : 'completed';
  const updates = { status: newStatus };
  if (newStatus === 'completed') updates.progress = 100;
  try {
    await dataManager.update('goals', goal.id, updates);
    console.log('[Goals] Estado:', goal.id, '->', newStatus);
  } catch (err) {
    console.error('[Goals] Erro ao alternar:', err);
  }
}

async function handleDelete(goal) {
  const name = goal.name || '(sem nome)';
  if (!confirm('Apagar o objetivo "' + name + '"?')) return;
  try {
    await dataManager.delete('goals', goal.id);
    console.log('[Goals] Apagado:', goal.id);
  } catch (err) {
    console.error('[Goals] Erro ao apagar:', err);
  }
}

export const goalsPage = { init: initGoals };
export default goalsPage;
