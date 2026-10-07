/**
 * VoiceManager
 *
 * Orquestra uma sessão de voz ponta a ponta:
 *   IDLE → criar sessão → pedir permissão → LISTENING
 *        → transcrição interim/final → INTERPRETING
 *        → interpretar + validar → CONFIRMING | ERROR
 *        → (se CONFIRMING) utilizador confirma → route → emitir 'voice:prefill-form'
 *        → (se CONFIRMING) utilizador cancela → CANCELLED
 *
 * NÃO cria entidades. NÃO toca no DataManager.
 * Emite eventos que a UI (overlay + orbe) e o router consomem.
 *
 * Eventos emitidos:
 *   voice:state       { state }           — mudou o estado
 *   voice:interim     { text }            — transcrição parcial
 *   voice:transcript  { transcript }      — transcrição final
 *   voice:understood  { intent, decision }— interpretação aceita (aguarda confirmar)
 *   voice:clarify     { intent, decision }— precisa de clarificação
 *   voice:error       { reason }          — não entendi ou falhou
 *   voice:cancelled   {}                  — cancelado pelo utilizador
 *   voice:confirmed   { route }           — confirmado, pronto para prefill
 */

import { eventBus } from '../eventBus.js';
import { stateManager } from '../stateManager.js';
import voiceSession, { VOICE_STATES } from './VoiceSession.js';
import { SpeechRecognizer, isSpeechSupported } from './SpeechRecognizer.js';
import VoiceInterpreter from './VoiceInterpreter.js';
import VoiceValidator, { POLICY } from './VoiceValidator.js';
import VoiceCommandRouter from './VoiceCommandRouter.js';
import { AudioLevelMeter } from './AudioLevelMeter.js';

let _recognizer = null;
let _finalAccumulator = '';
let _meter = null;

function emit(event, payload) {
  try { eventBus.emit(event, payload); } catch (e) {
    console.warn('[VoiceManager] emit falhou:', event, e);
  }
}

function cleanupRecognizer() {
  if (_recognizer) {
    try { _recognizer.abort(); } catch (_) {}
    _recognizer = null;
  }
}

function startMeter() {
  if (_meter) return;
  _meter = new AudioLevelMeter();
  _meter.onLevel = (level) => {
    emit('voice:audioLevel', { level });
  };
  _meter.start().then((res) => {
    if (!res.ok) {
      console.warn('[VoiceManager] Meter não arrancou:', res.reason);
    }
  }).catch((e) => {
    console.warn('[VoiceManager] Erro ao arrancar meter:', e);
  });
}

function stopMeter() {
  if (_meter) {
    try { _meter.stop(); } catch (_) {}
    _meter = null;
    emit('voice:audioLevel', { level: 0 });
  }
}

async function processFinalTranscript() {
  const session = voiceSession.current();
  if (!session) return;

  const transcript = (_finalAccumulator || session.transcript || '').trim();
  session.setTranscript(transcript, '');
  emit('voice:transcript', { transcript });

  if (!transcript) {
    session.setError('no-transcript');
    emit('voice:error', { reason: 'no-transcript' });
    emit('voice:state', { state: VOICE_STATES.ERROR });
    return;
  }

  // Estado: INTERPRETING
  session.setState(VOICE_STATES.INTERPRETING);
  emit('voice:state', { state: VOICE_STATES.INTERPRETING });

  // Interpretar
  let intent;
  try {
    intent = VoiceInterpreter.interpret(transcript);
  } catch (e) {
    console.error('[VoiceManager] Interpreter falhou:', e);
    intent = { intent: 'unknown', confidence: 0, source: 'voice' };
  }
  session.setIntent(intent, intent.confidence || 0);

  // Validar
  let decision;
  try {
    decision = VoiceValidator.validate(intent, []);
  } catch (e) {
    console.error('[VoiceManager] Validator falhou:', e);
    decision = { decision: POLICY.REJECT, reason: 'validator-crash' };
  }
  session.setMissingFields(decision.missingFields || []);
  session.setAmbiguities(decision.ambiguousFields || []);

  if (decision.decision === POLICY.ACCEPT) {
    session.setState(VOICE_STATES.CONFIRMING);
    emit('voice:state', { state: VOICE_STATES.CONFIRMING });
    emit('voice:understood', { intent, decision });
  } else if (decision.decision === POLICY.NEED_CLARIFICATION) {
    emit('voice:clarify', { intent, decision });
    emit('voice:state', { state: VOICE_STATES.CONFIRMING });
  } else {
    session.setError(decision.reason || 'rejected');
    emit('voice:error', { reason: decision.reason || 'rejected' });
    emit('voice:state', { state: VOICE_STATES.ERROR });
  }
}

