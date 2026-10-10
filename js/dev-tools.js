/**
 * Dev Tools — utilitários de desenvolvimento
 *
 * TEMPORÁRIO. Este ficheiro será removido quando o desenvolvimento estabilizar.
 *
 * Fornece:
 *   - hardReload(): desregistra SW + apaga caches + reload forçado
 *   - activateDevMode(): ativa modo dev (localStorage)
 *   - isDevMode(): consulta o estado
 *
 * Está exposto em window.__lumiere.hardReload (para uso via eruda).
 */

const DEV_MODE_KEY = 'lumiereDevMode';

export function isDevMode() {
  try { return localStorage.getItem(DEV_MODE_KEY) === 'true'; } catch (_) { return false; }
}

export function activateDevMode(on) {
  try { localStorage.setItem(DEV_MODE_KEY, on ? 'true' : 'false'); } catch (_) {}
  return on;
}

/**
 * Força atualização completa:
 *   1. Desregistra todos os Service Workers
 *   2. Apaga todas as caches (Cache Storage API)
 *   3. Faz reload com URL única (bypass ao cache HTTP)
 */
export async function hardReload() {
  console.log('[DevTools] hardReload() iniciado');

  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    for (const r of regs) {
      try { await r.unregister(); console.log('[DevTools] SW desregistado:', r.scope); } catch (_) {}
    }
  } catch (e) { console.warn('[DevTools] unregister falhou:', e); }

  try {
    const keys = await caches.keys();
    for (const k of keys) {
      try { await caches.delete(k); console.log('[DevTools] Cache apagada:', k); } catch (_) {}
    }
  } catch (e) { console.warn('[DevTools] caches.delete falhou:', e); }

  console.log('[DevTools] A recarregar...');

  try {
    const url = new URL(location.href);
    url.searchParams.set('_r', String(Date.now()));
    setTimeout(() => { location.replace(url.toString()); }, 300);
  } catch (_) {
    setTimeout(() => { location.reload(); }, 300);
  }
}

/**
 * Inicializa os dev tools. Idempotente.
 */
/* ---------- Fast Timer (dev only) ---------- */
const FAST_KEY = 'lumiereFocusFast';

export function isFastTimer() {
  try { return localStorage.getItem(FAST_KEY) === 'true'; } catch (_) { return false; }
}

export function setFastTimer(on) {
  try { localStorage.setItem(FAST_KEY, on ? 'true' : 'false'); } catch (_) {}
  return on;
}

export function getFastTimerConfig() {
  // Quando ligado: foco=10s, pausa=5s, pausa longa=15s
  return {
    focusSec: 10,
    breakSec: 5,
    longBreakSec: 15
  };
}

export function initDevTools() {
  if (typeof window === 'undefined') return;
  if (window.__devToolsReady) return;
  window.__devToolsReady = true;

  // Expor globalmente para uso via eruda
  window.__lumiere = window.__lumiere || {};
  window.__lumiere.hardReload = hardReload;
  window.__lumiere.devMode = { on: activateDevMode, is: isDevMode };
  window.__lumiere.fastTimer = { on: setFastTimer, is: isFastTimer };

  console.log('[DevTools] Pronto. Usa window.__lumiere.hardReload() no eruda.');
}

export default { hardReload, initDevTools, isDevMode, activateDevMode, isFastTimer, setFastTimer };
