/**
 * Voice Overlay — ecrã inteiro com 4 estados visuais.
 */
import { eventBus } from '../../core/eventBus.js';
import { VoiceManager } from '../../core/voice/VoiceManager.js';
import { createVoiceOrbThree } from './voice-orb-three.js';

let _root = null;
let _orb = null;
let _timer = null;
let _timerStart = 0;
let _lastState = null;

const EXAMPLES = [
  'Criar tarefa estudar matemática amanhã',
  'Adicionar despesa alimentação 500',
  'Criar hábito correr às 7'
];

function el(tag, cls, txt) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (txt !== undefined) e.textContent = txt;
  return e;
}

function buildCloseButton() {
  const b = el('button', 'voice-ov__close', '\u2715');
  b.type = 'button';
  b.setAttribute('aria-label', 'Cancelar');
  b.addEventListener('click', () => VoiceManager.cancel());
  return b;
}

function buildOrbSlot(extraClass) {
  return el('div', 'voice-ov__orb-slot' + (extraClass ? ' ' + extraClass : ''));
}

function buildListening() {
  const wrap = el('div', 'voice-ov__pane voice-ov__pane--listening');
  const title = el('h2', 'voice-ov__title', 'A OUVIR...');
  wrap.appendChild(title);

  const orbSlot = buildOrbSlot('voice-ov__orb-slot--lg');
  wrap.appendChild(orbSlot);

  const transcript = el('p', 'voice-ov__transcript', '...');
  transcript.id = 'voice-ov-transcript';
  wrap.appendChild(transcript);

  const wave = el('div', 'voice-ov__wave');
  wave.id = 'voice-ov-wave';
  for (let i = 0; i < 48; i++) {
    const bar = el('span', 'voice-ov__wave-bar');
    bar.style.setProperty('--i', String(i));
    wave.appendChild(bar);
  }
  wrap.appendChild(wave);

  const timer = el('div', 'voice-ov__timer', '00:00');
  timer.id = 'voice-ov-timer';
  wrap.appendChild(timer);

  // MVP 2.4 — dois botões: Cancelar (ghost) + TERMINEI DE FALAR (primary)
  const footer = el('div', 'voice-ov__footer voice-ov__footer--two voice-ov__footer--listening');

  const bCancel = el('button', 'voice-ov__btn voice-ov__btn--ghost', 'Cancelar');
  bCancel.type = 'button';
  bCancel.addEventListener('click', () => VoiceManager.cancel());

  const bFinish = el('button', 'voice-ov__btn voice-ov__btn--primary voice-ov__btn--finish', 'TERMINEI DE FALAR');
  bFinish.type = 'button';
  bFinish.setAttribute('aria-label', 'Terminei de falar');
  bFinish.addEventListener('click', () => VoiceManager.finishSpeaking());

  footer.appendChild(bCancel);
  footer.appendChild(bFinish);
  wrap.appendChild(footer);

  return { el: wrap, orbSlot };
}

function buildProcessing() {
  const wrap = el('div', 'voice-ov__pane voice-ov__pane--processing');
  const title = el('h2', 'voice-ov__title', 'A PROCESSA R...');
  wrap.appendChild(title);
  const orbSlot = buildOrbSlot('voice-ov__orb-slot--md');
  wrap.appendChild(orbSlot);
  const note = el('p', 'voice-ov__note', 'A interpretar o que disseste...');
  wrap.appendChild(note);
  return { el: wrap, orbSlot };
}

function chip(iconChar, label, value) {
  const row = el('div', 'voice-ov__chip');
  const ico = el('span', 'voice-ov__chip-ico', iconChar);
  const body = el('div', 'voice-ov__chip-body');
  const lbl = el('div', 'voice-ov__chip-lbl', label);
  const val = el('div', 'voice-ov__chip-val', value || '—');
  body.appendChild(lbl);
  body.appendChild(val);
  row.appendChild(ico);
  row.appendChild(body);
  return row;
}

