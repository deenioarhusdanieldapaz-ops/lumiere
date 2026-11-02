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
import { showHelpPanel } from '../components/help-panel/help-panel.js';

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
    this._initSwipeGesture();
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
    // F4.4 - Ações do Perfil e Suporte
    const profileBtn = document.getElementById('btn-profile');
    if (profileBtn) {
      profileBtn.addEventListener('click', () => {
        this.goTo('settings');
        if (this._isMobile()) this.closeMobile();
      });
    }

    const globalHelpBtn = document.getElementById('btn-global-help');
    if (globalHelpBtn) {
      globalHelpBtn.addEventListener('click', () => {
        showHelpPanel('Global', {}); 
        if (this._isMobile()) this.closeMobile();
      });
    }

    const aboutBtn = document.getElementById('btn-about');
    if (aboutBtn) {
      aboutBtn.addEventListener('click', () => {
        this._showAboutModal();
        if (this._isMobile()) this.closeMobile();
      });
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


  /** @private */
  _initSwipeGesture() {
    let touchStartX = 0;
    let touchStartY = 0;
    let isSwiping = false;

    document.addEventListener('touchstart', (e) => {
      if (!this._isMobile()) return;
      const touch = e.touches[0];
      const startX = touch.clientX;
      const isSidebarOpen = this.shell.classList.contains('is-mobile-open');
      
      // Abrir: Início na borda esquerda (< 30px). Fechar: Início dentro do menu (< 260px).
      if ((!isSidebarOpen && startX < 30) || (isSidebarOpen && startX < 260)) {
        touchStartX = startX;
        touchStartY = touch.clientY;
        isSwiping = true;
      }
    }, { passive: true });

    document.addEventListener('touchmove', (e) => {
      if (!isSwiping) return;
      const touch = e.touches[0];
      const deltaX = touch.clientX - touchStartX;
      const deltaY = touch.clientY - touchStartY;

      // Se o movimento for predominantemente vertical (scroll), cancela o swipe
      if (Math.abs(deltaY) > Math.abs(deltaX)) {
        isSwiping = false;
      }
    }, { passive: true });

    document.addEventListener('touchend', (e) => {
      if (!isSwiping) return;
      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - touchStartX;
      const isSidebarOpen = this.shell.classList.contains('is-mobile-open');

      // Se arrastou mais de 50px para a direita (abrir) ou esquerda (fechar)
      if (deltaX > 50 && !isSidebarOpen) {
        this.toggleSidebar();
      } else if (deltaX < -50 && isSidebarOpen) {
        this.toggleSidebar();
      }
      isSwiping = false;
    }, { passive: true });
  }

  /** @private Mostra o modal "Sobre o Lumière" */
  _showAboutModal() {
    const backdrop = document.createElement('div');
    backdrop.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.8);z-index:10000;display:flex;align-items:center;justify-content:center;padding:20px;';
    backdrop.innerHTML = `
      <div style="background:var(--color-bg-secondary, #1a1a1a);border:1px solid var(--color-gold, #d4af37);border-radius:16px;padding:32px;max-width:400px;text-align:center;color:var(--color-text-primary, #fff);">
        <img src="public/brand/master/app-icon-v3.svg" alt="Lumière" style="width:64px;height:64px;margin-bottom:16px;">
        <h2 style="color:var(--color-gold, #d4af37);margin:0 0 8px 0;font-size:1.5rem;">Lumière Life Manager</h2>
        <p style="color:var(--color-text-secondary, #b8956a);margin:0 0 24px 0;font-size:0.9rem;">Versão F4.4 (Frente 2)</p>
        <p style="margin:0 0 24px 0;line-height:1.5;">Organize • Conquiste • Realize<br><br>© 2024 Lumière. Todos os direitos reservados.</p>
        <button id="btn-close-about" style="background:var(--color-gold, #d4af37);color:#111;border:none;padding:12px 24px;border-radius:8px;font-weight:bold;cursor:pointer;width:100%;">Fechar</button>
      </div>
    `;
    document.body.appendChild(backdrop);
    document.getElementById('btn-close-about').addEventListener('click', () => backdrop.remove());
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop) backdrop.remove(); });
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
