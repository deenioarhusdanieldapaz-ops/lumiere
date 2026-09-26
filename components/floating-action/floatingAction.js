/**
 * Floating Action Button - Botao "+" contextual
 * Menu muda conforme a pagina actual.
 */
import { eventBus } from '../../core/eventBus.js';
import { stateManager } from '../../core/stateManager.js';
import { ICONS } from '../../js/icons.js';

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

let _fab = null;
let _menu = null;
let _open = false;
let _currentActions = [];

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
