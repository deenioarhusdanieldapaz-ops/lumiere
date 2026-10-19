/**
 * Goals Page
 *
 * Estrutura inicial: init + load + render list/empty.
 */
import { dataManager } from '../../core/dataManager.js';
import { stateManager } from '../../core/stateManager.js';
import { calculationsManager } from '../../core/calculationsManager.js';
import { requireAccess } from '../../core/auth.js';
import { eventBus } from '../../core/eventBus.js';
import { t } from '../../js/i18n.js';
import { createProgress } from '../../components/progress/progress.js';

// ============================================================
// Icones automaticos — 21 keywords (nome) + 9 categorias
// ============================================================
const CATEGORY_EMOJI_GOALS = {
  personal: '\u{1F331}', work: '\u{1F4BC}', study: '\u{1F393}',
  health: '\u{1F4AA}', finance: '\u{1F4B0}', home: '\u{1F3E0}',
  lumiere: '\u{2728}', leisure: '\u{1F3A8}', other: '\u{1F3AF}'
};

const KEYWORD_EMOJI_GOALS = [
  { kw: ['correr', 'corrida', 'maratona', 'km'], emoji: '\u{1F3C3}' },
  { kw: ['admissao', 'universidade', 'unza', 'exame'], emoji: '\u{1F393}' },
  { kw: ['poupar', 'poupanca', 'guardar dinheiro'], emoji: '\u{1F4B0}' },
  { kw: ['investir', 'investimento'], emoji: '\u{1F4C8}' },
  { kw: ['peso', 'emagrecer', 'massa'], emoji: '\u{2696}' },
  { kw: ['musculo', 'forca', 'ginasio'], emoji: '\u{1F4AA}' },
  { kw: ['ler', 'livros', 'leitura'], emoji: '\u{1F4DA}' },
  { kw: ['viajar', 'viagem'], emoji: '\u{2708}' },
  { kw: ['negocio', 'empresa', 'empreender'], emoji: '\u{1F680}' },
  { kw: ['casa', 'apartamento', 'comprar casa'], emoji: '\u{1F3E0}' },
  { kw: ['carro', 'mota', 'automovel'], emoji: '\u{1F697}' },
  { kw: ['casamento', 'noivado'], emoji: '\u{1F48D}' },
  { kw: ['lingua', 'ingles', 'idioma'], emoji: '\u{1F5E3}' },
  { kw: ['certificacao', 'curso', 'diploma'], emoji: '\u{1F4DC}' },
  { kw: ['poupar tempo', 'produtividade'], emoji: '\u{23F1}' },
  { kw: ['espiritual', 'fe', 'meditacao'], emoji: '\u{1F9D8}' },
  { kw: ['familia', 'ajudar'], emoji: '\u{2764}\u{FE0F}' },
  { kw: ['saude', 'bem-estar', 'mental'], emoji: '\u{1F331}' },
  { kw: ['arte', 'criar', 'escrever livro'], emoji: '\u{1F3A8}' },
  { kw: ['fisico', 'atletico', 'performance'], emoji: '\u{1F3CB}' },
  { kw: ['disciplina', 'consistencia'], emoji: '\u{1F3AF}' }
];

