
// --- GESTÃO DE LISTENER GLOBAL (NOTAS) ---
if (!window.__lumiereNoteMenuListener) {
  window.__lumiereNoteMenuListener = true;
  document.addEventListener('click', (e) => {
    if (!(e.target instanceof Element)) return;
    if (!e.target.closest('details.note-item__actions')) {
      document.querySelectorAll('details.note-item__actions[open]').forEach(d => d.removeAttribute('open'));
    }
  });
}
/**
 * Notes Page
 */
import { dataManager } from '../../core/dataManager.js';
import { stateManager } from '../../core/stateManager.js';
import { requireAccess } from '../../core/auth.js';
import { eventBus } from '../../core/eventBus.js';
import { t } from '../../js/i18n.js';

// ============================================================
// Icones automaticos — 21 keywords (titulo) + 9 categorias
// ============================================================
const CATEGORY_EMOJI_NOTES = {
  personal: '\u{1F4DD}', work: '\u{1F4BC}', study: '\u{1F4DA}',
  health: '\u{2764}\u{FE0F}', finance: '\u{1F4B0}', home: '\u{1F3E0}',
  lumiere: '\u{2728}', leisure: '\u{1F3B5}', other: '\u{1F4CC}'
};

const KEYWORD_EMOJI_NOTES = [
  { kw: ['ideia', 'brainstorm', 'pensamento'], emoji: '\u{1F4A1}' },
  { kw: ['estrategia', 'plano', 'planeamento'], emoji: '\u{1F3AF}' },
  { kw: ['registo', 'diario', 'log', 'journal'], emoji: '\u{1F4D6}' },
  { kw: ['receita', 'como fazer', 'tutorial'], emoji: '\u{1F373}' },
  { kw: ['reuniao', 'ata', 'encontro'], emoji: '\u{1F5E3}' },
  { kw: ['lista', 'checklist', 'compras'], emoji: '\u{1F4CB}' },
  { kw: ['urgente', 'importante', 'atencao'], emoji: '\u{26A0}' },
  { kw: ['referencia', 'link', 'fonte'], emoji: '\u{1F517}' },
  { kw: ['estudo', 'apontamento', 'materia'], emoji: '\u{1F4DA}' },
  { kw: ['viagem', 'travel', 'destino'], emoji: '\u{2708}' },
  { kw: ['contacto', 'pessoa', 'telefone'], emoji: '\u{1F464}' },
  { kw: ['saude', 'medico', 'sintoma'], emoji: '\u{1FA7A}' },
  { kw: ['dinheiro', 'orcamento', 'conta'], emoji: '\u{1F4B0}' },
  { kw: ['citacao', 'frase', 'quote'], emoji: '\u{1F4AC}' },
  { kw: ['livro', 'leitura', 'capitulo'], emoji: '\u{1F4D5}' },
  { kw: ['filme', 'serie', 'assistir'], emoji: '\u{1F3AC}' },
  { kw: ['reflexao', 'meditacao'], emoji: '\u{1F9D8}' },
  { kw: ['gratidao', 'agradecer', 'obrigado'], emoji: '\u{1F64F}' },
  { kw: ['sonho', 'meta', 'objetivo'], emoji: '\u{1F31F}' },
  { kw: ['projeto', 'projecto', 'trabalho'], emoji: '\u{1F680}' },
  { kw: ['calculo', 'matematica', 'formula'], emoji: '\u{1F9EE}' }
];

function normalizeText(str) {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function emojiForNote(title, category) {
  const normalized = normalizeText(title);
  for (const item of KEYWORD_EMOJI_NOTES) {
    if (item.kw.some((k) => normalized.includes(normalizeText(k)))) return item.emoji;
  }
  return CATEGORY_EMOJI_NOTES[category] || '\u{1F4CC}';
}

let _container = null;
let _state = {
  notes: [],
  editingId: null,
  showForm: false,
  loading: false,
  error: null
};
let _unsubscribe = null;


function handleSaveNoteAsTemplate(note) {
  const templateData = {
    name: note.title,
    description: note.content || '',
    category: note.category || 'personal',
    appliesTo: 'notes',
    icon: '📝',
    payload: { title: note.title, content: note.content, category: note.category, tags: note.tags || [] }
  };
  localStorage.setItem('lumiere_template_prefill', JSON.stringify(templateData));
  stateManager.navigateTo('templates');
}

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
  if (!requireAccess()) return;
  _state.editingId = noteId;
  _state.showForm = true;
  render();
  eventBus.emit('form:opened', { page: 'notes', editingId: noteId || null });
}

