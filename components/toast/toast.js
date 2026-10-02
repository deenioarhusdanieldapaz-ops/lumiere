/**
 * Toast Component
 * Caixa de notificação temporária no topo do ecrã.
 * NÃO conhece regras de negócio — recebe tipo + mensagem.
 *
 * Tipos: 'info' | 'success' | 'warning' | 'error'
 * Duração default: 4000ms
 */

const DEFAULT_DURATION = 4000;
const CONTAINER_ID = 'toast-container';

const ICONS = {
  info:    '\u2139\uFE0F',
  success: '\u2705',
  warning: '\u26A0\uFE0F',
  error:   '\u274C'
};

let _container = null;

function ensureContainer() {
  if (_container && document.body.contains(_container)) return _container;
  let el = document.getElementById(CONTAINER_ID);
  if (!el) {
    el = document.createElement('div');
    el.id = CONTAINER_ID;
    el.className = 'toast-container';
    el.setAttribute('role', 'region');
    el.setAttribute('aria-label', 'Notificações');
    el.setAttribute('aria-live', 'polite');
    document.body.appendChild(el);
  }
  _container = el;
  return el;
}

/**
 * Mostra um toast.
 * @param {Object} opts
 * @param {string} [opts.type='info'] - info | success | warning | error
 * @param {string} [opts.title] - Texto principal
 * @param {string} [opts.body] - Texto secundário (opcional)
 * @param {number} [opts.duration=4000] - Duração em ms
 * @returns {HTMLElement} elemento removível
 */
export function showToast({
  type = 'info',
  title = '',
  body = '',
  duration = DEFAULT_DURATION
} = {}) {
  if (!title && !body) return null;

  const container = ensureContainer();

  const toast = document.createElement('div');
  toast.className = 'toast toast--' + type;
  toast.setAttribute('role', 'status');

  // Ícone
  const icon = document.createElement('span');
  icon.className = 'toast__icon';
  icon.textContent = ICONS[type] || ICONS.info;
  icon.setAttribute('aria-hidden', 'true');
  toast.appendChild(icon);

  // Conteúdo
  const content = document.createElement('div');
  content.className = 'toast__content';

  if (title) {
    const t = document.createElement('div');
    t.className = 'toast__title';
    t.textContent = title;
    content.appendChild(t);
  }
  if (body) {
    const b = document.createElement('div');
    b.className = 'toast__body';
    b.textContent = body;
    content.appendChild(b);
  }
  toast.appendChild(content);

  // Botão fechar
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'toast__close';
  close.setAttribute('aria-label', 'Fechar notificação');
  close.textContent = '\u00D7';
  toast.appendChild(close);

  // Inserir no topo do container (novos por cima)
  container.insertBefore(toast, container.firstChild);

  // Animar entrada
  requestAnimationFrame(() => toast.classList.add('toast--visible'));

  // Auto-dismiss
  let timer = null;
  const dismiss = () => {
    if (timer) clearTimeout(timer);
    toast.classList.remove('toast--visible');
    toast.classList.add('toast--leaving');
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 300);
  };

  close.addEventListener('click', dismiss);

  // Pausa auto-dismiss se user interage
  toast.addEventListener('mouseenter', () => { if (timer) clearTimeout(timer); });
  toast.addEventListener('mouseleave', () => { timer = setTimeout(dismiss, 2000); });

  timer = setTimeout(dismiss, duration);

  return toast;
}

export default { showToast };
