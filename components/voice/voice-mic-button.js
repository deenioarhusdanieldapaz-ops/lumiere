/**
 * Voice Mic Button — botão circular no canto inferior ESQUERDO.
 * Simétrico ao FAB "+" no canto inferior DIREITO.
 */
import { eventBus } from '../../core/eventBus.js';
import { VoiceManager } from '../../core/voice/VoiceManager.js';

let _btn = null;
let _busy = false;

function build() {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'voice-mic-btn';
  btn.setAttribute('aria-label', 'Comandos de voz');
  btn.setAttribute('aria-haspopup', 'dialog');

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', '22');
  svg.setAttribute('height', '22');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.8');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');

  const p1 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  p1.setAttribute('d', 'M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z');
  const p2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  p2.setAttribute('d', 'M19 10v2a7 7 0 0 1-14 0v-2');
  const p3 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  p3.setAttribute('x1', '12');
  p3.setAttribute('y1', '19');
  p3.setAttribute('x2', '12');
  p3.setAttribute('y2', '22');

  svg.appendChild(p1); svg.appendChild(p2); svg.appendChild(p3);
  btn.appendChild(svg);

  btn.addEventListener('click', async () => {
    if (_busy) return;
    if (!VoiceManager.isSupported()) {
      try { eventBus.emit('toast:show', { type: 'error', text: 'Navegador sem suporte a voz.' }); } catch (_) {}
      return;
    }
    const res = await VoiceManager.start();
    if (!res.ok) {
      try { eventBus.emit('toast:show', { type: 'error', text: 'Não foi possível iniciar.' }); } catch (_) {}
    }
  });
  return btn;
}

export function initVoiceMicButton() {
  if (_btn) return _btn;
  _btn = build();
  document.body.appendChild(_btn);

  eventBus.on('voice:state', (p) => {
    const s = p && p.state;
    _busy = (s === 'listening' || s === 'interpreting' || s === 'confirming');
    _btn.classList.toggle('voice-mic-btn--disabled', _busy);
    _btn.setAttribute('aria-disabled', _busy ? 'true' : 'false');
  });
  eventBus.on('voice:cancelled', () => { _busy = false; _btn.classList.remove('voice-mic-btn--disabled'); });
  eventBus.on('voice:confirmed', () => { _busy = false; _btn.classList.remove('voice-mic-btn--disabled'); });
  return _btn;
}

export function destroyVoiceMicButton() {
  if (_btn && _btn.parentNode) _btn.parentNode.removeChild(_btn);
  _btn = null;
}

export default { initVoiceMicButton, destroyVoiceMicButton };
