/**
 * Navigation - Módulo de navegação da UI.
 *
 * Responsabilidades:
 *  - Ligar itens da sidebar a stateManager.navigateTo()
 *  - Reagir a 'navigation:changed' para atualizar título e item ativo
 *  - Controlar abertura/fecho da sidebar (mobile: off-canvas, desktop: colapso)
 *
 * NÃO contém regras de negócio.
 */
import { stateManager } from '../core/stateManager.js';
import { eventBus } from '../core/eventBus.js';
import { createSheet } from '../components/sheet/sheet.js';
import { ICONS } from './icons.js';

class Navigation {
  constructor() {
    this.shell = null;
    this.toggleBtn = null;
    this.overlay = null;
    this.titleEl = null;
    this.navItems = [];
    this.bottomNavItems = [];
    this._subscriptions = [];
    this._initialized = false;
  }

  /**
   * Inicializa o módulo. Chama depois que o DOM está pronto.
   * @param {Object} [opts]
   * @param {string} [opts.shellId='app-shell']
   * @param {string} [opts.titleId='page-title']
   */
  init({ shellId = 'app-shell', titleId = 'page-title' } = {}) {
    if (this._initialized) return;
    this.shell = document.getElementById(shellId);
    if (!this.shell) {
      console.warn(`[Navigation] shell #${shellId} não encontrado.`);
      return;
    }
    this.toggleBtn = this.shell.querySelector('.app-topbar__toggle');
    this.overlay = this.shell.querySelector('.app-overlay');
    this.titleEl = document.getElementById(titleId);
    this.navItems = Array.from(this.shell.querySelectorAll('.app-nav-item[data-page]'));
    this.bottomNavItems = Array.from(document.querySelectorAll('.app-bottom-nav__item[data-page]'));

    this._wireEvents();
    this._applyCurrentPage(stateManager.getState().currentPage || 'dashboard');
    this._restoreCollapsedState();
    this._initialized = true;
    console.log('[Navigation] Inicializada.');
  }

  /** @private */
  _wireEvents() {
    if (this.toggleBtn) {
      this.toggleBtn.addEventListener('click', () => this.toggleSidebar());
    }
    if (this.overlay) {
      this.overlay.addEventListener('click', () => this.closeMobile());
    }
    for (const item of this.navItems) {
      item.addEventListener('click', () => {
        const page = item.dataset.page;
        if (page) this.goTo(page);
      });
    }
    for (const item of this.bottomNavItems) {
      item.addEventListener('click', () => {
        const page = item.dataset.page;
        if (page) this.goTo(page);
      });
    }
    // Botão "Mais" — abre o sheet de módulos secundários
    const moreBtn = document.getElementById('bottom-nav-more');
    if (moreBtn) {
      moreBtn.addEventListener('click', () => this._openMoreSheet());
    }
    const unsub = eventBus.on('navigation:changed', (payload) => {
      if (payload && payload.page) {
        this._applyCurrentPage(payload.page);
        this._applyBottomNavActive(payload.page);
      }
    });
    this._subscriptions.push(unsub);
  }

  /**
   * Navega para uma página.
   * @param {string} page
   * @param {Object} [params]
   */
  goTo(page, params = {}) {
    if (!page) return;
    stateManager.navigateTo(page, params);
    if (this._isMobile()) this.closeMobile();
  }

  /** Alterna sidebar (colapso em desktop, off-canvas em mobile). */
  toggleSidebar() {
    if (this._isMobile()) {
      const opening = !this.shell.classList.contains('is-mobile-open');
      this.shell.classList.toggle('is-mobile-open');
      this.overlay?.classList.toggle('is-visible');
      if (opening) {
        // C) Foco no primeiro item visível ao abrir
        const firstItem = this.navItems[0];
        if (firstItem) firstItem.focus();
      }
    } else {
      this.shell.classList.toggle('is-collapsed');
      this._persistCollapsedState();
    }
  }

  /** Fecha sidebar mobile. */
  closeMobile() {
    const wasOpen = this.shell.classList.contains('is-mobile-open');
    this.shell.classList.remove('is-mobile-open');
    this.overlay?.classList.remove('is-visible');
    if (wasOpen && this.toggleBtn) {
      // C) Foco devolvido ao toggle ao fechar
      this.toggleBtn.focus();
    }
  }

