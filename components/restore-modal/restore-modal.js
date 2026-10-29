import { restoreData } from '../../core/backup.js';
import { eventBus } from '../../core/eventBus.js';

let _modalEl = null;

function el(tag, cls, txt) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (txt !== undefined) e.textContent = txt;
  return e;
}

function svgIcon(d, cls) {
  return `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  const months = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  return `${parseInt(d)} de ${months[parseInt(m)-1]} de ${y}`;
}

export function showRestoreModal(backup) {
  if (_modalEl) return;

  const backdrop = el('div', 'restore-modal-backdrop');
  const modal = el('div', 'restore-modal');

  // Ícone (SVG inline para não ter fundo)
  const iconWrap = el('div', 'restore-modal__icon-wrap');
  iconWrap.innerHTML = svgIcon(
    '<path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/><path d="M12 15V9"/><path d="m9 12 3 3 3-3"/>',
    'restore-modal__icon-svg'
  );
  modal.appendChild(iconWrap);

  // Título
  modal.appendChild(el('h2', 'restore-modal__title', 'RESTAURAR DADOS?'));

  // Divisor
  const divider = el('div', 'restore-modal__divider');
  divider.appendChild(el('span', null, '\u2726'));
  modal.appendChild(divider);

  // Informações
  const info = el('div', 'restore-modal__info');

  const row1 = el('div', 'restore-info-row');
  const row1Icon = el('span', 'restore-info-row__icon');
  row1Icon.innerHTML = svgIcon('<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>', 'restore-info-svg');
  row1.appendChild(row1Icon);
  row1.appendChild(el('span', null, 'Encontrámos um backup do dia ' + formatDate(backup.date) + '.'));
  info.appendChild(row1);

  const row2 = el('div', 'restore-info-row');
  const row2Icon = el('span', 'restore-info-row__icon');
  row2Icon.innerHTML = svgIcon('<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>', 'restore-info-svg');
  row2.appendChild(row2Icon);
  const totalRecords = backup.payload ? (backup.payload.totalRecords || 0) : 0;
  row2.appendChild(el('span', null, 'Contém ' + totalRecords + ' registos (tarefas, hábitos, etc).'));
  info.appendChild(row2);

  modal.appendChild(info);

  // Pergunta
  modal.appendChild(el('p', 'restore-modal__question', 'Desejas restaurar os teus dados agora?'));

  // Ações
  const actions = el('div', 'restore-modal__actions');

  const btnRestore = el('button', 'restore-btn restore-btn--primary', 'RESTAURAR');
  btnRestore.type = 'button';

  const btnIgnore = el('button', 'restore-btn restore-btn--ghost', 'IGNORAR');
  btnIgnore.type = 'button';

  actions.appendChild(btnRestore);
  actions.appendChild(btnIgnore);
  modal.appendChild(actions);

  // Aviso
  const warning = el('div', 'restore-modal__warning');
  warning.appendChild(el('span', 'restore-modal__warning-icon', '\u24D8')); // Info
  warning.appendChild(el('span', null, 'Ao restaurar, os dados atuais neste telemóvel serão substituídos pelo backup.'));
  modal.appendChild(warning);

  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);
  _modalEl = backdrop;

  // Handlers
  btnIgnore.addEventListener('click', () => {
    closeRestoreModal();
  });

  btnRestore.addEventListener('click', async () => {
    btnRestore.disabled = true;
    btnRestore.textContent = 'A RESTAURAR...';
    btnIgnore.disabled = true;

    let isSuccess = false;

    try {
      const result = await restoreData(backup.payload);

      if (result?.success === true) {
        isSuccess = true;
        const total = result.restoredCount || 0;
        const failed = result.failedCount || 0;

        closeRestoreModal();

        if (failed > 0) {
          try { eventBus.emit('toast:show', { type: 'success', text: `Dados restaurados! (${total} registados recuperados, ${failed} ignorados).` }); } catch (_) {}
        } else {
          try { eventBus.emit('toast:show', { type: 'success', text: 'Dados restaurados com sucesso!' }); } catch (_) {}
        }
        setTimeout(() => window.location.reload(), 1000);
      } else {
        // Falha tratada (success === false)
        const errorMsg = (result?.errors && result.errors.length > 0) ? result.errors[0] : 'O restauro não foi concluído. O ficheiro pode ser inválido ou incompatível.';
        try { eventBus.emit('toast:show', { type: 'error', text: errorMsg }); } catch (_) {}
      }
    } catch (err) {
      console.warn('[Restore UI] Ocorreu uma falha inesperada durante o processo de restauro.');
      try { eventBus.emit('toast:show', { type: 'error', text: 'Ocorreu um erro inesperado. Tenta novamente.' }); } catch (_) {}
    } finally {
      // Garante que os botões são reativados se NÃO houver sucesso
      if (!isSuccess) {
        btnRestore.textContent = 'ERRO. TENTAR NOVAMENTE';
        btnRestore.disabled = false;
        btnIgnore.disabled = false;
      }
    }
  });
}

function closeRestoreModal() {
  if (_modalEl && _modalEl.parentNode) {
    _modalEl.parentNode.removeChild(_modalEl);
    _modalEl = null;
  }
}
