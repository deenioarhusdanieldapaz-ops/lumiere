/**
 * Voice Orb v3 — Refundação com Bézier caóticas
 *
 * Geometria:
 *   - 5 correntes principais (Bézier grossas com glow) que atravessam a esfera
 *   - 110 filamentos finos caóticos com pontos de controle desviados
 *   - 2 anéis orbitais externos (r=134, r=150)
 *   - 4 pontos cardeais com glow
 *   - Núcleo com gradiente radial em 4 camadas (branco → laranja → dourado → transparente)
 *
 * Cada linha vai de perto da periferia → interior (com desvio) → periferia oposta.
 * A densidade no centro emerge naturalmente dos cruzamentos.
 *
 * Reagente a audioLevel (0..1) com smoothing exponencial.
 * Respeita prefers-reduced-motion.
 */

const SIZE = 320;
const CX = 160;
const CY = 160;
const R = 120;

const NUM_STRANDS = 5;
const NUM_FILAMENTS = 110;
const ANCHORS = 6;          // pontos âncora por linha
const SEGS = ANCHORS - 1;   // segmentos Bézier
const SAMPLES = 10;         // pontos amostrados por segmento (para wobble suave)

const C_DEEP   = '#D4AF37';
const C_MID    = '#F5D76E';
const C_WARM   = '#FBB03B';
const C_WHITE  = '#FFF4CC';

const STATE_CONFIG = {
  idle:           { gain: 0.10, speedMul: 0.55, opacMul: 0.90, corePulse: 0.05 },
  listening:      { gain: 1.60, speedMul: 1.00, opacMul: 1.00, corePulse: 0.55 },
  processing:     { gain: 0.40, speedMul: 0.55, opacMul: 0.80, corePulse: 0.15 },
  understood:     { gain: 0.25, speedMul: 0.45, opacMul: 0.95, corePulse: 0.10 },
  not_understood: { gain: 0.25, speedMul: 0.45, opacMul: 0.50, corePulse: 0.05 }
};

