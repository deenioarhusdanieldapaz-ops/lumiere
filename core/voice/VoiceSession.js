/**
 * VoiceSession
 *
 * Estado temporário de uma sessão de voz.
 * Criado quando o microfone é ativado, destruído quando a sessão termina.
 * NÃO persiste em IndexedDB. Vive apenas em memória.
 *
 * Ciclo de vida:
 *   IDLE → criar() → A_OUVIR → ENTENDI_ISTO → PRE_PREENCHIDO → CONFIRMADO
 *                           ↘ NAO_ENTENDI ↗
 *                           ↘ CANCELADO  ↗
 *
 * Estados possíveis: idle | listening | interpreting | confirming | error | cancelled
 */

let _current = null;
let _seq = 0;

export const VOICE_STATES = {
  IDLE: 'idle',
  LISTENING: 'listening',
  INTERPRETING: 'interpreting',
  CONFIRMING: 'confirming',
  ERROR: 'error',
  CANCELLED: 'cancelled'
};

export class VoiceSession {
  constructor(meta = {}) {
    _seq += 1;
    this.id = 'vs_' + Date.now() + '_' + _seq;
    this.startedAt = new Date().toISOString();
    this.state = VOICE_STATES.IDLE;
    this.transcript = '';
    this.interimTranscript = '';
    this.intent = null;
    this.confidence = 0;
    this.ambiguities = [];
    this.missingFields = [];
    this.source = meta.source || 'mic';
    this.endedAt = null;
    this.errorReason = null;
  }

  setState(newState) {
    this.state = newState;
    return this;
  }

  setTranscript(final, interim) {
    this.transcript = final || this.transcript;
    this.interimTranscript = interim || '';
    return this;
  }

  setIntent(intent, confidence) {
    this.intent = intent;
    this.confidence = typeof confidence === 'number' ? confidence : 0;
    return this;
  }

  setAmbiguities(list) {
    this.ambiguities = Array.isArray(list) ? list : [];
    return this;
  }

  setMissingFields(list) {
    this.missingFields = Array.isArray(list) ? list : [];
    return this;
  }

  setError(reason) {
    this.errorReason = reason || 'unknown';
    this.state = VOICE_STATES.ERROR;
    return this;
  }

  end(finalState) {
    this.endedAt = new Date().toISOString();
    if (finalState) this.state = finalState;
    return this;
  }

  toJSON() {
    return {
      id: this.id,
      startedAt: this.startedAt,
      endedAt: this.endedAt,
      state: this.state,
      transcript: this.transcript,
      intent: this.intent,
      confidence: this.confidence,
      ambiguities: this.ambiguities,
      missingFields: this.missingFields,
      source: this.source,
      errorReason: this.errorReason
    };
  }
}

export const voiceSession = {
  create(meta) {
    if (_current && _current.state === VOICE_STATES.LISTENING) {
      throw new Error('Já existe uma sessão de voz ativa.');
    }
    _current = new VoiceSession(meta);
    return _current;
  },
  current() { return _current; },
  end(finalState) {
    if (_current) { _current.end(finalState); }
    const done = _current;
    _current = null;
    return done;
  },
  isActive() {
    return Boolean(_current) && _current.state !== VOICE_STATES.IDLE;
  }
};

export default voiceSession;
