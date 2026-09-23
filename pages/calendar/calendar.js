/**
 * Calendar Page
 *
 * Eventos agrupados por data (mais próximos primeiro).
 */
import { dataManager } from '../../core/dataManager.js';
import { eventBus } from '../../core/eventBus.js';
import { t } from '../../js/i18n.js';

let _container = null;
let _state = {
  events: [],
  editingId: null,
  showForm: false,
  loading: false,
  error: null
};
let _unsubscribe = null;

export function initCalendar(container) {
  if (!container) {
    console.warn('[Calendar] container inválido.');
    return;
  }
  _container = container;

  if (_unsubscribe) _unsubscribe();
  _unsubscribe = eventBus.on('data:changed', (payload) => {
    if (payload && payload.collection === 'calendarEvents') {
      loadEvents();
    }
  });

  loadEvents();
}

async function loadEvents() {
  _state.loading = true;
  _state.error = null;
  render();

  try {
    const events = await dataManager.list('calendarEvents');
    let arr = Array.isArray(events) ? events : [];
    // Ordenar cronologicamente por start
    arr = arr.slice().sort((a, b) => (a.start || '').localeCompare(b.start || ''));
    _state.events = arr;
  } catch (err) {
    console.error('[Calendar] Erro ao carregar:', err);
    _state.error = err.message || 'Erro ao carregar eventos.';
    _state.events = [];
  } finally {
    _state.loading = false;
    render();
  }
}

function render() {
  if (!_container) return;
  _container.innerHTML = '';

  const page = document.createElement('div');
  page.className = 'calendar-page';

  page.appendChild(renderHeader());

  if (_state.showForm) {
    page.appendChild(renderForm());
  }

  if (_state.loading) {
    page.appendChild(renderState('A carregar eventos…'));
  } else if (_state.error) {
    page.appendChild(renderState(_state.error, true));
  } else if (_state.events.length === 0) {
    page.appendChild(renderState('Sem eventos. Toque em "Novo evento" para criar o primeiro.'));
  } else {
    page.appendChild(renderListGrouped());
  }

  _container.appendChild(page);
}

function renderHeader() {
  const header = document.createElement('header');
  header.className = 'calendar-header';

  const title = document.createElement('h2');
  title.className = 'calendar-header__title';
  title.textContent = 'Calendário';
  header.appendChild(title);

  const actions = document.createElement('div');
  actions.className = 'calendar-header__actions';

  const btnNew = document.createElement('button');
  btnNew.type = 'button';
  btnNew.className = 'calendar-btn calendar-btn--primary';
  btnNew.textContent = 'Novo evento';
  btnNew.addEventListener('click', () => openForm());
  actions.appendChild(btnNew);

  header.appendChild(actions);
  return header;
}

function renderListGrouped() {
  const wrap = document.createElement('div');
  wrap.className = 'calendar-list';

  // Agrupar por data (parte YYYY-MM-DD do start)
  const groups = {};
  for (const ev of _state.events) {
    const day = (ev.start || '').split('T')[0] || '?';
    if (!groups[day]) groups[day] = [];
    groups[day].push(ev);
  }

  // Renderizar grupos por ordem de data
  for (const day of Object.keys(groups).sort()) {
    const group = document.createElement('div');
    group.className = 'calendar-group';

    const label = document.createElement('div');
    label.className = 'calendar-group__date';
    label.textContent = formatDayLabel(day);
    group.appendChild(label);

    for (const ev of groups[day]) {
      group.appendChild(renderEventItem(ev));
    }

    wrap.appendChild(group);
  }

  return wrap;
}

