/**
 * Módulo Perfil — Lumière Life Manager
 * Abre no #content quando se clica em Perfil (sidebar footer ou topbar user).
 * Guarda dados em IndexedDB (coleção userProfile) + espelha nome em localStorage.
 */

import { dataManager } from '../../core/dataManager.js';
import { eventBus } from '../../core/eventBus.js';

let _state = {
  profile: null,
  saving: false,
  photoDataUrl: null
};

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  })[c]);
}

async function loadOrCreateProfile() {
  try {
    const list = await dataManager.list('userProfiles');
    if (Array.isArray(list) && list.length > 0) {
      // Preferir o que tem avatar; senão, o mais recente
      const withAvatar = list.find(p => p && p.avatar);
      if (withAvatar) return withAvatar;
      list.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
      return list[0];
    }
  } catch (err) {
    console.warn('[Profile] Erro ao listar perfis:', err);
  }
  const name = localStorage.getItem('lumiereUserName') || '';
  const created = await dataManager.create('userProfiles', { name });
  return created;
}

function render(container) {
  const p = _state.profile || {};
  const avatarSrc = _state.photoDataUrl || p.avatar || '';
  const initials = computeInitials(p.name || 'Utilizador');

  container.innerHTML = `
    <section class="profile">
      <header class="profile__header">
        <button class="profile__back" type="button" id="profile-back" aria-label="Voltar">←</button>
        <h1 class="profile__title">Perfil</h1>
      </header>

      <div class="profile__avatar-wrap">
        <div class="profile__avatar" id="profile-avatar-preview">
          ${avatarSrc
            ? `<img src="${escapeHtml(avatarSrc)}" alt="" class="profile__avatar-img">`
            : `<span class="profile__avatar-initials">${escapeHtml(initials)}</span>`}
        </div>
        <label class="profile__avatar-btn" for="profile-avatar-input">
          Alterar foto
          <input type="file" id="profile-avatar-input" accept="image/*" hidden>
        </label>
        ${avatarSrc ? `<button class="profile__avatar-remove" type="button" id="profile-avatar-remove">Remover foto</button>` : ''}
      </div>

      <form class="profile__form" id="profile-form">
        <label class="profile__label">
          Nome
          <input type="text" id="profile-name" class="profile__input" value="${escapeHtml(p.name || '')}" required>
        </label>

        <label class="profile__label">
          Email
          <input type="email" id="profile-email" class="profile__input" value="${escapeHtml(p.email || '')}" placeholder="(opcional)">
        </label>

        <label class="profile__label">
          Bio
          <textarea id="profile-bio" class="profile__input profile__input--textarea" rows="3" placeholder="(opcional)">${escapeHtml(p.bio || '')}</textarea>
        </label>

        <div class="profile__actions">
          <button type="submit" class="profile__btn profile__btn--primary" id="profile-save" ${_state.saving ? 'disabled' : ''}>
            ${_state.saving ? 'A guardar...' : 'Guardar'}
          </button>
        </div>

        <p class="profile__status" id="profile-status" hidden></p>
      </form>
    </section>
  `;

  attachHandlers(container);
}

function computeInitials(name) {
  const parts = String(name || '').trim().split(/\s+/);
  if (!parts[0]) return 'U';
  if (parts.length > 1) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return parts[0].substring(0, 2).toUpperCase();
}

