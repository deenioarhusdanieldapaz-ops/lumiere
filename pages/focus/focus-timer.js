/**
 * Focus Timer — Pomodoro state machine + overlays (ecrãs 2, 3, 4)
 *
 * Ecrã 2: EM FOCO — countdown 25 min, anel de progresso, ciclos ⚝
 * Ecrã 3: PAUSA — countdown 5 min, tons azuis, sugestões
 * Ecrã 4: TERMINADO — celebração, stats, próximo / voltar
 *
 * Persiste no fim (não em cada tick) numa única linha de focusSessions.
 * Se o utilizador sair sem terminar, NADA é guardado (evita lixo).
 */

import { dataManager } from '../../core/dataManager.js';
import { eventBus } from '../../core/eventBus.js';
import { isFastTimer, getFastTimerConfig } from '../../js/dev-tools.js';

/* ---------- Configuração ---------- */
const DEFAULT_CFG = {
  focusMin: 25,
  shortBreakMin: 5,
  longBreakMin: 15,
  cyclesBeforeLong: 4
};

/**
 * Devolve a config efetiva. Se o modo dev fast timer estiver ligado,
 * substitui os minutos por segundos (10s / 5s / 15s).
 */
function getCFG(customCfg) {
  if (isFastTimer && isFastTimer()) {
    const f = getFastTimerConfig();
    return {
      focusMin: 0,
      shortBreakMin: 0,
      longBreakMin: 0,
      cyclesBeforeLong: 4,
      _focusMs: f.focusSec * 1000,
      _breakMs: f.breakSec * 1000,
      _longMs: f.longBreakSec * 1000,
      _fast: true
    };
  }
  const base = customCfg ? {
    focusMin: customCfg.focusMin,
    shortBreakMin: customCfg.shortBreakMin,
    longBreakMin: customCfg.longBreakMin,
    cyclesBeforeLong: customCfg.cyclesBeforeLong
  } : DEFAULT_CFG;
  return {
    ...base,
    _focusMs: base.focusMin * 60 * 1000,
    _breakMs: base.shortBreakMin * 60 * 1000,
    _longMs: base.longBreakMin * 60 * 1000,
    _fast: false
  };
}
const RING_R = 45;
const RING_CIRC = 2 * Math.PI * RING_R;

/* ---------- Estado ---------- */
let _root = null;
let _refs = null;
let _pendingEntity = null;
let _tickTimer = null;
let _session = null;
/* _session = {
 *   entity: { type, id, name },
 *   startedAt: ISO string,
 *   phase: 'focus' | 'break' | 'long',
 *   phaseDurationMs: number,
 *   phaseStartTs: number,
 *   isPaused: boolean,
 *   pausedAt: number | 0,
 *   pausedMsTotal: number,
 *   cyclesCompleted: number,
 *   focusMsTotal: number
 * }
 */

/* ---------- Helpers ---------- */
function fmtMMSS(ms) {
  if (ms < 0) ms = 0;
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}
function el(tag, cls, txt) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (txt !== undefined) e.textContent = txt;
  return e;
}
function pad(n) { return String(n).padStart(2, '0'); }

/* ---------- Builders DOM ---------- */
function buildRing() {
  const wrap = el('div', 'focus-ring');
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'focus-ring__svg');
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

  // Track + Progress — rotacionados para começar no topo
  const gRot = document.createElementNS(NS, 'g');
  gRot.setAttribute('transform', 'rotate(-90 50 50)');

  const track = document.createElementNS(NS, 'circle');
  track.setAttribute('class', 'focus-ring__track');
  track.setAttribute('cx', '50');
  track.setAttribute('cy', '50');
  track.setAttribute('r', String(RING_R));

  const prog = document.createElementNS(NS, 'circle');
  prog.setAttribute('class', 'focus-ring__progress');
  prog.setAttribute('cx', '50');
  prog.setAttribute('cy', '50');
  prog.setAttribute('r', String(RING_R));
  prog.setAttribute('stroke-dasharray', String(RING_CIRC));
  prog.setAttribute('stroke-dashoffset', '0');

  gRot.appendChild(track);
  gRot.appendChild(prog);
  svg.appendChild(gRot);

  // Marcador no anel
  const marker = document.createElementNS(NS, 'circle');
  marker.setAttribute('class', 'focus-ring__marker');
  marker.setAttribute('cx', '50');
  marker.setAttribute('cy', '5');
  marker.setAttribute('r', '2');
  marker.setAttribute('fill', '#f5d76e');

  svg.appendChild(marker);
  wrap.appendChild(svg);

  const time = el('div', 'focus-ring__time', '25:00');
  wrap.appendChild(time);

  return { wrap, time, progress: prog, marker };
}

