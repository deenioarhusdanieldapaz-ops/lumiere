/**
 * AudioLevelMeter
 *
 * Lê a amplitude do microfone em tempo real e calcula um valor normalizado 0..1.
 * NÃO armazena áudio. NÃO grava. Só lê amplitude instantânea.
 * Cumpre a regra do manual: "não armazenar áudio bruto por padrão".
 *
 * Uso:
 *   const meter = new AudioLevelMeter({ smoothing: 0.15 });
 *   await meter.start();         // pede stream + cria AnalyserNode + arranca loop
 *   meter.onLevel = (level) => { ... }; // (0..1)
 *   meter.stop();                 // fecha stream + AudioContext
 *
 * O valor é suavizado (exponential smoothing) para evitar tremores do ruído.
 */

const FFT_SIZE = 256;
const SMOOTHING = 0.15;      // 0 = sem suavização, 1 = muito suave
const NOISE_FLOOR = 0.05;    // ignorar abaixo disto
const CEILING = 0.75;        // acima disto já é "forte"

export class AudioLevelMeter {
  constructor(options = {}) {
    this.smoothing = options.smoothing !== undefined ? options.smoothing : SMOOTHING;
    this.noiseFloor = options.noiseFloor !== undefined ? options.noiseFloor : NOISE_FLOOR;
    this.ceiling = options.ceiling !== undefined ? options.ceiling : CEILING;

    this._stream = null;
    this._audioCtx = null;
    this._analyser = null;
    this._dataArray = null;
    this._rafId = null;
    this._lastTs = 0;
    this._smoothLevel = 0;
    this._running = false;

    /** @type {(level: number) => void} */
    this.onLevel = function () {};

    // Bind para o loop (substitui class field)
    this._loop = this._loop.bind(this);
  }

  isRunning() { return this._running; }

  async start() {
    if (this._running) return { ok: true, already: true };

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return { ok: false, reason: 'no-mediadevices' };
    }

    try {
      this._stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      });
    } catch (e) {
      const name = e && e.name ? e.name : 'unknown';
      return { ok: false, reason: name };
    }

    const AudioContextImpl = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextImpl) {
      this._stopStream();
      return { ok: false, reason: 'no-audiocontext' };
    }

    try {
      this._audioCtx = new AudioContextImpl();
      const source = this._audioCtx.createMediaStreamSource(this._stream);
      this._analyser = this._audioCtx.createAnalyser();
      this._analyser.fftSize = FFT_SIZE;
      this._analyser.smoothingTimeConstant = 0.6;
      source.connect(this._analyser);
      this._dataArray = new Uint8Array(this._analyser.frequencyBinCount);
    } catch (e) {
      this._stopStream();
      this._closeCtx();
      return { ok: false, reason: 'analyser-failed' };
    }

    this._running = true;
    this._lastTs = 0;
    this._smoothLevel = 0;
    this._loop();
    return { ok: true };
  }

  stop() {
    if (this._rafId) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
    this._running = false;
    this._stopStream();
    this._closeCtx();
    this._analyser = null;
    this._dataArray = null;
    this._smoothLevel = 0;
  }

  getLevel() { return this._smoothLevel; }

  _stopStream() {
    if (this._stream) {
      try { this._stream.getTracks().forEach(t => t.stop()); } catch (_) {}
      this._stream = null;
    }
  }

  _closeCtx() {
    if (this._audioCtx) {
      try {
        if (this._audioCtx.state !== 'closed') this._audioCtx.close();
      } catch (_) {}
      this._audioCtx = null;
    }
  }

  _computeRMS() {
    // Frequência média em vez de waveform — mais estável que peaks
    this._analyser.getByteFrequencyData(this._dataArray);
    let sum = 0;
    for (let i = 0; i < this._dataArray.length; i++) {
      const v = this._dataArray[i] / 255;
      sum += v * v;
    }
    return Math.sqrt(sum / this._dataArray.length);
  }

  _loop() {
    if (!this._running || !this._analyser) return;
    this._rafId = requestAnimationFrame(this._loop);

    const raw = this._computeRMS();

    // Normalizar: cortar noise floor, escalar até ceiling
    let normalized = (raw - this.noiseFloor) / (this.ceiling - this.noiseFloor);
    if (normalized < 0) normalized = 0;
    if (normalized > 1) normalized = 1;

    // Smoothing exponencial
    this._smoothLevel += (normalized - this._smoothLevel) * (1 - this.smoothing);

    try { this.onLevel(this._smoothLevel); } catch (_) {}
  }
}

export default AudioLevelMeter;
