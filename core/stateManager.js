/**
 * State Manager - Fonte única de verdade da UI
 * Gerencia estado da aplicação, seleção, loading, erros, sidebar e contexto.
 * É reativo: notifica listeners em cada mudança.
 */
import { eventBus } from './eventBus.js';

// Estado inicial
const initialState = {
  // Navegação
  currentPage: 'dashboard',
  sidebarOpen: false,
  previousPage: null,

  // UI
  loading: false,
  error: null,
  success: null,

  // Seleção
  selectedId: null,
  selectedType: null, // 'task', 'habit', etc.

  // Dados do usuário
  user: {
    name: null,
    preferences: {
      theme: 'noir', // noir | lumiere | auto
      goldIntensity: 'balanced', // subtle | balanced | strong
      interfaceSize: 'balanced' // compact | balanced | comfortable
    }
  },

  // Contexto
  context: {
    // Informações adicionais sobre a tela atual
    filter: null,
    sort: null,
    searchTerm: ''
  },

  // Flag para onboarding
  onboardingCompleted: false
};

class StateManager {
  constructor() {
    this.state = { ...initialState };
    this.listeners = [];
    this.isUpdating = false;

    // Carregar estado salvo (localStorage para preferências)
    this._loadPersistedState();
  }

  /**
   * Obter o estado atual (cópia imutável)
   * @returns {Object}
   */
  getState() {
    return { ...this.state };
  }

  /**
   * Obter uma propriedade específica
   * @param {string} key - Caminho com ponto (ex: 'user.name')
   * @returns {any}
   */
  get(key) {
    const parts = key.split('.');
    let value = this.state;
    for (const part of parts) {
      if (value === undefined || value === null) return undefined;
      value = value[part];
    }
    return value;
  }

  /**
   * Atualizar o estado
   * @param {Object} updates - Propriedades a serem atualizadas (merge profundo)
   * @param {string} source - Origem da atualização (para logging)
   */
  set(updates, source = 'unknown') {
    if (this.isUpdating) {
      console.warn('[StateManager] Atualização durante atualização, ignorando:', updates);
      return;
    }

    this.isUpdating = true;
    try {
      // Merge profundo manual (simples, sem bibliotecas)
      const newState = this._deepMerge({ ...this.state }, updates);
      this.state = newState;

      // Salvar preferências no localStorage (parcial)
      this._persistState();

      // Notificar listeners
      this._notifyListeners(updates, source);

      // Emitir evento via EventBus
      eventBus.emit('state:changed', { updates, source });
    } finally {
      this.isUpdating = false;
    }
  }

  /**
   * Resetar para o estado inicial
   */
  reset() {
    this.state = { ...initialState };
    this._persistState();
    this._notifyListeners({ reset: true }, 'reset');
    eventBus.emit('state:reset', {});
  }

  /**
   * Adicionar um listener para mudanças de estado
   * @param {Function} callback - (newState, updates, source) => void
   * @returns {Function} Função para remover o listener
   */
  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index !== -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Notificar todos os listeners
   * @private
   */
  _notifyListeners(updates, source) {
    const state = this.getState();
    for (const cb of this.listeners) {
      try {
        cb(state, updates, source);
      } catch (error) {
        console.error('[StateManager] Erro no listener:', error);
      }
    }
  }

  /**
   * Merge profundo de objetos
   * @private
   */
  _deepMerge(target, source) {
    const result = { ...target };
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this._deepMerge(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    return result;
  }

  /**
   * Persistir estado no localStorage (apenas preferências e user)
   * @private
   */
  _persistState() {
    try {
      const toStore = {
        user: this.state.user,
        onboardingCompleted: this.state.onboardingCompleted,
        preferences: this.state.user?.preferences || {}
      };
      localStorage.setItem('lumiereState', JSON.stringify(toStore));
    } catch (e) {
      // Ignorar erros de localStorage
    }
  }

  /**
   * Carregar estado persistido
   * @private
   */
  _loadPersistedState() {
    try {
      const stored = localStorage.getItem('lumiereState');
      if (stored) {
        const parsed = JSON.parse(stored);
        // Merge cuidadoso para não sobrescrever estrutura
        if (parsed.user) {
          this.state.user = { ...this.state.user, ...parsed.user };
        }
        if (parsed.onboardingCompleted !== undefined) {
          this.state.onboardingCompleted = parsed.onboardingCompleted;
        }
        if (parsed.preferences) {
          this.state.user.preferences = { ...this.state.user.preferences, ...parsed.preferences };
        }
      }
    } catch (e) {
      // Ignorar erros
    }
  }

  /**
   * Método auxiliar para navegação
   * @param {string} page - Nome da página
   * @param {Object} params - Parâmetros adicionais
   */
  navigateTo(page, params = {}) {
    this.set({
      previousPage: this.state.currentPage,
      currentPage: page,
      ...params
    }, 'navigation');
    eventBus.emit('navigation:changed', { page, params });
  }
}

// Singleton
export const stateManager = new StateManager();
export default stateManager;