function buildUnderstood(intent) {
  const wrap = el('div', 'voice-ov__pane voice-ov__pane--understood');
  const title = el('h2', 'voice-ov__title', 'ENTENDI ISTO:');
  wrap.appendChild(title);
  const sub = el('p', 'voice-ov__sub', 'Confirma antes de criar.');
  wrap.appendChild(sub);

  const orbSlot = buildOrbSlot('voice-ov__orb-slot--sm');
  wrap.appendChild(orbSlot);

  const chips = el('div', 'voice-ov__chips');
  const ttl = (intent && intent.title) ? intent.title : '—';
  let prazo = '—';
  if (intent && intent.dueDate) {
    const d = new Date(intent.dueDate + 'T00:00:00');
    const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    prazo = d.getDate() + ' ' + months[d.getMonth()];
  }
  const prio = (intent && intent.priority) ? intent.priority : 'medium';
  const prioLabel = ({ low:'Baixa', medium:'Média (por defeito)', high:'Alta', urgent:'Urgente' })[prio] || prio;
  const cat = (intent && intent.category) ? intent.category : 'personal';
  const catLabel = cat.charAt(0).toUpperCase() + cat.slice(1);

  chips.appendChild(chip('\u{1F3AF}', 'AÇÃO', 'Nova tarefa'));
  chips.appendChild(chip('\u{1F4DD}', 'TÍTULO', ttl));
  chips.appendChild(chip('\u{1F4C5}', 'PRAZO', prazo));
  chips.appendChild(chip('\u26A1', 'PRIORIDADE', prioLabel));
  chips.appendChild(chip('\u{1F3F7}\uFE0F', 'CATEGORIA', catLabel));
  wrap.appendChild(chips);

  const footer = el('div', 'voice-ov__footer');
  const bAgain = el('button', 'voice-ov__btn voice-ov__btn--ghost', 'Falar de novo');
  bAgain.type = 'button';
  bAgain.addEventListener('click', () => { VoiceManager.cancel(); setTimeout(() => VoiceManager.start(), 250); });
  const bCancel = el('button', 'voice-ov__btn voice-ov__btn--ghost', 'Cancelar');
  bCancel.type = 'button';
  bCancel.addEventListener('click', () => VoiceManager.cancel());
  const bConfirm = el('button', 'voice-ov__btn voice-ov__btn--primary', 'Confirmar');
  bConfirm.type = 'button';
  bConfirm.addEventListener('click', () => VoiceManager.confirm());

  footer.appendChild(bAgain);
  footer.appendChild(bCancel);
  footer.appendChild(bConfirm);
  wrap.appendChild(footer);

  return { el: wrap, orbSlot };
}

function buildError() {
  const wrap = el('div', 'voice-ov__pane voice-ov__pane--error');
  const title = el('h2', 'voice-ov__title voice-ov__title--error', 'NÃO ENTENDI BEM.');
  wrap.appendChild(title);
  const sub = el('p', 'voice-ov__sub', 'Podes repetir ou dizer de outra forma?');
  wrap.appendChild(sub);

  const orbSlot = buildOrbSlot('voice-ov__orb-slot--sm voice-ov__orb-slot--dim');
  wrap.appendChild(orbSlot);

  const box = el('div', 'voice-ov__examples');
  box.appendChild(el('div', 'voice-ov__examples-title', 'Exemplos:'));
  const ul = el('ul', 'voice-ov__examples-list');
  for (const ex of EXAMPLES) ul.appendChild(el('li', null, ex));
  box.appendChild(ul);
  wrap.appendChild(box);

  const footer = el('div', 'voice-ov__footer voice-ov__footer--two');
  const bAgain = el('button', 'voice-ov__btn voice-ov__btn--primary', 'Falar novamente');
  bAgain.type = 'button';
  bAgain.addEventListener('click', () => { VoiceManager.cancel(); setTimeout(() => VoiceManager.start(), 250); });
  const bCancel = el('button', 'voice-ov__btn voice-ov__btn--ghost', 'Cancelar');
  bCancel.type = 'button';
  bCancel.addEventListener('click', () => VoiceManager.cancel());
  footer.appendChild(bAgain);
  footer.appendChild(bCancel);
  wrap.appendChild(footer);

  return { el: wrap, orbSlot };
}

function buildNeedInfo(intent, decision) {
  const wrap = el('div', 'voice-ov__pane voice-ov__pane--needinfo');

  const title = el('h2', 'voice-ov__title', 'QUASE LÁ...');
  wrap.appendChild(title);
  const sub = el('p', 'voice-ov__sub', 'Falta um detalhe para continuar.');
  wrap.appendChild(sub);

  const orbSlot = buildOrbSlot('voice-ov__orb-slot--sm');
  wrap.appendChild(orbSlot);

  const chips = el('div', 'voice-ov__chips');
  const ttl = (intent && intent.title) ? intent.title : '(sem título)';
  const missing = (decision && decision.missingFields) ? decision.missingFields : [];
  const reason = (decision && decision.reason) || 'medium-confidence';

  chips.appendChild(chip('\u{1F3AF}', 'AÇÃO', 'Nova tarefa'));
  chips.appendChild(chip('\u{1F4DD}', 'TÍTULO', ttl));
  wrap.appendChild(chips);

  const info = el('div', 'voice-ov__examples');
  const infoTitle = el('div', 'voice-ov__examples-title', 'O que falta:');
  info.appendChild(infoTitle);
  const ul = el('ul', 'voice-ov__examples-list');
  if (missing.indexOf('title') >= 0) {
    ul.appendChild(el('li', null, 'Diz o nome da tarefa (ex: "estudar matemática")'));
  } else if (reason === 'medium-confidence') {
    ul.appendChild(el('li', null, 'Fala mais um pouco ou tenta ser mais específico'));
  } else {
    ul.appendChild(el('li', null, 'Repete a frase de forma mais direta'));
  }
  info.appendChild(ul);
  wrap.appendChild(info);

  const footer = el('div', 'voice-ov__footer voice-ov__footer--two');
  const bAgain = el('button', 'voice-ov__btn voice-ov__btn--primary', 'Falar novamente');
  bAgain.type = 'button';
  bAgain.addEventListener('click', () => { VoiceManager.cancel(); setTimeout(() => VoiceManager.start(), 250); });
  const bCancel = el('button', 'voice-ov__btn voice-ov__btn--ghost', 'Cancelar');
  bCancel.type = 'button';
  bCancel.addEventListener('click', () => VoiceManager.cancel());
  footer.appendChild(bAgain);
  footer.appendChild(bCancel);
  wrap.appendChild(footer);

  return { el: wrap, orbSlot };
}