function buildCyclesStars(count) {
  const wrap = el('div', 'focus-cycles');
  const cfg = getCFG();
  for (let i = 0; i < cfg.cyclesBeforeLong; i++) {
    const cls = i < count ? 'focus-cycles__star focus-cycles__star--done'
      : (i === count ? 'focus-cycles__star focus-cycles__star--active'
        : 'focus-cycles__star focus-cycles__star--empty');
    wrap.appendChild(el('span', cls, '\u2726'));
  }
  return wrap;
}

function buildOverlayFocus() {
  const ov = el('div', 'focus-overlay focus-overlay--focus');

  const top = el('div', 'focus-topbar');
  const exit = el('button', 'focus-topbar__exit', '\u2190 Sair');
  exit.type = 'button';
  const sesso = el('div', 'focus-topbar__session');
  sesso.innerHTML = 'Sessão <strong>1 de 4</strong>';
  top.appendChild(exit);
  top.appendChild(sesso);
  ov.appendChild(top);

  const body = el('div', 'focus-timer');
  const ring = buildRing();
  body.appendChild(ring.wrap);

  const lbl = el('div', 'focus-label');
  lbl.appendChild(el('div', 'focus-label__tag', 'EM FOCO'));
  lbl.appendChild(el('h2', 'focus-label__name', '—'));
  body.appendChild(lbl);

  const stars = buildCyclesStars(0);
  body.appendChild(stars);
  ov.appendChild(body);

  const actions = el('div', 'focus-actions');
  const pauseBtn = el('button', 'focus-btn focus-btn--ghost', '\u23F8 Pausar');
  pauseBtn.type = 'button';
  const finishBtn = el('button', 'focus-btn focus-btn--primary', '\u2713 Terminar');
  finishBtn.type = 'button';
  actions.appendChild(pauseBtn);
  actions.appendChild(finishBtn);
  ov.appendChild(actions);

  return { ov, exit, sesso, ring, name: lbl.querySelector('.focus-label__name'), stars, pauseBtn, finishBtn };
}

function buildOverlayPause() {
  const ov = el('div', 'focus-overlay focus-overlay--pause');

  const top = el('div', 'focus-topbar');
  const exit = el('button', 'focus-topbar__exit', '\u2190 Sair');
  exit.type = 'button';
  const sesso = el('div', 'focus-topbar__session');
  sesso.innerHTML = 'Sessão <strong>1 de 4</strong>';
  top.appendChild(exit);
  top.appendChild(sesso);
  ov.appendChild(top);

  const body = el('div', 'focus-timer');
  const ring = buildRing();
  body.appendChild(ring.wrap);

  const lbl = el('div', 'focus-label');
  lbl.appendChild(el('div', 'focus-label__tag', 'PAUSA'));
  const hint = el('p', 'focus-label__hint', 'Aproveita. Levanta-te e respira.');
  lbl.appendChild(hint);
  body.appendChild(lbl);

  const sug = el('div', 'focus-pause-suggestions');
  sug.appendChild(el('div', 'focus-pause-suggestions__title', 'Sugestões de pausa'));
  const grid = el('div', 'focus-pause-suggestions__grid');
  const items = [
    { icon: '\u{1F4A7}', label: 'Bebe água', hint: 'Hidrata o teu corpo' },
    { icon: '\u{1F9D8}', label: 'Alonga', hint: 'Ativa a tua energia' },
    { icon: '\u{1F441}', label: 'Olha para longe', hint: 'Descansa a visão' }
  ];
  for (const s of items) {
    const box = el('div', 'focus-suggestion');
    box.appendChild(el('div', 'focus-suggestion__icon', s.icon));
    box.appendChild(el('div', 'focus-suggestion__label', s.label));
    box.appendChild(el('div', 'focus-suggestion__hint', s.hint));
    grid.appendChild(box);
  }
  sug.appendChild(grid);
  body.appendChild(sug);
  ov.appendChild(body);

  const actions = el('div', 'focus-actions');
  const skipBtn = el('button', 'focus-btn focus-btn--primary', '\u25B6 Saltar pausa');
  skipBtn.type = 'button';
  actions.appendChild(skipBtn);
  ov.appendChild(actions);

  return { ov, exit, sesso, ring, skipBtn };
}