function prefersReducedMotion() {
  try {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (_) { return false; }
}

function rand(a, b) { return a + Math.random() * (b - a); }

/* ============================================================
   Geometria — correntes e filamentos
   ============================================================ */

function buildStrand(index) {
  const anchors = [];
  // Abertura angular entre início e fim (linhas atravessam a esfera)
  const startAngle = rand(0, Math.PI * 2);
  const endAngle = startAngle + rand(Math.PI * 0.7, Math.PI * 1.5);
  for (let i = 0; i < ANCHORS; i++) {
    const t = i / (ANCHORS - 1);
    const ang = startAngle + (endAngle - startAngle) * t;
    // Bordas na periferia, meio mais perto do centro
    const edgeBias = 1 - Math.sin(t * Math.PI) * 0.7; // 1 → 0.3 → 1
    const rad = R * (0.55 + 0.42 * edgeBias) * rand(0.92, 1.05);
    anchors.push({
      baseX: CX + rad * Math.cos(ang),
      baseY: CY + rad * Math.sin(ang),
      phase: rand(0, Math.PI * 2),
      speed: rand(0.15, 0.45),
      ampR: rand(1.5, 4.5),
      ampA: rand(0.02, 0.08),
      baseAngle: ang,
      baseRad: rad
    });
  }
  return {
    anchors,
    phase: rand(0, Math.PI * 2),
    speed: rand(0.25, 0.55),
    width: rand(1.2, 2.2),
    opacity: rand(0.55, 0.85),
    color: index % 2 === 0 ? C_MID : C_WARM,
    glow: true,
    depth: rand(0.7, 1.0)
  };
}

function buildFilament() {
  const anchors = [];
  const startAngle = rand(0, Math.PI * 2);
  const endAngle = startAngle + rand(Math.PI * 0.5, Math.PI * 1.8);
  for (let i = 0; i < ANCHORS; i++) {
    const t = i / (ANCHORS - 1);
    const ang = startAngle + (endAngle - startAngle) * t;
    const edgeBias = 1 - Math.sin(t * Math.PI) * rand(0.4, 0.85);
    const rad = R * (0.5 + 0.48 * edgeBias) * rand(0.85, 1.08);
    anchors.push({
      baseX: CX + rad * Math.cos(ang),
      baseY: CY + rad * Math.sin(ang),
      phase: rand(0, Math.PI * 2),
      speed: rand(0.2, 0.9),
      ampR: rand(0.6, 2.8),
      ampA: rand(0.015, 0.055),
      baseAngle: ang,
      baseRad: rad
    });
  }
  const wChoice = Math.random();
  const width = wChoice < 0.7 ? rand(0.35, 0.7) : rand(0.7, 1.15);
  const colorChoice = Math.random();
  const color = colorChoice < 0.6 ? C_DEEP : (colorChoice < 0.9 ? C_MID : C_WARM);
  return {
    anchors,
    phase: rand(0, Math.PI * 2),
    speed: rand(0.2, 0.85),
    width,
    opacity: rand(0.15, 0.55),
    color,
    glow: false,
    depth: rand(0.35, 1.0)
  };
}

function buildGeometry() {
  const strands = [];
  for (let i = 0; i < NUM_STRANDS; i++) strands.push(buildStrand(i));
  const filaments = [];
  for (let i = 0; i < NUM_FILAMENTS; i++) filaments.push(buildFilament());
  return { strands, filaments };
}

/* ============================================================
   Desenho
   ============================================================ */

function anchorPos(a, t, stateGain) {
  const dx = Math.cos(t * a.speed + a.phase) * a.ampR * (1 + stateGain * 1.5);
  const da = Math.sin(t * a.speed * 0.7 + a.phase * 1.3) * a.ampA * (1 + stateGain * 1.5);
  const r = a.baseRad + dx;
  const ang = a.baseAngle + da;
  return { x: CX + r * Math.cos(ang), y: CY + r * Math.sin(ang) };
}

function drawLine(ctx, line, t, stateGain, globalOpacityMul) {
  const cfg = line;
  ctx.strokeStyle = line.color;
  ctx.lineWidth = line.width;
  ctx.globalAlpha = Math.min(1, line.opacity * globalOpacityMul * line.depth);
  if (line.glow) {
    ctx.shadowColor = C_MID;
    ctx.shadowBlur = 6;
  } else {
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
  }

  // Amostrar pontos ao longo dos segmentos Bézier
  const pts = [];
  for (let i = 0; i < line.anchors.length; i++) {
    pts.push(anchorPos(line.anchors[i], t, stateGain));
  }

  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i];
    const p1 = pts[i + 1];
    // Ponto de controlo: média + desvio perpendicular
    const mx = (p0.x + p1.x) / 2;
    const my = (p0.y + p1.y) / 2;
    const dx = p1.x - p0.x;
    const dy = p1.y - p0.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const deviation = (Math.sin(t * line.speed + line.phase + i * 1.7) * 14) * (1 + stateGain * 0.8);
    const cx = mx + nx * deviation;
    const cy = my + ny * deviation;
    ctx.quadraticCurveTo(cx, cy, p1.x, p1.y);
  }
  ctx.stroke();
}

