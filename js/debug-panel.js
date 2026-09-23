/**
 * Debug Panel - TEMPORARIO
 * Captura console.log/error/warn + erros globais e exibe na tela.
 * Remover em Fase 11 (Polimento).
 */
(function() {
  var panel = document.createElement('div');
  panel.id = 'debug-panel';
  panel.style.cssText = 'position:fixed;bottom:0;left:0;right:0;max-height:40vh;overflow-y:auto;background:rgba(0,0,0,0.95);color:#0f0;font-family:monospace;font-size:11px;padding:6px;border-top:1px solid #0f0;z-index:99999;display:none;';
  panel.innerHTML = '<div style="display:flex;justify-content:space-between;margin-bottom:4px;"><strong>Debug Panel</strong><button id="debug-clear" style="background:transparent;color:#0f0;border:1px solid #0f0;border-radius:3px;padding:0 6px;">limpar</button></div><div id="debug-log"></div>';

  var toggleBtn = document.createElement('button');
  toggleBtn.id = 'debug-toggle';
  toggleBtn.textContent = 'DBG';
  toggleBtn.style.cssText = 'position:fixed;top:80px;right:8px;background:#0f0;color:#000;border:none;border-radius:50%;width:34px;height:34px;font-size:11px;font-weight:bold;z-index:100000;cursor:pointer;opacity:0.45;transition:opacity 200ms ease;';
  toggleBtn.addEventListener('mouseenter', function() { toggleBtn.style.opacity = '1'; });
  toggleBtn.addEventListener('mouseleave', function() { toggleBtn.style.opacity = '0.45'; });
  toggleBtn.addEventListener('touchstart', function() { toggleBtn.style.opacity = '1'; });

  document.body.appendChild(panel);
  document.body.appendChild(toggleBtn);

  var logEl = panel.querySelector('#debug-log');
  var clearBtn = panel.querySelector('#debug-clear');

  toggleBtn.addEventListener('click', function() {
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
  });
  clearBtn.addEventListener('click', function() {
    logEl.innerHTML = '';
  });

  function writeLine(color, prefix, args) {
    var line = document.createElement('div');
    line.style.color = color;
    line.style.marginBottom = '2px';
    var text = Array.prototype.slice.call(args).map(function(a) {
      if (a instanceof Error) {
        return '[Error] ' + a.message + (a.stack ? ' | ' + a.stack.split('\n')[1] : '');
      }
      if (typeof a === 'object' && a !== null) {
        try {
          var str = JSON.stringify(a);
          return str === '{}' ? '[Object ' + (a.constructor ? a.constructor.name : 'unknown') + ']' : str;
        } catch (e) { return String(a); }
      }
      return String(a);
    }).join(' ');
    line.textContent = prefix + ' ' + text;
    logEl.appendChild(line);
    logEl.scrollTop = logEl.scrollHeight;
  }

  var origLog = console.log, origError = console.error, origWarn = console.warn;
  console.log = function() { writeLine('#0f0', '[log]', arguments); origLog.apply(console, arguments); };
  console.error = function() { writeLine('#f55', '[ERR]', arguments); origError.apply(console, arguments); };
  console.warn = function() { writeLine('#fc0', '[WRN]', arguments); origWarn.apply(console, arguments); };

  window.addEventListener('error', function(e) {
    writeLine('#f55', '[GLOBAL-ERR]', [e.message, e.filename + ':' + e.lineno]);
  });
  window.addEventListener('unhandledrejection', function(e) {
    writeLine('#f55', '[PROMISE-ERR]', [String(e.reason)]);
  });

  writeLine('#0ff', '[dbg]', ['Debug panel ativo.']);
})();