  /** @private D) Lê o estado guardado e aplica */
  _restoreCollapsedState() {
    try {
      const stored = localStorage.getItem('lumiereSidebarCollapsed');
      if (stored === '1' && !this._isMobile()) {
        this.shell.classList.add('is-collapsed');
      }
    } catch (e) { /* ignorar */ }
  }

  /** @private D) Guarda o estado atual */
  _persistCollapsedState() {
    try {
      const collapsed = this.shell.classList.contains('is-collapsed') ? '1' : '0';
      localStorage.setItem('lumiereSidebarCollapsed', collapsed);
    } catch (e) { /* ignorar */ }
  }

  /** @private */
  _isMobile() {
    return window.matchMedia('(max-width: 767px)').matches;
  }

  /** @private */
  _applyCurrentPage(page) {
    for (const item of this.navItems) {
      const isActive = item.dataset.page === page;
      item.classList.toggle('is-active', isActive);
      if (isActive) {
        item.setAttribute('aria-current', 'page');
      } else {
        item.removeAttribute('aria-current');
      }
    }
    if (this.titleEl) {
      const active = this.navItems.find(i => i.dataset.page === page);
      const label = active?.querySelector('.app-nav-item__label')?.textContent;
      if (label) this.titleEl.textContent = label;
    }
  }


  /**
   * Atualiza o estado ativo do bottom nav.
   * @private
   * @param {string} page
   */
  _applyBottomNavActive(page) {
    for (const item of this.bottomNavItems) {
      const isActive = item.dataset.page === page;
      item.classList.toggle('is-active', isActive);
      if (isActive) {
        item.setAttribute('aria-current', 'page');
      } else {
        item.removeAttribute('aria-current');
      }
    }
  }

  /**
   * Abre o sheet "Mais" com módulos secundários.
   * @private
   */
  _openMoreSheet() {
    const sheet = createSheet({
      title: 'Mais',
      sections: [
        {
          title: 'Cards',
          items: [
            { icon: 'target',   label: 'Objetivo Principal', page: 'mainGoal' },
            { icon: 'chart',    label: 'Progresso Semanal', page: 'weeklyProgress' },
            { icon: 'dollar',   label: 'Finanças',       page: 'finances-card' },
            { icon: 'diamond',  label: 'Lumière',        page: 'lumiere-card' },
            { icon: 'chart',    label: 'Insights',       page: 'insights-card' }
          ]
        },
        {
          title: 'Módulos',
          items: [
            { icon: 'book',     label: 'Estudos',        page: 'studies' },
            { icon: 'target',   label: 'Objetivos',      page: 'goals' },
            { icon: 'calendar', label: 'Calendário',     page: 'calendar' },
            { icon: 'note',     label: 'Notas',          page: 'notes' }
          ]
        },
        {
          title: 'Sistema',
          items: [
            { icon: 'chart',    label: 'Relatórios',     page: 'reports-card' },
            { icon: 'settings', label: 'Configurações',  page: 'settings' }
          ]
        }
      ],
      onSelect: (item) => {
        if (item.disabled) return;
        if (item.page) this.goTo(item.page);
      }
    });
    // Importar icons já foi feito no bootstrap, mas garantir que o sheet
    // tem os ícones SVG injetados
    if (window.__lumiere && window.__lumiere.injectIcons) {
      // Usar o que já está disponível
    }
    sheet.open();
    // Injetar os SVGs nos ícones do sheet (foram criados após injectIcons())
    requestAnimationFrame(() => {
      document.querySelectorAll('.lumiere-sheet__icon[data-icon]').forEach(el => {
        const name = el.getAttribute('data-icon');
        if (ICONS[name]) {
          el.innerHTML = ICONS[name];
        }
      });
    });
  }

  /** Limpa listeners. */
  destroy() {
    for (const unsub of this._subscriptions) unsub?.();
    this._subscriptions = [];
    this._initialized = false;
  }
}

export const navigation = new Navigation();
export default navigation;
