/**
 * Voice Orb — Híbrido (Etapa 5)
 *
 * Composição visual:
 *   - Base estática: imagem orb-base.png (esfera desenhada, com glow, linhas, anéis)
 *   - Camada 1: aura difusa que respira com o áudio
 *   - Camada 2: 2500 partículas reais com movimento orgânico (snoise)
 *   - Camada 3: núcleo suave que pulsa
 *
 * A imagem está ESTÁTICA — apenas as camadas superiores se movem.
 * Efeito final: o utilizador percepciona movimento em todo o conjunto,
 * mas a "arte" fica visualmente perfeita (idêntica à referência).
 *
 * Reagente a audioLevel (0..1). Respeita prefers-reduced-motion.
 */

import * as THREE from 'three';

const PARTICLE_COUNT = 5000;
const RADIUS = 1.6;
const PHI = Math.PI * (1 + Math.sqrt(5));
const IMAGE_PLANE_SIZE = 5.6;
const IMAGE_PLANE_Z = -2.8;

const STATE_CONFIG = {
  idle:           { gain: 0.15, speedMul: 0.20, corePulse: 0.05 },
  listening:      { gain: 1.60, speedMul: 1.00, corePulse: 0.50 },
  processing:     { gain: 0.35, speedMul: 0.40, corePulse: 0.15 },
  understood:     { gain: 0.25, speedMul: 0.30, corePulse: 0.10 },
  not_understood: { gain: 0.25, speedMul: 0.30, corePulse: 0.05 }
};

const GOLD_DEEP   = new THREE.Color(0.79, 0.58, 0.12);
const GOLD_BRIGHT = new THREE.Color(1.00, 0.76, 0.30);