function attachHandlers(container) {
  // Voltar
  const back = container.querySelector('#profile-back');
  if (back) back.addEventListener('click', () => {
    eventBus.emit('navigation:changed', { page: 'dashboard' });
  });

  // Foto — input
  const fileInput = container.querySelector('#profile-avatar-input');
  if (fileInput) fileInput.addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showStatus('Só imagens são permitidas.', 'error');
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      showStatus('Máximo 50 MB.', 'error');
      return;
    }
    // Ler, redimensionar para 512x512, comprimir como JPEG
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const SIZE = 512;
        const canvas = document.createElement('canvas');
        canvas.width = SIZE;
        canvas.height = SIZE;
        const ctx = canvas.getContext('2d');
        // Cobrir o quadrado (recorte centrado)
        const min = Math.min(img.width, img.height);
        const sx = (img.width  - min) / 2;
        const sy = (img.height - min) / 2;
        ctx.drawImage(img, sx, sy, min, min, 0, 0, SIZE, SIZE);
        _state.photoDataUrl = canvas.toDataURL('image/jpeg', 0.85);
        render(container);
        showStatus('Foto carregada. Clica em Guardar.', 'info');
      };
      img.onerror = () => showStatus('Erro ao ler a imagem.', 'error');
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });

  // Foto — remover
  const removeBtn = container.querySelector('#profile-avatar-remove');
  if (removeBtn) removeBtn.addEventListener('click', () => {
    _state.photoDataUrl = null;
    if (_state.profile) _state.profile.avatar = '';
    render(container);
    showStatus('Foto removida. Clica em Guardar.', 'info');
  });

  // Form submit
  const form = container.querySelector('#profile-form');
  if (form) form.addEventListener('submit', async (e) => {
    e.preventDefault();
    await save(container);
  });
}

function showStatus(text, kind = 'info') {
  const el = document.getElementById('profile-status');
  if (!el) return;
  el.textContent = text;
  el.className = 'profile__status profile__status--' + kind;
  el.hidden = false;
}

async function save(container) {
  const nameEl = container.querySelector('#profile-name');
  const emailEl = container.querySelector('#profile-email');
  const bioEl = container.querySelector('#profile-bio');
  const name = nameEl ? nameEl.value.trim() : '';
  const email = emailEl ? emailEl.value.trim() : '';
  const bio = bioEl ? bioEl.value.trim() : '';

  if (!name) {
    showStatus('Nome é obrigatório.', 'error');
    return;
  }

  _state.saving = true;
  render(container);

  // SEMPRE incluir avatar — se não houver novo, manter o antigo
  const updates = {
    name,
    email,
    bio,
    avatar: _state.photoDataUrl !== null
      ? (_state.photoDataUrl || '')
      : (_state.profile && _state.profile.avatar) || ''
  };

  try {
    const id = _state.profile && _state.profile.id;
    if (id) {
      await dataManager.update('userProfiles', id, updates);
      _state.profile = { ..._state.profile, ...updates };
    } else {
      _state.profile = await dataManager.create('userProfiles', updates);
    }

    // Espelhar o nome no localStorage (usado pela sidebar/topbar)
    localStorage.setItem('lumiereUserName', name);

    // Avisar o resto da app
    eventBus.emit('profile:changed', _state.profile);

    _state.saving = false;
    _state.photoDataUrl = null;
    console.log('[Profile] Guardado id=' + (_state.profile && _state.profile.id));
    console.log('[Profile] Avatar guardado len=' + ((_state.profile && _state.profile.avatar) ? _state.profile.avatar.length : 0));
    render(container);
    showStatus('Perfil guardado.', 'success');
  } catch (err) {
    console.error('[Profile] Erro ao guardar:', err);
    _state.saving = false;
    render(container);
    showStatus('Erro ao guardar. Tenta novamente.', 'error');
  }
}

export async function initProfile(container) {
  if (!container) {
    console.warn('[Profile] container nao fornecido');
    return;
  }
  _state = { profile: null, saving: false, photoDataUrl: null };
  container.innerHTML = '<p class="profile__loading">A carregar perfil…</p>';
  try {
    _state.profile = await loadOrCreateProfile();
    console.log('[Profile] Carregado id=' + (_state.profile && _state.profile.id));
    console.log('[Profile] Avatar len=' + ((_state.profile && _state.profile.avatar) ? _state.profile.avatar.length : 0));
  } catch (err) {
    console.error('[Profile] Erro ao carregar:', err);
    _state.profile = { id: null, name: '', email: '', bio: '', avatar: '' };
  }
  render(container);
}

export default { initProfile };
