/**
 * Notes Page
 */
import { dataManager } from '../../core/dataManager.js';
import { eventBus } from '../../core/eventBus.js';
import { t } from '../../js/i18n.js';

let _container = null;
let _state = {
  notes: [],
  editingId: null,
  showForm: false,
  loading: false,
  error: null
};
let _unsubscribe = null;

export function initNotes(container) {
  if (!container) {
    console.warn('[Notes] container inválido.');
    return;
  }
  _container = container;

  if (_unsubscribe) _unsubscribe();
  _unsubscribe = eventBus.on('data:changed', (payload) => {
    if (payload && payload.collection === 'notes') {
      loadNotes();
    }
  });

  loadNotes();
}

async function loadNotes() {
  _state.loading = true;
  _state.error = null;
  render();

  try {
    const notes = await dataManager.list('notes');
    let arr = Array.isArray(notes) ? notes : [];
    // Ordenar: fixadas primeiro, depois por updatedAt (mais recentes no topo)
    arr = arr.slice().sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return (b.updatedAt || '').localeCompare(a.updatedAt || '');
    });
    _state.notes = arr;
  } catch (err) {
    console.error('[Notes] Erro ao carregar:', err);
    _state.error = err.message || 'Erro ao carregar notas.';
    _state.notes = [];
  } finally {
    _state.loading = false;
    render();
  }
}

function render() {
  if (!_container) return;
  _container.innerHTML = '';

  const page = document.createElement('div');
  page.className = 'notes-page';

  page.appendChild(renderHeader());

  if (_state.showForm) {
    page.appendChild(renderForm());
  }

  if (_state.loading) {
    page.appendChild(renderState('A carregar notas…'));
  } else if (_state.error) {
    page.appendChild(renderState(_state.error, true));
  } else if (_state.notes.length === 0) {
    page.appendChild(renderState('Sem notas. Toque em "Nova nota" para criar a primeira.'));
  } else {
    const list = document.createElement('div');
    list.className = 'notes-list';
    for (const note of _state.notes) {
      list.appendChild(renderNoteItem(note));
    }
    page.appendChild(list);
  }

  _container.appendChild(page);
}

function renderHeader() {
  const header = document.createElement('header');
  header.className = 'notes-header';

  const title = document.createElement('h2');
  title.className = 'notes-header__title';
  title.textContent = 'Notas';
  header.appendChild(title);

  const actions = document.createElement('div');
  actions.className = 'notes-header__actions';

  const btnNew = document.createElement('button');
  btnNew.type = 'button';
  btnNew.className = 'notes-btn notes-btn--primary';
  btnNew.textContent = 'Nova nota';
  btnNew.addEventListener('click', () => openForm());
  actions.appendChild(btnNew);

  header.appendChild(actions);
  return header;
}

function renderState(message, isError = false) {
  const div = document.createElement('div');
  div.className = 'notes-state' + (isError ? ' notes-state--error' : '');
  div.textContent = message;
  return div;
}

/* ============================================================
   FORMULÁRIO
   ============================================================ */

function openForm(noteId = null) {
  _state.editingId = noteId;
  _state.showForm = true;
  render();
}

function closeForm() {
  _state.editingId = null;
  _state.showForm = false;
  render();
}

function updateFormError(message) {
  const el = _container ? _container.querySelector('.notes-form__error') : null;
  if (el) {
    el.textContent = message || '';
    el.hidden = !message;
  }
}

function renderForm() {
  const isEdit = Boolean(_state.editingId);
  const note = isEdit ? _state.notes.find(n => n.id === _state.editingId) : null;

  const form = document.createElement('form');
  form.className = 'notes-form';
  form.noValidate = true;
  form.addEventListener('submit', handleSubmit);

  const title = document.createElement('h3');
  title.className = 'notes-form__title';
  title.textContent = isEdit ? 'Editar nota' : 'Nova nota';
  form.appendChild(title);

  const grid = document.createElement('div');
  grid.className = 'notes-form__grid';

  grid.appendChild(field('Título *', 'input', 'title', note ? note.title : '', { type: 'text', required: true }));
  grid.appendChild(field('Conteúdo *', 'textarea', 'content', note ? note.content : '', { full: true, required: true }));
  grid.appendChild(field('Categoria', 'select', 'category', note ? note.category : 'personal', {
    options: ['personal','work','study','health','finance','home','lumiere','leisure','other'],
    translate: 'category'
  }));
  grid.appendChild(field('Etiquetas (separadas por vírgula)', 'input', 'tagsRaw', note && Array.isArray(note.tags) ? note.tags.join(', ') : '', { full: true, type: 'text' }));
  grid.appendChild(fieldCheckbox('Fixar no topo', 'pinned', note ? note.pinned : false));
  grid.appendChild(fieldCheckbox('Arquivar', 'archived', note ? note.archived : false));

  form.appendChild(grid);

  const error = document.createElement('p');
  error.className = 'notes-form__error';
  error.hidden = true;
  form.appendChild(error);

  const actions = document.createElement('div');
  actions.className = 'notes-form__actions';

  const btnCancel = document.createElement('button');
  btnCancel.type = 'button';
  btnCancel.className = 'notes-btn';
  btnCancel.textContent = 'Cancelar';
  btnCancel.addEventListener('click', () => closeForm());
  actions.appendChild(btnCancel);

  const btnSave = document.createElement('button');
  btnSave.type = 'submit';
  btnSave.className = 'notes-btn notes-btn--primary';
  btnSave.textContent = isEdit ? 'Guardar' : 'Criar';
  actions.appendChild(btnSave);

  form.appendChild(actions);
  return form;
}