function buildOverlayDone() {
  const ov = el('div', 'focus-overlay focus-overlay--done');

  const box = el('div', 'focus-done');
  const iconWrap = el('div', 'focus-done__icon');
  const iconImg = document.createElement('img');
  iconImg.src = '/pages/focus/assets/emblema-ciclo.webp';
  iconImg.alt = '';
  iconWrap.appendChild(iconImg);
  box.appendChild(iconWrap);
  box.appendChild(el('h2', 'focus-done__title', 'BOM TRABALHO!'));
  const txt = el('p', 'focus-done__text', '—');
  box.appendChild(txt);

  const stats = el('div', 'focus-done__stats');
  box.appendChild(stats);

  const quote = el('p', 'focus-done__quote', '"Pequenos passos, grandes resultados."');
  box.appendChild(quote);

  const actions = el('div', 'focus-actions');
  const again = el('button', 'focus-btn focus-btn--ghost', '\u25B6 Nova sessão');
  again.type = 'button';
  const back = el('button', 'focus-btn focus-btn--primary', 'Voltar aos itens');
  back.type = 'button';
  actions.appendChild(again);
  actions.appendChild(back);
  ov.appendChild(box);
  ov.appendChild(actions);

  return { ov, text: txt, stats, again, back };
}

/* ---------- Persistência da config Pomodoro (B7.4) ---------- */
const POMODORO_CFG_KEY = 'lumiere.pomodoroCfg';
const POMODORO_CFG_DEFAULT = { focusMin: 25, shortBreakMin: 5, longBreakMin: 15, cyclesBeforeLong: 4, includeLong: true };

function loadCfgFromStorage() {
  try {
    const raw = localStorage.getItem(POMODORO_CFG_KEY);
    if (!raw) return { ...POMODORO_CFG_DEFAULT };
    const parsed = JSON.parse(raw);
    return {
      focusMin: parsed.focusMin || POMODORO_CFG_DEFAULT.focusMin,
      shortBreakMin: parsed.shortBreakMin || POMODORO_CFG_DEFAULT.shortBreakMin,
      longBreakMin: parsed.longBreakMin || POMODORO_CFG_DEFAULT.longBreakMin,
      cyclesBeforeLong: parsed.cyclesBeforeLong || POMODORO_CFG_DEFAULT.cyclesBeforeLong,
      includeLong: parsed.includeLong !== false
    };
  } catch (e) {
    return { ...POMODORO_CFG_DEFAULT };
  }
}

function saveCfgToStorage(cfg) {
  try {
    localStorage.setItem(POMODORO_CFG_KEY, JSON.stringify({
      focusMin: cfg.focusMin,
      shortBreakMin: cfg.shortBreakMin,
      longBreakMin: cfg.longBreakMin,
      cyclesBeforeLong: cfg.cyclesBeforeLong,
      includeLong: cfg.includeLong
    }));
  } catch (e) { /* silent */ }
}

