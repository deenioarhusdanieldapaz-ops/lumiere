/**
 * Studies Page
 *
 * Primeira página com sub-entidade (StudySession).
 * Cada estudo carrega as suas sessões e mostra-as dentro do cartão.
 */
import { dataManager } from '../../core/dataManager.js';
import { eventBus } from '../../core/eventBus.js';
import { t } from '../../js/i18n.js';

let _container = null;
let _state = {
  studies: [],
  sessionsByStudy: {},   // { studyId: [sessions] }
  goals: [],
  editingId: null,
  showForm: false,
  loading: false,
  error: null
};

let _unsubscribe = null;

export function initStudies(container) {
  if (!container) {
    console.warn('[Studies] container inválido.');
    return;
  }
  _container = container;

  if (_unsubscribe) _unsubscribe();
  _unsubscribe = eventBus.on('data:changed', (payload) => {
    if (payload && (payload.collection === 'studies' || payload.collection === 'studySessions')) {
      loadStudies();
    }
  });

  loadStudies();
}

async function loadStudies() {
  _state.loading = true;
  _state.error = null;
  render();

  try {
    const studies = await dataManager.list('studies');
    const [sessions, goals] = await Promise.all([
      dataManager.list('studySessions').catch(() => []),
      dataManager.list('goals').catch(() => [])
    ]);
    _state.goals = Array.isArray(goals) ? goals : [];

    const studiesArr = Array.isArray(studies) ? studies : [];
    const sessionsArr = Array.isArray(sessions) ? sessions : [];

    // Agrupar sessões por studyId
    const byStudy = {};
    for (const s of sessionsArr) {
      if (!byStudy[s.studyId]) byStudy[s.studyId] = [];
      byStudy[s.studyId].push(s);
    }
    // Ordenar sessões por data desc
    for (const id of Object.keys(byStudy)) {
      byStudy[id].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    }

    _state.studies = studiesArr;
    _state.sessionsByStudy = byStudy;
  } catch (err) {
    console.error('[Studies] Erro ao carregar:', err);
    _state.error = err.message || 'Erro ao carregar estudos.';
    _state.studies = [];
    _state.sessionsByStudy = {};
  } finally {
    _state.loading = false;
    render();
  }
}

function render() {
  if (!_container) return;
  _container.innerHTML = '';

  const page = document.createElement('div');
  page.className = 'studies-page';

  page.appendChild(renderHeader());

  if (_state.showForm) {
    page.appendChild(renderForm());
  }

  if (_state.loading) {
    page.appendChild(renderState('A carregar estudos…'));
  } else if (_state.error) {
    page.appendChild(renderState(_state.error, true));
  } else if (_state.studies.length === 0) {
    page.appendChild(renderState('Sem estudos. Toque em "Novo estudo" para criar o primeiro.'));
  } else {
    page.appendChild(renderList());
  }

  _container.appendChild(page);
}

function renderHeader() {
  const header = document.createElement('header');
  header.className = 'studies-header';

  const title = document.createElement('h2');
  title.className = 'studies-header__title';
  title.textContent = 'Estudos';
  header.appendChild(title);

  const actions = document.createElement('div');
  actions.className = 'studies-header__actions';

  const btnNew = document.createElement('button');
  btnNew.type = 'button';
  btnNew.className = 'studies-btn studies-btn--primary';
  btnNew.textContent = 'Novo estudo';
  btnNew.addEventListener('click', () => openForm());
  actions.appendChild(btnNew);

  header.appendChild(actions);
  return header;
}

function renderList() {
  const list = document.createElement('div');
  list.className = 'studies-list';
  for (const study of _state.studies) {
    list.appendChild(renderStudyItem(study));
  }
  return list;
}

