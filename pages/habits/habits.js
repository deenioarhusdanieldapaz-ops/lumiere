/**
 * Habits Page
 *
 * Estrutura inicial: init + load + render list/empty.
 */
import { dataManager } from '../../core/dataManager.js';
import { eventBus } from '../../core/eventBus.js';
import { t } from '../../js/i18n.js';

let _container = null;
let _state = {
  habits: [],
  editingId: null,
  showForm: false,
  loading: false,
  error: null
};

let _unsubscribe = null;

export function initHabits(container) {
  if (!container) {
    console.warn('[Habits] container inválido.');
    return;
  }
  _container = container;

  if (_unsubscribe) _unsubscribe();
  _unsubscribe = eventBus.on('data:changed', (payload) => {
    if (payload && payload.collection === 'habits') {
      loadHabits();
    }
  });

  loadHabits();
}

async function loadHabits() {
  _state.loading = true;
  _state.error = null;
  render();

  try {
    const habits = await dataManager.list('habits');
    const habitsArr = Array.isArray(habits) ? habits : [];
    const today = new Date().toISOString().split('T')[0];
    const logs = await dataManager.list('habitLogs');
    const logsToday = new Set(
      (Array.isArray(logs) ? logs : [])
        .filter(l => l.date === today && l.completed)
        .map(l => l.habitId)
    );
    const todayDow = ['sun','mon','tue','wed','thu','fri','sat'][new Date().getDay()];
    _state.habits = habitsArr.map(h => {
      const days = Array.isArray(h.daysOfWeek) ? h.daysOfWeek : [];
      const isToday = days.length === 0 || days.includes(todayDow);
      return { ...h, _doneToday: logsToday.has(h.id), _isToday: isToday };
    });
  } catch (err) {
    console.error('[Habits] Erro ao carregar:', err);
    _state.error = err.message || 'Erro ao carregar hábitos.';
    _state.habits = [];
  } finally {
    _state.loading = false;
    render();
  }
}

function render() {
  if (!_container) return;
  _container.innerHTML = '';

  const page = document.createElement('div');
  page.className = 'habits-page';

  page.appendChild(renderHeader());

  if (_state.showForm) {
    page.appendChild(renderForm());
  }

  if (_state.loading) {
    page.appendChild(renderState('A carregar hábitos…'));
  } else if (_state.error) {
    page.appendChild(renderState(_state.error, true));
  } else if (_state.habits.length === 0) {
    page.appendChild(renderState('Sem hábitos. Toque em "Novo hábito" para criar o primeiro.'));
  } else {
    page.appendChild(renderList());
  }

  _container.appendChild(page);
}

function renderHeader() {
  const header = document.createElement('header');
  header.className = 'habits-header';

  const title = document.createElement('h2');
  title.className = 'habits-header__title';
  title.textContent = 'Hábitos';
  header.appendChild(title);

  const actions = document.createElement('div');
  actions.className = 'habits-header__actions';

  const btnNew = document.createElement('button');
  btnNew.type = 'button';
  btnNew.className = 'habits-btn habits-btn--primary';
  btnNew.textContent = 'Novo hábito';
  btnNew.addEventListener('click', () => openForm());
  actions.appendChild(btnNew);

  header.appendChild(actions);
  return header;
}

function renderList() {
  const list = document.createElement('div');
  list.className = 'habits-list';
  const ordenados = [..._state.habits].sort((a, b) => {
    if (a._isToday && !b._isToday) return -1;
    if (!a._isToday && b._isToday) return 1;
    return 0;
  });
  for (const habit of ordenados) {
    list.appendChild(renderHabitItem(habit));
  }
  return list;
}

