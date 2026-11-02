export function showHelpWelcome(moduleName = 'Tarefas', onComplete, customText = {}) {
  const backdrop = document.createElement('div');
  backdrop.className = 'help-welcome-backdrop';

  
  
  const svgBotanico = `
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" class="hw-svg-botanico">
      <ellipse cx="50" cy="85" rx="15" ry="4" fill="var(--color-illustration-gold)" opacity="0.2"/>
      <path d="M50 85 C50 70, 45 60, 50 45 C55 30, 50 20, 50 15" stroke="var(--color-illustration-gold)" stroke-width="1.5" stroke-linecap="round"/>
      <path d="M50 65 C35 65, 30 50, 40 45 C45 50, 50 55, 50 65 Z" stroke="var(--color-illustration-gold)" stroke-width="1.5" stroke-linejoin="round"/>
      <path d="M50 55 C65 55, 70 40, 60 35 C55 40, 50 45, 50 55 Z" stroke="var(--color-illustration-gold)" stroke-width="1.5" stroke-linejoin="round"/>
      <path d="M50 35 C40 35, 35 25, 45 20 C48 25, 50 30, 50 35 Z" stroke="var(--color-illustration-gold)" stroke-width="1.5" stroke-linejoin="round"/>
      <path d="M50 25 C60 25, 65 15, 55 10 C52 15, 50 20, 50 25 Z" stroke="var(--color-illustration-gold)" stroke-width="1.5" stroke-linejoin="round"/>
      <circle cx="25" cy="40" r="1" fill="var(--color-illustration-gold)" opacity="0.6"/>
      <circle cx="75" cy="30" r="1" fill="var(--color-illustration-gold)" opacity="0.8"/>
      <circle cx="65" cy="70" r="1" fill="var(--color-illustration-gold)" opacity="0.5"/>
      <circle cx="30" cy="20" r="1" fill="var(--color-illustration-gold)" opacity="0.4"/>
    </svg>
  `;

  const modal = document.createElement('div');
  modal.className = 'help-welcome-modal';

  modal.innerHTML = `
    <button type="button" class="hw-close" id="hw-close-btn" aria-label="Fechar">✕</button>
    
    
    <div class="hw-image-plant">${svgBotanico}</div>
    
    <h2 class="hw-title">
      <span class="hw-title-line1">${customText.title || "Bem-vindo ao Módulo"}</span>
      <span class="hw-title-line2">${customText.title ? "" : moduleName}</span>
    </h2>
    
    <p class="hw-desc">${customText.subtitle || "Este é o teu espaço para organizar a tua vida. Vamos dar uma vista de olhos rápida pelas funcionalidades?"}</p>
    
    <div class="hw-actions">
      <button type="button" class="hw-btn hw-btn--primary" id="hw-start">
        Começar Orientação
      </button>
      <button type="button" class="hw-btn hw-btn--ghost" id="hw-skip">
        Agora não
      </button>
    </div>
  `;

  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);

  const close = () => {
    backdrop.classList.remove('is-active');
    setTimeout(() => backdrop.remove(), 300);
  };

  modal.querySelector('#hw-close-btn').addEventListener('click', close);
  
  modal.querySelector('#hw-start').addEventListener('click', () => {
    const cleanName = moduleName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    localStorage.setItem('lumiere_help_' + cleanName + '_seen', 'true');
    close();
    if (onComplete) onComplete();
  });

  modal.querySelector('#hw-skip').addEventListener('click', () => {
    const cleanName = moduleName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    localStorage.setItem('lumiere_help_' + cleanName + '_seen', 'true');
    close();
  });

  requestAnimationFrame(() => backdrop.classList.add('is-active'));
}