function formatDayLabel(isoDay) {
  if (!isoDay || isoDay === '?') return 'Sem data';
  const d = new Date(isoDay + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return isoDay;
  try {
    return d.toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  } catch (e) {
    return isoDay;
  }
}

function renderState(message, isError = false) {
  const div = document.createElement('div');
  div.className = 'calendar-state' + (isError ? ' calendar-state--error' : '');
  div.textContent = message;
  return div;
}

/* ============================================================
   ITEM DO EVENTO
   ============================================================ */

function renderEventItem(ev) {
  const item = document.createElement('article');
  item.className = 'calendar-item';
  if (ev.allDay) item.classList.add('calendar-item--allday');

  const header = document.createElement('div');
  header.className = 'calendar-item__header';

  const name = document.createElement('h3');
  name.className = 'calendar-item__name';
  name.textContent = ev.title || '(sem título)';
  header.appendChild(name);

  // Hora (se não for allDay)
  if (!ev.allDay && ev.start) {
    const time = document.createElement('span');
    time.className = 'calendar-item__time';
    const s = ev.start.split('T')[1] || '';
    const e = (ev.end || '').split('T')[1] || '';
    time.textContent = s && e ? (s.slice(0,5) + '–' + e.slice(0,5)) : s.slice(0,5);
    header.appendChild(time);
  } else if (ev.allDay) {
    const time = document.createElement('span');
    time.className = 'calendar-item__time';
    time.textContent = 'Dia inteiro';
    header.appendChild(time);
  }

  const actions = document.createElement('div');
  actions.className = 'calendar-item__actions';

  const btnEdit = document.createElement('button');
  btnEdit.type = 'button';
  btnEdit.textContent = '✎';
  btnEdit.title = 'Editar';
  btnEdit.setAttribute('aria-label', 'Editar');
  btnEdit.addEventListener('click', () => openForm(ev.id));
  actions.appendChild(btnEdit);

  const btnDelete = document.createElement('button');
  btnDelete.type = 'button';
  btnDelete.textContent = '✕';
  btnDelete.title = 'Apagar';
  btnDelete.setAttribute('aria-label', 'Apagar');
  btnDelete.addEventListener('click', () => handleDelete(ev));
  actions.appendChild(btnDelete);

  header.appendChild(actions);
  item.appendChild(header);

  const meta = document.createElement('div');
  meta.className = 'calendar-item__meta';
  if (ev.category) meta.appendChild(metaTag(t('category', ev.category)));
  if (ev.location) meta.appendChild(metaTag(ev.location));
  if (ev.recurrence && ev.recurrence !== 'none') meta.appendChild(metaTag(ev.recurrence));
  item.appendChild(meta);

  if (ev.description) {
    const desc = document.createElement('p');
    desc.className = 'calendar-item__description';
    desc.textContent = ev.description;
    item.appendChild(desc);
  }

  return item;
}

function metaTag(text) {
  const span = document.createElement('span');
  span.className = 'calendar-item__tag';
  span.textContent = text;
  return span;
}

/* ============================================================
   FORMULÁRIO
   ============================================================ */

function openForm(eventId = null) {
  _state.editingId = eventId;
  _state.showForm = true;
  render();
}

function closeForm() {
  _state.editingId = null;
  _state.showForm = false;
  render();
}

function updateFormError(message) {
  const el = _container ? _container.querySelector('.calendar-form__error') : null;
  if (el) {
    el.textContent = message || '';
    el.hidden = !message;
  }
}

function renderForm() {
  const isEdit = Boolean(_state.editingId);
  const ev = isEdit ? _state.events.find(e => e.id === _state.editingId) : null;

  const form = document.createElement('form');
  form.className = 'calendar-form';
  form.noValidate = true;
  form.addEventListener('submit', handleSubmit);

  const title = document.createElement('h3');
  title.className = 'calendar-form__title';
  title.textContent = isEdit ? 'Editar evento' : 'Novo evento';
  form.appendChild(title);

  const grid = document.createElement('div');
  grid.className = 'calendar-form__grid';

  grid.appendChild(field('Título *', 'input', 'title', ev ? ev.title : '', { type: 'text', required: true }));
  grid.appendChild(field('Descrição', 'textarea', 'description', ev ? ev.description : '', { full: true }));

  // Início / Fim com datetime-local
  const startVal = ev && ev.start ? ev.start.slice(0, 16) : defaultStart();
  const endVal = ev && ev.end ? ev.end.slice(0, 16) : defaultEnd();
  grid.appendChild(field('Início *', 'input', 'start', startVal, { type: 'datetime-local', required: true }));
  grid.appendChild(field('Fim *', 'input', 'end', endVal, { type: 'datetime-local', required: true }));

  grid.appendChild(fieldCheckbox('Dia inteiro', 'allDay', ev ? ev.allDay : false));

  grid.appendChild(field('Categoria', 'select', 'category', ev ? ev.category : 'personal', {
    options: ['personal','work','study','health','finance','home','lumiere','leisure','other'],
    translate: 'category'
  }));
  grid.appendChild(field('Local', 'input', 'location', ev ? ev.location : '', { type: 'text' }));
  grid.appendChild(field('Recorrência', 'select', 'recurrence', ev ? ev.recurrence : 'none', {
    options: ['none','daily','weekly','monthly','yearly'],
    labels: { none: 'Nenhuma', daily: 'Diária', weekly: 'Semanal', monthly: 'Mensal', yearly: 'Anual' }
  }));
  grid.appendChild(fieldCheckbox('Lembrete', 'reminder', ev ? ev.reminder : false));
  grid.appendChild(field('Notas', 'textarea', 'notes', ev ? ev.notes : '', { full: true }));

  form.appendChild(grid);

  const error = document.createElement('p');
  error.className = 'calendar-form__error';
  error.hidden = true;
  form.appendChild(error);

  const actions = document.createElement('div');
  actions.className = 'calendar-form__actions';

  const btnCancel = document.createElement('button');
  btnCancel.type = 'button';
  btnCancel.className = 'calendar-btn';
  btnCancel.textContent = 'Cancelar';
  btnCancel.addEventListener('click', () => closeForm());
  actions.appendChild(btnCancel);

  const btnSave = document.createElement('button');
  btnSave.type = 'submit';
  btnSave.className = 'calendar-btn calendar-btn--primary';
  btnSave.textContent = isEdit ? 'Guardar' : 'Criar';
  actions.appendChild(btnSave);

  form.appendChild(actions);
  return form;
}

function defaultStart() {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  return toLocalInputValue(d);
}

function defaultEnd() {
  const d = new Date();
  d.setHours(d.getHours() + 1, 0, 0, 0);
  return toLocalInputValue(d);
}

function toLocalInputValue(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return date.getFullYear() + '-' + pad(date.getMonth()+1) + '-' + pad(date.getDate())
    + 'T' + pad(date.getHours()) + ':' + pad(date.getMinutes());
}

function field(labelText, tag, name, value, opts = {}) {
  const wrap = document.createElement('div');
  wrap.className = 'calendar-form__field' + (opts.full ? ' calendar-form__field--full' : '');

  const label = document.createElement('label');
  label.setAttribute('for', 'cal-' + name);
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
  } else {
    input = document.createElement('input');
    input.type = opts.type || 'text';
    input.value = value === undefined || value === null ? '' : value;
  }
  input.id = 'cal-' + name;
  input.name = name;
  if (opts.required) input.required = true;

  wrap.appendChild(input);
  return wrap;
}

