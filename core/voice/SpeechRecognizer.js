/**
 * SpeechRecognizer (MVP 2.4 — sem auto-restart)
 *
 * Encapsula a Web Speech API. Uma única sessão.
 * Quando o Chrome termina a captura (`onend`), NÃO reinicia.
 * O utilizador controla quando terminar via o botão "TERMINEI DE FALAR".
 */

const SpeechRecognitionImpl = typeof window !== 'undefined'
  ? (window.SpeechRecognition || window.webkitSpeechRecognition || null)
  : null;

export function isSpeechSupported() {
  return Boolean(SpeechRecognitionImpl);
}

export class SpeechRecognizer {
  constructor(options = {}) {
    this.lang = options.lang || 'pt-PT';
    this.interimResults = true;

    this._recognition = null;
    this._active = false;

    this.onStart = options.onStart || function() {};
    this.onInterim = options.onInterim || function() {};
    this.onFinal = options.onFinal || function() {};
    this.onError = options.onError || function() {};
    this.onEnd = options.onEnd || function() {};
  }

  async requestPermission() {
    if (!isSpeechSupported()) return { granted: false, reason: 'unsupported' };
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return { granted: false, reason: 'no-mediadevices' };
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(t => t.stop());
      return { granted: true };
    } catch (e) {
      const name = e && e.name ? e.name : 'unknown';
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        return { granted: false, reason: 'denied' };
      }
      return { granted: false, reason: name };
    }
  }

  start() {
    if (!isSpeechSupported()) { this.onError('unsupported'); return false; }
    if (this._active) return true;

    try {
      const rec = new SpeechRecognitionImpl();
      rec.lang = this.lang;
      rec.continuous = false;      // single utterance — o Chrome Android ignora true
      rec.interimResults = this.interimResults;
      rec.maxAlternatives = 1;

      rec.onstart = () => {
        this._active = true;
        console.log('[SR] onstart');
        this.onStart();
      };

      rec.onresult = (event) => {
        let interim = '';
        let final = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const r = event.results[i];
          if (r.isFinal) final += r[0].transcript;
          else interim += r[0].transcript;
        }
        if (final) {
          console.log('[SR] onresult FINAL: "' + final.trim() + '"');
          this.onFinal(final.trim());
        }
        if (interim) {
          this.onInterim(interim.trim());
        }
      };

      rec.onerror = (event) => {
        const code = event && event.error ? event.error : 'unknown';
        console.log('[SR] onerror:', code);
        if (code === 'no-speech' || code === 'aborted') return;
        if (code === 'not-allowed' || code === 'service-not-allowed') {
          this.onError('permission-denied');
          return;
        }
        this.onError(code);
      };

      rec.onend = () => {
        console.log('[SR] onend');
        this._active = false;
        this.onEnd();
      };

      this._recognition = rec;
      console.log('[SR] rec.start() chamado | lang=' + rec.lang);
      rec.start();
      return true;
    } catch (e) {
      console.warn('[SR] start() falhou:', e && e.message);
      this.onError('start-failed');
      return false;
    }
  }

  stop() {
    if (this._recognition && this._active) {
      try { this._recognition.stop(); } catch (_) {}
    }
  }

  abort() {
    if (this._recognition) {
      try { this._recognition.abort(); } catch (_) {}
      this._recognition = null;
      this._active = false;
    }
  }

  isActive() { return this._active; }
}

export default SpeechRecognizer;
