/**
 * Floating Action Button - Botao "+" contextual
 * Menu muda conforme a pagina actual.
 */
import { eventBus } from '../../core/eventBus.js';
import { stateManager } from '../../core/stateManager.js';
import { ICONS } from '../../js/icons.js';
import { dataManager } from '../../core/dataManager.js';

const PAGE_ACTIONS = {
  overview: [
    { icon: 'check',    label: 'Nova tarefa',      target: 'tasks',    action: 'new' },
    { icon: 'note',     label: 'Nova nota',        target: 'notes',    action: 'new' },
    { icon: 'dollar',   label: 'Nova transacao',   target: 'finances', action: 'new' },
    { icon: 'book',     label: 'Sessao de estudo', target: 'studies',  action: 'new' },
    { icon: 'target',   label: 'Novo objetivo',    target: 'goals',    action: 'new' }
  ],
  tasks: [
    { icon: 'check',  label: 'Nova tarefa', target: 'tasks', action: 'new' },
    { icon: 'note',   label: 'Nova nota',   target: 'notes', action: 'new' }
  ],
  habits: [
    { icon: 'refresh', label: 'Novo habito', target: 'habits', action: 'new' },
    { icon: 'check',   label: 'Nova tarefa', target: 'tasks',  action: 'new' }
  ],
  studies: [
    { icon: 'book',   label: 'Novo estudo',       target: 'studies', action: 'new' },
    { icon: 'check',  label: 'Nova tarefa',       target: 'tasks',   action: 'new' }
  ],
  goals: [
    { icon: 'target', label: 'Novo objetivo', target: 'goals', action: 'new' },
    { icon: 'check',  label: 'Nova tarefa',   target: 'tasks', action: 'new' }
  ],
  finances: [
    { icon: 'dollar', label: 'Nova transacao', target: 'finances', action: 'new' },
    { icon: 'note',   label: 'Nova nota',      target: 'notes',    action: 'new' }
  ],
  notes: [
    { icon: 'note',  label: 'Nova nota',   target: 'notes', action: 'new' },
    { icon: 'check', label: 'Nova tarefa', target: 'tasks', action: 'new' }
  ],
  calendar: [
    { icon: 'calendar', label: 'Novo evento', target: 'calendar', action: 'new' },
    { icon: 'check',    label: 'Nova tarefa', target: 'tasks',    action: 'new' }
  ]
};

const PAGE_TO_COLLECTION = {
  habits: 'habits', tasks: 'tasks', goals: 'goals',
  studies: 'studies', notes: 'notes'
};

const PAGE_TO_LABEL = {
  habits: 'Hábitos', tasks: 'Tarefas', goals: 'Objetivos',
  studies: 'Estudos', notes: 'Notas'
};

let _fab = null;
let _menu = null;
let _open = false;
let _currentActions = [];
let _activeForm = null;

function getActionsForPage(page) {
  return PAGE_ACTIONS[page] || PAGE_ACTIONS.overview;
}

function buildMenuItems(actions) {
  return actions.map(a => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'fab-menu__item';
    btn.dataset.target = a.target;
    btn.dataset.action = a.action;

    const iconSpan = document.createElement('span');
    iconSpan.className = 'fab-menu__item-icon';
    if (ICONS[a.icon]) iconSpan.innerHTML = ICONS[a.icon];

    const labelSpan = document.createElement('span');
    labelSpan.className = 'fab-menu__item-label';
    labelSpan.textContent = a.label;

    btn.appendChild(iconSpan);
    btn.appendChild(labelSpan);

    btn.addEventListener('click', () => {
      eventBus.emit('navigation:changed', { page: a.target });
      try { eventBus.emit('page:open-form', { page: a.target, action: a.action }); } catch (e) {}
      closeMenu();
    });

    return btn;
  });
}

function openMenu() {
  if (_open) return;
  _open = true;
  _fab.classList.add('fab--open');
  _menu.hidden = false;
  _menu.classList.add('fab-menu--open');
  _fab.setAttribute('aria-expanded', 'true');
}

function closeMenu() {
  if (!_open) return;
  _open = false;
  _fab.classList.remove('fab--open');
  _menu.classList.remove('fab-menu--open');
  _fab.setAttribute('aria-expanded', 'false');
  setTimeout(() => {
    if (!_open) _menu.hidden = true;
  }, 250);
}

function toggleMenu() {
  if (_open) closeMenu();
  else openMenu();
}