function showOverlay() {
  if (_root) return;
  _root = el('div', 'voice-ov');
  document.body.appendChild(_root);
  requestAnimationFrame(() => _root.classList.add('is-open'));
}

function hideOverlay() {
  if (!_root) return;
  const r = _root;
  _root = null;
  r.classList.remove('is-open');
  if (_orb) { try { _orb.destroy(); } catch (_) {} _orb = null; }
  stopTimer();
  setTimeout(() => { if (r.parentNode) r.parentNode.removeChild(r); }, 260);
}

function setPane(builder, intent) {
  if (!_root) return;
  if (_orb) { try { _orb.destroy(); } catch (_) {} _orb = null; }
  _root.innerHTML = '';
  _root.appendChild(buildCloseButton());
  const built = builder(intent);
  _root.appendChild(built.el);

  if (built.orbSlot) {
    try {
      _orb = createVoiceOrbThree(built.orbSlot);
      _orb.start();
      const map = {
        listening: 'listening',
        confirming: 'understood',
        error: 'not_understood',
        interpreting: 'processing'
      };
      _orb.setState(map[_lastState] || 'idle');
    } catch (e) { console.warn('[VoiceOverlay] Orbe falhou:', e); }
  }
}

function startTimer() {
  stopTimer();
  _timerStart = Date.now();
  _timer = setInterval(() => {
    const t = _root && _root.querySelector('#voice-ov-timer');
    if (!t) return;
    const s = Math.floor((Date.now() - _timerStart) / 1000);
    t.textContent = String(Math.floor(s/60)).padStart(2,'0') + ':' + String(s%60).padStart(2,'0');
  }, 200);
}
function stopTimer() { if (_timer) { clearInterval(_timer); _timer = null; } }

function animateWave(level) {
  if (!_root) return;
  const wave = _root.querySelector('#voice-ov-wave');
  if (!wave) return;
  const bars = wave.querySelectorAll('.voice-ov__wave-bar');
  const lvl = Math.max(0.05, Math.min(1, level || 0));
  bars.forEach((b, i) => {
    const seed = (i * 0.37) % 1;
    const h = (0.15 + 0.85 * lvl * (0.4 + 0.6 * Math.abs(Math.sin((Date.now() / 300) + seed * 6))));
    b.style.height = (h * 100) + '%';
  });
}

function subscribe() {
  eventBus.on('voice:state', (p) => {
    const s = p && p.state;
    _lastState = s;
    if (s === 'listening') { showOverlay(); setPane(buildListening); startTimer(); }
    else if (s === 'interpreting') { showOverlay(); setPane(buildProcessing); }
    else if (s === 'error') { showOverlay(); setPane(buildError); stopTimer(); }
    else if (s === 'cancelled') { hideOverlay(); }
  });

  eventBus.on('voice:interim', (p) => {
    const t = _root && _root.querySelector('#voice-ov-transcript');
    if (t) t.textContent = (p && p.text) ? p.text : '...';
  });
  eventBus.on('voice:transcript', (p) => {
    const t = _root && _root.querySelector('#voice-ov-transcript');
    if (t) t.textContent = (p && p.transcript) ? p.transcript : '...';
  });
  eventBus.on('voice:understood', (p) => {
    _lastState = 'confirming';
    showOverlay();
    setPane(buildUnderstood, (p && p.intent) ? p.intent : {});
    stopTimer();
  });
  eventBus.on('voice:clarify', (p) => {
    _lastState = 'confirming'; // usa orbe calmo, não dessaturado
    showOverlay();
    setPane((intent) => buildNeedInfo(intent, p && p.decision), (p && p.intent) ? p.intent : {});
    stopTimer();
  });
  eventBus.on('voice:error', () => {
    _lastState = 'error'; showOverlay(); setPane(buildError); stopTimer();
  });
  eventBus.on('voice:confirmed', () => { hideOverlay(); });
  eventBus.on('voice:audioLevel', (p) => {
    const lvl = (p && typeof p.level === 'number') ? p.level : 0;
    animateWave(lvl);
    if (_orb) _orb.setAudioLevel(lvl);
  });
}

export function initVoiceOverlay() { subscribe(); }

export default { initVoiceOverlay };
