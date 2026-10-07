/**
 * SpeechRecognizer
 *
 * Encapsula a Web Speech API (window.SpeechRecognition / webkitSpeechRecognition).
 * Responsabilidades:
 *   - Verificar suporte do browser
 *   - Pedir permissão de microfone (apenas na primeira utilização)
 *   - Iniciar / parar / abortar reconhecimento
 *   - Emitir eventos de transcrição (final e interim)
 *   - Lidar com erros e recusa de permissão sem quebrar a app
 *
 * NÃO interpreta o texto. Só transcreve.
 * NÃO cria entidades. NÃO fala com o DataManager.
 *
 * Eventos emitidos (via callbacks):
 *   onStart()        — reconhecimento iniciou
 *   onInterim(text)  — transcrição parcial (a crescer)
 *   onFinal(text)    — transcrição final de um utterance
 *   onError(code)    — erro de reconhecimento
 *   onEnd()          — reconhecimento terminou (natural ou por stop)
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
    this.continuous = options.continuous !== false;
    this.interimResults = options.interimResults !== false;

    this._recognition = null;
    this._active = false;

    this.onStart = options.onStart || function() {};
    this.onInterim = options.onInterim || function() {};
    this.onFinal = options.onFinal || function() {};
    this.onError = options.onError || function() {};
    this.onEnd = options.onEnd || function() {};
  }

  async requestPermission() {
    if (!isSpeechSupported()) {
      return { granted: false, reason: 'unsupported' };
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return { granted: false, reason: 'no-mediadevices' };
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Fecha as tracks imediatamente — só queríamos a permissão
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
    if (!isSpeechSupported()) {
      this.onError('unsupported');
      return false;
    }
    if (this._active) return true;

    try {
      const rec = new SpeechRecognitionImpl();
      rec.lang = this.lang;
      rec.continuous = this.continuous;
      rec.interimResults = this.interimResults;
      rec.maxAlternatives = 1;

      rec.onstart = () => {
        this._active = true;
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
        if (final) this.onFinal(final.trim());
        if (interim) this.onInterim(interim.trim());
      };
      rec.onerror = (event) => {
        const code = event && event.error ? event.error : 'unknown';
        this.onError(code);
      };
      rec.onend = () => {
        this._active = false;
        this.onEnd();
      };

      this._recognition = rec;
      rec.start();
      return true;
    } catch (e) {
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
