/**
 * Core / Voice
 *
 * Lumière Command System — sistema de comandos por voz.
 * Arquitetura isolada; a app funciona sem este módulo (Voice é opcional).
 *
 * Ordem de fluxo:
 *   IDLE → permissão → A_OUVIR → transcrição → interpretação
 *        → validação → ENTENDI_ISTO → router → form real
 *        → confirmação → DataManager → IndexedDB
 */
export { VoiceManager } from './VoiceManager.js';
export { SpeechRecognizer, isSpeechSupported } from './SpeechRecognizer.js';
export { VoiceInterpreter, INTENTS } from './VoiceInterpreter.js';
export { VoiceValidator, CONFIDENCE, POLICY } from './VoiceValidator.js';
export { VoiceCommandRouter } from './VoiceCommandRouter.js';
export { voiceSession, VoiceSession, VOICE_STATES } from './VoiceSession.js';