function renderStudyItem(study) {
  const item = document.createElement('article');
  item.className = 'study-item';
  if (study.status === 'completed') item.classList.add('study-item--completed');
  if (study.status === 'paused') item.classList.add('study-item--paused');

  const header = document.createElement('div');
  header.className = 'study-item__header';

  const name = document.createElement('h3');
  name.className = 'study-item__name';
  name.textContent = study.name || '(sem nome)';
  header.appendChild(name);

  const actions = document.createElement('div');
  actions.className = 'study-item__actions';

  const btnToggle = document.createElement('button');
  btnToggle.type = 'button';
  btnToggle.textContent = study.status === 'completed' ? '↺' : '✓';
  btnToggle.title = study.status === 'completed' ? 'Reabrir' : 'Marcar como concluído';
  btnToggle.setAttribute('aria-label', btnToggle.title);
  btnToggle.addEventListener('click', () => handleToggle(study));
  actions.appendChild(btnToggle);

  const btnEdit = document.createElement('button');
  btnEdit.type = 'button';
  btnEdit.textContent = '✎';
  btnEdit.title = 'Editar';
  btnEdit.setAttribute('aria-label', 'Editar');
  btnEdit.addEventListener('click', () => openForm(study.id));
  actions.appendChild(btnEdit);

  const btnDelete = document.createElement('button');
  btnDelete.type = 'button';
  btnDelete.textContent = '✕';
  btnDelete.title = 'Apagar';
  btnDelete.setAttribute('aria-label', 'Apagar');
  btnDelete.addEventListener('click', () => handleDelete(study));
  actions.appendChild(btnDelete);

  header.appendChild(actions);

  item.appendChild(header);

  const meta = document.createElement('div');
  meta.className = 'study-item__meta';
  if (study.subject) meta.appendChild(metaTag(study.subject));
  meta.appendChild(metaTag(study.category ? t('category', study.category) : '—'));
  meta.appendChild(metaTag(t('studyStatus', study.status)));
  if (study.priority) meta.appendChild(metaTag(t('priority', study.priority)));
  item.appendChild(meta);

  if (study.description) {
    const desc = document.createElement('p');
    desc.className = 'study-item__description';
    desc.textContent = study.description;
    item.appendChild(desc);
  }

  // Sessões (por agora só mostra; será interativo no 8.4e)
  const sessions = _state.sessionsByStudy[study.id] || [];
  item.appendChild(renderSessionsList(sessions, study));

  return item;
}

function renderSessionsList(sessions, study) {
  const wrap = document.createElement('div');
  wrap.className = 'study-sessions';

  const title = document.createElement('h4');
  title.className = 'study-sessions__title';
  title.textContent = 'Sessões (' + sessions.length + ')';
  wrap.appendChild(title);

  for (const s of sessions) {
    const row = document.createElement('div');
    row.className = 'study-session';

    const info = document.createElement('div');
    info.className = 'study-session__info';

    const line = document.createElement('div');
    const date = document.createElement('span');
    date.className = 'study-session__date';
    date.textContent = s.date || '—';
    line.appendChild(date);
    line.appendChild(document.createTextNode(' · '));

    const dur = document.createElement('span');
    dur.className = 'study-session__duration';
    dur.textContent = (s.duration || 0) + ' min';
    line.appendChild(dur);
    info.appendChild(line);

    if (s.notes) {
      const notes = document.createElement('div');
      notes.className = 'study-session__notes';
      notes.textContent = s.notes;
      info.appendChild(notes);
    }

    row.appendChild(info);

    const btnDel = document.createElement('button');
    btnDel.type = 'button';
    btnDel.className = 'study-session__delete';
    btnDel.textContent = '✕';
    btnDel.title = 'Apagar sessão';
    btnDel.setAttribute('aria-label', 'Apagar sessão');
    btnDel.addEventListener('click', () => handleDeleteSession(s));
    row.appendChild(btnDel);

    wrap.appendChild(row);
  }

  // Formulário inline para adicionar sessão
  wrap.appendChild(renderSessionForm(study));

  return wrap;
}

function renderSessionForm(study) {
  const form = document.createElement('form');
  form.className = 'study-session-form';
  form.noValidate = true;
  form.addEventListener('submit', (e) => handleAddSession(e, study));

  const today = new Date().toISOString().split('T')[0];

  const dateInput = document.createElement('input');
  dateInput.type = 'date';
  dateInput.name = 'date';
  dateInput.value = today;
  dateInput.required = true;
  form.appendChild(dateInput);

  const durInput = document.createElement('input');
  durInput.type = 'number';
  durInput.name = 'duration';
  durInput.placeholder = 'min';
  durInput.min = '1';
  durInput.required = true;
  form.appendChild(durInput);

  const notesInput = document.createElement('input');
  notesInput.type = 'text';
  notesInput.name = 'notes';
  notesInput.placeholder = 'Notas (opcional)';
  form.appendChild(notesInput);

  const btn = document.createElement('button');
  btn.type = 'submit';
  btn.textContent = '+ Adicionar';
  form.appendChild(btn);

  return form;
}

