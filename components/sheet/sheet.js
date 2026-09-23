/**
 * Sheet Component
 * Painel deslizante do fundo do ecrã (bottom sheet).
 * Reutilizável — recebe lista de items e callback.
 *
 * Uso:
 *   const sheet = createSheet({
 *     title: 'Mais',
 *     items: [{ icon: 'book', label: 'Estudos', page: 'studies' }, ...],
 *     onSelect: (item) => { ... }
 *   });
 *   sheet.open();
 */

let _activeSheet = null;

export function createSheet({
  title = '',
  items = [],
  sections = null,
  onSelect = () => {},
  closeOnSelect = true
} = {}) {
  // Estrutura
  const backdrop = document.createElement('div');
  backdrop.className = 'lumiere-sheet-backdrop';
  backdrop.setAttribute('aria-hidden', 'true');

  const sheet = document.createElement('div');
  sheet.className = 'lumiere-sheet';
  sheet.setAttribute('role', 'dialog');
  sheet.setAttribute('aria-modal', 'true');
  sheet.setAttribute('aria-label', title || 'Menu');

  // Handle
  const handle = document.createElement('button');
  handle.className = 'lumiere-sheet__handle';
  handle.setAttribute('aria-label', 'Fechar');
  handle.type = 'button';

  // Título (opcional)
  let titleEl = null;
  if (title) {
    titleEl = document.createElement('div');
    titleEl.className = 'lumiere-sheet__title';
    titleEl.textContent = title;
  }

  // Helper: constroi um item
  function buildItem(item) {
    const li = document.createElement('li');
    li.className = 'lumiere-sheet__item';

    const btn = document.createElement('button');
    btn.className = 'lumiere-sheet__btn';
    btn.type = 'button';
    if (item.disabled) {
      btn.disabled = true;
      btn.setAttribute('aria-disabled', 'true');
    }

    if (item.icon) {
      const ico = document.createElement('span');
      ico.className = 'lumiere-sheet__icon';
      ico.setAttribute('data-icon', item.icon);
      btn.appendChild(ico);
    }

    const label = document.createElement('span');
    label.className = 'lumiere-sheet__label';
    label.textContent = item.label || '';
    btn.appendChild(label);

    const chev = document.createElement('span');
    chev.className = 'lumiere-sheet__chevron';
    chev.setAttribute('aria-hidden', 'true');
    chev.textContent = '\u203A';
    btn.appendChild(chev);

    if (!item.disabled) {
      btn.addEventListener('click', () => {
        if (closeOnSelect) api.close();
        try {
          onSelect(item);
        } catch (err) {
          console.error('[Sheet] onSelect erro:', err);
        }
      });
    }

    li.appendChild(btn);
    return li;
  }

  // Lista principal
  const list = document.createElement('div');
  list.className = 'lumiere-sheet__list';

  if (sections && Array.isArray(sections) && sections.length > 0) {
    // Modo com secções
    for (const sec of sections) {
      if (!sec || !sec.title || !Array.isArray(sec.items) || sec.items.length === 0) continue;

      const secWrap = document.createElement('div');
      secWrap.className = 'lumiere-sheet__section';

      const secTitle = document.createElement('h4');
      secTitle.className = 'lumiere-sheet__section-title';
      secTitle.textContent = sec.title;
      secWrap.appendChild(secTitle);

      const secList = document.createElement('ul');
      secList.className = 'lumiere-sheet__section-list';
      for (const it of sec.items) secList.appendChild(buildItem(it));
      secWrap.appendChild(secList);

      list.appendChild(secWrap);
    }
  } else {
    // Modo lista plana (compatibilidade)
    const flatList = document.createElement('ul');
    flatList.className = 'lumiere-sheet__section-list';
    for (const item of items) flatList.appendChild(buildItem(item));
    list.appendChild(flatList);
  }

  // Montar estrutura
  sheet.appendChild(handle);
  if (titleEl) sheet.appendChild(titleEl);
  sheet.appendChild(list);

  // Handlers de fecho
  const closeOnBackdrop = () => api.close();
  const closeOnEsc = (e) => {
    if (e.key === 'Escape') api.close();
  };
  const closeOnHandle = () => api.close();

  // API pública
  const api = {
    open() {
      // Fechar qualquer sheet já aberto
      if (_activeSheet && _activeSheet !== api) {
        _activeSheet.close();
      }
      document.body.appendChild(backdrop);
      document.body.appendChild(sheet);
      // Forçar reflow para animação
      void sheet.offsetHeight;
      backdrop.classList.add('is-open');
      sheet.classList.add('is-open');
      document.body.classList.add('has-sheet-open');
      _activeSheet = api;

      backdrop.addEventListener('click', closeOnBackdrop);
      handle.addEventListener('click', closeOnHandle);
      document.addEventListener('keydown', closeOnEsc);
    },

    close() {
      backdrop.classList.remove('is-open');
      sheet.classList.remove('is-open');
      document.body.classList.remove('has-sheet-open');

      setTimeout(() => {
        if (backdrop.parentNode) backdrop.parentNode.removeChild(backdrop);
        if (sheet.parentNode) sheet.parentNode.removeChild(sheet);
      }, 280);

      backdrop.removeEventListener('click', closeOnBackdrop);
      handle.removeEventListener('click', closeOnHandle);
      document.removeEventListener('keydown', closeOnEsc);

      if (_activeSheet === api) _activeSheet = null;
    },

    isOpen() {
      return sheet.classList.contains('is-open');
    }
  };

  return api;
}

export default { createSheet };
