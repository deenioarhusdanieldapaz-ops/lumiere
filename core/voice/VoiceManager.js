/**
 * VoiceManager (MVP 2.4)
 *
 * Sem timers. Sem watchdogs. Sem silence detection.
 * O utilizador controla QUANDO termina de falar via finishSpeaking().
 *
 * Fluxo:
 *   start() → pedir permissão → recognizer.start()
 *          → onresult (interim + final) acumula em _finalAccumulator
 *          → onend NÃO faz nada (o recognizer reinicia sozinho para não perder fala)
 *          → utilizador toca em "Terminei de falar" → finishSpeaking()
 *          → finishSpeaking() para o recognizer + processFinalTranscript()
 */
import { eventBus } from '../eventBus.js';
import { stateManager } from '../stateManager.js';
import voiceSession, { VOICE_STATES } from './VoiceSession.js';
import { SpeechRecognizer, isSpeechSupported } from './SpeechRecognizer.js';
import VoiceInterpreter from './VoiceInterpreter.js';
import VoiceValidator, { POLICY } from './VoiceValidator.js';
import VoiceCommandRouter from './VoiceCommandRouter.js';

let _recognizer = null;
let _finalAccumulator = '';

/**
 * Junta um novo utterance ao acumulado, removendo sobreposições.
 * O Chrome às vezes reenvia o texto completo no próximo resultado,
 * e sem esta função duplicamos tudo.
 */
function mergeUtterance(prev, incoming) {
  const p = (prev || '').trim();
  const i = (incoming || '').trim();
  if (!p) return i;
  if (!i) return p;
  if (p === i) return p;

  // Caso 1: incoming é substring do acumulado (Chrome reenvia parte já ouvida)
  if (p.includes(i)) return p;

  // Caso 2: incoming contém o acumulado inteiro (Chrome reenvia tudo + mais)
  if (i.startsWith(p)) return i;

  // Caso 3: sobreposição sufixo/prefixo com 3+ caracteres
  const minOverlap = 3;
  const maxLen = Math.min(p.length, i.length);
  for (let len = maxLen; len >= minOverlap; len--) {
    if (p.slice(-len) === i.slice(0, len)) {
      return p + i.slice(len);
    }
  }

  // Caso 4: sobreposição onde incoming aparece em qualquer ponto de p
  // (Chrome às vezes "reinicia" o utterance do início)
  const idx = p.lastIndexOf(i);
  if (idx >= 0 && (idx + i.length) >= p.length - 3) {
    return p;
  }

  return p + ' ' + i;
}

function emit(event, payload) {
  try { eventBus.emit(event, payload); } catch (e) { console.warn('[VoiceManager] emit falhou:', event, e); }
}

function cleanupRecognizer() {
  if (_recognizer) { try { _recognizer.abort(); } catch (_) {} _recognizer = null; }
}

/* ---------- Pseudo-meter para o orbe (visual) ---------- */
let _pseudoTimer = null;
let _pseudoLevel = 0;
let _lastActivity = 0;

function _pseudoTick() {
  if (!voiceSession.isActive()) return;
  const ageMs = Date.now() - _lastActivity;
  const decay = ageMs > 700 ? Math.max(0, 1 - (ageMs - 700) / 900) : 1;
  emit('voice:audioLevel', { level: _pseudoLevel * decay });
}
function startMeter() {
  stopMeter();
  _pseudoLevel = 0;
  _lastActivity = Date.now();
  _pseudoTimer = setInterval(_pseudoTick, 80);
}
function stopMeter() {
  if (_pseudoTimer) { clearInterval(_pseudoTimer); _pseudoTimer = null; }
  _pseudoLevel = 0;
  emit('voice:audioLevel', { level: 0 });
}
function pulseMeter(textLength) {
  const n = Math.max(0, Math.min(1, (textLength || 0) / 40));
  _pseudoLevel = 0.25 + n * 0.65;
  _lastActivity = Date.now();
}

/* ---------- Núcleo ---------- */