function field(labelText, tag, name, value, opts = {}) {
  const wrap = document.createElement('div');
  wrap.className = 'notes-form__field' + (opts.full ? ' notes-form__field--full' : '');

  const label = document.createElement('label');
  label.setAttribute('for', 'note-' + name);
  label.textContent = labelText;
  wrap.appendChild(label);

  let input;
  if (tag === 'textarea') {
    input = document.createElement('textarea');
    input.rows = 6;
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
  input.id = 'note-' + name;
  input.name = name;
  if (opts.required) input.required = true;

  wrap.appendChild(input);
  return wrap;
}

function fieldCheckbox(labelText, name, checked) {
  const wrap = document.createElement('div');
  wrap.className = 'notes-form__field notes-form__field--checkbox';

  const input = document.createElement('input');
  input.type = 'checkbox';
  input.id = 'note-' + name;
  input.name = name;
  input.checked = Boolean(checked);
  wrap.appendChild(input);

  const label = document.createElement('label');
  label.setAttribute('for', 'note-' + name);
  label.textContent = labelText;
  wrap.appendChild(label);

  return wrap;
}

/* ============================================================
   ITEM DA LISTA
   ============================================================ */

function renderNoteItem(note) {
  const item = document.createElement('article');
  item.className = 'note-item';
  if (note.pinned) item.classList.add('note-item--pinned');
  if (note.archived) item.classList.add('note-item--archived');

  const header = document.createElement('div');
  header.className = 'note-item__header';

  const name = document.createElement('h3');
  name.className = 'note-item__name';
  name.textContent = note.title || '(sem título)';
  header.appendChild(name);

  const actions = document.createElement('div');
  actions.className = 'note-item__actions';

  const btnPin = document.createElement('button');
  btnPin.type = 'button';
  btnPin.textContent = note.pinned ? '★' : '☆';
  btnPin.title = note.pinned ? 'Desfixar' : 'Fixar no topo';
  btnPin.setAttribute('aria-label', btnPin.title);
  btnPin.addEventListener('click', () => handleTogglePin(note));
  actions.appendChild(btnPin);

  const btnEdit = document.createElement('button');
  btnEdit.type = 'button';
  btnEdit.textContent = '✎';
  btnEdit.title = 'Editar';
  btnEdit.setAttribute('aria-label', 'Editar');
  btnEdit.addEventListener('click', () => openForm(note.id));
  actions.appendChild(btnEdit);

  const btnDelete = document.createElement('button');
  btnDelete.type = 'button';
  btnDelete.textContent = '✕';
  btnDelete.title = 'Apagar';
  btnDelete.setAttribute('aria-label', 'Apagar');
  btnDelete.addEventListener('click', () => handleDelete(note));
  actions.appendChild(btnDelete);

  header.appendChild(actions);
  item.appendChild(header);

  const meta = document.createElement('div');
  meta.className = 'note-item__meta';
  if (note.category) meta.appendChild(metaTag(t('category', note.category)));
  if (note.pinned) meta.appendChild(metaTagGold('Fixada'));
  if (note.archived) meta.appendChild(metaTag('Arquivada'));
  if (Array.isArray(note.tags) && note.tags.length > 0) {
    for (const tag of note.tags) meta.appendChild(metaTag(tag));
  }
  item.appendChild(meta);

  if (note.content) {
    const content = document.createElement('p');
    content.className = 'note-item__content';
    content.textContent = note.content;
    item.appendChild(content);
  }

  return item;
}

function metaTag(text) {
  const span = document.createElement('span');
  span.className = 'note-item__tag';
  span.textContent = text;
  return span;
}

function metaTagGold(text) {
  const span = document.createElement('span');
  span.className = 'note-item__tag note-item__tag--gold';
  span.textContent = text;
  return span;
}

/* ============================================================
   AÇÕES
   ============================================================ */

async function handleSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const formData = new FormData(form);
  const data = Object.fromEntries(formData.entries());

  // Checkboxes só aparecem no FormData se marcados
  data.pinned = formData.has('pinned');
  data.archived = formData.has('archived');

  for (const k of Object.keys(data)) {
    if (typeof data[k] === 'string') data[k] = data[k].trim();
  }

  if (!data.title) { updateFormError('O título é obrigatório.'); return; }
  if (!data.content) { updateFormError('O conteúdo é obrigatório.'); return; }

  // Processar tags
  if (data.tagsRaw !== undefined) {
    const raw = data.tagsRaw || '';
    data.tags = raw ? raw.split(',').map(s => s.trim()).filter(Boolean) : [];
    delete data.tagsRaw;
  }

  const btn = form.querySelector('button[type="submit"]');
  if (btn) btn.disabled = true;

  try {
    if (_state.editingId) {
      await dataManager.update('notes', _state.editingId, data);
      console.log('[Notes] Atualizada:', _state.editingId);
    } else {
      const created = await dataManager.create('notes', data);
      console.log('[Notes] Criada:', created.id);
    }
    _state.showForm = false;
    _state.editingId = null;
  } catch (err) {
    console.error('[Notes] Erro ao guardar:', err);
    updateFormError(err.message || 'Erro ao guardar.');
    if (btn) btn.disabled = false;
  }
}

async function handleTogglePin(note) {
  try {
    await dataManager.update('notes', note.id, { pinned: !note.pinned });
    console.log('[Notes] Pin:', note.id, '->', !note.pinned);
  } catch (err) {
    console.error('[Notes] Erro ao alternar fixar:', err);
  }
}

async function handleDelete(note) {
  const name = note.title || '(sem título)';
  if (!confirm('Apagar a nota "' + name + '"?')) return;
  try {
    await dataManager.delete('notes', note.id);
    console.log('[Notes] Apagada:', note.id);
  } catch (err) {
    console.error('[Notes] Erro ao apagar:', err);
  }
}

export const notesPage = { init: initNotes };
export default notesPage;