export const VoiceManager = {
  isSupported() {
    return isSpeechSupported();
  },

  isActive() {
    return voiceSession.isActive();
  },

  /**
   * Inicia sessão de voz.
   * @param {Object} options
   *   - lang: 'pt-PT' (default)
   *   - continuous: false (default)
   * @returns {Promise<{ok: boolean, reason?: string}>}
   */
  async start(options = {}) {
    // Abortar sessão existente
    if (voiceSession.isActive()) {
      console.warn('[VoiceManager] Sessão já ativa, a cancelar anterior.');
      this.cancel();
      await new Promise(r => setTimeout(r, 120));
    }

    if (!isSpeechSupported()) {
      emit('voice:error', { reason: 'unsupported' });
      emit('voice:state', { state: VOICE_STATES.ERROR });
      return { ok: false, reason: 'unsupported' };
    }

    // Criar sessão
    _finalAccumulator = '';
    const session = voiceSession.create({ source: 'mic' });
    session.setState(VOICE_STATES.IDLE);
    emit('voice:state', { state: VOICE_STATES.IDLE });

    // Criar recognizer
    _recognizer = new SpeechRecognizer({
      lang: options.lang || 'pt-PT',
      continuous: options.continuous === true,
      interimResults: true,
      onStart: () => {
        session.setState(VOICE_STATES.LISTENING);
        emit('voice:state', { state: VOICE_STATES.LISTENING });
      },
      onInterim: (text) => {
        session.setTranscript('', text);
        emit('voice:interim', { text });
      },
      onFinal: (text) => {
        _finalAccumulator += (text ? ' ' + text : '');
        _finalAccumulator = _finalAccumulator.trim();
        session.setTranscript(_finalAccumulator, '');
        emit('voice:transcript', { transcript: _finalAccumulator, isFinal: true });
      },
      onError: (code) => {
        const reason = code === 'not-allowed' ? 'permission-denied' : code;
        session.setError(reason);
        emit('voice:error', { reason });
        emit('voice:state', { state: VOICE_STATES.ERROR });
        cleanupRecognizer();
        stopMeter();
      },
      onEnd: () => {
        const s = voiceSession.current();
        if (!s) return;
        if (s.state === VOICE_STATES.LISTENING) {
          processFinalTranscript();
        }
        cleanupRecognizer();
        stopMeter();
      }
    });

    // Pedir permissão ANTES de começar (o recognizer pediria implicitamente,
    // mas assim temos controlo sobre a mensagem de erro)
    const perm = await _recognizer.requestPermission();
    if (!perm.granted) {
      session.setError(perm.reason || 'permission-denied');
      emit('voice:error', { reason: perm.reason || 'permission-denied' });
      emit('voice:state', { state: VOICE_STATES.ERROR });
      cleanupRecognizer();
      stopMeter();
      return { ok: false, reason: perm.reason || 'permission-denied' };
    }

    // Arrancar meter de áudio (para o orbe reagir)
    startMeter();

    // Arrancar reconhecimento
    const started = _recognizer.start();
    if (!started) {
      session.setError('start-failed');
      emit('voice:error', { reason: 'start-failed' });
      emit('voice:state', { state: VOICE_STATES.ERROR });
      cleanupRecognizer();
      stopMeter();
      return { ok: false, reason: 'start-failed' };
    }

    return { ok: true };
  },

  /**
   * Cancela a sessão.
   */
  cancel() {
    const session = voiceSession.current();
    if (!session) return;

    cleanupRecognizer();
    stopMeter();
    session.end(VOICE_STATES.CANCELLED);
    emit('voice:cancelled', {});
    emit('voice:state', { state: VOICE_STATES.CANCELLED });
    voiceSession.end();
    _finalAccumulator = '';
  },

  /**
   * Confirma a interpretação — passa para o router.
   * Só válido se a sessão estiver em CONFIRMING.
   */
  confirm() {
    const session = voiceSession.current();
    if (!session || session.state !== VOICE_STATES.CONFIRMING) {
      console.warn('[VoiceManager] confirm() fora de estado CONFIRMING.');
      return { ok: false, reason: 'not-confirming' };
    }

    let route;
    try {
      route = VoiceCommandRouter.route(session.intent);
    } catch (e) {
      console.error('[VoiceManager] Router falhou:', e);
      emit('voice:error', { reason: 'router-crash' });
      emit('voice:state', { state: VOICE_STATES.ERROR });
      return { ok: false, reason: 'router-crash' };
    }

    if (!route) {
      emit('voice:error', { reason: 'no-route' });
      emit('voice:state', { state: VOICE_STATES.ERROR });
      return { ok: false, reason: 'no-route' };
    }

    // 1) Navegar primeiro — garante que initTasks() corre e regista o listener
    try {
      stateManager.navigateTo(route.page);
    } catch (e) {
      console.warn('[VoiceManager] navigateTo falhou:', e);
    }

    // 2) Emitir o prefill com pequeno delay (módulo destino faz init + registo do listener)
    setTimeout(() => {
      try { eventBus.emit('voice:prefill-form', route); } catch (e) {
        console.warn('[VoiceManager] emit prefill falhou:', e);
      }
    }, 250);

    emit('voice:confirmed', { route });
    session.end(VOICE_STATES.CONFIRMING);
    voiceSession.end();
    _finalAccumulator = '';
    cleanupRecognizer();
    stopMeter();
    return { ok: true, route };
  },

  /**
   * DEBUG/TESTE: injetar transcrição sem microfone.
   * Usado pela página de teste enquanto o interpretador é stub.
   */
  async debugInjectTranscript(text) {
    if (voiceSession.isActive()) {
      this.cancel();
      await new Promise(r => setTimeout(r, 100));
    }
    _finalAccumulator = String(text || '').trim();
    const session = voiceSession.create({ source: 'debug' });
    session.setTranscript(_finalAccumulator, '');
    emit('voice:state', { state: VOICE_STATES.LISTENING });
    // Processa imediatamente
    setTimeout(() => processFinalTranscript(), 200);
    return { ok: true };
  }
};

export default VoiceManager;
