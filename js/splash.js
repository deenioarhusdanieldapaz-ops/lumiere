/**
 * Splash Screen — auto-hide com timer próprio (13s).
 * Independente do app.js. Nunca falha, nunca é interrompido.
 */

const FIXED_DURATION = 12000;
const FADE_DURATION = 500;

function doHide() {
  const el = document.getElementById('splash');
  if (!el) return;
  el.classList.add('splash--hide');
  setTimeout(() => {
    if (el.parentNode) el.parentNode.removeChild(el);
  }, FADE_DURATION);
}

if (typeof window !== 'undefined') {
  window.setTimeout(doHide, FIXED_DURATION);
}

export const splash = {
  hide() {},   // no-op — não interrompe nada
  show() {}
};

export default splash;
