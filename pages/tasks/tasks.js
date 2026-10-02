/**
 * Tasks Page
 *
 * Estrutura inicial: init + load + render list/empty.
 * O formulário (create/update/delete) será adicionado nos próximos sub-blocos.
 *
 * Camadas: UI → Core (DataManager) → Storage → EventBus
 */
import { dataManager } from '../../core/dataManager.js';
import { eventBus } from '../../core/eventBus.js';
import { t } from '../../js/i18n.js';

// ============================================================
// Icones automaticos — 50 keywords (nome) + 9 categorias
// Ordem: especificas antes de genericas, saude antes de agendamento
// ============================================================
const CATEGORY_EMOJI_TASKS = {
  personal: '\u{1F4DD}', work: '\u{1F4BC}', study: '\u{1F4DA}',
  health: '\u{2764}\u{FE0F}', finance: '\u{1F4B0}', home: '\u{1F3E0}',
  lumiere: '\u{2728}', leisure: '\u{1F3AF}', other: '\u{1F4CC}'
};

const KEYWORD_EMOJI_TASKS = [
  { kw: ['dormir', 'sono', 'descansar', 'deitar'], emoji: '\u{1F6CC}' },
  { kw: ['igreja', 'missa', 'culto'], emoji: '\u{26EA}' },
  { kw: ['trabalhar', 'trabalho', 'buscato', 'emprego'], emoji: '\u{1F4BC}' },
  { kw: ['reuniao', 'encontro', 'meeting'], emoji: '\u{1F91D}' },
  { kw: ['relatorio', 'report'], emoji: '\u{1F4C4}' },
  { kw: ['estudar', 'estudo', 'materia'], emoji: '\u{1F4DA}' },
  { kw: ['ler', 'leitura', 'livro'], emoji: '\u{1F4D6}' },
  { kw: ['fisica', 'matematica', 'calculo'], emoji: '\u{1F9EE}' },
  { kw: ['medico', 'consulta', 'hospital'], emoji: '\u{1FA7A}' },
  { kw: ['dentista'], emoji: '\u{1F9B7}' },
  { kw: ['farmacia', 'remedio', 'medicamento'], emoji: '\u{1F48A}' },
  { kw: ['teste', 'prova', 'exame'], emoji: '\u{1F4DD}' },
  { kw: ['revisao', 'revisar', 'rever'], emoji: '\u{1F504}' },
  { kw: ['correr', 'corrida', 'treino'], emoji: '\u{1F3C3}' },
  { kw: ['alongar', 'aquecimento', 'ginastica'], emoji: '\u{1F938}' },
  { kw: ['limpar', 'arrumar', 'casa'], emoji: '\u{1F9F9}' },
  { kw: ['passar', 'engomar'], emoji: '\u{1F454}' },
  { kw: ['lavar', 'roupa'], emoji: '\u{1F455}' },
  { kw: ['compras', 'mercado', 'supermercado'], emoji: '\u{1F6D2}' },
  { kw: ['comprar', 'adquirir'], emoji: '\u{1F6CD}' },
  { kw: ['cozinhar', 'refeicao', 'comida'], emoji: '\u{1F373}' },
  { kw: ['pagar', 'pagamento', 'conta', 'fatura'], emoji: '\u{1F4B3}' },
  { kw: ['poupar', 'transferir', 'enviar dinheiro'], emoji: '\u{1F4B0}' },
  { kw: ['banco', 'bci', 'deposito'], emoji: '\u{1F3E6}' },
  { kw: ['ligar', 'telefonar', 'chamar'], emoji: '\u{1F4DE}' },
  { kw: ['enviar', 'email', 'mensagem'], emoji: '\u{2709}' },
  { kw: ['responder', 'resposta'], emoji: '\u{1F4AC}' },
  { kw: ['marcar', 'agendar', 'marcacao'], emoji: '\u{1F4C5}' },
  { kw: ['ir ao', 'visitar', 'visita'], emoji: '\u{1F4CD}' },
  { kw: ['tratar', 'resolver', 'assunto'], emoji: '\u{1F527}' },
  { kw: ['imprimir'], emoji: '\u{1F5A8}' },
  { kw: ['escrever', 'redigir', 'texto'], emoji: '\u{270D}' },
  { kw: ['preencher', 'formulario'], emoji: '\u{1F4CB}' },
  { kw: ['entregar', 'entrega', 'prazo'], emoji: '\u{23F0}' },
  { kw: ['confirmar', 'confirmacao'], emoji: '\u{2705}' },
  { kw: ['planear', 'planeamento'], emoji: '\u{1F4CA}' },
  { kw: ['organizar', 'lista'], emoji: '\u{1F4C1}' },
  { kw: ['pesquisar', 'procurar', 'buscar'], emoji: '\u{1F50D}' },
  { kw: ['verificar', 'checar'], emoji: '\u{2714}' },
  { kw: ['familia', 'ajudar pessoa'], emoji: '\u{1F468}\u{200D}\u{1F469}\u{200D}\u{1F467}' },
  { kw: ['aniversario', 'parabens'], emoji: '\u{1F382}' },
  { kw: ['presente', 'prenda'], emoji: '\u{1F381}' },
  { kw: ['viajar', 'viagem', 'voo'], emoji: '\u{2708}\u{FE0F}' },
  { kw: ['passaporte', 'visto'], emoji: '\u{1F6C2}' },
  { kw: ['manutencao', 'reparar', 'arranjar'], emoji: '\u{1F528}' },
  { kw: ['instalar', 'configurar', 'setup'], emoji: '\u{2699}\u{FE0F}' },
  { kw: ['backup', 'copia', 'guardar'], emoji: '\u{1F4BE}' },
  { kw: ['seguranca', 'proteger', 'senha'], emoji: '\u{1F512}' },
  { kw: ['ir buscar', 'recolher', 'ir pegar'], emoji: '\u{1F697}' },
  { kw: ['carregar', 'recarregar', 'bateria'], emoji: '\u{1F50B}' },
  { kw: ['festa', 'celebrar', 'comemorar'], emoji: '\u{1F389}' },
  { kw: ['fotografia', 'foto', 'tirar foto'], emoji: '\u{1F4F7}' }
];