function normalizeText(str) {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function emojiForGoal(name, category) {
  const normalized = normalizeText(name);
  for (const item of KEYWORD_EMOJI_GOALS) {
    if (item.kw.some((k) => normalized.includes(normalizeText(k)))) return item.emoji;
  }
  return CATEGORY_EMOJI_GOALS[category] || '\u{1F3AF}';
}

let _container = null;
let _state = {
  goals: [],
  editingId: null,
  showForm: false,
  loading: false,
  error: null
};

let _unsubscribe = null;


function handleSaveGoalAsTemplate(goal) {
  const templateData = {
    name: goal.name,
    description: goal.description || '',
    category: goal.category || 'personal',
    appliesTo: 'goals',
    icon: goal.icon || '🎯',
    payload: {
      name: goal.name,
      description: goal.description,
      category: goal.category,
      targetDate: goal.targetDate,
      notes: goal.notes || ''
    }
  };
  localStorage.setItem('lumiere_template_prefill', JSON.stringify(templateData));
  
  // Navegação automática usando o stateManager nativo
  stateManager.navigateTo('templates');
}

export function initGoals(container) {
  if (!container) {
    console.warn('[Goals] container inválido.');
    return;
  }
  _container = container;

  if (_unsubscribe) _unsubscribe();
  _unsubscribe = eventBus.on('data:changed', (payload) => {
    if (payload && (payload.collection === 'goals' || payload.collection === 'tasks')) {
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
    
    // AQUI ESTÁ A CORREÇÃO: Carregar as tarefas para o cálculo do progresso
    const tasks = await dataManager.list('tasks');
    _state.tasks = Array.isArray(tasks) ? tasks : [];
    
  } catch (err) {
    console.error('[Goals] Erro ao carregar:', err);
    _state.error = err.message || 'Erro ao carregar objetivos.';
    _state.goals = [];
    _state.tasks = [];
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
  item.className = 'lum-card lum-card--goal goal-item';
  if (goal.status === 'completed') item.classList.add('goal-item--completed');
  if (goal.status === 'abandoned') item.classList.add('goal-item--abandoned');

  const header = document.createElement('div');
  header.className = 'lum-card__header goal-item__header';
  const headerLeft = document.createElement('div');
  headerLeft.className = 'lum-card__header-left goal-item__header-left';

  // Ícone SVG de Alvo
  const icon = document.createElement('span');
  icon.className = 'lum-card__icon goal-item__icon';
  const svgIcon = '<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg>';
  
  if (goal.icon) icon.textContent = goal.icon;
  else icon.innerHTML = svgIcon;
  
  icon.setAttribute('aria-hidden', 'true');
  headerLeft.appendChild(icon);

  const name = document.createElement('h3');
  name.className = 'lum-card__title goal-item__name';
  name.textContent = goal.name || '(sem nome)';
  headerLeft.appendChild(name);
  header.appendChild(headerLeft);

  // Menu
  const actions = document.createElement('details');
  actions.className = 'lum-card__actions goal-item__actions';
  const summary = document.createElement('summary');
  summary.className = 'goal-item__menu-btn';
  summary.innerHTML = '⋮';
  summary.setAttribute('aria-label', 'Mais ações');
  actions.appendChild(summary);
  
  const menuDropdown = document.createElement('div');
  menuDropdown.className = 'goal-item__menu-dropdown';

  const btnPrimary = document.createElement('button');
  btnPrimary.type = 'button';
  btnPrimary.innerHTML = goal.isPrimary ? '★ Remover Principal' : '☆ Marcar Principal';
  btnPrimary.addEventListener('click', (e) => { e.preventDefault(); actions.removeAttribute('open'); handleSetPrimary(goal); });
  menuDropdown.appendChild(btnPrimary);

  const btnToggle = document.createElement('button');
  btnToggle.type = 'button';
  btnToggle.innerHTML = goal.status === 'completed' ? '↺ Reabrir' : '✓ Concluir';
  btnToggle.addEventListener('click', (e) => { e.preventDefault(); actions.removeAttribute('open'); handleToggle(goal); });
  menuDropdown.appendChild(btnToggle);

  const btnEdit = document.createElement('button');
  btnEdit.type = 'button';
  btnEdit.innerHTML = '✎ Editar';
  btnEdit.addEventListener('click', (e) => { e.preventDefault(); actions.removeAttribute('open'); openForm(goal.id); });
  menuDropdown.appendChild(btnEdit);

  const btnTemplate = document.createElement('button');
  btnTemplate.type = 'button';
  btnTemplate.innerHTML = '📋 Guardar como Template';
  btnTemplate.addEventListener('click', (e) => { e.preventDefault(); actions.removeAttribute('open'); handleSaveGoalAsTemplate(goal); });
  menuDropdown.appendChild(btnTemplate);

  const btnDelete = document.createElement('button');
  btnDelete.type = 'button';
  btnDelete.innerHTML = '✕ Apagar';
  btnDelete.addEventListener('click', (e) => { e.preventDefault(); actions.removeAttribute('open'); handleDelete(goal); });
  menuDropdown.appendChild(btnDelete);

  actions.appendChild(menuDropdown);
  header.appendChild(actions);
  item.appendChild(header);

  // Tags
  const meta = document.createElement('div');
  meta.className = 'goal-item__meta';
  meta.appendChild(metaTag(goal.category ? t('category', goal.category) : '—'));
  meta.appendChild(metaTag(t('goalStatus', goal.status)));
  if (goal.priority) meta.appendChild(metaTag(t('priority', goal.priority)));
  item.appendChild(meta);

  // Descrição Expansível
  if (goal.description) {
    const descWrap = document.createElement('div');
    descWrap.className = 'goal-item__desc-wrap';
    const desc = document.createElement('p');
    desc.className = 'goal-item__description';
    desc.textContent = goal.description;
    descWrap.appendChild(desc);

    const btnReadMore = document.createElement('button');
    btnReadMore.type = 'button';
    btnReadMore.className = 'goal-item__read-more';
    btnReadMore.textContent = 'Ler mais';
    btnReadMore.style.display = 'none';
    descWrap.appendChild(btnReadMore);
    item.appendChild(descWrap);

    btnReadMore.addEventListener('click', (e) => {
      e.stopPropagation();
      const isExpanded = descWrap.classList.toggle('is-expanded');
      btnReadMore.textContent = isExpanded ? 'Mostrar menos' : 'Ler mais';
      if (!isExpanded) btnReadMore.style.display = (desc.scrollHeight > desc.clientHeight + 2) ? 'block' : 'none';
    });

    const observer = new ResizeObserver(() => {
      if (descWrap.classList.contains('is-expanded')) {
        btnReadMore.style.display = 'block';
        return;
      }
      btnReadMore.style.display = (desc.scrollHeight > desc.clientHeight + 2) ? 'block' : 'none';
    });
    observer.observe(desc);
  }

  // Barra de Progresso (Automática)
  const progressWrapper = document.createElement('div');
  progressWrapper.className = 'goal-item__progress';
  
  // Tenta obter as tarefas do estado global ou passa um array vazio (será recalculado)
  const tasks = _state.tasks || []; 
  const progress = calculationsManager.calculateGoalProgress(goal.id, tasks);
  
  const bar = createProgress({
    value: progress,
    label: 'Progresso',
    variant: 'default',
    showPercent: true,
    size: 'md'
  });
  progressWrapper.appendChild(bar);
  item.appendChild(progressWrapper);

  // Rodapé
  const footer = document.createElement('div');
  footer.className = 'goal-item__footer';
  
  let dateStr = '';
  if (goal.targetDate) {
    const parts = goal.targetDate.split('-');
    if (parts.length === 3) dateStr = `${parts[2]}/${parts[1]}/${parts[0]}`;
    else dateStr = goal.targetDate;
  }

  if (dateStr) {
    const dateSpan = document.createElement('span');
    dateSpan.className = 'goal-item__footer-info';
    const calIcon = '<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px; vertical-align:text-bottom;"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>';
    dateSpan.innerHTML = calIcon;
    dateSpan.appendChild(document.createTextNode(' Alvo: ' + dateStr));
    footer.appendChild(dateSpan);
  }

  const arrowIcon = document.createElement('span');
  arrowIcon.className = 'goal-item__arrow';
  arrowIcon.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>';
  footer.appendChild(arrowIcon);

  item.appendChild(footer);

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
  if (!requireAccess()) return;
  _state.editingId = goalId;
  _state.showForm = true;
  _state.error = null;
  render();
  eventBus.emit('form:opened', { page: 'goals', editingId: goalId || null });
}

function closeForm() {
  _state.editingId = null;
  _state.showForm = false;
  _state.error = null;
  render();
  eventBus.emit('form:closed', { page: 'goals' });
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
    eventBus.emit('form:closed', { page: 'goals' });
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