function renderHabitItem(habit) {
  const item = document.createElement('article');
  item.className = 'habit-item';
  if (habit.status === 'paused') item.classList.add('habit-item--paused');
  if (habit._doneToday) item.classList.add('habit-item--done');
  if (habit._isToday) item.classList.add('habit-item--today');

  const header = document.createElement('div');
  header.className = 'habit-item__header';

  const name = document.createElement('h3');
  name.className = 'habit-item__name';
  name.textContent = habit.name || '(sem nome)';
  header.appendChild(name);

  if (habit._isToday && !habit._doneToday) {
    const badge = document.createElement('span');
    badge.className = 'habit-item__badge-today';
    badge.textContent = 'HOJE';
    header.appendChild(badge);
  }

  const actions = document.createElement('div');
  actions.className = 'habit-item__actions';

  const btnCheck = document.createElement('button');
  btnCheck.type = 'button';
  btnCheck.textContent = habit._doneToday ? '✓' : '○';
  btnCheck.title = habit._doneToday ? 'Registado hoje' : 'Registar hoje';
  btnCheck.setAttribute('aria-label', btnCheck.title);
  if (habit._doneToday) btnCheck.disabled = true;
  btnCheck.addEventListener('click', () => handleCheckIn(habit));
  actions.appendChild(btnCheck);

  const btnEdit = document.createElement('button');
  btnEdit.type = 'button';
  btnEdit.textContent = '✎';
  btnEdit.title = 'Editar';
  btnEdit.setAttribute('aria-label', 'Editar');
  btnEdit.addEventListener('click', () => openForm(habit.id));
  actions.appendChild(btnEdit);

  const btnDelete = document.createElement('button');
  btnDelete.type = 'button';
  btnDelete.textContent = '✕';
  btnDelete.title = 'Apagar';
  btnDelete.setAttribute('aria-label', 'Apagar');
  btnDelete.addEventListener('click', () => handleDelete(habit));
  actions.appendChild(btnDelete);

  header.appendChild(actions);

  item.appendChild(header);

  const meta = document.createElement('div');
  meta.className = 'habit-item__meta';
  meta.appendChild(metaTag(habit.category ? t('category', habit.category) : '—'));
  meta.appendChild(metaTag(t('frequency', habit.frequency)));
  if (habit.target || habit.unit) {
    const target = (habit.target || 1) + ' ' + (habit.unit || 'x');
    meta.appendChild(metaTag(target));
  }
  item.appendChild(meta);

  if (habit.description) {
    const desc = document.createElement('p');
    desc.className = 'habit-item__description';
    desc.textContent = habit.description;
    item.appendChild(desc);
  }

  return item;
}

function metaTag(text) {
  const span = document.createElement('span');
  span.className = 'habit-item__tag';
  span.textContent = text;
  return span;
}

function renderState(message, isError = false) {
  const div = document.createElement('div');
  div.className = 'habits-state' + (isError ? ' habits-state--error' : '');
  div.textContent = message;
  return div;
}

/* __HABITS_FORM_FUNCTIONS__ */
function openForm(habitId = null) {
  _state.editingId = habitId;
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
  const el = _container ? _container.querySelector('.habits-form__error') : null;
  if (el) {
    el.textContent = message || '';
    el.hidden = !message;
  }
}

function renderForm() {
  const isEdit = Boolean(_state.editingId);
  const habit = isEdit ? _state.habits.find(h => h.id === _state.editingId) : null;

  const form = document.createElement('form');
  form.className = 'habits-form';
  form.noValidate = true;
  form.addEventListener('submit', handleSubmit);

  const title = document.createElement('h3');
  title.className = 'habits-form__title';
  title.textContent = isEdit ? 'Editar hábito' : 'Novo hábito';
  form.appendChild(title);

  const grid = document.createElement('div');
  grid.className = 'habits-form__grid';

  grid.appendChild(field('Nome *', 'input', 'name', habit ? habit.name : '', { type: 'text', required: true }));
  grid.appendChild(field('Descrição', 'textarea', 'description', habit ? habit.description : '', { full: true }));
  grid.appendChild(field('Categoria *', 'select', 'category', habit ? habit.category : 'personal', {
    options: ['personal','work','study','health','finance','home','lumiere','leisure','other'],
    translate: 'category'
  }));
  grid.appendChild(field('Frequência *', 'select', 'frequency', habit ? habit.frequency : 'daily', {
    options: ['daily','weekly','monthly'],
    translate: 'frequency'
  }));
  grid.appendChild(field('Alvo', 'input', 'target', habit ? habit.target : 1, { type: 'number' }));
  grid.appendChild(field('Unidade', 'input', 'unit', habit ? habit.unit : 'vezes', { type: 'text' }));
  grid.appendChild(field('Estado *', 'select', 'status', habit ? habit.status : 'active', {
    options: ['active','paused','archived'],
    translate: 'habitStatus'
  }));
  grid.appendChild(field('Data de início', 'input', 'startDate', habit ? habit.startDate : '', { type: 'date' }));

  // Dias da semana
  const daysWrap = document.createElement('div');
  daysWrap.className = 'habits-form__field habits-form__field--full';
  const daysLabel = document.createElement('label');
  daysLabel.textContent = 'Dias da semana';
  daysWrap.appendChild(daysLabel);
  const daysRow = document.createElement('div');
  daysRow.className = 'habits-form__days';
  const dayMap = [
    { key: 'mon', label: 'Seg' },
    { key: 'tue', label: 'Ter' },
    { key: 'wed', label: 'Qua' },
    { key: 'thu', label: 'Qui' },
    { key: 'fri', label: 'Sex' },
    { key: 'sat', label: 'Sab' },
    { key: 'sun', label: 'Dom' }
  ];
  const selectedDays = habit && Array.isArray(habit.daysOfWeek) ? habit.daysOfWeek : [];
  for (const d of dayMap) {
    const cbLabel = document.createElement('label');
    cbLabel.className = 'habits-form__day';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.name = 'day_' + d.key;
    cb.checked = selectedDays.includes(d.key);
    const span = document.createElement('span');
    span.textContent = d.label;
    cbLabel.appendChild(cb);
    cbLabel.appendChild(span);
    daysRow.appendChild(cbLabel);
  }
  daysWrap.appendChild(daysRow);
  grid.appendChild(daysWrap);

  form.appendChild(grid);

  const error = document.createElement('p');
  error.className = 'habits-form__error';
  error.hidden = true;
  form.appendChild(error);

  const actions = document.createElement('div');
  actions.className = 'habits-form__actions';

  const btnCancel = document.createElement('button');
  btnCancel.type = 'button';
  btnCancel.className = 'habits-btn';
  btnCancel.textContent = 'Cancelar';
  btnCancel.addEventListener('click', () => closeForm());
  actions.appendChild(btnCancel);

  const btnSave = document.createElement('button');
  btnSave.type = 'submit';
  btnSave.className = 'habits-btn habits-btn--primary';
  btnSave.textContent = isEdit ? 'Guardar' : 'Criar';
  actions.appendChild(btnSave);

  form.appendChild(actions);
  return form;
}