function closeForm() {
  _state.editingId = null;
  _state.showForm = false;
  render();
  eventBus.emit('form:closed', { page: 'notes' });
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
  item.className = 'lum-card lum-card--note note-item';
  if (note.pinned) item.classList.add('note-item--pinned');
  if (note.archived) item.classList.add('note-item--archived');

  const header = document.createElement('div');
  header.className = 'lum-card__header note-item__header';
  const headerLeft = document.createElement('div');
  headerLeft.className = 'lum-card__header-left note-item__header-left';

  // Ícone SVG de Folha de Papel (Premium)
  const icon = document.createElement('span');
  icon.className = 'lum-card__icon note-item__icon';
  const svgIcon = '<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>';
  
  if (note.icon) {
    icon.textContent = note.icon;
  } else {
    icon.innerHTML = svgIcon;
  }
  icon.setAttribute('aria-hidden', 'true');
  headerLeft.appendChild(icon);

  const name = document.createElement('h3');
  name.className = 'lum-card__title note-item__name';
  name.textContent = note.title || '(sem título)';
  headerLeft.appendChild(name);
  header.appendChild(headerLeft);

  // Menu de 3 Pontos
  const actions = document.createElement('details');
  actions.className = 'lum-card__actions note-item__actions';
  const summary = document.createElement('summary');
  summary.className = 'note-item__menu-btn';
  summary.innerHTML = '⋮';
  summary.setAttribute('aria-label', 'Mais ações');
  actions.appendChild(summary);
  
  const menuDropdown = document.createElement('div');
  menuDropdown.className = 'note-item__menu-dropdown';

  const btnPin = document.createElement('button');
  btnPin.type = 'button';
  btnPin.innerHTML = note.pinned ? '★ Desfixar' : '☆ Fixar no topo';
  btnPin.addEventListener('click', (e) => { e.preventDefault(); actions.removeAttribute('open'); handleTogglePin(note); });
  menuDropdown.appendChild(btnPin);

  const btnEdit = document.createElement('button');
  btnEdit.type = 'button';
  btnEdit.innerHTML = '✎ Editar';
  btnEdit.addEventListener('click', (e) => { e.preventDefault(); actions.removeAttribute('open'); openForm(note.id); });
  menuDropdown.appendChild(btnEdit);

  const btnTemplate = document.createElement('button');
  btnTemplate.type = 'button';
  btnTemplate.innerHTML = '📋 Guardar como Template';
  btnTemplate.addEventListener('click', (e) => { e.preventDefault(); actions.removeAttribute('open'); handleSaveNoteAsTemplate(note); });
  menuDropdown.appendChild(btnTemplate);

  const btnDelete = document.createElement('button');
  btnDelete.type = 'button';
  btnDelete.innerHTML = '✕ Apagar';
  btnDelete.addEventListener('click', (e) => { e.preventDefault(); actions.removeAttribute('open'); handleDelete(note); });
  menuDropdown.appendChild(btnDelete);

  actions.appendChild(menuDropdown);
  header.appendChild(actions);
  item.appendChild(header);

  // Tags
  const meta = document.createElement('div');
  meta.className = 'note-item__meta';
  if (note.category) meta.appendChild(metaTag(t('category', note.category)));
  if (note.pinned) meta.appendChild(metaTagGold('Fixada'));
  if (note.archived) meta.appendChild(metaTag('Arquivada'));
  if (Array.isArray(note.tags) && note.tags.length > 0) {
    for (const tag of note.tags) meta.appendChild(metaTag(tag));
  }
  item.appendChild(meta);

  // Conteúdo Expansível (Ler Mais)
  if (note.content) {
    const descWrap = document.createElement('div');
    descWrap.className = 'note-item__desc-wrap';
    const content = document.createElement('p');
    content.className = 'note-item__content';
    content.textContent = note.content;
    descWrap.appendChild(content);

    const btnReadMore = document.createElement('button');
    btnReadMore.type = 'button';
    btnReadMore.className = 'note-item__read-more';
    btnReadMore.textContent = 'Ler mais';
    btnReadMore.style.display = 'none';
    descWrap.appendChild(btnReadMore);
    item.appendChild(descWrap);

    btnReadMore.addEventListener('click', (e) => {
      e.stopPropagation();
      const isExpanded = descWrap.classList.toggle('is-expanded');
      btnReadMore.textContent = isExpanded ? 'Mostrar menos' : 'Ler mais';
      if (!isExpanded) btnReadMore.style.display = (content.scrollHeight > content.clientHeight + 2) ? 'block' : 'none';
    });

    const observer = new ResizeObserver(() => {
      if (descWrap.classList.contains('is-expanded')) {
        btnReadMore.style.display = 'block';
        return;
      }
      btnReadMore.style.display = (content.scrollHeight > content.clientHeight + 2) ? 'block' : 'none';
    });
    observer.observe(content);
    
    const listObserver = new MutationObserver(() => {
      if (!document.body.contains(content)) {
        observer.disconnect();
        listObserver.disconnect();
      }
    });
    listObserver.observe(document.body, { childList: true, subtree: true });
  }

  // Rodapé (Data e Seta)
  const footer = document.createElement('div');
  footer.className = 'note-item__footer';
  
  let dateStr = '';
  if (note.updatedAt) {
    const d = new Date(note.updatedAt);
    const now = new Date();
    const isToday = d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    const timeStr = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
    dateStr = isToday ? `Hoje, ${timeStr}` : `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth()+1).padStart(2, '0')}, ${timeStr}`;
  }

  if (dateStr) {
    const dateSpan = document.createElement('span');
    dateSpan.className = 'note-item__footer-info';
    const calIcon = '<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px; vertical-align:text-bottom;"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>';
    dateSpan.innerHTML = calIcon;
    dateSpan.appendChild(document.createTextNode(' ' + dateStr));
    footer.appendChild(dateSpan);
  }

  // Seta do Mockup
  const arrowIcon = document.createElement('span');
  arrowIcon.className = 'note-item__arrow';
  arrowIcon.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>';
  footer.appendChild(arrowIcon);

  item.appendChild(footer);

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
    eventBus.emit('form:closed', { page: 'notes' });
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
