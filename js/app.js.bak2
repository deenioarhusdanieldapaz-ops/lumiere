/**
 * Lumière Life Manager - Entrada da aplicação
 */
import { core } from '../core/index.js';
import { eventBus } from '../core/eventBus.js';
import { dataManager } from '../core/dataManager.js';
import { stateManager } from '../core/stateManager.js';
import { navigation } from './navigation.js';
import { initTasks } from '../pages/tasks/tasks.js';
import { initHabits } from '../pages/habits/habits.js';
import { initGoals } from '../pages/goals/goals.js';
import { initStudies } from '../pages/studies/studies.js';
import { initLumiere } from '../pages/lumiere/lumiere.js';
import { initNotes } from '../pages/notes/notes.js';
import { initCalendar } from '../pages/calendar/calendar.js';
import { initFinances } from '../pages/finances/finances.js';
import { initSettings } from '../pages/settings/settings.js';
import { initProfile } from '../pages/profile/profile.js';
import { initOverview } from '../pages/cards/overview/overview.js';
import { initProgress } from '../pages/cards/progress/progress.js';
import { initMainGoal } from '../pages/cards/mainGoal/mainGoal.js';
import { initLumiereCard } from '../pages/cards/lumiere/lumiere.js';
import { initFinancesCard } from '../pages/cards/finances/finances.js';
import { initToday } from '../pages/cards/today/today.js';
import { initWeeklyProgress } from '../pages/cards/weeklyProgress/weeklyProgress.js';
import { initInsightsCard } from '../pages/cards/insights/insights.js';
import { initReports } from '../pages/cards/reports/reports.js';
import { splash } from './splash.js';
import { injectIcons } from './icons.js';
import { notifications } from './notifications.js';

/**
 * Monta o Dashboard no container #content.
 */
function applyTheme(theme) {
  const valid = ['noir', 'lumiere', 'auto'];
  const t = valid.includes(theme) ? theme : 'noir';
  document.documentElement.setAttribute('data-theme', t);
  console.log('[App] Tema aplicado:', t);
}

async function renderDashboard() {
  const container = document.getElementById('content');
  if (!container) {
    console.warn('[App] #content não encontrado.');
    return;
  }
  const userName = localStorage.getItem('lumiereUserName') || '';

  // Carregar todas as coleções para o Dashboard
  const names = [
    'tasks','habits','habitLogs','studies','studySessions',
    'goals','goalMilestones','calendarEvents','financeAccounts',
    'financeTransactions','budgets','notes','lumiereBusinesses',
    'lumiereProducts','lumiereCustomers','lumiereSales','reminders'
  ];
  const collections = {};
  try {
    const results = await Promise.all(
      names.map(n => dataManager.list(n).catch(() => []))
    );
    for (let i = 0; i < names.length; i++) {
      collections[names[i]] = Array.isArray(results[i]) ? results[i] : [];
    }
  } catch (err) {
    console.error('[App] Erro ao carregar coleções:', err);
  }

  loadDashboard(container, {
    userName,
    state: stateManager.getState(),
    collections,
    services: { core, eventBus, stateManager, dataManager }
  });
}

/**
 * Renderiza só se a página atual for dashboard.
 */
function renderIfDashboard() {
  const state = stateManager.getState();
  if (state.currentPage === 'dashboard') {
    renderDashboard();
  }
}

