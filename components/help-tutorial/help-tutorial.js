export function showHelpTutorial(steps, onComplete) {
  if (!steps || steps.length === 0) return;

  let currentStep = 0;
  const backdrop = document.createElement('div');
  backdrop.className = 'help-tutorial-backdrop';

  const tooltip = document.createElement('div');
  tooltip.className = 'help-tutorial-tooltip';

  document.body.appendChild(backdrop);
  document.body.appendChild(tooltip);

  const spotlight = document.createElement('div');
  spotlight.className = 'help-tutorial-spotlight';
  document.body.appendChild(spotlight);

  function renderStep() {
    const step = steps[currentStep];
    const targetEl = document.querySelector(step.target);

    if (!targetEl) {
      // FALLBACK: Se o alvo não existe (ex: lista vazia, botões escondidos)
      // Esconde o holofote e centra o balão no ecrã.
      spotlight.style.display = 'none';
      tooltip.style.top = '50%';
      tooltip.style.left = '50%';
      tooltip.style.transform = 'translate(-50%, -50%)';
    } else {
      // Alvo encontrado. Destaca e posiciona o balão.
      spotlight.style.display = 'block';
      tooltip.style.transform = 'none';
      
      const rect = targetEl.getBoundingClientRect();
      spotlight.style.top = `${rect.top - 8}px`;
      spotlight.style.left = `${rect.left - 8}px`;
      spotlight.style.width = `${rect.width + 16}px`;
      spotlight.style.height = `${rect.height + 16}px`;

      const tooltipTop = rect.bottom + 20;
      const tooltipLeft = Math.max(16, Math.min(window.innerWidth - 300 - 16, rect.left));
      tooltip.style.top = `${tooltipTop}px`;
      tooltip.style.left = `${tooltipLeft}px`;
    }

    const isLastStep = currentStep === steps.length - 1;
    tooltip.innerHTML = `
      <div class="tut-step-indicator">Passo ${currentStep + 1} de ${steps.length}</div>
      <h4 class="tut-title">${step.title}</h4>
      <p class="tut-desc">${step.text}</p>
      <div class="tut-actions">
        <button type="button" class="tut-btn tut-btn--skip" id="tut-skip">Saltar</button>
        <div class="tut-nav">
          ${currentStep > 0 ? '<button type="button" class="tut-btn tut-btn--prev" id="tut-prev">Anterior</button>' : ''}
          <button type="button" class="tut-btn tut-btn--next" id="tut-next">${isLastStep ? 'Concluir' : 'Seguinte'}</button>
        </div>
      </div>
    `;

    tooltip.querySelector('#tut-skip').addEventListener('click', close);
    
    const btnNext = tooltip.querySelector('#tut-next');
    btnNext.addEventListener('click', () => {
      if (isLastStep) {
        close();
        if (onComplete) onComplete();
      } else {
        currentStep++;
        renderStep();
      }
    });

    const btnPrev = tooltip.querySelector('#tut-prev');
    if (btnPrev) {
      btnPrev.addEventListener('click', () => {
        currentStep--;
        renderStep();
      });
    }
  }

  function close() {
    backdrop.remove();
    tooltip.remove();
    spotlight.remove();
  }

  requestAnimationFrame(() => {
    backdrop.classList.add('is-active');
    renderStep();
  });
}
