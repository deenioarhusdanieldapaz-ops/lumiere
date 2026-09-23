/**
 * EventBus - Comunicação desacoplada entre partes do sistema.
 *
 * API:
 *   on(event, callback)   → registra listener, retorna função unsubscribe
 *   once(event, callback) → listener que se remove após a primeira chamada
 *   off(event, callback)  → remove listener específico
 *   emit(event, payload)  → notifica todos os listeners do evento
 *   clear(event?)         → remove listeners de um evento (ou todos, se vazio)
 *
 * Nenhuma regra de negócio. Nenhum acesso ao DOM.
 */

export class EventBus {
  constructor() {
    /** @type {Map<string, Set<Function>>} */
    this._listeners = new Map();
  }

  /**
   * Registra um listener para um evento.
   * @param {string} event
   * @param {Function} callback
   * @returns {Function} função para desregistrar
   */
  on(event, callback) {
    if (typeof callback !== 'function') {
      throw new Error('[EventBus] Callback deve ser uma função.');
    }
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }
    this._listeners.get(event).add(callback);
    return () => this.off(event, callback);
  }

  /**
   * Registra um listener que se remove após a primeira chamada.
   */
  once(event, callback) {
    const wrapper = (payload) => {
      this.off(event, wrapper);
      callback(payload);
    };
    return this.on(event, wrapper);
  }

  /**
   * Remove um listener específico.
   */
  off(event, callback) {
    const set = this._listeners.get(event);
    if (!set) return;
    set.delete(callback);
    if (set.size === 0) this._listeners.delete(event);
  }

  /**
   * Emite um evento para todos os listeners registrados.
   * Erros em um listener NÃO interrompem os demais.
   * @param {string} event
   * @param {*} payload
   */
  emit(event, payload) {
    const set = this._listeners.get(event);
    if (!set || set.size === 0) return;

    // Copiar para permitir modificações durante a iteração
    const listeners = Array.from(set);
    for (const cb of listeners) {
      try {
        cb(payload);
      } catch (err) {
        console.error(`[EventBus] Erro em listener de "${event}":`, err);
      }
    }
  }

  /**
   * Remove todos os listeners de um evento (ou todos, se event não for passado).
   * @param {string} [event]
   */
  clear(event) {
    if (event === undefined) {
      this._listeners.clear();
    } else {
      this._listeners.delete(event);
    }
  }

  /**
   * Diagnóstico: retorna número de listeners de um evento (ou total).
   * @param {string} [event]
   * @returns {number}
   */
  count(event) {
    if (event === undefined) {
      let total = 0;
      for (const set of this._listeners.values()) total += set.size;
      return total;
    }
    const set = this._listeners.get(event);
    return set ? set.size : 0;
  }
}

// Singleton
export const eventBus = new EventBus();
export default eventBus;
