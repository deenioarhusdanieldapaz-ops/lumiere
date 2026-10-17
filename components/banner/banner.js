/**
 * components/banner/banner.js
 * Gere o banner de Trial Expirado e o mini-modal de renovação.
 */

import { eventBus } from '../../core/eventBus.js';
import { getCurrentUser } from '../../core/auth.js';

let _bannerEl = null;
let _modalEl = null;

function el(tag, cls, txt) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (txt !== undefined) e.textContent = txt;
  return e;
}

function copyToClipboard(text, btn) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      const original = btn.textContent;
      btn.textContent = 'Copiado!';
      setTimeout(() => btn.textContent = original, 2000);
    }).catch(err => console.warn('Falha ao copiar:', err));
  } else {
    alert('Número: ' + text);
  }
}

function openRenewModal() {
  if (_modalEl) return;

  const backdrop = el('div', 'renew-modal-backdrop');
  const modal = el('div', 'renew-modal');

  const closeBtn = el('button', 'renew-modal__close', '\u2715');
  closeBtn.addEventListener('click', closeRenewModal);
  modal.appendChild(closeBtn);

  modal.appendChild(el('h2', 'renew-modal__title', 'RENOVAR LUMIÈRE'));
  modal.appendChild(el('p', 'renew-modal__subtitle', 'Escolhe um número, faz o pagamento e envia o comprovativo no WhatsApp.'));

  const options = el('div', 'renew-modal__options');

  // E-Mola
  const emola = el('div', 'renew-option');
  const emolaInfo = el('div', 'renew-option__info');
  emolaInfo.appendChild(el('span', 'renew-option__label', 'E-Mola'));
  emolaInfo.appendChild(el('span', 'renew-option__value', '877858254'));
  emolaInfo.appendChild(el('span', 'renew-option__name', 'Daniel Alfredo Daniel'));
  emola.appendChild(emolaInfo);
  const emolaBtn = el('button', 'renew-option__btn', 'Copiar');
  emolaBtn.addEventListener('click', () => copyToClipboard('877858254', emolaBtn));
  emola.appendChild(emolaBtn);
  options.appendChild(emola);

  // M-Pesa
  const mpesa = el('div', 'renew-option');
  const mpesaInfo = el('div', 'renew-option__info');
  mpesaInfo.appendChild(el('span', 'renew-option__label', 'M-Pesa'));
  mpesaInfo.appendChild(el('span', 'renew-option__value', '843482513'));
  mpesaInfo.appendChild(el('span', 'renew-option__name', 'Daniel Alfredo Daniel'));
  mpesa.appendChild(mpesaInfo);
  const mpesaBtn = el('button', 'renew-option__btn', 'Copiar');
  mpesaBtn.addEventListener('click', () => copyToClipboard('843482513', mpesaBtn));
  mpesa.appendChild(mpesaBtn);
  options.appendChild(mpesa);

  modal.appendChild(options);

  const waBtn = el('button', 'renew-modal__whatsapp', 'Enviar comprovativo via WhatsApp');
  waBtn.addEventListener('click', () => {
    const user = getCurrentUser();
    const email = user && user.email ? user.email : 'N/A';
    const msg = 'Olá, quero renovar a minha subscrição Lumière. O meu email é: ' + email;
    const url = 'https://wa.me/258834748955?text=' + encodeURIComponent(msg);
    window.open(url, '_blank');
  });
  modal.appendChild(waBtn);

  backdrop.appendChild(modal);
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) closeRenewModal();
  });

  document.body.appendChild(backdrop);
  _modalEl = backdrop;
}

function closeRenewModal() {
  if (_modalEl && _modalEl.parentNode) {
    _modalEl.parentNode.removeChild(_modalEl);
    _modalEl = null;
  }
}

function buildBanner() {
  const banner = el('div', 'trial-banner');

  const left = el('div', 'trial-banner__left');
  left.appendChild(el('span', 'trial-banner__icon', '\u{1F512}')); // Cadeado

  const text = el('div', 'trial-banner__text');
  text.appendChild(el('span', 'trial-banner__title', 'O teu trial expirou'));
  text.appendChild(el('span', 'trial-banner__subtitle', 'Renova para criar e editar.'));
  left.appendChild(text);

  banner.appendChild(left);

  const btn = el('button', 'trial-banner__btn', 'Renovar');
  btn.addEventListener('click', openRenewModal);
  banner.appendChild(btn);

  return banner;
}

export function showTrialExpiredBanner() {
  if (_bannerEl) return;

  const appMain = document.querySelector('.app-main');
  const content = document.getElementById('content');
  
  if (!appMain || !content) return;

  _bannerEl = buildBanner();
  appMain.insertBefore(_bannerEl, content);
}

export function hideTrialExpiredBanner() {
  if (_bannerEl && _bannerEl.parentNode) {
    _bannerEl.parentNode.removeChild(_bannerEl);
    _bannerEl = null;
  }
  closeRenewModal();
}

export function initBanner() {
  eventBus.on('auth:changed', (payload) => {
    if (payload && payload.hasAccess === false) {
      showTrialExpiredBanner();
    } else {
      hideTrialExpiredBanner();
    }
  });

  // Verificação inicial (caso a app já arranque com trial expirado)
  import('../../core/auth.js').then(m => {
    if (m.getCurrentUser() && !m.hasActiveAccess()) {
      showTrialExpiredBanner();
    }
  });
}