function prefersReducedMotion() {
  try {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (_) { return false; }
}

/* ============================================================
   Geometria das partículas
   ============================================================ */
function buildSphereGeometry() {
  const positions = new Float32Array(PARTICLE_COUNT * 3);
  const sizes = new Float32Array(PARTICLE_COUNT);
  const seeds = new Float32Array(PARTICLE_COUNT);

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const y = 1 - (i / (PARTICLE_COUNT - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const theta = PHI * i;
    const x = Math.cos(theta) * r;
    const z = Math.sin(theta) * r;
    const rVar = RADIUS * (0.92 + Math.random() * 0.16);
    positions[i * 3 + 0] = x * rVar;
    positions[i * 3 + 1] = y * rVar;
    positions[i * 3 + 2] = z * rVar;
    sizes[i] = 0.5 + Math.random() * 1.8;
    seeds[i] = Math.random();
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
  return geo;
}

/* ============================================================
   Shaders das partículas (com snoise)
   ============================================================ */
const NOISE_GLSL = /* glsl */`
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
float snoise(vec3 v) {
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(
             i.z + vec4(0.0, i1.z, i2.z, 1.0))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0))
           + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}
`;

const PARTICLE_VERTEX_SHADER = /* glsl */`
  attribute float aSize;
  attribute float aSeed;
  uniform float uAudioLevel;
  uniform float uTime;
  uniform float uCorePulse;
  uniform float uNoiseFreq;
  uniform float uNoiseAmp;
  uniform float uNoiseSpeed;
  varying float vFresnel;
  varying float vSeed;

  void main() {
    vec3 basePos = position;
    vec3 dir = normalize(basePos);
    float n = snoise(basePos * uNoiseFreq + vec3(0.0, 0.0, uTime * uNoiseSpeed));
    float n2 = snoise(basePos * (uNoiseFreq * 2.1) + vec3(uTime * uNoiseSpeed * 0.6, 0.0, 0.0)) * 0.4;
    float noiseVal = (n + n2) * 0.7;
    float amp = uNoiseAmp * (0.55 + uAudioLevel * 2.0 + uCorePulse * 0.6);
    vec3 pos = basePos + dir * noiseVal * amp;
    pos *= 1.0 + sin(uTime * 0.8) * 0.01;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = aSize * (16.0 / -mvPosition.z) * (1.0 + uAudioLevel * 0.7);
    gl_Position = projectionMatrix * mvPosition;

    vec3 normal = normalize(pos);
    vec3 viewNormal = normalize(normalMatrix * normal);
    vec3 viewDir = normalize(-mvPosition.xyz);
    float dotNV = abs(dot(viewNormal, viewDir));
    vFresnel = pow(1.0 - dotNV, 1.6);
    vSeed = aSeed;
  }
`;

const PARTICLE_FRAGMENT_SHADER = /* glsl */`
  uniform vec3 uColorDeep;
  uniform vec3 uColorBright;
  uniform float uAudioLevel;
  varying float vFresnel;
  varying float vSeed;

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float dist = length(uv);
    if (dist > 0.5) discard;
    float alpha = smoothstep(0.5, 0.0, dist);
    alpha = pow(alpha, 1.9);
    float glow = pow(smoothstep(0.5, 0.0, dist), 3.5);
    alpha = alpha * 0.75 + glow * 0.45;
    vec3 color = mix(uColorDeep, uColorBright, vFresnel * 1.1);
    // Empurrar a paleta para laranja quente (elimina verde no additive)
    color.r = min(1.0, color.r * 1.10);
    color.g = color.g * 0.88;
    color.b = color.b * 0.55;
    color += uAudioLevel * 0.18 * uColorBright;
    color *= 0.85 + vSeed * 0.3;
    gl_FragColor = vec4(color, alpha * (0.10 + vFresnel * 0.32));
  }
`;

/* ============================================================
   Textura da aura
   ============================================================ */
function buildAuraTexture() {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 512;
  const ctx = c.getContext('2d');
  const grad = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
  grad.addColorStop(0, 'rgba(251, 176, 59, 0.20)');
  grad.addColorStop(0.30, 'rgba(245, 215, 110, 0.10)');
  grad.addColorStop(0.60, 'rgba(212, 175, 55, 0.05)');
  grad.addColorStop(1, 'rgba(212, 175, 55, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);
  return new THREE.CanvasTexture(c);
}

/* ============================================================
   Factory principal
   ============================================================ */
export function createVoiceOrbThree(container, options = {}) {
  if (!container) throw new Error('[VoiceOrbThree] container inválido');

  const reduced = prefersReducedMotion();
  const baseImageUrl = options.baseImageUrl
    || new URL('./orb-base.png', import.meta.url).href;

  let state = 'idle';
  let audioInjected = 0;
  let audioSmooth = 0;
  let rafId = null;
  let lastTs = 0;
  let timeAccum = 0;

  const width = 320, height = 320;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
  camera.position.set(0, 0, 8.75);

  const renderer = new THREE.WebGLRenderer({
    alpha: true, antialias: true, powerPreference: 'high-performance'
  });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);

  const canvas = renderer.domElement;
  canvas.className = 'voice-orb-three-canvas';
  container.appendChild(canvas);

  // ---------- Camada 0: imagem base estática ----------
  const imagePlaneGeo = new THREE.CircleGeometry(IMAGE_PLANE_SIZE * 0.5, 64);
  const imagePlaneMat = new THREE.MeshBasicMaterial({
    transparent: true,
    depthWrite: false,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    color: 0x000000
  });
  const imagePlane = new THREE.Mesh(imagePlaneGeo, imagePlaneMat);
  imagePlane.position.set(0, 0, IMAGE_PLANE_Z);
  scene.add(imagePlane);

  // Carregamento assíncrono — se falhar, cena funciona sem imagem
  const textureLoader = new THREE.TextureLoader();
  textureLoader.load(
    baseImageUrl,
    (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      imagePlaneMat.map = tex;
      imagePlaneMat.opacity = 1;
      imagePlaneMat.color.setHex(0xffffff);
      imagePlaneMat.needsUpdate = true;
      console.log('[VoiceOrbThree] Imagem base carregada');
    },
    undefined,
    (err) => { console.warn('[VoiceOrbThree] Falha ao carregar orb-base.png:', err); }
  );

  // ---------- Camada 1: aura difusa ----------
  const auraTexture = buildAuraTexture();
  const auraMat = new THREE.SpriteMaterial({
    map: auraTexture,
    transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending,
    opacity: 0.85
  });
  const auraSprite = new THREE.Sprite(auraMat);
  auraSprite.scale.set(5.0, 5.0, 1);
  auraSprite.position.set(0, 0, IMAGE_PLANE_Z + 0.1);
  scene.add(auraSprite);

  // ---------- Camada 2: partículas reais ----------
  const geometry = buildSphereGeometry();
  const uniforms = {
    uAudioLevel: { value: 0 },
    uTime: { value: 0 },
    uCorePulse: { value: 0 },
    uNoiseFreq: { value: 0.9 },
    uNoiseAmp: { value: 0.10 },
    uNoiseSpeed: { value: 0.35 },
    uColorDeep: { value: GOLD_DEEP.clone() },
    uColorBright: { value: GOLD_BRIGHT.clone() }
  };
  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: NOISE_GLSL + PARTICLE_VERTEX_SHADER,
    fragmentShader: PARTICLE_FRAGMENT_SHADER,
    transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  const points = new THREE.Points(geometry, material);
  scene.add(points);

  // ---------- Camada 3: núcleo suave (complementa o da imagem) ----------
  const coreTexture = (() => {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 256;
    const ctx = c.getContext('2d');
    const grad = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    grad.addColorStop(0, 'rgba(255, 244, 204, 0.9)');
    grad.addColorStop(0.20, 'rgba(251, 176, 59, 0.45)');
    grad.addColorStop(0.55, 'rgba(212, 175, 55, 0.10)');
    grad.addColorStop(1, 'rgba(212, 175, 55, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(c);
  })();
  const coreMat = new THREE.SpriteMaterial({
    map: coreTexture,
    transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending,
    opacity: 0.7
  });
  const coreSprite = new THREE.Sprite(coreMat);
  coreSprite.scale.set(0.9, 0.9, 1);
  scene.add(coreSprite);

  // ---------- Loop ----------
  function renderFrame(ts) {
    const cfg = STATE_CONFIG[state] || STATE_CONFIG.idle;
    const dt = lastTs ? Math.min((ts - lastTs) / 1000, 0.05) : 0.016;
    lastTs = ts;
    timeAccum += dt * cfg.speedMul;

    const targetAudio = state === 'listening' ? audioInjected : 0;
    audioSmooth += (targetAudio - audioSmooth) * 0.16;
    if (audioSmooth < 0) audioSmooth = 0;
    if (audioSmooth > 1) audioSmooth = 1;

    uniforms.uTime.value = timeAccum;
    uniforms.uAudioLevel.value = audioSmooth * cfg.gain;
    uniforms.uCorePulse.value = cfg.corePulse;

    // Partículas rodam suavemente (a imagem fica estática)
    points.rotation.y = timeAccum * 0.10;
    points.rotation.x = Math.sin(timeAccum * 0.06) * 0.06;

    // Aura respira
    const auraScale = 5.0 + Math.sin(timeAccum * 0.8) * 0.15 + audioSmooth * 0.6;
    auraSprite.scale.set(auraScale, auraScale, 1);
    auraMat.opacity = 0.75 + audioSmooth * 0.25;

    // Núcleo pulsa
    const coreScale = 0.9 + Math.sin(timeAccum * 2) * cfg.corePulse * 0.25 + audioSmooth * 0.35;
    coreSprite.scale.set(coreScale, coreScale, 1);
    coreMat.opacity = 0.65 + audioSmooth * 0.35;

    renderer.render(scene, camera);
    rafId = requestAnimationFrame(renderFrame);
  }

  function renderStatic() {
    const cfg = STATE_CONFIG[state] || STATE_CONFIG.idle;
    uniforms.uTime.value = 0;
    uniforms.uAudioLevel.value = 0;
    uniforms.uCorePulse.value = cfg.corePulse;
    points.rotation.set(0, 0, 0);
    auraSprite.scale.set(5.0, 5.0, 1);
    auraMat.opacity = 0.85;
    coreSprite.scale.set(0.9, 0.9, 1);
    coreMat.opacity = 0.7;
    renderer.render(scene, camera);
  }

  const api = {
    start() {
      if (rafId) return;
      if (reduced) { renderStatic(); return; }
      lastTs = 0;
      rafId = requestAnimationFrame(renderFrame);
    },
    stop() {
      if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
      lastTs = 0;
    },
    setState(s) { if (STATE_CONFIG[s]) { state = s; if (reduced) renderStatic(); } },
    setAudioLevel(level) {
      const n = Number(level);
      if (isNaN(n)) return;
      audioInjected = n < 0 ? 0 : (n > 1 ? 1 : n);
    },
    destroy() {
      api.stop();
      geometry.dispose(); material.dispose();
      auraMat.dispose(); auraTexture.dispose();
      coreMat.dispose(); coreTexture.dispose();
      imagePlaneGeo.dispose();
      if (imagePlaneMat.map) imagePlaneMat.map.dispose();
      imagePlaneMat.dispose();
      renderer.dispose();
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
    },
    getState() { return state; }
  };

  renderStatic();
  return api;
}

export default { createVoiceOrbThree };
