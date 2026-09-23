/**
 * Core - Ponto de entrada central
 * Exporta todos os serviços do Core (singletons).
 *
 * Nota: apenas o EventBus expõe a classe; os outros módulos expõem
 * apenas o singleton. Se no futuro as classes forem exportadas,
 * este arquivo pode voltar a exportá-las.
 */
export { EventBus, eventBus } from './eventBus.js';
export { storageManager } from './storageManager.js';
export { stateManager } from './stateManager.js';
export { dataManager } from './dataManager.js';
export { calculationsManager } from './calculationsManager.js';
export { core } from './core.js';
