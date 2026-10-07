/**
 * VoiceInterpreter
 *
 * Transforma transcrição (texto natural) em VoiceIntent estruturado.
 *
 * VoiceIntent:
 *   {
 *     input: 'criar tarefa estudar matemática amanhã',
 *     intent: 'create_task',
 *     title: 'Estudar matemática',
 *     dueDate: '2026-10-08',
 *     priority: 'medium',
 *     category: 'study',
 *     confidence: 0.96,
 *     source: 'voice',
 *     missingFields: [],
 *     ambiguousFields: []
 *   }
 *
 * NÃO grava no IndexedDB.
 * NÃO abre formulários.
 * Devolve apenas o objeto interpretado.
 */

export const INTENTS = {
  CREATE_TASK: 'create_task',
  CREATE_HABIT: 'create_habit',
  CREATE_EVENT: 'create_event',
  CREATE_NOTE: 'create_note',
  CREATE_EXPENSE: 'create_expense',
  CREATE_GOAL: 'create_goal',
  UNKNOWN: 'unknown'
};

export const VoiceInterpreter = {
  interpret(_text) {
    // TODO: implementar parsing por intenção (Bloco D)
    return {
      input: _text,
      intent: INTENTS.UNKNOWN,
      confidence: 0,
      source: 'voice',
      missingFields: [],
      ambiguousFields: []
    };
  }
};

export default VoiceInterpreter;