function renderMenuForPage(page) {
  _currentActions = getActionsForPage(page);
  _menu.innerHTML = '';
  const items = buildMenuItems(_currentActions);
  items.forEach(item => _menu.appendChild(item));

  // Opção "Guardar como template" — só aparece quando há um item em edição
  if (_activeForm && _activeForm.editingId && PAGE_TO_COLLECTION[_activeForm.page]) {
    const btnSave = document.createElement('button');
    btnSave.type = 'button';
    btnSave.className = 'fab-menu__item fab-menu__item--template';

    const icon = document.createElement('span');
    icon.className = 'fab-menu__item-icon';
    icon.textContent = '\u2B50';
    btnSave.appendChild(icon);

    const label = document.createElement('span');
    label.className = 'fab-menu__item-label';
    label.textContent = 'Guardar como template';
    btnSave.appendChild(label);

    btnSave.addEventListener('click', () => openSaveTemplateModal(_activeForm));
    _menu.appendChild(btnSave);
  }
}

// ============================================================
// Modal "Guardar como template"
// ============================================================
function buildPayloadFromItem(page, item) {
  const pick = (keys) => {
    const out = {};
    for (const k of keys) {
      if (item[k] !== undefined && item[k] !== null && item[k] !== '') {
        out[k] = item[k];
      }
    }
    return out;
  };

  switch (page) {
    case 'tasks':
      return pick(['name','description','priority','status','dueDate','tags','notes']);
    case 'habits':
      return pick(['name','description','frequency','target','unit','daysOfWeek','notes']);
    case 'studies':
      return pick(['name','description','subject','duration','notes']);
    case 'goals':
      return pick(['name','description','targetDate','notes']);
    case 'notes':
      return pick(['title','content','tags']);
    default:
      return {};
  }
}

function payloadRowLabel(key) {
  const labels = {
    name: 'Nome', description: 'Descrição', priority: 'Prioridade',
    status: 'Estado', dueDate: 'Prazo', tags: 'Etiquetas', notes: 'Notas',
    frequency: 'Frequência', target: 'Meta', unit: 'Unidade',
    daysOfWeek: 'Dias', subject: 'Disciplina', duration: 'Duração',
    targetDate: 'Prazo', title: 'Título', content: 'Conteúdo'
  };
  return labels[key] || key;
}

function payloadRowValue(val) {
  if (Array.isArray(val)) return val.join(', ');
  return String(val);
}

async function openSaveTemplateModal(activeForm) {
  const collection = PAGE_TO_COLLECTION[activeForm.page];
  if (!collection) return;

  let item;
  try {
    item = await dataManager.read(collection, activeForm.editingId);
  } catch (err) {
    console.error('[FAB] Erro ao ler item:', err);
    alert('Não foi possível carregar o item.');
    return;
  }
  if (!item) {
    alert('Item não encontrado.');
    return;
  }

  const payload = buildPayloadFromItem(activeForm.page, item);
  const suggestedName = item.name || item.title || 'Novo template';
  const category = item.category || 'personal';

  openModal({
    title: 'Guardar como template?',
    suggestedName,
    appliesTo: activeForm.page,
    category,
    payload,
    onSave: async (data) => {
      await dataManager.create('templates', data);
      closeMenu();
    }
  });
}