function field(labelText, tag, name, value, opts = {}) {
  const wrap = document.createElement('div');
  wrap.className = 'habits-form__field' + (opts.full ? ' habits-form__field--full' : '');

  const label = document.createElement('label');
  label.setAttribute('for', 'habit-' + name);
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
  input.id = 'habit-' + name;
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
  if (!data.frequency) { updateFormError('A frequência é obrigatória.'); return; }
  if (!data.status) { updateFormError('O estado é obrigatório.'); return; }

  // Converter dias da semana
  const days = [];
  const dayKeys = ['mon','tue','wed','thu','fri','sat','sun'];
  for (const k of dayKeys) {
    if (data['day_' + k] === 'on' || data['day_' + k] === true) {
      days.push(k);
    }
    delete data['day_' + k];
  }
  data.daysOfWeek = days;

  // Converter target para número
  if (data.target !== undefined && data.target !== '') {
    data.target = Number(data.target);
    if (Number.isNaN(data.target)) {
      updateFormError('O alvo deve ser um número.');
      return;
    }
  }

  const btn = form.querySelector('button[type="submit"]');
  if (btn) btn.disabled = true;

  try {
    if (_state.editingId) {
      await dataManager.update('habits', _state.editingId, data);
      console.log('[Habits] Atualizado:', _state.editingId);
    } else {
      const created = await dataManager.create('habits', data);
      console.log('[Habits] Criado:', created.id);
    }
    _state.showForm = false;
    _state.editingId = null;
  } catch (err) {
    console.error('[Habits] Erro ao guardar:', err);
    updateFormError(err.message || 'Erro ao guardar.');
    if (btn) btn.disabled = false;
  }
}

/* __HABITS_ACTIONS_82D__ */
async function handleCheckIn(habit) {
  const today = new Date().toISOString().split('T')[0];
  try {
    await dataManager.create('habitLogs', {
      habitId: habit.id,
      date: today,
      completed: true,
      value: habit.target || 1
    });
    console.log('[Habits] Check-in:', habit.id, today);
  } catch (err) {
    console.error('[Habits] Erro no check-in:', err);
  }
}

async function handleDelete(habit) {
  const name = habit.name || '(sem nome)';
  if (!confirm('Apagar o hábito "' + name + '" e todos os registos?')) return;
  try {
    const logs = await dataManager.list('habitLogs');
    const related = (Array.isArray(logs) ? logs : []).filter(l => l.habitId === habit.id);
    for (const log of related) {
      await dataManager.delete('habitLogs', log.id);
    }
    await dataManager.delete('habits', habit.id);
    console.log('[Habits] Apagado:', habit.id, '(logs:', related.length, ')');
  } catch (err) {
    console.error('[Habits] Erro ao apagar:', err);
  }
}

export const habitsPage = { init: initHabits };
export default habitsPage;