/* ---------- Ecrã de configuração (B7.1) ---------- */
function buildOverlayConfig(entity) {
  const ov = el('div', 'focus-overlay focus-overlay--config');

  const topbar = el('div', 'focus-topbar focus-topbar--config');
  const closeBtn = el('button', 'focus-topbar__close', '\u2715');
  closeBtn.type = 'button';
  closeBtn.setAttribute('aria-label', 'Fechar');
  topbar.appendChild(closeBtn);
  ov.appendChild(topbar);

  const body = el('div', 'focus-config');

  body.appendChild(el('h2', 'focus-config__title', 'CONFIGURAR SESSÃO'));
  body.appendChild(el('p', 'focus-config__name', entity.name || '\u2014'));

  body.appendChild(el('div', 'focus-config__section-label', 'PRESETS RÁPIDOS'));

  const presets = el('div', 'focus-config__presets');
  const presetData = [
    { key: 'classic', label: 'CLÁSSICO', sub: '25 / 5 / 15' },
    { key: 'short',   label: 'CURTO',    sub: '15 / 5 / 10' },
    { key: 'long',    label: 'LONGO',    sub: '50 / 10 / 30' },
    { key: 'custom',  label: '\u2699', sub: '' }
  ];
  const presetRefs = {};
  for (const pd of presetData) {
    const btn = el('button', 'focus-config__preset');
    btn.type = 'button';
    btn.dataset.preset = pd.key;
    btn.appendChild(el('span', 'focus-config__preset-label', pd.label));
    btn.appendChild(el('span', 'focus-config__preset-sub', pd.sub));
    presets.appendChild(btn);
    presetRefs[pd.key] = btn;
  }
  body.appendChild(presets);

  const card = el('div', 'focus-config__card');
  const saved = loadCfgFromStorage();
  const sliderDefs = [
    { key: 'focusMin',         icon: '\u2600', label: 'FOCO',              min: 5, max: 90, value: saved.focusMin,         unit: 'MIN' },
    { key: 'shortBreakMin',    icon: '\u2615', label: 'PAUSA CURTA',       min: 1, max: 15, value: saved.shortBreakMin,    unit: 'MIN' },
    { key: 'longBreakMin',     icon: '\u263D', label: 'PAUSA LONGA',       min: 5, max: 45, value: saved.longBreakMin,     unit: 'MIN' },
    { key: 'cyclesBeforeLong', icon: '\u2726', label: 'CICLOS ATÉ LONGA',  min: 2, max: 8,  value: saved.cyclesBeforeLong, unit: '' }
  ];
  const sliderRefs = {};
  for (const sd of sliderDefs) {
    const row = el('div', 'focus-config__slider-row');
    row.appendChild(el('span', 'focus-config__slider-icon', sd.icon));
    const main = el('div', 'focus-config__slider-main');
    main.appendChild(el('div', 'focus-config__slider-label', sd.label));
    const input = document.createElement('input');
    input.type = 'range';
    input.min = String(sd.min);
    input.max = String(sd.max);
    input.value = String(sd.value);
    input.className = 'focus-config__range';
    input.dataset.key = sd.key;
    main.appendChild(input);
    const bounds = el('div', 'focus-config__slider-bounds');
    bounds.appendChild(el('span', null, String(sd.min)));
    bounds.appendChild(el('span', null, String(sd.max)));
    main.appendChild(bounds);
    row.appendChild(main);
    const valWrap = el('div', 'focus-config__slider-value-wrap');
    const val = el('span', 'focus-config__slider-value', String(sd.value));
    valWrap.appendChild(val);
    if (sd.unit) valWrap.appendChild(el('span', 'focus-config__slider-unit', sd.unit));
    row.appendChild(valWrap);
    card.appendChild(row);
    sliderRefs[sd.key] = { input, val };
  }

  const toggleRow = el('div', 'focus-config__toggle-row');
  toggleRow.appendChild(el('span', 'focus-config__toggle-label', 'Incluir pausa longa'));
  const toggle = el('button', 'focus-config__toggle' + (saved.includeLong ? ' is-on' : ''));
  toggle.type = 'button';
  toggle.setAttribute('role', 'switch');
  toggle.setAttribute('aria-checked', saved.includeLong ? 'true' : 'false');
  toggle.appendChild(el('span', 'focus-config__toggle-knob'));
  toggleRow.appendChild(toggle);
  card.appendChild(toggleRow);

  body.appendChild(card);

  const preview = el('div', 'focus-config__preview');
  preview.appendChild(el('div', 'focus-config__preview-label', 'PRÉ-VISUALIZAÇÃO'));
  const pLine1 = el('div', 'focus-config__preview-line');
  const pLine2 = el('div', 'focus-config__preview-line');
  preview.appendChild(pLine1);
  preview.appendChild(pLine2);
  body.appendChild(preview);

  ov.appendChild(body);

  const actions = el('div', 'focus-actions');
  const cancel = el('button', 'focus-btn focus-btn--ghost', 'Cancelar');
  cancel.type = 'button';
  const start = el('button', 'focus-btn focus-btn--primary', 'Iniciar');
  start.type = 'button';
  actions.appendChild(cancel);
  actions.appendChild(start);
  ov.appendChild(actions);

  return {
    ov, close: closeBtn, cancel, start, toggle,
    sliders: sliderRefs, presets: presetRefs,
    preview: { line1: pLine1, line2: pLine2 }
  };
}

