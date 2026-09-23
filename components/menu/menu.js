/**
 * Menu Component
 * Menu contextual (dropdown) reutilizável. NÃO conhece regras de negócio.
 * Recebe itens via parâmetros e emite callback ao selecionar.
 */

/**
 * @param {Object} options
 * @param {Array<{id: string, label: string, disabled?: boolean}>} options.items
 * @param {Function} options.onSelect - (itemId) => void
 * @param {string} [options.triggerLabel='⋯'] - Rótulo do botão de abertura
 * @param {string} [options.triggerAriaLabel='Abrir menu']
 * @param {string} [options.align='right'] - 'left' | 'right'
 * @returns {HTMLElement}
 */
export function createMenu({
  items = [],
  onSelect = null,
  triggerLabel = '⋯',
  triggerAriaLabel = 'Abrir menu',
  align = 'right'
} = {}) {
  const wrapper = document.createElement('div');
  wrapper.className = `lumiere-menu lumiere-menu--${align}`;

  // Botão de trigger
  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'lumiere-menu__trigger';
  trigger.setAttribute('aria-haspopup', 'menu');
  trigger.setAttribute('aria-expanded', 'false');
  trigger.setAttribute('aria-label', triggerAriaLabel);
  trigger.textContent = triggerLabel;

  // Lista de itens
  const list = document.createElement('ul');
  list.className = 'lumiere-menu__list';
  list.setAttribute('role', 'menu');
  list.hidden = true;

  items.forEach((item, index) => {
    const li = document.createElement('li');
    li.className = 'lumiere-menu__item';
    li.setAttribute('role', 'none');

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'lumiere-menu__action';
    btn.setAttribute('role', 'menuitem');
    btn.tabIndex = -1;
    btn.dataset.id = item.id;
    btn.textContent = item.label;
    if (item.disabled) {
      btn.disabled = true;
      btn.setAttribute('aria-disabled', 'true');
    }
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (item.disabled) return;
      close();
      if (typeof onSelect === 'function') onSelect(item.id);
    });

    li.appendChild(btn);
    list.appendChild(li);
  });

  // Estado do menu
  let isOpen = false;

  function open() {
    if (isOpen) return;
    isOpen = true;
    list.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
    // Focar o primeiro item habilitado
    const first = list.querySelector('.lumiere-menu__action:not([disabled])');
    if (first) first.focus();
    document.addEventListener('click', onDocClick, true);
    document.addEventListener('keydown', onKeyDown);
  }

  function close() {
    if (!isOpen) return;
    isOpen = false;
    list.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
    document.removeEventListener('click', onDocClick, true);
    document.removeEventListener('keydown', onKeyDown);
  }

  function onDocClick(e) {
    if (!wrapper.contains(e.target)) close();
  }

  function onKeyDown(e) {
    if (e.key === 'Escape') {
      close();
      trigger.focus();
      return;
    }
    // Navegação por setas
    const enabled = Array.from(list.querySelectorAll('.lumiere-menu__action:not([disabled])'));
    const current = document.activeElement;
    const idx = enabled.indexOf(current);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = enabled[(idx + 1) % enabled.length];
      if (next) next.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = enabled[(idx - 1 + enabled.length) % enabled.length];
      if (prev) prev.focus();
    } else if (e.key === 'Home') {
      e.preventDefault();
      if (enabled[0]) enabled[0].focus();
    } else if (e.key === 'End') {
      e.preventDefault();
      if (enabled[enabled.length - 1]) enabled[enabled.length - 1].focus();
    }
  }

  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    if (isOpen) close();
    else open();
  });

  wrapper.appendChild(trigger);
  wrapper.appendChild(list);

  // API pública para controlar externamente
  wrapper._open = open;
  wrapper._close = close;

  return wrapper;
}

export default createMenu;
