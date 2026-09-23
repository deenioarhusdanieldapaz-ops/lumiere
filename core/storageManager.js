/**
 * Storage Manager - Persistência com IndexedDB via Dexie
 * Encapsula todas as operações de banco de dados.
 * Nenhuma UI fala diretamente com este módulo.
 */
import Dexie from 'dexie';

// Definir esquema do banco
const DB_NAME = 'LumiereDB';
const DB_VERSION = 1;

class LumiereDatabase extends Dexie {
  constructor() {
    super(DB_NAME);
    this.version(DB_VERSION).stores({
      userProfiles: 'id, name, createdAt, updatedAt',
      tasks: 'id, name, category, status, dueDate, createdAt, updatedAt',
      habits: 'id, name, category, frequency, createdAt, updatedAt',
      habitLogs: 'id, habitId, date, completed, createdAt',
      studies: 'id, name, category, status, createdAt, updatedAt',
      studySessions: 'id, studyId, date, duration, notes',
      goals: 'id, name, category, status, targetDate, createdAt, updatedAt',
      goalMilestones: 'id, goalId, name, completed, createdAt',
      calendarEvents: 'id, title, start, end, allDay, createdAt, updatedAt',
      financeAccounts: 'id, name, type, balance, currency, createdAt, updatedAt',
      financeTransactions: 'id, accountId, amount, type, category, date, description, createdAt',
      budgets: 'id, category, amount, period, spent, createdAt, updatedAt',
      notes: 'id, title, content, category, createdAt, updatedAt',
      lumiereBusinesses: 'id, name, type, createdAt, updatedAt',
      lumiereProducts: 'id, businessId, name, price, stock, createdAt, updatedAt',
      lumiereCustomers: 'id, name, email, phone, createdAt, updatedAt',
      lumiereSales: 'id, customerId, productId, amount, date, createdAt',
      reminders: 'id, title, dueDate, completed, entityId, entityType, createdAt',
      categories: 'id, name, type, color, createdAt',
      tags: 'id, name, color, createdAt',
      preferences: 'id, key, value, updatedAt'
    });
  }
}

// Instância única do banco
let dbInstance = null;

function getDB() {
  if (!dbInstance) {
    dbInstance = new LumiereDatabase();
  }
  return dbInstance;
}

/**
 * Storage Manager - API pública
 */
export const storageManager = {
  /**
   * Obter uma coleção (tabela)
   * @param {string} collectionName - Nome da coleção
   * @returns {Dexie.Table} Tabela Dexie
   */
  getCollection(collectionName) {
    const db = getDB();
    if (!db[collectionName]) {
      throw new Error(`Coleção "${collectionName}" não existe no banco.`);
    }
    return db[collectionName];
  },

  /**
   * Criar um novo registro
   * @param {string} collection - Nome da coleção
   * @param {Object} data - Dados a serem inseridos (deve conter id)
   * @returns {Promise<string>} ID do registro criado
   */
  async create(collection, data) {
    const table = this.getCollection(collection);
    if (!data.id) {
      data.id = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    }
    if (!data.createdAt) data.createdAt = new Date().toISOString();
    if (!data.updatedAt) data.updatedAt = data.createdAt;
    await table.add(data);
    return data.id;
  },

  /**
   * Ler um registro por ID
   * @param {string} collection - Nome da coleção
   * @param {string} id - ID do registro
   * @returns {Promise<Object>} Registro encontrado ou undefined
   */
  async read(collection, id) {
    const table = this.getCollection(collection);
    return await table.get(id);
  },

  /**
   * Atualizar um registro existente
   * @param {string} collection - Nome da coleção
   * @param {string} id - ID do registro
   * @param {Object} updates - Dados a serem atualizados
   * @returns {Promise<number>} Número de registros atualizados
   */
  async update(collection, id, updates) {
    const table = this.getCollection(collection);
    updates.updatedAt = new Date().toISOString();
    return await table.update(id, updates);
  },

  /**
   * Remover um registro
   * @param {string} collection - Nome da coleção
   * @param {string} id - ID do registro
   * @returns {Promise<void>}
   */
  async delete(collection, id) {
    const table = this.getCollection(collection);
    await table.delete(id);
  },

  /**
   * Listar todos os registros de uma coleção
   * @param {string} collection - Nome da coleção
   * @returns {Promise<Array>} Lista de registros
   */
  async list(collection) {
    const table = this.getCollection(collection);
    return await table.toArray();
  },

  /**
   * Buscar por um campo específico
   * @param {string} collection - Nome da coleção
   * @param {string} field - Campo a ser filtrado
   * @param {*} value - Valor a ser correspondido
   * @returns {Promise<Array>}
   */
  async findBy(collection, field, value) {
    const table = this.getCollection(collection);
    return await table.where(field).equals(value).toArray();
  },

  /**
   * Limpar todos os dados (cuidado!)
   * @param {string} collection - Nome da coleção
   * @returns {Promise<void>}
   */
  async clear(collection) {
    const table = this.getCollection(collection);
    await table.clear();
  }
};

export default storageManager;