/* ---------- Persistência ---------- */
async function saveSession(completed) {
  if (!_session) return;
  const s = _session;
  const now = new Date();
  const start = new Date(s.startedAt);
  const totalMs = now - start;
  const focusMin = Math.round(s.focusMsTotal / 60000);
  const pausedMin = Math.round((s.breakMsTotal || 0) / 60000);
  const totalMin = Math.round(totalMs / 60000);

  const payload = {
    entityType: s.entity.type,
    entityId: s.entity.id || '',
    entityName: s.entity.name || '',
    date: start.toISOString().split('T')[0],
    startedAt: s.startedAt,
    endedAt: now.toISOString(),
    totalMinutes: totalMin,
    focusMinutes: focusMin,
    pausedMinutes: pausedMin,
    completedCycles: s.cyclesCompleted,
    wasCompleted: Boolean(completed),
    note: ''
  };

  try {
    await dataManager.create('focusSessions', payload);
    console.log('[FocusTimer] Sessão guardada:', payload);
  } catch (e) {
    console.error('[FocusTimer] Falha ao guardar sessão:', e);
  }
}

/* ---------- State machine ---------- */
function startPhase(phase) {
  const s = _session;
  const cfg = s.cfg;
  s.phase = phase;
  if (phase === 'focus') {
    s.phaseDurationMs = cfg._focusMs;
  } else if (phase === 'break') {
    s.phaseDurationMs = cfg._breakMs;
  } else {
    s.phaseDurationMs = cfg._longMs;
  }
  s.phaseStartTs = Date.now();
  s.isPaused = false;
  s.pausedAt = 0;
}

function getRemainingMs() {
  const s = _session;
  if (!s) return 0;
  const elapsed = Date.now() - s.phaseStartTs;
  return Math.max(0, s.phaseDurationMs - elapsed);
}

async function endSessionAuto() {
  if (!_session) return;
  if (_session._ending) return;
  _session._ending = true;
  console.log('[FocusTimer] Auto-fim da sessao');
  if (_tickTimer) { clearInterval(_tickTimer); _tickTimer = null; }
  await saveSession(true);
  showDone();
  eventBus.emit('data:changed', { collection: 'focusSessions', action: 'create' });
}

function onPhaseEnd() {
  const s = _session;
  if (!s) return;
  const cfg = s.cfg;

  if (s.phase === 'focus') {
    s.cyclesCompleted++;
    s.focusMsTotal += s.phaseDurationMs;
    const isLastCycle = s.cyclesCompleted >= cfg.cyclesBeforeLong;

    if (isLastCycle) {
      if (cfg.includeLong) {
        startPhase('long');
        showPause();
        try { eventBus.emit('toast:show', { type: 'success', text: '\u00DAltimo ciclo! Pausa longa.' }); } catch (_) {}
      } else {
        endSessionAuto();
      }
    } else {
      startPhase('break');
      showPause();
      try { eventBus.emit('toast:show', { type: 'success', text: 'Ciclo completo! Faz uma pausa.' }); } catch (_) {}
    }
  } else if (s.phase === 'long') {
    s.breakMsTotal += s.phaseDurationMs;
    endSessionAuto();
  } else {
    s.breakMsTotal += s.phaseDurationMs;
    startPhase('focus');
    showFocus();
    try { eventBus.emit('toast:show', { type: 'info', text: 'Pausa terminada. Volta ao foco.' }); } catch (_) {}
  }
}

/* ---------- Render por frame ---------- */
function tick() {
  if (!_session || !_refs) return;
  const s = _session;
  if (s.isPaused) return;

  const remaining = getRemainingMs();
  if (remaining <= 0) {
    onPhaseEnd();
    return;
  }

  // Atualizar anel
  const ratio = remaining / s.phaseDurationMs; // 1 → 0
  const offset = RING_CIRC * (1 - ratio);
  const progress = 1 - ratio; // 0 → 1
  if (_refs.current.ring && _refs.current.ring.progress) {
    _refs.current.ring.progress.setAttribute('stroke-dashoffset', String(offset));
  }
  if (_refs.current.ring && _refs.current.ring.time) {
    _refs.current.ring.time.textContent = fmtMMSS(remaining);
  }
  // Marcador viaja no anel — começa no topo (-90°), sentido horário
  if (_refs.current.ring && _refs.current.ring.marker) {
    const angle = -Math.PI / 2 + progress * 2 * Math.PI;
    const mx = 50 + RING_R * Math.cos(angle);
    const my = 50 + RING_R * Math.sin(angle);
    _refs.current.ring.marker.setAttribute('cx', mx.toFixed(2));
    _refs.current.ring.marker.setAttribute('cy', my.toFixed(2));
  }
}

