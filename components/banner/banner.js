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

  let selectedPlan = 'annual';

  const backdrop = el('div', 'renew-modal-backdrop');
  const modal = el('div', 'renew-modal');

  const closeBtn = el('button', 'renew-modal__close', '\u2715');
  closeBtn.addEventListener('click', closeRenewModal);
  modal.appendChild(closeBtn);

  modal.appendChild(el('div', 'renew-modal__brand', 'LUMIÈRE'));
  modal.appendChild(el('h2', 'renew-modal__title', 'Renovação da Subscrição'));
  modal.appendChild(el('p', 'renew-modal__subtitle', 'Continue a transformar os seus dias em grandes conquistas. Escolha o plano que melhor se adapta a si.'));

  const plansContainer = el('div', 'renew-plans');

  const planAnnual = el('div', 'renew-plan is-active');
  planAnnual.dataset.plan = 'annual';
  planAnnual.appendChild(el('div', 'renew-plan__badge', 'Mais vantajoso'));
  planAnnual.appendChild(el('div', 'renew-plan__check'));
  planAnnual.appendChild(el('span', 'renew-plan__icon', '\u{1F451}'));
  planAnnual.appendChild(el('div', 'renew-plan__title', 'Plano Anual'));
  planAnnual.appendChild(el('div', 'renew-plan__desc', '12 meses de acesso completo'));
  planAnnual.appendChild(el('div', 'renew-plan__price', '1.090 MT'));
  planAnnual.appendChild(el('div', 'renew-plan__save', 'Poupe 218 MT por ano'));
  plansContainer.appendChild(planAnnual);

  const planMonthly = el('div', 'renew-plan');
  planMonthly.dataset.plan = 'monthly';
  planMonthly.appendChild(el('div', 'renew-plan__check'));
  planMonthly.appendChild(el('span', 'renew-plan__icon', '\u{1F4C5}'));
  planMonthly.appendChild(el('div', 'renew-plan__title', 'Plano Mensal'));
  planMonthly.appendChild(el('div', 'renew-plan__desc', '30 dias de acesso completo'));
  planMonthly.appendChild(el('div', 'renew-plan__price', '109 MT'));
  planMonthly.appendChild(el('div', 'renew-plan__save', 'Mais flexibilidade'));
  plansContainer.appendChild(planMonthly);

  modal.appendChild(plansContainer);

  const selectPlan = (planEl, planKey) => {
    selectedPlan = planKey;
    planAnnual.classList.remove('is-active');
    planMonthly.classList.remove('is-active');
    planEl.classList.add('is-active');
  };

  planAnnual.addEventListener('click', () => selectPlan(planAnnual, 'annual'));
  planMonthly.addEventListener('click', () => selectPlan(planMonthly, 'monthly'));

  const divider = el('div', 'renew-divider');
  divider.appendChild(el('span', null, '\u2726'));
  modal.appendChild(divider);

  const features = el('div', 'renew-features');
  
  const feat1 = el('div', 'renew-feature');
  feat1.appendChild(el('div', 'renew-feature__icon', '\u221E'));
  feat1.appendChild(el('div', 'renew-feature__title', 'Acesso aos 9 módulos'));
  feat1.appendChild(el('div', 'renew-feature__desc', 'Todos os seus módulos favoritos disponíveis.'));
  features.appendChild(feat1);

  const feat2 = el('div', 'renew-feature');
  feat2.appendChild(el('div', 'renew-feature__icon', '\u{1F6E1}'));
  feat2.appendChild(el('div', 'renew-feature__title', 'Os seus dados protegidos'));
  feat2.appendChild(el('div', 'renew-feature__desc', 'Segurança e privacidade em primeiro lugar.'));
  features.appendChild(feat2);

  const feat3 = el('div', 'renew-feature');
  feat3.appendChild(el('div', 'renew-feature__icon', '\u26A1'));
  feat3.appendChild(el('div', 'renew-feature__title', 'Atualizações'));
  feat3.appendChild(el('div', 'renew-feature__desc', 'Sempre uma versão melhor para si.'));
  features.appendChild(feat3);

  modal.appendChild(features);

  // Info de Pagamento
  const payInfo = el('div', 'renew-pay-info');
  payInfo.innerHTML = `
    <div class="renew-pay-info__header">
      <span>Dados para Pagamento</span>
      <span>\u{1F512} Pagamento manual</span>
    </div>
    <div class="renew-pay-info__row">
      <div class="renew-pay-info__left"><span class="renew-pay-info__icon">\u{1F4F1}</span> E-Mola</div>
      <div class="renew-pay-info__value">877 858 254</div>
      <div class="renew-pay-info__name">Nome:<br>Daniel Alfredo Daniel</div>
    </div>
    <div class="renew-pay-info__row">
      <div class="renew-pay-info__left"><span class="renew-pay-info__icon">\u{1F4F1}</span> M-Pesa</div>
      <div class="renew-pay-info__value">843 482 513</div>
      <div class="renew-pay-info__name">Nome:<br>Daniel Alfredo Daniel</div>
    </div>
  `;
  modal.appendChild(payInfo);

  // Botão WhatsApp
  const waBtn = el('button', 'renew-btn-wa');
  waBtn.innerHTML = '\u{1F4AC} Enviar comprovativo via WhatsApp';
  waBtn.addEventListener('click', () => {
    const user = getCurrentUser();
    const email = user && user.email ? user.email : 'N/A';
    const planName = selectedPlan === 'annual' ? 'Anual (1.090 MT)' : 'Mensal (109 MT)';
    const msg = 'Olá, quero renovar a minha subscrição Lumière.\nPlano escolhido: ' + planName + '\nO meu email é: ' + email;
    const url = 'https://wa.me/258834748955?text=' + encodeURIComponent(msg);
    window.open(url, '_blank');
  });
  modal.appendChild(waBtn);

  const footer = el('div', 'renew-footer');
  footer.innerHTML = '<span class="renew-footer-icon">\u{1F512}</span> O pagamento é verificado manualmente.<br>Envia o teu comprovativo e nós ativamos a tua subscrição o mais rápido possível.';
  modal.appendChild(footer);

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
