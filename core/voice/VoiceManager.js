/**
 * VoiceManager
 *
 * Orquestra uma sessão de voz ponta a ponta:
 *   IDLE → criar sessão → permissão → SpeechRecognizer.start()
 *        → transcrição final → VoiceInterpreter.interpret()
 *        → VoiceValidator.validate()
 *        → se aceitável: VoiceCommandRouter.route()
 *        → emitir evento UI ('voice:prefill-form')
 *        → aguardar confirmação do utilizador
 *        → se cancelado: marcar sessão como CANCELLED
 *
 * NÃO cria entidades. NÃO toca no DataManager diretamente.
 * Não arranca no bootstrap do app (regra secção 20).
 * Só corre quando o utilizador toca no microfone.
 */

import voiceSession, { VOICE_STATES } from './VoiceSession.js';
import { SpeechRecognizer, isSpeechSupported } from './SpeechRecognizer.js';
import VoiceInterpreter, { INTENTS } from './VoiceInterpreter.js';
import VoiceValidator from './VoiceValidator.js';
import VoiceCommandRouter from './VoiceCommandRouter.js';

export const VoiceManager = {
  isSupported() {
    return isSpeechSupported();
  },

  isActive() {
    return voiceSession.isActive();
  },

  // TODO: implementar (Bloco B/C)
  async start() {
    return { ok: false, reason: 'not-implemented' };
  },

  cancel() {
    // TODO: implementar
  },

  confirm() {
    // TODO: implementar
  }
};

export default VoiceManager;