/* ---------- Mostrar / esconder overlays ---------- */
function mountOverlay(which) {
  if (!_refs) _refs = {};
  if (!_root) {
    _root = el('div', 'focus-overlay-container');
    document.body.appendChild(_root);
  }
  _root.innerHTML = '';

  if (which === 'focus') {
    _refs.focus = buildOverlayFocus();
    _refs.current = _refs.focus;
    _refs.focus.ov.classList.add('is-active');
    _root.appendChild(_refs.focus.ov);
    wireFocusHandlers();
  } else if (which === 'pause') {
    _refs.pause = buildOverlayPause();
    _refs.current = _refs.pause;
    _refs.pause.ov.classList.add('is-active');
    _root.appendChild(_refs.pause.ov);
    wirePauseHandlers();
  } else if (which === 'done') {
    _refs.done = buildOverlayDone();
    _refs.current = _refs.done;
    _refs.done.ov.classList.add('is-active');
    _root.appendChild(_refs.done.ov);
    wireDoneHandlers();
  } else if (which === 'config') {
    _refs.config = buildOverlayConfig(_pendingEntity || { name: '\u2014' });
    _refs.current = _refs.config;
    _refs.config.ov.classList.add('is-active');
    _root.appendChild(_refs.config.ov);
    wireConfigHandlers();
  }
}

function unmountOverlay() {
  if (_root && _root.parentNode) _root.parentNode.removeChild(_root);
  _root = null;
  _refs = null;
  _pendingEntity = null;
  if (_tickTimer) { clearInterval(_tickTimer); _tickTimer = null; }
  _session = null;
}

function showFocus() {
  mountOverlay('focus');
  updateFocusUI();
  startTick();
}

function showPause() {
  mountOverlay('pause');
  updatePauseUI();
  startTick();
}

function showDone() {
  mountOverlay('done');
  updateDoneUI();
}

function showConfig(entity) {
  _pendingEntity = entity || null;
  mountOverlay('config');
}

/* ---------- Handlers do config (B7.3 — lógica completa) ---------- */
const PRESET_VALUES = {
  classic: { focusMin: 25, shortBreakMin: 5,  longBreakMin: 15, cyclesBeforeLong: 4 },
  short:   { focusMin: 15, shortBreakMin: 5,  longBreakMin: 10, cyclesBeforeLong: 4 },
  long:    { focusMin: 50, shortBreakMin: 10, longBreakMin: 30, cyclesBeforeLong: 4 }
};

function readConfigFromDOM() {
  const c = _refs.config;
  return {
    focusMin: parseInt(c.sliders.focusMin.input.value, 10),
    shortBreakMin: parseInt(c.sliders.shortBreakMin.input.value, 10),
    longBreakMin: parseInt(c.sliders.longBreakMin.input.value, 10),
    cyclesBeforeLong: parseInt(c.sliders.cyclesBeforeLong.input.value, 10),
    includeLong: c.toggle.classList.contains('is-on')
  };
}

function updateConfigPreview() {
  const c = _refs.config;
  const cfg = readConfigFromDOM();
  const cycleMin = cfg.focusMin + cfg.shortBreakMin;
  const fullMin = cfg.cyclesBeforeLong * cycleMin + (cfg.includeLong ? cfg.longBreakMin : 0);
  const h = Math.floor(fullMin / 60);
  const m = fullMin % 60;
  const durTxt = (h > 0 ? h + 'h ' : '') + (m > 0 ? m + 'min' : (h > 0 ? '00min' : '0min'));
  c.preview.line1.textContent = '1 ciclo = ' + cfg.focusMin + ' min foco + ' + cfg.shortBreakMin + ' min pausa';
  c.preview.line2.textContent = 'Sessão completa ≈ ' + durTxt;
}

function applyPreset(key) {
  const c = _refs.config;
  // Atualiza estado visual dos presets
  for (const k of Object.keys(c.presets)) {
    c.presets[k].classList.toggle('is-active', k === key);
  }
  if (key === 'custom') return;
  const vals = PRESET_VALUES[key];
  if (!vals) return;
  c.sliders.focusMin.input.value = String(vals.focusMin);
  c.sliders.focusMin.val.textContent = String(vals.focusMin);
  c.sliders.shortBreakMin.input.value = String(vals.shortBreakMin);
  c.sliders.shortBreakMin.val.textContent = String(vals.shortBreakMin);
  c.sliders.longBreakMin.input.value = String(vals.longBreakMin);
  c.sliders.longBreakMin.val.textContent = String(vals.longBreakMin);
  c.sliders.cyclesBeforeLong.input.value = String(vals.cyclesBeforeLong);
  c.sliders.cyclesBeforeLong.val.textContent = String(vals.cyclesBeforeLong);
  updateConfigPreview();
}