function drawOrbits(ctx, t, cfg) {
  ctx.save();
  ctx.strokeStyle = C_DEEP;
  ctx.globalAlpha = 0.30 * cfg.opacMul;
  ctx.lineWidth = 0.6;
  for (const r of [R + 14, R + 30]) {
    ctx.beginPath();
    ctx.arc(CX, CY, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();

  // 4 pontos cardeais
  ctx.save();
  ctx.fillStyle = C_MID;
  ctx.shadowColor = C_MID;
  ctx.shadowBlur = 6;
  for (const ang of [-Math.PI / 2, 0, Math.PI / 2, Math.PI]) {
    const r = R + 30;
    const x = CX + r * Math.cos(ang);
    const y = CY + r * Math.sin(ang);
    ctx.globalAlpha = 0.85 * cfg.opacMul;
    ctx.beginPath();
    ctx.arc(x, y, 2.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawCore(ctx, t, cfg, audioSmooth) {
  const pulse = Math.sin(t * 2) * cfg.corePulse;
  const coreR = 8 + pulse * 2 + audioSmooth * 4;
  const haloR = 60 + audioSmooth * 30 + pulse * 3;

  // Camada externa — halo largo
  const g1 = ctx.createRadialGradient(CX, CY, 0, CX, CY, haloR);
  g1.addColorStop(0, 'rgba(251, 176, 59, 0.35)');
  g1.addColorStop(0.35, 'rgba(245, 215, 110, 0.18)');
  g1.addColorStop(0.75, 'rgba(212, 175, 55, 0.05)');
  g1.addColorStop(1, 'rgba(212, 175, 55, 0)');
  ctx.fillStyle = g1;
  ctx.beginPath();
  ctx.arc(CX, CY, haloR, 0, Math.PI * 2);
  ctx.fill();

  // Camada média — dourado quente
  const g2 = ctx.createRadialGradient(CX, CY, 0, CX, CY, coreR * 3.5);
  g2.addColorStop(0, 'rgba(255, 244, 204, 0.95)');
  g2.addColorStop(0.35, 'rgba(251, 176, 59, 0.75)');
  g2.addColorStop(1, 'rgba(251, 176, 59, 0)');
  ctx.fillStyle = g2;
  ctx.beginPath();
  ctx.arc(CX, CY, coreR * 3.5, 0, Math.PI * 2);
  ctx.fill();

  // Núcleo central brilhante
  ctx.save();
  ctx.shadowColor = C_WHITE;
  ctx.shadowBlur = 22;
  ctx.fillStyle = C_WHITE;
  ctx.beginPath();
  ctx.arc(CX, CY, coreR, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function renderFrame(ctx, geo, cfg, t, stateGain, audioSmooth) {
  ctx.clearRect(0, 0, SIZE, SIZE);
  ctx.globalCompositeOperation = 'lighter';

  // 1. Orbits de fundo
  drawOrbits(ctx, t, cfg);

  // 2. Filamentos (mais numerosos, menos brilho)
  for (const f of geo.filaments) {
    drawLine(ctx, f, t, stateGain, cfg.opacMul);
  }

  // 3. Correntes principais por cima
  for (const s of geo.strands) {
    drawLine(ctx, s, t, stateGain, cfg.opacMul);
  }

  // 4. Núcleo
  ctx.globalCompositeOperation = 'source-over';
  drawCore(ctx, t, cfg, audioSmooth);
}

/* ============================================================
   Factory — ORBE
   ============================================================ */

export function createVoiceOrb(container, _options = {}) {
  if (!container) throw new Error('[VoiceOrb] container inválido');

  const reduced = prefersReducedMotion();
  const geo = buildGeometry();

  let state = 'idle';
  let audioInjected = 0;
  let audioSmooth = 0;
  let rafId = null;
  let lastTs = 0;
  let timeAccum = 0;

  const dpr = Math.min((typeof window !== 'undefined' && window.devicePixelRatio) || 1, 2);
  const canvas = document.createElement('canvas');
  canvas.className = 'voice-orb-canvas';
  canvas.width = SIZE * dpr;
  canvas.height = SIZE * dpr;

  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  container.appendChild(canvas);

  function frame(ts) {
    const cfg = STATE_CONFIG[state] || STATE_CONFIG.idle;
    const dt = lastTs ? Math.min((ts - lastTs) / 1000, 0.05) : 0.016;
    lastTs = ts;
    timeAccum += dt * cfg.speedMul;

    const targetAudio = state === 'listening' ? audioInjected : 0;
    audioSmooth += (targetAudio - audioSmooth) * 0.16;
    if (audioSmooth < 0) audioSmooth = 0;
    if (audioSmooth > 1) audioSmooth = 1;

    const stateGain = cfg.gain * (1 + audioSmooth * 1.5);
    renderFrame(ctx, geo, cfg, timeAccum, stateGain, audioSmooth);

    rafId = requestAnimationFrame(frame);
  }

  function renderStatic() {
    const cfg = STATE_CONFIG[state] || STATE_CONFIG.idle;
    renderFrame(ctx, geo, cfg, 0, cfg.gain * 0.5, 0);
  }

  const api = {
    start() {
      if (rafId) return;
      if (reduced) { renderStatic(); return; }
      lastTs = 0;
      rafId = requestAnimationFrame(frame);
    },
    stop() {
      if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
      lastTs = 0;
    },
    setState(s) {
      if (STATE_CONFIG[s]) {
        state = s;
        if (reduced) renderStatic();
      }
    },
    setAudioLevel(level) {
      const n = Number(level);
      if (isNaN(n)) return;
      audioInjected = n < 0 ? 0 : (n > 1 ? 1 : n);
    },
    destroy() {
      api.stop();
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
    },
    getState() { return state; }
  };

  renderStatic();
  return api;
}

/* ============================================================
   Factory — WAVEFORM
   ============================================================ */

const WAVE_W = 280;
const WAVE_H = 44;
const WAVE_BARS = 56;

export function createVoiceWaveform(container, _options = {}) {
  if (!container) throw new Error('[VoiceWaveform] container inválido');

  const reduced = prefersReducedMotion();
  let rafId = null;
  let audioInjected = 0;
  let audioSmooth = 0;
  let lastTs = 0;
  const history = new Array(WAVE_BARS).fill(0);

  const dpr = Math.min((typeof window !== 'undefined' && window.devicePixelRatio) || 1, 2);
  const canvas = document.createElement('canvas');
  canvas.className = 'voice-wave-canvas';
  canvas.width = WAVE_W * dpr;
  canvas.height = WAVE_H * dpr;

  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  container.appendChild(canvas);

  function render() {
    ctx.clearRect(0, 0, WAVE_W, WAVE_H);
    const cy = WAVE_H / 2;
    const barGap = 1.4;
    const barW = (WAVE_W - barGap * (WAVE_BARS - 1)) / WAVE_BARS;

    for (let i = 0; i < WAVE_BARS; i++) {
      const level = history[i];
      const edgeFactor = Math.sin((i / (WAVE_BARS - 1)) * Math.PI);
      const h = 2 + level * (WAVE_H - 6) * edgeFactor;
      const x = i * (barW + barGap);
      const y = cy - h / 2;

      ctx.fillStyle = C_MID;
      ctx.globalAlpha = 0.55 + level * 0.45;
      ctx.beginPath();
      const r = Math.min(barW / 2, 1.2);
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + barW - r, y);
      ctx.quadraticCurveTo(x + barW, y, x + barW, y + r);
      ctx.lineTo(x + barW, y + h - r);
      ctx.quadraticCurveTo(x + barW, y + h, x + barW - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.fill();
    }
  }

  function frame(ts) {
    const dt = lastTs ? Math.min((ts - lastTs) / 1000, 0.05) : 0.016;
    lastTs = ts;
    audioSmooth += (audioInjected - audioSmooth) * 0.28;
    if (audioSmooth < 0) audioSmooth = 0;
    if (audioSmooth > 1) audioSmooth = 1;
    history.shift();
    const jitter = (Math.random() - 0.5) * 0.15;
    history.push(Math.max(0, Math.min(1, audioSmooth + jitter)));
    render();
    rafId = requestAnimationFrame(frame);
  }

  const api = {
    start() {
      if (rafId) return;
      if (reduced) { render(); return; }
      lastTs = 0;
      rafId = requestAnimationFrame(frame);
    },
    stop() {
      if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
      lastTs = 0;
    },
    setAudioLevel(level) {
      const n = Number(level);
      if (isNaN(n)) return;
      audioInjected = n < 0 ? 0 : (n > 1 ? 1 : n);
    },
    destroy() {
      api.stop();
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
    }
  };

  render();
  return api;
}

export default { createVoiceOrb, createVoiceWaveform };