function normalizeText(str) {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function emojiForTask(name, category) {
  const normalized = normalizeText(name);
  for (const item of KEYWORD_EMOJI_TASKS) {
    if (item.kw.some((k) => normalized.includes(normalizeText(k)))) return item.emoji;
  }
  return CATEGORY_EMOJI_TASKS[category] || '\u{1F4CC}';
}

let _container = null;
let _state = {
  tasks: [],
  goals: [],
  editingId: null,
  showForm: false,
  loading: false,
  error: null
};

let _unsubscribe = null;

/**
 * Inicializa a página.
 * @param {HTMLElement} container
 */
export function initTasks(container) {
  if (!container) {
    console.warn('[Tasks] container inválido.');
    return;
  }
  _container = container;

  // Reactividade: recarrega quando houver alterações em "tasks"
  if (_unsubscribe) _unsubscribe();
  _unsubscribe = eventBus.on('data:changed', (payload) => {
    if (payload && payload.collection === 'tasks') {
      loadTasks();
    }
  });

  loadTasks();
}

/**
 * Carrega a lista de tarefas do DataManager.
 */
async function loadTasks() {
  _state.loading = true;
  _state.error = null;
  render();

  try {
    const [tasks, goals] = await Promise.all([
      dataManager.list('tasks').catch(() => []),
      dataManager.list('goals').catch(() => [])
    ]);
    _state.tasks = Array.isArray(tasks) ? tasks : [];
    _state.goals = Array.isArray(goals) ? goals : [];
  } catch (err) {
    console.error('[Tasks] Erro ao carregar:', err);
    _state.error = err.message || 'Erro ao carregar tarefas.';
    _state.tasks = [];
  } finally {
    _state.loading = false;
    render();
  }
}

/**
 * Renderiza a página inteira.
 */
function render() {
  if (!_container) return;
  _container.innerHTML = '';

  const page = document.createElement('div');
  page.className = 'tasks-page';

  page.appendChild(renderHeader());

  if (_state.showForm) {
    page.appendChild(renderForm());
  }

  if (_state.loading) {
    page.appendChild(renderState('A carregar tarefas…'));
  } else if (_state.error) {
    page.appendChild(renderState(_state.error, true));
  } else if (_state.tasks.length === 0) {
    page.appendChild(renderState('Sem tarefas. Toque em "Nova tarefa" para criar a primeira.'));
  } else {
    page.appendChild(renderList());
  }

  _container.appendChild(page);
}

/**
 * Cabeçalho (título + ações).
 */
function renderHeader() {
  const header = document.createElement('header');
  header.className = 'tasks-header';

  const title = document.createElement('h2');
  title.className = 'tasks-header__title';
  title.textContent = 'Tarefas';
  header.appendChild(title);

  const actions = document.createElement('div');
  actions.className = 'tasks-header__actions';

  const btnNew = document.createElement('button');
  btnNew.type = 'button';
  btnNew.className = 'tasks-btn tasks-btn--primary';
  btnNew.textContent = 'Nova tarefa';
  btnNew.addEventListener('click', () => openForm());
  actions.appendChild(btnNew);

  header.appendChild(actions);
  return header;
}

/**
 * Lista de tarefas.
 */
function renderList() {
  const wrap = document.createElement('div');
  wrap.className = 'tasks-grouped';

  const today = new Date().toISOString().split('T')[0];
  const weekEnd = new Date();
  weekEnd.setDate(weekEnd.getDate() + 7);
  const weekEndYmd = weekEnd.toISOString().split('T')[0];

  const grupos = {
    hoje: [],
    semana: [],
    tarde: [],
    semData: [],
    concluidas: []
  };

  for (const task of _state.tasks) {
    if (task.status === 'completed' || task.status === 'cancelled') {
      grupos.concluidas.push(task);
      continue;
    }
    const d = task.dueDate || '';
    if (!d) grupos.semData.push(task);
    else if (d <= today) grupos.hoje.push(task);
    else if (d <= weekEndYmd) grupos.semana.push(task);
    else grupos.tarde.push(task);
  }

  const ordem = [
    { key: 'hoje', titulo: 'Hoje' },
    { key: 'semana', titulo: 'Esta semana' },
    { key: 'tarde', titulo: 'Mais tarde' },
    { key: 'semData', titulo: 'Sem data' },
    { key: 'concluidas', titulo: 'Concluidas' }
  ];

  for (const g of ordem) {
    const arr = grupos[g.key];
    if (arr.length === 0) continue;

    const sec = document.createElement('section');
    sec.className = 'tasks-group tasks-group--' + g.key;

    const header = document.createElement('h3');
    header.className = 'tasks-group__title';
    header.textContent = g.titulo + ' (' + arr.length + ')';
    sec.appendChild(header);

    const list = document.createElement('div');
    list.className = 'tasks-list';
    for (const task of arr) {
      list.appendChild(renderTaskItem(task));
    }
    sec.appendChild(list);

    wrap.appendChild(sec);
  }

  return wrap;
}

/**
 * Um item individual.
 */
function renderTaskItem(task) {
  const item = document.createElement('article');
  item.className = 'task-item';
  if (task.status === 'completed') item.classList.add('task-item--completed');

  const header = document.createElement('div');
  header.className = 'task-item__header';

  const today = new Date().toISOString().split('T')[0];
  const isToday = task.dueDate && task.dueDate <= today && task.status !== 'completed' && task.status !== 'cancelled';
  if (isToday) item.classList.add('task-item--today');

  const headerLeft = document.createElement('div');
  headerLeft.className = 'task-item__header-left';

  const icon = document.createElement('span');
  icon.className = 'task-item__icon';
  if (task.status === 'completed') {
    icon.classList.add('is-completed');
    icon.textContent = '\u2705';
  } else {
    icon.textContent = task.icon || emojiForTask(task.name, task.category);
  }
  icon.setAttribute('aria-hidden', 'true');
  headerLeft.appendChild(icon);

  const name = document.createElement('h3');
  name.className = 'task-item__name';
  name.textContent = task.name || '(sem nome)';
  headerLeft.appendChild(name);

  if (isToday) {
    const badge = document.createElement('span');
    badge.className = 'task-item__badge-today';
    badge.textContent = 'HOJE';
    headerLeft.appendChild(badge);
  }

  header.appendChild(headerLeft);

  const actions = document.createElement('div');
  actions.className = 'task-item__actions';

  // Alternar concluída/pendente
  const btnToggle = document.createElement('button');
  btnToggle.type = 'button';
  btnToggle.textContent = task.status === 'completed' ? '↺' : '✓';
  btnToggle.title = task.status === 'completed' ? 'Reabrir' : 'Concluir';
  btnToggle.setAttribute('aria-label', btnToggle.title);
  btnToggle.addEventListener('click', () => handleToggle(task));
  actions.appendChild(btnToggle);

  // Editar
  const btnEdit = document.createElement('button');
  btnEdit.type = 'button';
  btnEdit.textContent = '✎';
  btnEdit.title = 'Editar';
  btnEdit.setAttribute('aria-label', 'Editar');
  btnEdit.addEventListener('click', () => openForm(task.id));
  actions.appendChild(btnEdit);

  // Apagar
  const btnDelete = document.createElement('button');
  btnDelete.type = 'button';
  btnDelete.textContent = '✕';
  btnDelete.title = 'Apagar';
  btnDelete.setAttribute('aria-label', 'Apagar');
  btnDelete.addEventListener('click', () => handleDelete(task));
  actions.appendChild(btnDelete);

  header.appendChild(actions);

  item.appendChild(header);

  const meta = document.createElement('div');
  meta.className = 'task-item__meta';
  meta.appendChild(metaTag(task.category ? t('category', task.category) : '—'));
  meta.appendChild(metaTag(task.status ? t('status', task.status) : '—'));
  if (task.priority) meta.appendChild(metaTag(t('priority', task.priority)));
  item.appendChild(meta);

  if (task.description) {
    const desc = document.createElement('p');
    desc.className = 'task-item__description';
    desc.textContent = task.description;
    item.appendChild(desc);
  }

  return item;
}

function metaTag(text) {
  const span = document.createElement('span');
  span.className = 'task-item__tag';
  span.textContent = text;
  return span;
}

/**
 * Estado (loading / empty / error).
 */
function renderState(message, isError = false) {
  const div = document.createElement('div');
  div.className = 'tasks-state' + (isError ? ' tasks-state--error' : '');
  div.textContent = message;
  return div;
}


/**
 * Abre o formulário (criação ou edição).
 * @param {string|null} taskId
 */
function openForm(taskId = null) {
  _state.editingId = taskId;
  _state.showForm = true;
  _state.error = null;
  render();
  eventBus.emit('form:opened', { page: 'tasks', editingId: taskId || null });
}

/**
 * Fecha o formulário.
 */
function closeForm() {
  _state.editingId = null;
  _state.showForm = false;
  _state.error = null;
  render();
  eventBus.emit('form:closed', { page: 'tasks' });
}

/**
 * Atualiza a área de erro do formulário (se existir).
 */
function updateFormError(message) {
  const el = _container ? _container.querySelector('.tasks-form__error') : null;
  if (el) {
    el.textContent = message || '';
    el.hidden = !message;
  }
}

/**
 * Renderiza o formulário.
 */
function renderForm() {
  const isEdit = Boolean(_state.editingId);
  const task = isEdit ? _state.tasks.find(t => t.id === _state.editingId) : null;

  const form = document.createElement('form');
  form.className = 'tasks-form';
  form.noValidate = true;
  form.addEventListener('submit', handleSubmit);

  const title = document.createElement('h3');
  title.className = 'tasks-form__title';
  title.textContent = isEdit ? 'Editar tarefa' : 'Nova tarefa';
  form.appendChild(title);

  const grid = document.createElement('div');
  grid.className = 'tasks-form__grid';

  grid.appendChild(field('Nome *', 'input', 'name', task ? task.name : '', { type: 'text', required: true }));
  grid.appendChild(field('Descrição', 'textarea', 'description', task ? task.description : '', { full: true }));
  grid.appendChild(field('Categoria *', 'select', 'category', task ? task.category : 'personal', {
    options: ['personal','work','study','health','finance','home','lumiere','leisure','other'],
    translate: 'category'
  }));
  grid.appendChild(field('Prioridade', 'select', 'priority', task ? task.priority : 'medium', {
    options: ['low','medium','high','urgent'],
    translate: 'priority'
  }));
  grid.appendChild(field('Estado *', 'select', 'status', task ? task.status : 'pending', {
    options: ['pending','in-progress','completed','cancelled'],
    translate: 'status'
  }));
  grid.appendChild(field('Data de início', 'input', 'startDate', task ? task.startDate : '', { type: 'date' }));
  grid.appendChild(field('Hora', 'input', 'startTime', task ? task.startTime : '', { type: 'time' }));
  grid.appendChild(field('Prazo', 'input', 'dueDate', task ? task.dueDate : '', { type: 'date' }));
  grid.appendChild(field('Recorrência', 'select', 'recurrence', task ? task.recurrence : 'none', {
    options: ['none','daily','weekly','monthly','yearly']
  }));
  grid.appendChild(field('Lembrete', 'checkbox', 'reminder', task ? task.reminder : false, { full: true }));

  // Objetivo ligado
  const goalWrap = document.createElement('div');
  goalWrap.className = 'tasks-form__field tasks-form__field--full';
  const goalLabel = document.createElement('label');
  goalLabel.setAttribute('for', 'task-goalId');
  goalLabel.textContent = 'Objetivo ligado';
  goalWrap.appendChild(goalLabel);
  const goalSelect = document.createElement('select');
  goalSelect.id = 'task-goalId';
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
        opt.textContent = g.name || 'Sem título';
        if (task && task.goalId === g.id) opt.selected = true;
        goalSelect.appendChild(opt);
      }
    });
  }
  goalWrap.appendChild(goalSelect);
  grid.appendChild(goalWrap);

  grid.appendChild(field('Etiquetas (separadas por vírgula)', 'input', 'tags', task && Array.isArray(task.tags) ? task.tags.join(', ') : '', { full: true }));
  grid.appendChild(field('Notas adicionais', 'textarea', 'notes', task ? task.notes : '', { full: true }));

  form.appendChild(grid);

  const error = document.createElement('p');
  error.className = 'tasks-form__error';
  error.hidden = true;
  form.appendChild(error);

  const actions = document.createElement('div');
  actions.className = 'tasks-form__actions';

  const btnCancel = document.createElement('button');
  btnCancel.type = 'button';
  btnCancel.className = 'tasks-btn';
  btnCancel.textContent = 'Cancelar';
  btnCancel.addEventListener('click', () => closeForm());
  actions.appendChild(btnCancel);

  const btnSave = document.createElement('button');
  btnSave.type = 'submit';
  btnSave.className = 'tasks-btn tasks-btn--primary';
  btnSave.textContent = isEdit ? 'Guardar' : 'Criar';
  actions.appendChild(btnSave);

  form.appendChild(actions);
  return form;
}