function markCustomPreset() {
  const c = _refs.config;
  for (const k of Object.keys(c.presets)) {
    c.presets[k].classList.toggle('is-active', k === 'custom');
  }
}

function wireConfigHandlers() {
  const c = _refs.config;

  const closeAll = () => {
    _pendingEntity = null;
    unmountOverlay();
  };
  c.close.addEventListener('click', closeAll);
  c.cancel.addEventListener('click', closeAll);

  c.start.addEventListener('click', () => {
    const entity = _pendingEntity;
    const cfg = readConfigFromDOM();
    saveCfgToStorage(cfg);
    _pendingEntity = null;
    unmountOverlay();
    if (entity) {
      setTimeout(() => startSession(entity, cfg), 100);
    }
  });

  // Sliders
  for (const key of Object.keys(c.sliders)) {
    const ref = c.sliders[key];
    ref.input.addEventListener('input', () => {
      ref.val.textContent = ref.input.value;
      markCustomPreset();
      updateConfigPreview();
    });
  }

  // Presets
  for (const key of Object.keys(c.presets)) {
    c.presets[key].addEventListener('click', () => applyPreset(key));
  }

  // Toggle
  c.toggle.addEventListener('click', () => {
    const on = c.toggle.classList.toggle('is-on');
    c.toggle.setAttribute('aria-checked', on ? 'true' : 'false');
    updateConfigPreview();
  });

  // Estado inicial: marca Clássico ativo + calcula preview
  c.presets.classic.classList.add('is-active');
  updateConfigPreview();
}

function updateFocusUI() {
  if (!_refs || !_refs.focus || !_session) return;
  _refs.focus.name.textContent = _session.entity.name || '—';
  const cfg = getCFG();
  const sessNum = Math.min(_session.cyclesCompleted + 1, cfg.cyclesBeforeLong);
  _refs.focus.sesso.innerHTML = 'Sessão <strong>' + sessNum + ' de ' + cfg.cyclesBeforeLong + '</strong>';
  // Atualizar estrelas
  const parent = _refs.focus.stars.parentNode;
  const newStars = buildCyclesStars(_session.cyclesCompleted);
  parent.replaceChild(newStars, _refs.focus.stars);
  _refs.focus.stars = newStars;
}

function updatePauseUI() {
  if (!_refs || !_refs.pause || !_session) return;
  const cfg = getCFG();
  const sessNum = Math.min(_session.cyclesCompleted, cfg.cyclesBeforeLong);
  _refs.pause.sesso.innerHTML = 'Sessão <strong>' + sessNum + ' de ' + cfg.cyclesBeforeLong + '</strong>';
}

function updateDoneUI() {
  if (!_refs || !_refs.done || !_session) return;
  const focusMin = Math.round(_session.focusMsTotal / 60000);
  _refs.done.text.textContent = 'Focaste ' + focusMin + ' min em "' + (_session.entity.name || '—') + '"';

  const stats = _refs.done.stats;
  stats.innerHTML = '';
  const rows = [
    { icon: '\u2726', label: 'Ciclos completos', value: String(_session.cyclesCompleted) },
    { icon: '\u{1F4C5}', label: 'Tempo de foco', value: focusMin + ' min' },
    { icon: '\u23F1', label: 'Tempo em pausa', value: Math.round((_session.breakMsTotal || 0) / 60000) + ' min' }
  ];
  for (const r of rows) {
    const row = el('div', 'focus-done__stat-row');
    row.appendChild(el('span', 'focus-done__stat-icon', r.icon));
    row.appendChild(el('span', 'focus-done__stat-label', r.label));
    row.appendChild(el('span', 'focus-done__stat-value', r.value));
    stats.appendChild(row);
  }
}

