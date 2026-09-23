/**
 * Registry de sections do Dashboard.
 *
 * Cada section regista-se com { id, order, render }.
 * O orchestrator consome a lista ordenada por `order`.
 *
 * NÃO conhece regras de negócio. NÃO fala com o Core.
 * Apenas um registo em memória.
 */

class DashboardRegistry {
  constructor() {
    /** @type {Map<string, {id:string, order:number, render:Function}>} */
    this._sections = new Map();
  }

  /**
   * Regista uma section.
   * @param {Object} section
   * @param {string} section.id     - Identificador único
   * @param {number} [section.order=100] - Ordem de renderização (menor = primeiro)
   * @param {Function} section.render - (container, context) => void
   */
  register(section) {
    if (!section || typeof section.id !== 'string') {
      throw new Error('[Registry] Section precisa de "id" (string).');
    }
    if (typeof section.render !== 'function') {
      throw new Error(`[Registry] Section "${section.id}" precisa de "render" (função).`);
    }
    if (this._sections.has(section.id)) {
      console.warn(`[Registry] Section "${section.id}" já registada. Ignorada.`);
      return;
    }
    this._sections.set(section.id, {
      id: section.id,
      order: typeof section.order === 'number' ? section.order : 100,
      render: section.render
    });
  }

  /**
   * Devolve a lista de sections registadas, ordenada por `order`.
   * @returns {Array<{id:string, order:number, render:Function}>}
   */
  list() {
    return Array.from(this._sections.values())
      .sort((a, b) => a.order - b.order);
  }

  /**
   * Verifica se uma section está registada.
   * @param {string} id
   * @returns {boolean}
   */
  has(id) {
    return this._sections.has(id);
  }

  /**
   * Devolve uma section por id.
   * @param {string} id
   * @returns {Object|undefined}
   */
  get(id) {
    return this._sections.get(id);
  }

  /**
   * Limpa o registo (útil em testes).
   */
  clear() {
    this._sections.clear();
  }
}

export const dashboardRegistry = new DashboardRegistry();
export default dashboardRegistry;
