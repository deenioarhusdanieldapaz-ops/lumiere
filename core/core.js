/**
 * Core - Orquestração central
 * Ponto de entrada único para inicialização, ciclo de vida e API unificada.
 * Coordena StateManager, DataManager, CalculationsManager e EventBus.
 */
import { eventBus } from './eventBus.js';
import { storageManager } from './storageManager.js';
import { stateManager } from './stateManager.js';
import { dataManager } from './dataManager.js';
import { calculationsManager } from './calculationsManager.js';

class Core {
  constructor() {
    this.initialized = false;
    this._subscriptions = [];
  }

  /**
   * Inicializar o Core: carregar estado, dados e configurar listeners
   * @returns {Promise<void>}
   */
  async init() {
    if (this.initialized) {
      console.warn('[Core] Já inicializado.');
      return;
    }

    try {
      console.log('[Core] Inicializando...');

      // 1. Carregar estado persistido (já feito pelo StateManager no construtor)
      // 2. Carregar dados iniciais (opcional)
      // 3. Configurar listeners para eventos de dados
      this._setupListeners();

      // 4. Emitir evento de inicialização
      eventBus.emit('core:initialized', { timestamp: new Date().toISOString() });

      this.initialized = true;
      console.log('[Core] Inicializado com sucesso.');
    } catch (error) {
      console.error('[Core] Erro na inicialização:', error);
      throw error;
    }
  }

  /**
   * Configurar listeners para sincronização automática
   * @private
   */
  _setupListeners() {
    // Quando dados mudam, atualizar cálculos e estado (exemplo)
    const unsubscribe = eventBus.on('data:changed', async (payload) => {
      // Aqui pode-se recalcular métricas ou atualizar estado
      // Por exemplo, atualizar indicadores gerais no StateManager
      try {
        // Obter todas as coleções (simplificado)
        const collections = {};
        // Na prática, seria melhor ter uma lista de coleções para carregar
        // Mas isso será implementado posteriormente
        // stateManager.set({ lastUpdate: new Date().toISOString() }, 'data:changed');
      } catch (err) {
        console.error('[Core] Erro ao processar data:changed:', err);
      }
    });
    this._subscriptions.push(unsubscribe);

    // Listener para navegação
    const navUnsubscribe = eventBus.on('navigation:changed', (payload) => {
      // Atualizar estado se necessário
      stateManager.set({ currentPage: payload.page }, 'navigation');
    });
    this._subscriptions.push(navUnsubscribe);
  }

  /**
   * Obter dados de uma coleção (via DataManager)
   * @param {string} collection - Nome da coleção
   * @param {Object} options - Opções (filtros)
   * @returns {Promise<Array>}
   */
  async getData(collection, options = {}) {
    return await dataManager.list(collection, options);
  }

  /**
   * Criar um novo registro (via DataManager)
   * @param {string} collection - Nome da coleção
   * @param {Object} data - Dados
   * @returns {Promise<Object>}
   */
  async createRecord(collection, data) {
    return await dataManager.create(collection, data);
  }

  /**
   * Atualizar um registro (via DataManager)
   * @param {string} collection - Nome da coleção
   * @param {string} id - ID do registro
   * @param {Object} updates - Dados a atualizar
   * @returns {Promise<Object>}
   */
  async updateRecord(collection, id, updates) {
    return await dataManager.update(collection, id, updates);
  }

  /**
   * Remover um registro (via DataManager)
   * @param {string} collection - Nome da coleção
   * @param {string} id - ID do registro
   * @returns {Promise<void>}
   */
  async deleteRecord(collection, id) {
    return await dataManager.delete(collection, id);
  }

  /**
   * Calcular métricas (via CalculationsManager)
   * @param {string} metric - Nome da métrica (ex: 'taskProgress')
   * @param {Object} params - Parâmetros
   * @returns {any}
   */
  calculate(metric, params = {}) {
    // Mapear métricas para funções do CalculationsManager
    const metricMap = {
      taskProgress: () => {
        // Pega tarefas do DataManager (simplificado)
        // Na prática, seria async, mas aqui retornamos uma Promise
        return calculationsManager.calculateTaskProgress(params.tasks || []);
      },
      habitProgress: () => calculationsManager.calculateHabitProgress(params.habits, params.habitLogs, params.period),
      financeSummary: () => calculationsManager.calculateFinanceSummary(params.accounts, params.transactions),
      consistency: () => calculationsManager.checkDataConsistency(params.collections),
      indicators: () => calculationsManager.calculateGeneralIndicators(params.collections)
    };
    if (metricMap[metric]) {
      return metricMap[metric]();
    }
    throw new Error(`Métrica "${metric}" não suportada`);
  }

  /**
   * Obter estado da UI (via StateManager)
   * @returns {Object}
   */
  getState() {
    return stateManager.getState();
  }

  /**
   * Atualizar estado da UI (via StateManager)
   * @param {Object} updates
   * @param {string} source
   */
  setState(updates, source = 'core') {
    stateManager.set(updates, source);
  }

  /**
   * Navegar para uma página
   * @param {string} page
   * @param {Object} params
   */
  navigateTo(page, params = {}) {
    stateManager.navigateTo(page, params);
  }

  /**
   * Limpar recursos (listeners, etc.)
   */
  destroy() {
    for (const unsubscribe of this._subscriptions) {
      try {
        unsubscribe();
      } catch (e) {
        // Ignorar
      }
    }
    this._subscriptions = [];
    this.initialized = false;
    eventBus.clear('core:initialized');
    console.log('[Core] Destruído.');
  }
}

// Singleton
export const core = new Core();
export default core;