/* ---------- Handlers ---------- */
function wireFocusHandlers() {
  _refs.focus.exit.addEventListener('click', () => {
    console.log('[FocusTimer] Exit — sessão abandonada, nada guardado');
    unmountOverlay();
    eventBus.emit('focus:session:end', { saved: false });
  });
  _refs.focus.pauseBtn.addEventListener('click', () => {
    if (!_session.isPaused) {
      // Pausar
      _session.isPaused = true;
      _session.pausedAt = Date.now();
      _refs.focus.pauseBtn.innerHTML = '\u25B6 Retomar';
      _refs.focus.pauseBtn.classList.remove('focus-btn--ghost');
      _refs.focus.pauseBtn.classList.add('focus-btn--primary');
      console.log('[FocusTimer] Pausado');
      try { eventBus.emit('toast:show', { type: 'info', text: 'Sessão em pausa' }); } catch (_) {}
    } else {
      // Retomar
      const elapsedPause = Date.now() - _session.pausedAt;
      _session.pausedMsTotal += elapsedPause;
      _session.phaseStartTs += elapsedPause; // empurra o início da fase para não contar pausa
      _session.isPaused = false;
      _session.pausedAt = 0;
      _refs.focus.pauseBtn.innerHTML = '\u23F8 Pausar';
      _refs.focus.pauseBtn.classList.add('focus-btn--ghost');
      _refs.focus.pauseBtn.classList.remove('focus-btn--primary');
      console.log('[FocusTimer] Retomado | pausa de ' + Math.round(elapsedPause / 1000) + 's');
      try { eventBus.emit('toast:show', { type: 'success', text: 'De volta ao foco' }); } catch (_) {}
    }
  });
  _refs.focus.finishBtn.addEventListener('click', async () => {
    console.log('[FocusTimer] Finish — sessão terminada pelo utilizador');
    await saveSession(true);
    showDone();
    eventBus.emit('data:changed', { collection: 'focusSessions', action: 'create' });
  });
}

function wirePauseHandlers() {
  _refs.pause.exit.addEventListener('click', () => {
    console.log('[FocusTimer] Exit durante pausa — nada guardado');
    unmountOverlay();
    eventBus.emit('focus:session:end', { saved: false });
  });
  _refs.pause.skipBtn.addEventListener('click', () => {
    console.log('[FocusTimer] Pausa saltada');
    startPhase('focus');
    showFocus();
  });
}

function wireDoneHandlers() {
  _refs.done.back.addEventListener('click', () => {
    unmountOverlay();
    eventBus.emit('focus:session:end', { saved: true });
  });
  _refs.done.again.addEventListener('click', () => {
    const entity = _session.entity;
    unmountOverlay();
    eventBus.emit('focus:session:end', { saved: true });
    setTimeout(() => startSession(entity), 200);
  });
}

/* ---------- Tick ---------- */
function startTick() {
  if (_tickTimer) clearInterval(_tickTimer);
  _tickTimer = setInterval(tick, 250);
  tick();
}

/* ---------- Entrada pública ---------- */
export function openConfigFor(entity) {
  if (_session) {
    console.warn('[FocusTimer] Sessão ativa, não abre config.');
    return;
  }
  if (!entity || !entity.type || !entity.name) {
    console.warn('[FocusTimer] Entity inválida:', entity);
    return;
  }
  showConfig(entity);
}

export function startSession(entity, customCfg) {
  if (_session) {
    console.warn('[FocusTimer] Já existe sessão ativa. Ignorando.');
    return;
  }
  if (!entity || !entity.type || !entity.name) {
    console.warn('[FocusTimer] Entity inválida:', entity);
    return;
  }

  const cfg = getCFG(customCfg);
  if (cfg._fast) {
    console.log('[FocusTimer] ⚡ Modo rápido ativo:', cfg._focusMs/1000 + 's foco / ' + cfg._breakMs/1000 + 's pausa / ' + cfg._longMs/1000 + 's longa');
  }
  _session = {
    entity: {
      type: entity.type,
      id: entity.id || '',
      name: entity.name
    },
    startedAt: new Date().toISOString(),
    phase: 'focus',
    phaseDurationMs: cfg._focusMs,
    phaseStartTs: Date.now(),
    isPaused: false,
    pausedAt: 0,
    pausedMsTotal: 0,
    cyclesCompleted: 0,
    focusMsTotal: 0,
    breakMsTotal: 0,
    cfg: cfg
  };

  _refs = {};
  console.log('[FocusTimer] Sessão iniciada em', entity.name);
  showFocus();
}

export function isSessionActive() {
  return _session !== null;
}

export default { startSession, openConfigFor, isSessionActive };