async function processFinalTranscript() {
  const session = voiceSession.current();
  if (!session) return;

  if (_recognizer) { try { _recognizer.stop(); } catch (_) {} }

  const transcript = (_finalAccumulator || session.transcript || '').trim();
  console.log('[VoiceManager] processFinalTranscript | acumulado="' + _finalAccumulator + '" | final="' + transcript + '"');

  session.setTranscript(transcript, '');
  emit('voice:transcript', { transcript });

  if (!transcript) {
    session.setError('no-transcript');
    emit('voice:error', { reason: 'no-transcript' });
    emit('voice:state', { state: VOICE_STATES.ERROR });
    return;
  }

  session.setState(VOICE_STATES.INTERPRETING);
  emit('voice:state', { state: VOICE_STATES.INTERPRETING });

  let intent;
  try { intent = VoiceInterpreter.interpret(transcript); }
  catch (e) { console.error('[VoiceManager] Interpreter falhou:', e); intent = { intent: 'unknown', confidence: 0, source: 'voice' }; }
  session.setIntent(intent, intent.confidence || 0);

  let decision;
  try { decision = VoiceValidator.validate(intent, []); }
  catch (e) { console.error('[VoiceManager] Validator falhou:', e); decision = { decision: POLICY.REJECT, reason: 'validator-crash' }; }
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
  isSupported() { return isSpeechSupported(); },
  isActive() { return voiceSession.isActive(); },

  async start(options = {}) {
    if (voiceSession.isActive()) {
      this.cancel();
      await new Promise(r => setTimeout(r, 120));
    }
    if (!isSpeechSupported()) {
      emit('voice:error', { reason: 'unsupported' });
      emit('voice:state', { state: VOICE_STATES.ERROR });
      return { ok: false, reason: 'unsupported' };
    }

    _finalAccumulator = '';
    const session = voiceSession.create({ source: 'mic' });
    session.setState(VOICE_STATES.IDLE);
    emit('voice:state', { state: VOICE_STATES.IDLE });

    _recognizer = new SpeechRecognizer({
      lang: options.lang || 'pt-PT',
      continuous: true,
      interimResults: true,
      onStart: () => {
        session.setState(VOICE_STATES.LISTENING);
        emit('voice:state', { state: VOICE_STATES.LISTENING });
      },
      onInterim: (text) => {
        session.setTranscript('', text);
        emit('voice:interim', { text });
        pulseMeter((text || '').length);
      },
      onFinal: (text) => {
        _finalAccumulator = mergeUtterance(_finalAccumulator, text);
        session.setTranscript(_finalAccumulator, '');
        emit('voice:transcript', { transcript: _finalAccumulator, isFinal: true });
        pulseMeter((text || '').length);
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
        // MVP 2.4: onend NÃO processa. Aguarda ação do utilizador.
        console.log('[VoiceManager] onEnd — aguardar "Terminei de falar"');
      }
    });

    const perm = await _recognizer.requestPermission();
    if (!perm.granted) {
      session.setError(perm.reason || 'permission-denied');
      emit('voice:error', { reason: perm.reason || 'permission-denied' });
      emit('voice:state', { state: VOICE_STATES.ERROR });
      cleanupRecognizer();
      stopMeter();
      return { ok: false, reason: perm.reason || 'permission-denied' };
    }

    startMeter();
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
   * Utilizador terminou de falar. Parar recognizer e processar acumulado.
   */
  finishSpeaking() {
    const session = voiceSession.current();
    if (!session || session.state !== VOICE_STATES.LISTENING) {
      console.warn('[VoiceManager] finishSpeaking() fora de LISTENING');
      return { ok: false, reason: 'not-listening' };
    }
    console.log('[VoiceManager] finishSpeaking() | acumulado="' + _finalAccumulator + '"');
    if (_recognizer) { try { _recognizer.stop(); } catch (_) {} }
    processFinalTranscript();
    return { ok: true };
  },

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

  confirm() {
    const session = voiceSession.current();
    if (!session || session.state !== VOICE_STATES.CONFIRMING) {
      console.warn('[VoiceManager] confirm() fora de CONFIRMING.');
      return { ok: false, reason: 'not-confirming' };
    }

    let route;
    try { route = VoiceCommandRouter.route(session.intent); }
    catch (e) {
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

    try { stateManager.navigateTo(route.page); } catch (e) { console.warn('[VoiceManager] navigateTo falhou:', e); }
    setTimeout(() => {
      try { eventBus.emit('voice:prefill-form', route); }
      catch (e) { console.warn('[VoiceManager] emit prefill falhou:', e); }
    }, 250);

    emit('voice:confirmed', { route });
    session.end(VOICE_STATES.CONFIRMING);
    voiceSession.end();
    _finalAccumulator = '';
    cleanupRecognizer();
    stopMeter();
    return { ok: true, route };
  },

  async debugInjectTranscript(text) {
    if (voiceSession.isActive()) { this.cancel(); await new Promise(r => setTimeout(r, 100)); }
    _finalAccumulator = String(text || '').trim();
    const session = voiceSession.create({ source: 'debug' });
    session.setTranscript(_finalAccumulator, '');
    emit('voice:state', { state: VOICE_STATES.LISTENING });
    setTimeout(() => processFinalTranscript(), 200);
    return { ok: true };
  }
};

export default VoiceManager;