async function bootstrap() {
  try {
    console.log('[App] Lumière Life Manager - bootstrap iniciado');
    injectIcons();

    // Preencher nome e iniciais do utilizador no topbar
    (function populateTopbarProfile() {
      const name = localStorage.getItem('lumiereUserName') || 'Utilizador';
      const nameEl = document.getElementById('topbar-user-name');
      const avatarEl = document.getElementById('topbar-avatar');
      if (nameEl) nameEl.textContent = displayShortName(name);
      if (avatarEl) {
        const parts = name.trim().split(/\s+/);
        const initials = parts.length > 1
          ? parts[0][0] + parts[parts.length - 1][0]
          : parts[0].substring(0, 2);
        avatarEl.textContent = initials.toUpperCase();
      }
    })();

    function displayShortName(full) {
      const parts = String(full || '').trim().split(/\s+/);
      if (parts.length <= 2) return parts.join(' ');
      return parts[0] + ' ' + parts[parts.length - 1];
    }

    // Preencher nome e iniciais do utilizador no rodapé
    (function populateSidebarProfile() {
      const name = localStorage.getItem('lumiereUserName') || 'Utilizador';
      const nameEl = document.getElementById('sidebar-user-name');
      const avatarEl = document.getElementById('sidebar-avatar');
      if (nameEl) nameEl.textContent = name;
      if (avatarEl) {
        const parts = name.trim().split(/\s+/);
        const initials = parts.length > 1
          ? parts[0][0] + parts[parts.length - 1][0]
          : parts[0].substring(0, 2);
        avatarEl.textContent = initials.toUpperCase();
      }
    })();
    console.log('[App] Icones da sidebar injetados.');
    await notifications.init();
    console.log('[App] Painel de notificacoes pronto.');

    // Ligar botoes de perfil (sidebar footer + topbar user)
    (function initProfileTriggers() {
      const triggerProfile = () => {
        eventBus.emit('navigation:changed', { page: 'profile' });
      };
      const btnProfile = document.getElementById('btn-profile');
      const topbarUser = document.getElementById('topbar-user');
      if (btnProfile) btnProfile.addEventListener('click', triggerProfile);
      if (topbarUser) topbarUser.addEventListener('click', triggerProfile);
    })();
    await core.init();
    console.log('[App] Core pronto.');

    navigation.init();
    console.log('[App] Navegação inicializada.');

    // Recarregar dashboard quando dados mudam (com debounce)
    let _dashReload = false;
    eventBus.on('data:changed', () => {
      if (stateManager.getState().currentPage !== 'dashboard') return;
      if (_dashReload) return;
      _dashReload = true;
      Promise.resolve().then(async () => {
        _dashReload = false;
        await renderDashboard();
      });
    });

    // Reagir a mudanças de preferências (tema)
    eventBus.on('preferences:changed', (prefs) => {
      if (prefs && prefs.theme) applyTheme(prefs.theme);
    });

    eventBus.on('profile:changed', (profile) => {
      if (!profile) return;
      const name = profile.name || 'Utilizador';
      const nameEl = document.getElementById('sidebar-user-name');
      const avatarEl = document.getElementById('sidebar-avatar');
      const topNameEl = document.getElementById('topbar-user-name');
      const topAvatarEl = document.getElementById('topbar-avatar');
      if (nameEl) nameEl.textContent = name;
      if (topNameEl) topNameEl.textContent = displayShortName(name);
      const parts = name.trim().split(/\s+/);
      const initials = parts.length > 1
        ? parts[0][0] + parts[parts.length - 1][0]
        : parts[0].substring(0, 2);
      const ini = initials.toUpperCase();
      if (avatarEl) {
        if (profile.avatar) {
          avatarEl.style.background = 'url(' + profile.avatar + ') center/cover';
          avatarEl.textContent = '';
        } else {
          avatarEl.style.background = '';
          avatarEl.textContent = ini;
        }
      }
      if (topAvatarEl) {
        if (profile.avatar) {
          topAvatarEl.style.background = 'url(' + profile.avatar + ') center/cover';
          topAvatarEl.textContent = '';
        } else {
          topAvatarEl.style.background = '';
          topAvatarEl.textContent = ini;
        }
      }
    });

    eventBus.on('navigation:changed', (payload) => {
      if (!payload) return;
      const container = document.getElementById('content');
      if (payload.page === 'overview') {
        if (container) initOverview(container);
      } else if (payload.page === 'progress') {
        if (container) initProgress(container);
      } else if (payload.page === 'mainGoal') {
        if (container) initMainGoal(container);
      } else if (payload.page === 'lumiere-card') {
        if (container) initLumiereCard(container);
      } else if (payload.page === 'finances-card') {
        if (container) initFinancesCard(container);
      } else if (payload.page === 'today') {
        if (container) initToday(container);
      } else if (payload.page === 'weeklyProgress') {
        if (container) initWeeklyProgress(container);
      } else if (payload.page === 'insights-card') {
        if (container) initInsightsCard(container);
      } else if (payload.page === 'reports-card') {
        if (container) initReports(container);
      /* dashboard antigo arquivado — routing removido */
      } else if (payload.page === 'tasks') {
        if (container) initTasks(container);
      } else if (payload.page === 'habits') {
        if (container) initHabits(container);
      } else if (payload.page === 'goals') {
        if (container) initGoals(container);
      } else if (payload.page === 'studies') {
        if (container) initStudies(container);
      } else if (payload.page === 'lumiere') {
        if (container) initLumiere(container);
      } else if (payload.page === 'notes') {
        if (container) initNotes(container);
      } else if (payload.page === 'calendar') {
        if (container) initCalendar(container);
      } else if (payload.page === 'finances') {
        if (container) initFinances(container);
      } else if (payload.page === 'settings') {
        if (container) initSettings(container);
      } else if (payload.page === 'profile') {
        if (container) initProfile(container);
      } else {
        // Páginas ainda sem conteúdo definido: limpa a área
        if (container) container.innerHTML = '';
      }
    });

    const shell = document.getElementById('app-shell');
    if (shell && !shell.hidden) {
      renderIfDashboard();
    }

    document.addEventListener('onboarding:complete', () => {
      console.log('[App] Onboarding concluído, renderizando dashboard.');
      renderIfDashboard();
    });

    if (typeof window !== 'undefined') {
      window.__lumiere = { core, navigation, renderDashboard };

      // Landing page — Visão Geral Rápida
      stateManager.navigateTo('overview');
      eventBus.emit('navigation:changed', { page: 'overview' });
    }
    splash.hide();
  } catch (err) {
    console.error('[App] Falha ao inicializar:', err);
    splash.hide(0);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}
