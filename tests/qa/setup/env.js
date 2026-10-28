import 'fake-indexeddb/auto';
process.env.NODE_ENV = 'test';
process.env.VITEST = 'true';
globalThis.__networkCalls = [];
function blocked(name) {
  return (...args) => {
    globalThis.__networkCalls.push({ name, argc: args.length, at: Date.now() });
    throw new Error('[Isolation] Rede bloqueada: ' + name);
  };
}
try { globalThis.fetch = blocked('fetch'); } catch (_) {}
try { globalThis.XMLHttpRequest = class { constructor() { blocked('xhr')(); } }; } catch (_) {}
try { globalThis.WebSocket = class { constructor() { blocked('ws')(); } }; } catch (_) {}
try { if (globalThis.navigator) globalThis.navigator.sendBeacon = blocked('sendBeacon'); } catch (_) {}
if (typeof globalThis.indexedDB === 'undefined') {
  throw new Error('[Isolation] fake-indexeddb nao foi aplicado');
}
console.log('[QA env] Ambiente isolado pronto.');
