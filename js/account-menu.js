/**
 * js/account-menu.js — Menu de conta do avatar (topbar).
 *
 * Comportamento:
 *   - Não logado: clicar no avatar abre o modal de login.
 *   - Logado: clicar no avatar abre um dropdown com email + "Sair".
 *
 * Reage a auth:changed para atualizar o avatar.
 */

import { openLoginModal } from '../pages/auth/auth.js';
import { signOut, getCurrentUser, onAuthChange } from '../core/auth.js';
import { eventBus } from '../core/eventBus.js';

const CSS_HREF = '/CSS/account-menu.css';

let _dropdown = null;
let _refs = null;
let _isOpen = false;

function ensureStyles() {
  if (document.querySelector('link[href="' + CSS_HREF + '"]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = CSS_HREF;
  document.head.appendChild(link);
}

function el(tag, cls, txt) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (txt !== undefined) e.textContent = txt;
  return e;
}

function buildDropdown() {
  const dd = el('div', 'account-menu');

  const emailWrap = el('div', 'account-menu__email');
  emailWrap.appendChild(el('span', 'account-menu__email-label', 'Sessão'));
  const emailText = el('span', 'account-menu__email-text', '');
  emailWrap.appendChild(emailText);
  dd.appendChild(emailWrap);

  const btnSignOut = el('button', 'account-menu__item account-menu__item--danger', 'Sair');
  btnSignOut.type = 'button';
  dd.appendChild(btnSignOut);

  return { dd, emailText, btnSignOut };
}

function closeDropdown() {
  if (!_dropdown) return;
  _dropdown.classList.remove('is-open');
  _isOpen = false;
}

function openDropdown() {
  if (!_dropdown) return;
  const user = getCurrentUser();
  if (!user) {
    openLoginModal();
    return;
  }
  _refs.emailText.textContent = user.email || '(sem email)';
  _dropdown.classList.add('is-open');
  _isOpen = true;
}

function updateAvatar() {
  const user = getCurrentUser();
  const avatarEl = document.getElementById('topbar-avatar');
  const nameEl = document.getElementById('topbar-user-name');
  if (!avatarEl) return;

  if (user) {
    const email = user.email || '';
    const local = email.split('@')[0] || '';
    const parts = local.split(/[.\-_]/).filter(Boolean);
    let initials = 'U';
    if (parts.length >= 2) {
      initials = (parts[0][0] + parts[1][0]).toUpperCase();
    } else if (parts.length === 1 && parts[0].length >= 2) {
      initials = parts[0].substring(0, 2).toUpperCase();
    } else if (parts.length === 1) {
      initials = parts[0][0].toUpperCase();
    }
    avatarEl.textContent = initials;
    if (nameEl) nameEl.textContent = local;
  }
  // Se não logado, deixa o avatar como está (o app.js já populou)
}

export function initAccountMenu() {
  ensureStyles();
  const topbarUser = document.getElementById('topbar-user');
  if (!topbarUser) {
    console.warn('[AccountMenu] #topbar-user não encontrado');
    return;
  }

  // Construir dropdown e anexar ao topbarUser (position relative no CSS)
  const built = buildDropdown();
  _dropdown = built.dd;
  _refs = built;
  topbarUser.appendChild(_dropdown);

  // Handler do avatar — substitui o comportamento padrão (navegar para profile)
  const avatarClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (_isOpen) {
      closeDropdown();
    } else {
      openDropdown();
    }
  };
  topbarUser.addEventListener('click', avatarClick);

  // Handler do botão Sair
  built.btnSignOut.addEventListener('click', async (e) => {
    e.stopPropagation();
    closeDropdown();
    const res = await signOut();
    if (res.ok) {
      try { eventBus.emit('toast:show', { type: 'success', text: 'Sessão terminada.' }); } catch (_) {}
    } else {
      try { eventBus.emit('toast:show', { type: 'error', text: 'Erro ao terminar sessão.' }); } catch (_) {}
    }
  });

  // Fechar ao clicar fora
  document.addEventListener('click', (e) => {
    if (!_isOpen) return;
    if (_dropdown.contains(e.target)) return;
    if (topbarUser.contains(e.target)) return;
    closeDropdown();
  });

  // Fechar com Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && _isOpen) closeDropdown();
  });

  // Reagir a mudanças de auth
  eventBus.on('auth:changed', () => {
    updateAvatar();
    closeDropdown();
  });

  // Estado inicial
  updateAvatar();
  console.log('[AccountMenu] inicializado');
}

export default { initAccountMenu };