/**
 * Constrói um campo do formulário.
 */
function field(labelText, tag, name, value, opts = {}) {
  const wrap = document.createElement('div');
  wrap.className = 'tasks-form__field' + (opts.full ? ' tasks-form__field--full' : '');

  const label = document.createElement('label');
  label.setAttribute('for', 'task-' + name);
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
  } else if (tag === 'checkbox') {
    input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = value === true || value === 'true';
  } else {
    input = document.createElement('input');
    input.type = opts.type || 'text';
    input.value = value || '';
  }
  input.id = 'task-' + name;
  input.name = name;
  if (opts.required) input.required = true;

  wrap.appendChild(input);
  return wrap;
}

/**
 * Submete o formulário (cria ou atualiza).
 */
async function handleSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const formData = new FormData(form);
  const data = Object.fromEntries(formData.entries());

  // Limpeza
  for (const k of Object.keys(data)) {
    if (typeof data[k] === 'string') data[k] = data[k].trim();
  }
  // Conversoes especiais
  data.reminder = data.reminder === 'on' || data.reminder === 'true' || data.reminder === true;
  if (typeof data.tags === 'string') {
    data.tags = data.tags.split(',').map(s => s.trim()).filter(Boolean);
  }

  // Validação mínima (o contrato também valida)
  if (!data.name) {
    updateFormError('O nome é obrigatório.');
    return;
  }
  if (!data.category) {
    updateFormError('A categoria é obrigatória.');
    return;
  }
  if (!data.status) {
    updateFormError('O estado é obrigatório.');
    return;
  }

  const btn = form.querySelector('button[type="submit"]');
  if (btn) btn.disabled = true;

  try {
    if (_state.editingId) {
      await dataManager.update('tasks', _state.editingId, data);
      console.log('[Tasks] Atualizada:', _state.editingId);
    } else {
      const created = await dataManager.create('tasks', data);
      console.log('[Tasks] Criada:', created.id);
    }
    _state.showForm = false;
    _state.editingId = null;
    eventBus.emit('form:closed', { page: 'tasks' });
    // loadTasks() é chamado automaticamente via eventBus 'data:changed'
  } catch (err) {
    console.error('[Tasks] Erro ao guardar:', err);
    updateFormError(err.message || 'Erro ao guardar.');
    if (btn) btn.disabled = false;
  }
}


/**
 * Alterna o estado da tarefa (pending <-> completed).
 */
async function handleToggle(task) {
  const newStatus = task.status === 'completed' ? 'pending' : 'completed';
  try {
    await dataManager.update('tasks', task.id, { status: newStatus });
    console.log('[Tasks] Estado alterado:', task.id, '->', newStatus);
  } catch (err) {
    console.error('[Tasks] Erro ao alternar estado:', err);
  }
}

/**
 * Apaga a tarefa (com confirmação).
 */
async function handleDelete(task) {
  const name = task.name || '(sem nome)';
  if (!confirm('Apagar a tarefa "' + name + '"?')) return;
  try {
    await dataManager.delete('tasks', task.id);
    console.log('[Tasks] Apagada:', task.id);
  } catch (err) {
    console.error('[Tasks] Erro ao apagar:', err);
  }
}

export const tasksPage = { init: initTasks };
export default tasksPage;
