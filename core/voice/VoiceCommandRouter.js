/**
 * VoiceCommandRouter
 *
 * Traduz um VoiceIntent (já validado) → uma "rota" que a UI pode executar.
 *
 * NÃO cria entidades. NÃO fala com o DataManager.
 * Emite 'voice:prefill-form' com { page, action, payload, voiceOrigin }.
 * O módulo destino (tasks.js, etc.) escuta e abre o form pré-preenchido.
 *
 * Tradução de campos:
 *   intent.title  →  payload.name   (o taskContract usa `name`, não `title`)
 *   intent.dueDate/priority/category → passam diretos
 *   intent.confidence/source/input → metadados (para a UI mostrar "preenchido por voz")
 */

import { eventBus } from '../eventBus.js';

/* ============================================================
   Mapeamento intent → destino
   ============================================================ */

const INTENT_TO_DEST = {
  create_task:    { page: 'tasks',     collection: 'tasks' },
  create_habit:   { page: 'habits',    collection: 'habits' },
  create_event:   { page: 'calendar',  collection: 'calendarEvents' },
  create_note:    { page: 'notes',     collection: 'notes' },
  create_expense: { page: 'finances',  collection: 'financeTransactions' },
  create_goal:    { page: 'goals',     collection: 'goals' }
};

/* ============================================================
   Construtores de payload por intent
   Cada um traduz o intent para os campos aceites pelo contrato.
   ============================================================ */

function buildTaskPayload(intent) {
  const p = {};
  if (intent.title) p.name = intent.title;
  if (intent.dueDate) p.dueDate = intent.dueDate;
  if (intent.priority) p.priority = intent.priority;
  if (intent.category) p.category = intent.category;
  // Nota: intent pode trazer outros campos no futuro (tags, notes, etc.)
  return p;
}

function buildHabitPayload(intent) {
  const p = {};
  if (intent.title) p.name = intent.title;
  if (intent.category) p.category = intent.category;
  return p;
}

function buildEventPayload(intent) {
  const p = {};
  if (intent.title) p.title = intent.title;
  if (intent.dueDate) p.start = intent.dueDate;
  return p;
}

function buildNotePayload(intent) {
  const p = {};
  if (intent.title) p.title = intent.title;
  if (intent.content) p.content = intent.content;
  if (intent.category) p.category = intent.category;
  return p;
}

function buildExpensePayload(intent) {
  const p = {};
  if (intent.title) p.description = intent.title;
  if (intent.amount) p.amount = intent.amount;
  if (intent.category) p.category = intent.category;
  return p;
}

function buildGoalPayload(intent) {
  const p = {};
  if (intent.title) p.name = intent.title;
  if (intent.category) p.category = intent.category;
  if (intent.dueDate) p.targetDate = intent.dueDate;
  return p;
}

const PAYLOAD_BUILDERS = {
  create_task: buildTaskPayload,
  create_habit: buildHabitPayload,
  create_event: buildEventPayload,
  create_note: buildNotePayload,
  create_expense: buildExpensePayload,
  create_goal: buildGoalPayload
};

/* ============================================================
   API
   ============================================================ */

export const VoiceCommandRouter = {
  /**
   * Constrói a rota a partir de um intent validado.
   * @param {Object} intent — VoiceIntent do interpreter
   * @returns {Object|null} — rota ou null se intent desconhecido
   */
  route(intent) {
    if (!intent || !intent.intent) return null;

    const dest = INTENT_TO_DEST[intent.intent];
    if (!dest) return null;

    const builder = PAYLOAD_BUILDERS[intent.intent];
    const payload = builder ? builder(intent) : {};

    const route = {
      page: dest.page,
      action: 'new',
      collection: dest.collection,
      payload,
      voiceOrigin: true,
      meta: {
        intent: intent.intent,
        confidence: intent.confidence,
        source: intent.source || 'voice',
        input: intent.input || ''
      }
    };
    return route;
  },

  /**
   * Constrói a rota E emite 'voice:prefill-form' no eventBus.
   * @param {Object} intent
   * @returns {{ok: boolean, route?: Object, reason?: string}}
   */
  dispatch(intent) {
    const route = this.route(intent);
    if (!route) {
      return { ok: false, reason: 'no-route' };
    }
    try {
      eventBus.emit('voice:prefill-form', route);
    } catch (e) {
      console.error('[VoiceCommandRouter] emit falhou:', e);
      return { ok: false, reason: 'emit-failed' };
    }
    return { ok: true, route };
  }
};

export default VoiceCommandRouter;