async function handleAddSession(e, study) {
  e.preventDefault();
  const form = e.target;
  const formData = new FormData(form);
  const date = (formData.get('date') || '').trim();
  const duration = Number(formData.get('duration'));
  const notes = (formData.get('notes') || '').trim();

  if (!date) { console.warn('[Studies] Data obrigatória. Recebido:', JSON.stringify({date, duration})); return; }
  if (!duration || duration <= 0) { console.warn('[Studies] Duração inválida. Recebido:', JSON.stringify({date, duration, rawDur: formData.get('duration')})); return; }

  const btn = form.querySelector('button[type="submit"]');
  if (btn) btn.disabled = true;

  try {
    await dataManager.create('studySessions', {
      studyId: study.id,
      date: date,
      duration: duration,
      notes: notes
    });
    console.log('[Studies] Sessão adicionada:', study.id, date, duration + 'min');
  } catch (err) {
    console.error('[Studies] Erro ao adicionar sessão:', err);
    if (btn) btn.disabled = false;
  }
}

async function handleDeleteSession(session) {
  if (!confirm('Apagar esta sessão?')) return;
  try {
    await dataManager.delete('studySessions', session.id);
    console.log('[Studies] Sessão apagada:', session.id);
  } catch (err) {
    console.error('[Studies] Erro ao apagar sessão:', err);
  }
}

function metaTag(text) {
  const span = document.createElement('span');
  span.className = 'study-item__tag';
  span.textContent = text;
  return span;
}

function renderState(message, isError = false) {
  const div = document.createElement('div');
  div.className = 'studies-state' + (isError ? ' studies-state--error' : '');
  div.textContent = message;
  return div;
}

/* __STUDIES_FORM_FUNCTIONS__ */
function openForm(studyId = null) {
  _state.editingId = studyId;
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
  const el = _container ? _container.querySelector('.studies-form__error') : null;
  if (el) {
    el.textContent = message || '';
    el.hidden = !message;
  }
}

function renderForm() {
  const isEdit = Boolean(_state.editingId);
  const study = isEdit ? _state.studies.find(s => s.id === _state.editingId) : null;

  const form = document.createElement('form');
  form.className = 'studies-form';
  form.noValidate = true;
  form.addEventListener('submit', handleSubmit);

  const title = document.createElement('h3');
  title.className = 'studies-form__title';
  title.textContent = isEdit ? 'Editar estudo' : 'Novo estudo';
  form.appendChild(title);

  const grid = document.createElement('div');
  grid.className = 'studies-form__grid';

  grid.appendChild(field('Nome *', 'input', 'name', study ? study.name : '', { type: 'text', required: true }));
  grid.appendChild(field('Descrição', 'textarea', 'description', study ? study.description : '', { full: true }));
  grid.appendChild(field('Assunto *', 'input', 'subject', study ? study.subject : '', { type: 'text', required: true }));
  grid.appendChild(field('Categoria *', 'select', 'category', study ? study.category : 'study', {
    options: ['personal','work','study','health','finance','home','lumiere','leisure','other'],
    translate: 'category'
  }));
  grid.appendChild(field('Estado *', 'select', 'status', study ? study.status : 'planned', {
    options: ['planned','active','completed','paused'],
    translate: 'studyStatus'
  }));
  grid.appendChild(field('Prioridade', 'select', 'priority', study ? study.priority : 'medium', {
    options: ['low','medium','high','urgent'],
    translate: 'priority'
  }));
  grid.appendChild(field('Horas alvo', 'input', 'targetHours', study ? study.targetHours : 0, { type: 'number' }));
  grid.appendChild(field('Data de início', 'input', 'startDate', study ? study.startDate : '', { type: 'date' }));
  grid.appendChild(field('Data limite', 'input', 'dueDate', study ? study.dueDate : '', { type: 'date' }));

  // Objetivo ligado
  const goalWrap = document.createElement('div');
  goalWrap.className = 'studies-form__field studies-form__field--full';
  const goalLabel = document.createElement('label');
  goalLabel.setAttribute('for', 'study-goalId');
  goalLabel.textContent = 'Objetivo ligado';
  goalWrap.appendChild(goalLabel);
  const goalSelect = document.createElement('select');
  goalSelect.id = 'study-goalId';
  goalSelect.name = 'goalId';
  const noneOpt = document.createElement('option');
  noneOpt.value = '';
  noneOpt.textContent = '— Nenhum —';
  goalSelect.appendChild(noneOpt);
  if (Array.isArray(_state.goals)) {
    _state.goals.forEach(g => {
      if (g.status !== 'archived') {
        const opt = document.createElement('option');
        opt.value = g.id;
        opt.textContent = g.name || 'Sem titulo';
        if (study && study.goalId === g.id) opt.selected = true;
        goalSelect.appendChild(opt);
      }
    });
  }
  goalWrap.appendChild(goalSelect);
  grid.appendChild(goalWrap);

  grid.appendChild(field('Etiquetas (separadas por virgula)', 'input', 'tags', study && Array.isArray(study.tags) ? study.tags.join(', ') : '', { full: true }));
  grid.appendChild(field('Notas adicionais', 'textarea', 'notes', study ? study.notes : '', { full: true }));

  form.appendChild(grid);

  const error = document.createElement('p');
  error.className = 'studies-form__error';
  error.hidden = true;
  form.appendChild(error);

  const actions = document.createElement('div');
  actions.className = 'studies-form__actions';

  const btnCancel = document.createElement('button');
  btnCancel.type = 'button';
  btnCancel.className = 'studies-btn';
  btnCancel.textContent = 'Cancelar';
  btnCancel.addEventListener('click', () => closeForm());
  actions.appendChild(btnCancel);

  const btnSave = document.createElement('button');
  btnSave.type = 'submit';
  btnSave.className = 'studies-btn studies-btn--primary';
  btnSave.textContent = isEdit ? 'Guardar' : 'Criar';
  actions.appendChild(btnSave);

  form.appendChild(actions);
  return form;
}

