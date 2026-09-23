/**
 * Components Index
 * Ponto único de importação de todos os componentes de UI.
 *
 * Uso:
 *   import { createCard, createProgress, createEmptyState, createMenu } from '../components/index.js';
 *
 * Regra: componentes NÃO conhecem regras de negócio.
 * Recebem dados via parâmetros e emitem callbacks.
 */

export { createCard } from './cards/card.js';
export { createProgress } from './progress/progress.js';
export { createEmptyState } from './empty-state/emptyState.js';
export { createMenu } from './menu/menu.js';