function fieldCheckbox(labelText, name, checked) {
  const wrap = document.createElement('div');
  wrap.className = 'calendar-form__field calendar-form__field--checkbox';

  const input = document.createElement('input');
  input.type = 'checkbox';
  input.id = 'cal-' + name;
  input.name = name;
  input.checked = Boolean(checked);
  wrap.appendChild(input);

  const label = document.createElement('label');
  label.setAttribute('for', 'cal-' + name);
  label.textContent = labelText;
  wrap.appendChild(label);

  return wrap;
}

/* ============================================================
   AÇÕES
   ============================================================ */

async function handleSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const formData = new FormData(form);
  const data = Object.fromEntries(formData.entries());

  // Checkboxes
  data.allDay = formData.has('allDay');
  data.reminder = formData.has('reminder');

  for (const k of Object.keys(data)) {
    if (typeof data[k] === 'string') data[k] = data[k].trim();
  }

  if (!data.title) { updateFormError('O título é obrigatório.'); return; }
  if (!data.start) { updateFormError('A data de início é obrigatória.'); return; }
  if (!data.end) { updateFormError('A data de fim é obrigatória.'); return; }

  // Normalizar para ISO (datetime-local dá "YYYY-MM-DDTHH:mm")
  const startISO = data.start.length === 16 ? data.start + ':00' : data.start;
  const endISO = data.end.length === 16 ? data.end + ':00' : data.end;

  if (new Date(startISO) >= new Date(endISO)) {
    updateFormError('O início tem de ser antes do fim.');
    return;
  }

  data.start = startISO;
  data.end = endISO;

  const btn = form.querySelector('button[type="submit"]');
  if (btn) btn.disabled = true;

  try {
    if (_state.editingId) {
      await dataManager.update('calendarEvents', _state.editingId, data);
      console.log('[Calendar] Evento atualizado:', _state.editingId);
    } else {
      const created = await dataManager.create('calendarEvents', data);
      console.log('[Calendar] Evento criado:', created.id);
    }
    _state.showForm = false;
    _state.editingId = null;
  } catch (err) {
    console.error('[Calendar] Erro ao guardar:', err);
    updateFormError(err.message || 'Erro ao guardar.');
    if (btn) btn.disabled = false;
  }
}

async function handleDelete(ev) {
  const name = ev.title || '(sem título)';
  if (!confirm('Apagar o evento "' + name + '"?')) return;
  try {
    await dataManager.delete('calendarEvents', ev.id);
    console.log('[Calendar] Evento apagado:', ev.id);
  } catch (err) {
    console.error('[Calendar] Erro ao apagar:', err);
  }
}

export const calendarPage = { init: initCalendar };
export default calendarPage;