function field(labelText, tag, name, value, opts = {}) {
  const wrap = document.createElement('div');
  wrap.className = 'studies-form__field' + (opts.full ? ' studies-form__field--full' : '');

  const label = document.createElement('label');
  label.setAttribute('for', 'study-' + name);
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
  input.id = 'study-' + name;
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

  // Conversao de tags
  if (typeof data.tags === 'string') {
    data.tags = data.tags.split(',').map(s => s.trim()).filter(Boolean);
  }

  if (!data.name) { updateFormError('O nome é obrigatório.'); return; }
  if (!data.subject) { updateFormError('O assunto é obrigatório.'); return; }
  if (!data.category) { updateFormError('A categoria é obrigatória.'); return; }
  if (!data.status) { updateFormError('O estado é obrigatório.'); return; }

  // Converter targetHours
  if (data.targetHours !== undefined && data.targetHours !== '') {
    data.targetHours = Number(data.targetHours);
    if (Number.isNaN(data.targetHours) || data.targetHours < 0) {
      updateFormError('As horas alvo devem ser um número positivo.');
      return;
    }
  } else {
    delete data.targetHours;
  }

  const btn = form.querySelector('button[type="submit"]');
  if (btn) btn.disabled = true;

  try {
    if (_state.editingId) {
      await dataManager.update('studies', _state.editingId, data);
      console.log('[Studies] Atualizado:', _state.editingId);
    } else {
      const created = await dataManager.create('studies', data);
      console.log('[Studies] Criado:', created.id);
    }
    _state.showForm = false;
    _state.editingId = null;
  } catch (err) {
    console.error('[Studies] Erro ao guardar:', err);
    updateFormError(err.message || 'Erro ao guardar.');
    if (btn) btn.disabled = false;
  }
}

/* __STUDIES_ACTIONS_84D__ */
async function handleToggle(study) {
  const newStatus = study.status === 'completed' ? 'active' : 'completed';
  try {
    await dataManager.update('studies', study.id, { status: newStatus });
    console.log('[Studies] Estado:', study.id, '->', newStatus);
  } catch (err) {
    console.error('[Studies] Erro ao alternar:', err);
  }
}

async function handleDelete(study) {
  const name = study.name || '(sem nome)';
  if (!confirm('Apagar o estudo "' + name + '" e todas as sessões?')) return;
  try {
    // Apagar sessões associadas primeiro
    const [sessions, goals] = await Promise.all([
      dataManager.list('studySessions').catch(() => []),
      dataManager.list('goals').catch(() => [])
    ]);
    _state.goals = Array.isArray(goals) ? goals : [];
    const related = (Array.isArray(sessions) ? sessions : []).filter(s => s.studyId === study.id);
    for (const s of related) {
      await dataManager.delete('studySessions', s.id);
    }
    await dataManager.delete('studies', study.id);
    console.log('[Studies] Apagado:', study.id, '(sessions:', related.length, ')');
  } catch (err) {
    console.error('[Studies] Erro ao apagar:', err);
  }
}

export const studiesPage = { init: initStudies };
export default studiesPage;
