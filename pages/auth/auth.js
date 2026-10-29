/**
 * pages/auth/auth.js — Ecrã de login/registo (modal).
 *
 * D5.2c: só UI. Botões fazem log, sem ligação a auth ainda.
 * D5.2d vai substituir os handlers para chamar core/auth.js.
 *
 * API pública:
 *   openLoginModal()
 *   closeLoginModal()
 *   isLoginModalOpen()
 */

import { signIn, signUp, sendPasswordReset } from '/core/auth.js';
import { eventBus } from '/core/eventBus.js';

const CSS_HREF = '/pages/auth/auth.css';
const HINTS_KEY = 'lumiere.loginHintsSeen';
const EMBLEM_SRC = '/pages/focus/assets/emblema-ciclo.webp';

let _overlay = null;
let _refs = null;
let _mode = 'login';

function el(tag, cls, txt) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (txt !== undefined) e.textContent = txt;
  return e;
}

function ensureStyles() {
  if (document.querySelector('link[href="' + CSS_HREF + '"]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = CSS_HREF;
  document.head.appendChild(link);
}

function hintsSeen() {
  try { return localStorage.getItem(HINTS_KEY) === '1'; }
  catch (_) { return false; }
}

function markHintsSeen() {
  try { localStorage.setItem(HINTS_KEY, '1'); } catch (_) {}
}

function buildHints() {
  const wrap = el('div', 'auth-hints');
  if (hintsSeen()) wrap.classList.add('is-hidden');
  const items = [
    { icon: '\u25CE', label: 'Mais foco no que importa' },
    { icon: '\u25A4', label: 'Melhores h\u00E1bitos' },
    { icon: '\u2740', label: 'Equil\u00EDbrio na tua vida' },
    { icon: '\u2726', label: 'Grandes conquistas' }
  ];
  for (const it of items) {
    const h = el('div', 'auth-hint');
    h.appendChild(el('span', 'auth-hint__icon', it.icon));
    h.appendChild(el('span', 'auth-hint__label', it.label));
    wrap.appendChild(h);
  }
  return wrap;
}

function buildModal() {
  const overlay = el('div', 'auth-overlay');
  const modal = el('div', 'auth-modal');

  // Fechar (X)
  const close = el('button', 'auth-close', '\u2715');
  close.type = 'button';
  close.setAttribute('aria-label', 'Fechar');
  modal.appendChild(close);

  // Skip (Continuar sem conta)
  const skip = el('button', 'auth-skip', '\u2190 Continuar sem conta');
  skip.type = 'button';
  modal.appendChild(skip);

  // Brand
  const brand = el('div', 'auth-brand');
  const emblem = document.createElement('img');
  emblem.className = 'auth-brand__emblem';
  emblem.src = EMBLEM_SRC;
  emblem.alt = '';
  brand.appendChild(emblem);
  brand.appendChild(el('h1', 'auth-brand__name', 'LUMI\u00C8RE'));
  brand.appendChild(el('div', 'auth-brand__tag', 'Life Manager'));
  modal.appendChild(brand);

  // Título + subtítulo
  const title = el('h2', 'auth-title', 'BEM-VINDO DE VOLTA');
  const subtitle = el('p', 'auth-subtitle', 'Entra na tua conta e continua a construir a vida que queres.');
  modal.appendChild(title);
  modal.appendChild(subtitle);

  // Erro inline
  const errorEl = el('p', 'auth-error', '');
  modal.appendChild(errorEl);

  // Email
  const emailField = el('div', 'auth-field');
  emailField.appendChild(el('span', 'auth-field__icon', '\u2709'));
  const emailInput = document.createElement('input');
  emailInput.type = 'email';
  emailInput.className = 'auth-field__input';
  emailInput.placeholder = 'Endere\u00E7o de e-mail';
  emailInput.autocomplete = 'email';
  emailField.appendChild(emailInput);
  modal.appendChild(emailField);

  // Password
  const passField = el('div', 'auth-field');
  passField.appendChild(el('span', 'auth-field__icon', '\u{1F512}'));
  const passInput = document.createElement('input');
  passInput.type = 'password';
  passInput.className = 'auth-field__input';
  passInput.placeholder = 'Palavra-passe';
  passInput.autocomplete = 'current-password';
  passField.appendChild(passInput);
  const togglePw = el('button', 'auth-field__toggle', '\u{1F441}');
  togglePw.type = 'button';
  togglePw.setAttribute('aria-label', 'Mostrar palavra-passe');
  passField.appendChild(togglePw);
  modal.appendChild(passField);

  // Confirmar password (escondido por defeito, só aparece no modo registo)
  const confirmField = el('div', 'auth-field is-hidden');
  confirmField.appendChild(el('span', 'auth-field__icon', '\u{1F512}'));
  const confirmInput = document.createElement('input');
  confirmInput.type = 'password';
  confirmInput.className = 'auth-field__input';
  confirmInput.placeholder = 'Confirmar palavra-passe';
  confirmInput.autocomplete = 'new-password';
  confirmField.appendChild(confirmInput);
  modal.appendChild(confirmField);

  // Botões
  const btnPrimary = el('button', 'auth-btn auth-btn--primary', 'ENTRAR');
  btnPrimary.type = 'button';
  const btnGhost = el('button', 'auth-btn auth-btn--ghost', 'CRIAR CONTA');
  btnGhost.type = 'button';
  const btnReset = el('button', 'auth-link', 'Esqueci-me da password');
  btnReset.type = 'button';
  modal.appendChild(btnPrimary);
  modal.appendChild(btnGhost);
  modal.appendChild(btnReset);

  // Footer
  const footer = el('div', 'auth-footer');
  footer.innerHTML = 'Ao entrar, aceitas os <a href="#" onclick="return false;">Termos</a> e a <a href="#" onclick="return false;">Pol\u00EDtica de Privacidade</a>';
  modal.appendChild(footer);

  // Hints
  const hints = buildHints();
  modal.appendChild(hints);

  overlay.appendChild(modal);

  return { overlay, close, skip, title, subtitle, errorEl, emailInput, passInput, confirmField, confirmInput, togglePw, btnPrimary, btnGhost, btnReset, hints };
}

/* ---------- Helpers de submissão ---------- */

function mapFirebaseError(errorString) {
  if (!errorString) return 'Ocorreu um erro. Tenta novamente.';
  const err = String(errorString).toLowerCase();

  if (err.includes('invalid-email') || err.includes('missing-email')) return 'Email inválido.';
  if (err.includes('user-not-found') || err.includes('wrong-password') || err.includes('invalid-credential') || err.includes('invalid-login-credentials')) return 'Email ou palavra-passe incorretos.';
  if (err.includes('email-already-in-use')) return 'Este email já está registado. Tenta entrar.';
  if (err.includes('weak-password')) return 'A palavra-passe deve ter pelo menos 6 caracteres.';
  if (err.includes('too-many-requests')) return 'Demasiadas tentativas. Tenta mais tarde.';
  if (err.includes('network-request-failed')) return 'Sem ligação à internet.';
  if (err.includes('operation-not-allowed')) return 'Login por email não está ativo.';

  return 'Ocorreu um erro. Tenta novamente.';
}

function setLoading(on, primaryText, ghostText) {
  const r = _refs;
  if (!r) return;
  r.btnPrimary.disabled = on;
  r.btnGhost.disabled = on;
  r.btnReset.disabled = on;
  r.emailInput.disabled = on;
  r.passInput.disabled = on;
  r.confirmInput.disabled = on;
  if (on) {
    r.btnPrimary.dataset.orig = r.btnPrimary.textContent;
    r.btnPrimary.textContent = primaryText;
    if (ghostText) {
      r.btnGhost.dataset.orig = r.btnGhost.textContent;
      r.btnGhost.textContent = ghostText;
    }
  } else {
    if (r.btnPrimary.dataset.orig) {
      r.btnPrimary.textContent = r.btnPrimary.dataset.orig;
      delete r.btnPrimary.dataset.orig;
    }
    if (r.btnGhost.dataset.orig) {
      r.btnGhost.textContent = r.btnGhost.dataset.orig;
      delete r.btnGhost.dataset.orig;
    }
  }
}

function showError(msg) {
  if (_refs && _refs.errorEl) _refs.errorEl.textContent = msg || '';
}

function toast(msg) {
  try { eventBus.emit('toast:show', { type: 'success', text: msg }); } catch (_) {}
}

/* ---------- Modo (login / signup) ---------- */

function setMode(mode) {
  if (mode !== 'login' && mode !== 'signup') return;
  _mode = mode;
  const r = _refs;
  if (!r) return;

  if (mode === 'login') {
    r.title.textContent = 'BEM-VINDO DE VOLTA';
    r.subtitle.textContent = 'Entra na tua conta e continua a construir a vida que queres.';
    r.btnPrimary.textContent = 'ENTRAR';
    r.btnGhost.textContent = 'CRIAR CONTA';
    r.btnReset.style.display = '';
    r.confirmField.classList.add('is-hidden');
    r.passInput.autocomplete = 'current-password';
    r.passInput.value = '';
    r.confirmInput.value = '';
  } else {
    r.title.textContent = 'CRIAR CONTA';
    r.subtitle.textContent = 'Cria uma conta para acompanhar o teu progresso em qualquer dispositivo.';
    r.btnPrimary.textContent = 'REGISTAR';
    r.btnGhost.textContent = 'J\u00C1 TENHO CONTA';
    r.btnReset.style.display = 'none';
    r.confirmField.classList.remove('is-hidden');
    r.passInput.autocomplete = 'new-password';
    r.passInput.value = '';
    r.confirmInput.value = '';
  }

  r.errorEl.textContent = '';
  console.log('[Auth UI] modo:', mode);
}

/* ---------- Handlers ---------- */

function wireHandlers() {
  const r = _refs;

  r.close.addEventListener('click', () => closeLoginModal());
  r.skip.addEventListener('click', () => closeLoginModal());

  r.overlay.addEventListener('click', (e) => {
    if (e.target === r.overlay) closeLoginModal();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isLoginModalOpen()) closeLoginModal();
  });

  r.togglePw.addEventListener('click', () => {
    const isPw = r.passInput.type === 'password';
    r.passInput.type = isPw ? 'text' : 'password';
    r.togglePw.textContent = isPw ? '\u{1F576}' : '\u{1F441}';
  });

  r.btnPrimary.addEventListener('click', async () => {
    const email = r.emailInput.value.trim();
    const password = r.passInput.value;
    showError('');

    if (!email) { showError('Escreve o teu email.'); return; }
    if (!password) { showError('Escreve a tua palavra-passe.'); return; }

    if (_mode === 'signup') {
      if (password.length < 6) { showError('A palavra-passe deve ter pelo menos 6 caracteres.'); return; }
      if (password !== r.confirmInput.value) { showError('As palavras-passe não coincidem.'); return; }
      setLoading(true, 'A criar...', '');
      const res = await signUp(email, password);
      setLoading(false);
      if (res.ok) {
        closeLoginModal();
        toast('Conta criada. Bem-vindo!');
      } else {
        showError(mapFirebaseError(res.error));
      }
      return;
    }

    setLoading(true, 'A entrar...', '');
    const res = await signIn(email, password);
    setLoading(false);
    if (res.ok) {
      closeLoginModal();
      toast('Sessão iniciada.');
    } else {
      showError(mapFirebaseError(res.error));
    }
  });

  r.btnGhost.addEventListener('click', () => {
    setMode(_mode === 'login' ? 'signup' : 'login');
  });

  r.btnReset.addEventListener('click', async () => {
    const email = r.emailInput.value.trim();
    showError('');
    if (!email) { showError('Escreve o teu email primeiro.'); return; }
    r.btnPrimary.disabled = true;
    r.btnGhost.disabled = true;
    r.btnReset.disabled = true;
    r.btnReset.textContent = 'A enviar...';
    const res = await sendPasswordReset(email);
    r.btnPrimary.disabled = false;
    r.btnGhost.disabled = false;
    r.btnReset.disabled = false;
    r.btnReset.textContent = 'Esqueci-me da password';
    if (res.ok) {
      toast('Email de recuperação enviado.');
      showError('');
    } else {
      showError(mapFirebaseError(res.error));
    }
  });
}

/* ---------- API pública ---------- */

export function isLoginModalOpen() {
  return _overlay && _overlay.classList.contains('is-open');
}

export function openLoginModal() {
  ensureStyles();
  if (!_overlay) {
    const built = buildModal();
    _refs = built;
    _overlay = built.overlay;
    document.body.appendChild(_overlay);
    wireHandlers();
    setMode('login');
  }
  _overlay.classList.add('is-open');
  // Marcar hints como vistos depois de fechar
}

export function closeLoginModal() {
  if (!_overlay) return;
  _overlay.classList.remove('is-open');
  markHintsSeen();
}

export default { openLoginModal, closeLoginModal, isLoginModalOpen };