function openModal({ title, suggestedName, appliesTo, category, payload, onSave }) {
  const backdrop = document.createElement('div');
  backdrop.className = 'save-tpl-backdrop';

  const dialog = document.createElement('div');
  dialog.className = 'save-tpl-dialog';

  const h = document.createElement('h3');
  h.className = 'save-tpl-title';
  h.textContent = title;
  dialog.appendChild(h);

  // Nome
  const nameLabel = document.createElement('label');
  nameLabel.className = 'save-tpl-label';
  nameLabel.textContent = 'Nome do template';
  nameLabel.setAttribute('for', 'save-tpl-name');
  dialog.appendChild(nameLabel);

  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.className = 'save-tpl-input';
  nameInput.id = 'save-tpl-name';
  nameInput.value = suggestedName;
  dialog.appendChild(nameInput);

  // Meta (aplica-se a + categoria)
  const meta = document.createElement('div');
  meta.className = 'save-tpl-meta';
  const metaApplies = document.createElement('span');
  metaApplies.textContent = 'Aplica-se a: ' + (PAGE_TO_LABEL[appliesTo] || appliesTo);
  meta.appendChild(metaApplies);
  const metaCat = document.createElement('span');
  metaCat.textContent = 'Categoria: ' + category;
  meta.appendChild(metaCat);
  dialog.appendChild(meta);

  // Preview do payload
  const preview = document.createElement('div');
  preview.className = 'save-tpl-preview';
  const keys = Object.keys(payload);
  if (keys.length === 0) {
    const empty = document.createElement('div');
    empty.textContent = 'Sem campos para pré-preencher.';
    preview.appendChild(empty);
  } else {
    for (const k of keys) {
      const row = document.createElement('div');
      row.className = 'save-tpl-preview__row';
      const lbl = document.createElement('span');
      lbl.textContent = payloadRowLabel(k);
      const val = document.createElement('strong');
      val.textContent = payloadRowValue(payload[k]);
      row.appendChild(lbl);
      row.appendChild(val);
      preview.appendChild(row);
    }
  }
  dialog.appendChild(preview);

  // Error
  const errorEl = document.createElement('p');
  errorEl.className = 'save-tpl-error';
  errorEl.hidden = true;
  dialog.appendChild(errorEl);

  // Actions
  const actions = document.createElement('div');
  actions.className = 'save-tpl-actions';

  const btnCancel = document.createElement('button');
  btnCancel.type = 'button';
  btnCancel.className = 'save-tpl-btn';
  btnCancel.textContent = 'Cancelar';

  const btnSave = document.createElement('button');
  btnSave.type = 'button';
  btnSave.className = 'save-tpl-btn save-tpl-btn--primary';
  btnSave.textContent = 'Guardar';

  actions.appendChild(btnCancel);
  actions.appendChild(btnSave);
  dialog.appendChild(actions);

  backdrop.appendChild(dialog);
  document.body.appendChild(backdrop);

  // Animação de entrada
  requestAnimationFrame(() => backdrop.classList.add('is-open'));

  function closeModal() {
    backdrop.classList.remove('is-open');
    setTimeout(() => { if (backdrop.parentNode) backdrop.parentNode.removeChild(backdrop); }, 220);
  }

  btnCancel.addEventListener('click', closeModal);

  btnSave.addEventListener('click', async () => {
    errorEl.hidden = true;
    const name = (nameInput.value || '').trim();
    if (!name) {
      errorEl.textContent = 'O nome é obrigatório.';
      errorEl.hidden = false;
      return;
    }
    btnSave.disabled = true;
    try {
      const data = {
        name,
        description: '',
        category,
        appliesTo,
        payload,
        icon: '',
        tags: [],
        usageCount: 0,
        lastUsedAt: ''
      };
      await onSave(data);
      closeModal();
      console.log('[FAB] Template guardado a partir de', appliesTo);
    } catch (err) {
      console.error('[FAB] Erro ao guardar template:', err);
      errorEl.textContent = err.message || 'Erro ao guardar.';
      errorEl.hidden = false;
      btnSave.disabled = false;
    }
  });

  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) closeModal();
  });

  document.addEventListener('keydown', function onEsc(e) {
    if (e.key === 'Escape') {
      closeModal();
      document.removeEventListener('keydown', onEsc);
    }
  }, { once: false });

  nameInput.focus();
  nameInput.select();
}

export function initFloatingAction() {
  if (_fab) return;

  _fab = document.getElementById('fab');
  _menu = document.getElementById('fab-menu');
  if (!_fab || !_menu) {
    console.warn('[FAB] Elementos nao encontrados');
    return;
  }

  const state = stateManager.getState();
  renderMenuForPage(state.currentPage || 'overview');

  _fab.addEventListener('click', toggleMenu);

  eventBus.on('navigation:changed', (payload) => {
    if (payload && payload.page) {
      closeMenu();
      renderMenuForPage(payload.page);
    }
  });

  eventBus.on('form:opened', (payload) => {
    _activeForm = payload || null;
    console.log('[FAB] Form aberto:', payload);
    closeMenu();
    const state = stateManager.getState();
    renderMenuForPage(state.currentPage || 'overview');
  });

  eventBus.on('form:closed', () => {
    _activeForm = null;
    console.log('[FAB] Form fechado');
    closeMenu();
    const state = stateManager.getState();
    renderMenuForPage(state.currentPage || 'overview');
  });

  document.addEventListener('click', (e) => {
    if (!_open) return;
    if (_fab.contains(e.target) || _menu.contains(e.target)) return;
    closeMenu();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && _open) closeMenu();
  });

  console.log('[FAB] Inicializado');
}

export default { initFloatingAction };
