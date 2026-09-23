/**
 * Data Manager - CRUD, validação via contratos e integração com StorageManager.
 *
 * Fluxo: create/update -> defaults -> validação -> relações -> StorageManager -> EventBus
 * Nenhuma UI fala diretamente com StorageManager.
 */
import { storageManager } from './storageManager.js';
import { eventBus } from './eventBus.js';
import * as contracts from '../data/contracts/index.js?v=20260912a';

// Mapeamento coleção -> contrato
const contractMap = {
  tasks: contracts.taskContract,
  habits: contracts.habitContract,
  habitLogs: contracts.habitLogContract,
  studies: contracts.studyContract,
  studySessions: contracts.studySessionContract,
  goals: contracts.goalContract,
  goalMilestones: contracts.goalMilestoneContract,
  calendarEvents: contracts.calendarEventContract,
  financeAccounts: contracts.financeAccountContract,
  financeTransactions: contracts.financeTransactionContract,
  budgets: contracts.budgetContract,
  notes: contracts.noteContract,
  lumiereBusinesses: contracts.lumiereBusinessContract,
  lumiereProducts: contracts.lumiereProductContract,
  lumiereCustomers: contracts.lumiereCustomerContract,
  lumiereSales: contracts.lumiereSaleContract,
  reminders: contracts.reminderContract,
  categories: contracts.categoryContract,
  tags: contracts.tagContract,
  preferences: contracts.preferencesContract,
  userProfiles: contracts.userProfileContract
};

export const dataManager = {
  /**
   * Obter contrato de uma coleção (também valida a coleção).
   * @param {string} collection
   * @returns {Object} contrato
   */
  _getContract(collection) {
    const contract = contractMap[collection];
    if (!contract) {
      throw new Error(`Coleção "${collection}" não possui contrato definido.`);
    }
    return contract;
  },

  /**
   * Validar dados com o contrato.
   */
  _validate(collection, data) {
    const contract = this._getContract(collection);
    if (typeof contract.validate === 'function') {
      return contract.validate(data);
    }
    return { valid: true, errors: [] };
  },

  /**
   * Aplicar defaults do contrato (apenas na criação).
   */
  _applyDefaults(collection, data) {
    const contract = this._getContract(collection);
    const defaults = typeof contract.defaults === 'function' ? contract.defaults() : {};
    return { ...defaults, ...data };
  },

  /**
   * Verificar integridade referencial usando as relações do contrato.
   */
  async _checkRelations(collection, data) {
    const contract = this._getContract(collection);
    const errors = [];
    if (contract.relations && typeof contract.relations === 'object') {
      for (const [field, targetCollection] of Object.entries(contract.relations)) {
        const id = data[field];
        if (id) {
          try {
            const targetData = await storageManager.read(targetCollection, id);
            if (!targetData) {
              errors.push(`Referência inválida: ${field}="${id}" não encontrado em "${targetCollection}"`);
            }
          } catch (e) {
            errors.push(`Erro ao verificar relação ${field}: ${e.message}`);
          }
        }
      }
    }
    return { valid: errors.length === 0, errors };
  },

  /**
   * Criar um registro.
   * @param {string} collection
   * @param {Object} data
   * @returns {Promise<Object>} registro criado (com id/timestamps)
   */
  async create(collection, data) {
    const fullData = this._applyDefaults(collection, data);

    const validation = this._validate(collection, fullData);
    if (!validation.valid) {
      throw new Error(`Validação falhou em "${collection}": ${validation.errors.join(', ')}`);
    }

    const relationCheck = await this._checkRelations(collection, fullData);
    if (!relationCheck.valid) {
      throw new Error(`Integridade referencial em "${collection}": ${relationCheck.errors.join(', ')}`);
    }

    // StorageManager gera id/createdAt/updatedAt se ausentes
    await storageManager.create(collection, fullData);
    const created = await storageManager.read(collection, fullData.id);

    eventBus.emit(`data:created:${collection}`, created);
    eventBus.emit('data:changed', { collection, action: 'create', record: created });

    return created;
  },

  /**
   * Ler um registro por ID.
   */
  async read(collection, id) {
    this._getContract(collection); // valida a coleção
    return await storageManager.read(collection, id);
  },

  /**
   * Atualizar um registro.
   */
  async update(collection, id, updates) {
    this._getContract(collection);
    if (!id) throw new Error('ID é obrigatório para atualização.');

    const existing = await storageManager.read(collection, id);
    if (!existing) {
      throw new Error(`Registro "${id}" não encontrado em "${collection}".`);
    }

    const merged = { ...existing, ...updates };

    const validation = this._validate(collection, merged);
    if (!validation.valid) {
      throw new Error(`Validação falhou em "${collection}": ${validation.errors.join(', ')}`);
    }

    const relationCheck = await this._checkRelations(collection, merged);
    if (!relationCheck.valid) {
      throw new Error(`Integridade referencial em "${collection}": ${relationCheck.errors.join(', ')}`);
    }

    await storageManager.update(collection, id, updates);
    const updated = await storageManager.read(collection, id);

    eventBus.emit(`data:updated:${collection}`, updated);
    eventBus.emit('data:changed', { collection, action: 'update', record: updated });

    return updated;
  },

  /**
   * Remover um registro.
   */
  async delete(collection, id) {
    this._getContract(collection);
    if (!id) throw new Error('ID é obrigatório para remoção.');

    const existing = await storageManager.read(collection, id);
    if (!existing) {
      throw new Error(`Registro "${id}" não encontrado em "${collection}".`);
    }

    await storageManager.delete(collection, id);

    eventBus.emit(`data:deleted:${collection}`, { id, deletedAt: new Date().toISOString() });
    eventBus.emit('data:changed', { collection, action: 'delete', id });
  },

  /**
   * Listar registros.
   */
  async list(collection, options = {}) {
    this._getContract(collection);
    if (options.field && options.value !== undefined) {
      return await storageManager.findBy(collection, options.field, options.value);
    }
    return await storageManager.list(collection);
  },

  /**
   * Buscar por campo específico.
   */
  async findBy(collection, field, value) {
    this._getContract(collection);
    return await storageManager.findBy(collection, field, value);
  },

  /**
   * Contar registros (implementado via list, pois StorageManager não tem count).
   */
  async count(collection) {
    this._getContract(collection);
    const all = await storageManager.list(collection);
    return all.length;
  },

  /**
   * Limpar uma coleção (cuidado!).
   */
  async clear(collection) {
    this._getContract(collection);
    await storageManager.clear(collection);
    eventBus.emit(`data:cleared:${collection}`, { clearedAt: new Date().toISOString() });
    eventBus.emit('data:changed', { collection, action: 'clear' });
  }
};

export default dataManager;
