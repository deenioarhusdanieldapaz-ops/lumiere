export function showDeleteModal({ 
  onConfirm,
  title = 'Eliminação de Todos os Dados',
  description = 'Esta ação irá eliminar permanentemente todos os dados da sua conta, incluindo: perfil, projetos, ficheiros, configurações e histórico. Esta ação não pode ser desfeita.',
  confirmWord = 'APAGAR',
  actionLabel = 'Eliminar Tudo',
  isDanger = true
} = {}) {
  const backdrop = document.createElement('div');
  backdrop.className = 'delete-modal-backdrop';

  const modal = document.createElement('div');
  modal.className = 'delete-modal';

  // Estado 1 & 2: Normal e Validação
  const contentNormal = document.createElement('div');
  contentNormal.className = 'delete-modal__content';
  
  contentNormal.innerHTML = `
    <div class="delete-modal__icon-wrap">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
    </div>
    <h2 class="delete-modal__title">${title}</h2>
    <p class="delete-modal__desc">${description}</p>
    
    <div class="delete-modal__warning">
      <span>Para continuar, escreva exatamente a palavra: <strong>${confirmWord}</strong></span>
    </div>
    
    <input type="text" class="delete-modal__input" id="delete-confirm-input" placeholder="Escreva ${confirmWord} aqui..." autocomplete="off">
    
    <div class="delete-modal__actions">
      <button type="button" class="delete-modal__btn delete-modal__btn--cancel">Cancelar</button>
      <button type="button" class="delete-modal__btn delete-modal__btn--delete" id="delete-confirm-btn" disabled>${actionLabel}</button>
    </div>
  `;

  // Estado 3: Processamento
  const contentProcessing = document.createElement('div');
  contentProcessing.className = 'delete-modal__content delete-modal__content--processing';
  contentProcessing.style.display = 'none';
  contentProcessing.innerHTML = `
    <div class="delete-modal__icon-wrap delete-modal__icon-wrap--spinner">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M12 2a10 10 0 0 1 10 10"></path></svg>
    </div>
    <h2 class="delete-modal__title">A eliminar dados...</h2>
    <p class="delete-modal__desc">A sua conta está a ser eliminada. Isto pode demorar alguns minutos.</p>
    <div class="delete-modal__progress-bar"><div class="delete-modal__progress-fill"></div></div>
  `;

  // Estado 4: Erro
  const contentError = document.createElement('div');
  contentError.className = 'delete-modal__content delete-modal__content--error';
  contentError.style.display = 'none';
  contentError.innerHTML = `
    <div class="delete-modal__icon-wrap delete-modal__icon-wrap--error">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
    </div>
    <h2 class="delete-modal__title">Erro na eliminação</h2>
    <p class="delete-modal__desc" id="delete-error-msg">Ocorreu um erro ao tentar eliminar os dados. Por favor, tente novamente.</p>
    <div class="delete-modal__actions">
      <button type="button" class="delete-modal__btn delete-modal__btn--cancel" id="delete-btn-retry">Tentar novamente</button>
      <button type="button" class="delete-modal__btn delete-modal__btn--ghost" id="delete-btn-close-error">Cancelar</button>
    </div>
  `;

  modal.appendChild(contentNormal);
  modal.appendChild(contentProcessing);
  modal.appendChild(contentError);
  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);

  // Lógica
  const input = contentNormal.querySelector('#delete-confirm-input');
  const btnDelete = contentNormal.querySelector('#delete-confirm-btn');
  const btnCancel = contentNormal.querySelector('.delete-modal__btn--cancel');

  const closeModal = () => {
    backdrop.classList.remove('is-active');
    setTimeout(() => backdrop.remove(), 300);
  };

  // Validação em tempo real
  input.addEventListener('input', (e) => {
    if (e.target.value === confirmWord) {
      btnDelete.disabled = false;
      input.classList.add('is-valid');
    } else {
      btnDelete.disabled = true;
      input.classList.remove('is-valid');
    }
  });

  btnCancel.addEventListener('click', closeModal);

  // Ação de Eliminar
  btnDelete.addEventListener('click', async () => {
    if (input.value !== confirmWord) return;

    contentNormal.style.display = 'none';
    contentProcessing.style.display = 'flex';

    try {
      // Chama a função segura do Engenheiro 3
      await onConfirm();
      closeModal();
      // O reload é feito pela própria função handleWipeAll se tiver sucesso
    } catch (err) {
      contentProcessing.style.display = 'none';
      contentError.style.display = 'flex';
      contentError.querySelector('#delete-error-msg').textContent = err.message || 'Ocorreu um erro desconhecido.';
    }
  });

  // Ações de Erro
  contentError.querySelector('#delete-btn-retry').addEventListener('click', () => {
    contentError.style.display = 'none';
    contentNormal.style.display = 'flex';
  });
  contentError.querySelector('#delete-btn-close-error').addEventListener('click', closeModal);

  // Animação de entrada
  requestAnimationFrame(() => backdrop.classList.add('is-active'));
}
