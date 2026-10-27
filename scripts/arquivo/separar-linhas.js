const fs = require('fs');
let js = fs.readFileSync('pages/settings/settings.js', 'utf8');

// --- 1. Atualizar o Avatar (Remover "DA" e colocar SVG + Coroa) ---
const oldAvatar = `<div class="settings-profile-avatar">DA</div>`;
const newAvatar = `<div class="settings-profile-avatar" style="position:relative; display:flex; align-items:center; justify-content:center; overflow:hidden;">
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" stroke-width="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
  <span style="position:absolute; bottom:-2px; right:-2px; background:#D4AF37; color:#000; border-radius:50%; width:16px; height:16px; display:flex; align-items:center; justify-content:center; font-size:10px; border:1px solid #0A0A0A;">👑</span>
</div>`;
js = js.replace(oldAvatar, newAvatar);

// --- 2. Criar as novas funções de Modal (extraídas da renderPreferences antiga) ---
const newModalFunctions = `
function renderAppearanceModal() {
  const wrap = document.createElement('div');
  const p = _state.prefs;
  wrap.appendChild(makeSelect('Tema', 'theme', p.theme, [
    { value: 'noir', label: 'Noir (escuro)' },
    { value: 'lumiere', label: 'Lumière (claro)' },
    { value: 'auto', label: 'Automático' }
  ]));
  wrap.appendChild(makeSelect('Intensidade dourada', 'goldIntensity', p.goldIntensity, [
    { value: 'subtle', label: 'Sutil' },
    { value: 'balanced', label: 'Equilibrada' },
    { value: 'strong', label: 'Forte' }
  ]));
  wrap.appendChild(makeSelect('Tamanho da interface', 'interfaceSize', p.interfaceSize, [
    { value: 'compact', label: 'Compacto' },
    { value: 'balanced', label: 'Equilibrado' },
    { value: 'comfortable', label: 'Confortável' }
  ]));
  return wrap;
}

function renderLanguageModal() {
  const wrap = document.createElement('div');
  const p = _state.prefs;
  wrap.appendChild(makeSelect('Idioma', 'language', p.language, [
    { value: 'pt', label: 'Português' },
    { value: 'en', label: 'English (brevemente)' }
  ]));
  return wrap;
}

function renderNotificationsModal() {
  const wrap = document.createElement('div');
  const p = _state.prefs;
  
  // Notificações
  const notifRow = document.createElement('div');
  notifRow.className = 'settings-field settings-field--row';
  notifRow.style.marginBottom = '16px';
  const notifLabel = document.createElement('label');
  notifLabel.textContent = 'Notificações';
  const notifCb = document.createElement('input');
  notifCb.type = 'checkbox';
  notifCb.checked = Boolean(p.notificationsEnabled);
  notifCb.addEventListener('change', () => {
      p.notificationsEnabled = notifCb.checked;
      localStorage.setItem('lumierePreferences', JSON.stringify(p));
  });
  notifRow.append(notifLabel, notifCb);
  wrap.appendChild(notifRow);

  // Comandos de Voz
  const voiceRow = document.createElement('div');
  voiceRow.className = 'settings-field settings-field--row';
  const voiceLabel = document.createElement('label');
  voiceLabel.textContent = 'Comandos de voz (experimental)';
  const voiceCb = document.createElement('input');
  voiceCb.type = 'checkbox';
  voiceCb.checked = getVoiceEnabled();
  voiceCb.addEventListener('change', () => {
    setVoiceEnabled(voiceCb.checked);
  });
  voiceRow.append(voiceLabel, voiceCb);
  wrap.appendChild(voiceRow);
  
  const hint = document.createElement('p');
  hint.className = 'settings-hint';
  hint.style.marginTop = '10px';
  hint.textContent = 'Mostra o botão de microfone no ecrã principal.';
  wrap.appendChild(hint);
  
  return wrap;
}
`;

// Inserir as novas funções antes de renderPreferences
js = js.replace('function renderPreferences() {', newModalFunctions + '\nfunction renderPreferences() {');

// --- 3. Substituir a linha "Preferências" pelas 3 novas linhas ---
const oldRow = `listGeral.appendChild(createSettingsRow('Preferências', 'Tema, idioma e notificações', '⚙️', renderPreferences));`;
const newRows = `
    listGeral.appendChild(createSettingsRow('Aparência', 'Tema, intensidade dourada e tamanho da interface', '🎨', renderAppearanceModal));
    listGeral.appendChild(createSettingsRow('Idioma', 'Escolhe o teu idioma preferido', '🌐', renderLanguageModal));
    listGeral.appendChild(createSettingsRow('Notificações', 'Alertas, lembretes e sons', '🔔', renderNotificationsModal));
`;
js = js.replace(oldRow, newRows);

fs.writeFileSync('pages/settings/settings.js', js);
console.log('Linhas separadas e avatar atualizado!');
