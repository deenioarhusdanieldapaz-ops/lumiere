/**
 * Settings Page
 *
 * Página de preferências. Sem CRUD de entidades — só leitura/escrita de preferências
 * e ações destrutivas (reset onboarding, apagar dados).
 */
import { dataManager } from '../../core/dataManager.js';
import { storageManager } from '../../core/storageManager.js';
import { eventBus } from '../../core/eventBus.js';
import { createSheet } from '../../components/sheet/sheet.js';
import { dailyReviewTrigger } from '../../js/dailyReviewTrigger.js';
import { setVoiceEnabled, getVoiceEnabled } from '../../components/voice/voice-mic-button.js';
import { hardReload, isDevMode, activateDevMode } from '../../js/dev-tools.js';
import { openConfigFor } from '../focus/focus-timer.js';
import { setForceExpired, hasActiveAccess, getCurrentUser } from '../../core/auth.js';
import { getLatestCloudBackup, forceUploadBackup } from '../../core/backup.js';

let _container = null;
let _state = {
  prefs: null,
  loading: false,
  error: null
};

const PREF_KEY = 'lumierePreferences';

export function initSettings(container) {
  if (!container) {
    console.warn('[Settings] container inválido.');
    return;
  }
  _container = container;
  loadPrefs();
}

function loadPrefs() {
  _state.loading = true;
  render();

  try {
    // 1) Tentar localStorage
    let prefs = null;
    const raw = localStorage.getItem(PREF_KEY);
    if (raw) {
      try { prefs = JSON.parse(raw); } catch (e) { /* ignora */ }
    }
    // 2) Fallback para defaults
    if (!prefs || typeof prefs !== 'object') {
      prefs = {
        theme: 'noir',
        goldIntensity: 'balanced',
        interfaceSize: 'balanced',
        language: 'pt',
        notificationsEnabled: true
      };
    }
    // Garantir campos
    prefs.theme = prefs.theme || 'noir';
    prefs.goldIntensity = prefs.goldIntensity || 'balanced';
    prefs.interfaceSize = prefs.interfaceSize || 'balanced';
    prefs.language = prefs.language || 'pt';
    prefs.notificationsEnabled = prefs.notificationsEnabled !== false;

    _state.prefs = prefs;
  } catch (err) {
    console.error('[Settings] Erro ao carregar preferências:', err);
    _state.error = err.message || 'Erro ao carregar preferências.';
  } finally {
    _state.loading = false;
    render();
  }
}

function render() {
  if (!_container) return;
  _container.innerHTML = '';

  const page = document.createElement('div');
  page.className = 'settings-page';

  // --- CABEÇALHO PERSONALIZADO ---
  const customHeader = document.createElement('div');
  customHeader.className = 'settings-custom-header';

  const topRow = document.createElement('div');
  topRow.className = 'settings-header-top';

  const backBtn = document.createElement('button');
  backBtn.className = 'settings-back-btn';
  backBtn.innerHTML = '&lt;';
  backBtn.onclick = () => {
    // Voltar para o Dashboard (overview)
    if (window.__lumiere && window.__lumiere.stateManager) {
      window.__lumiere.stateManager.navigateTo('overview');
    }
  };

  const brand = document.createElement('div');
  brand.className = 'settings-brand';
  brand.innerHTML = '<img src="public/brand/master/app-icon-v3.svg" class="settings-brand-symbol"><h2 class="settings-brand-name">LUMIÈRE</h2><span class="settings-brand-tagline">Life Manager</span>';

  const quote = document.createElement('div');
  quote.className = 'settings-quote';
  quote.innerHTML = 'Disciplina hoje,<br>liberdade amanhã.';

  topRow.append(backBtn, brand, quote);

  const pageTitle = document.createElement('h1');
  pageTitle.className = 'settings-page-title';
  pageTitle.textContent = 'DEFINIÇÕES';

  const pageSubtitle = document.createElement('p');
  pageSubtitle.className = 'settings-page-subtitle';
  pageSubtitle.textContent = 'Personaliza a tua experiência';

  customHeader.append(topRow, pageTitle, pageSubtitle);
  page.appendChild(customHeader);

  const title = pageTitle; // Mantém a referência para o gesto secreto funcionar


  // Gesto secreto: 5 toques rápidos no título alternam modo dev
  (function attachSecretGesture() {
    let count = 0;
    let timer = null;
    title.style.userSelect = 'none';
    title.addEventListener('click', () => {
      count++;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => { count = 0; }, 2000);
      if (count >= 5) {
        count = 0;
        if (timer) { clearTimeout(timer); timer = null; }
        const now = !isDevMode();
        activateDevMode(now);
        try { eventBus.emit('toast:show', { type: 'success', text: now ? 'Modo dev ativado — a recarregar...' : 'Modo dev desativado — a recarregar...' }); } catch (_) {}
        // Reload é necessário para o eruda entrar/sair
        setTimeout(function() { location.reload(); }, 400);
      }
    });
  })();

  if (_state.loading) {
    page.appendChild(renderState('A carregar…'));
  } else if (_state.error) {
    page.appendChild(renderState(_state.error, true));
  } else {
    // Cartão de Perfil
    const profileCard = document.createElement('div');
    profileCard.className = 'settings-profile-card';
    profileCard.innerHTML = `
      <div class="settings-profile-avatar" style="position:relative; display:flex; align-items:center; justify-content:center; overflow:hidden;">
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" stroke-width="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
  <span style="position:absolute; bottom:-2px; right:-2px; background:#D4AF37; color:#000; border-radius:50%; width:16px; height:16px; display:flex; align-items:center; justify-content:center; font-size:10px; border:1px solid #0A0A0A;">👑</span>
</div>
      <div class="settings-profile-info">
        <p class="settings-profile-name">Arrhinuis</p>
        <p class="settings-profile-sub">Daniel Alfredo</p>
        <p class="settings-profile-loc">📍 Marromeu, Moçambique</p>
      </div>
      <div class="settings-profile-arrow">›</div>
    `;
    page.appendChild(profileCard);

    function createSettingsRow(title, sub, icon, renderFn) {
      const row = document.createElement('div');
      row.className = 'settings-menu-row';
      row.innerHTML = `
        <div class="settings-menu-icon">${icon}</div>
        <div class="settings-menu-text">
          <p class="settings-menu-title">${title}</p>
          <p class="settings-menu-sub">${sub}</p>
        </div>
        <div class="settings-menu-arrow">›</div>
      `;
      row.onclick = () => {
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.8);z-index:9998;display:flex;flex-direction:column;justify-content:flex-end;';
        const sheet = document.createElement('div');
        sheet.style.cssText = 'background:#0A0A0A;border-top:1px solid #D4AF37;border-radius:20px 20px 0 0;padding:20px;max-height:80vh;overflow-y:auto;transform:translateY(100%);transition:transform 0.3s;';
        const header = document.createElement('div');
        header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;';
        const h2 = document.createElement('h2');
        h2.style.cssText = 'color:#D4AF37;font-family:"Cinzel",serif;font-size:1.2rem;margin:0;';
        h2.textContent = title;
        const closeBtn = document.createElement('button');
        closeBtn.style.cssText = 'background:transparent;border:none;color:#F5F0EB;font-size:1.5rem;cursor:pointer;';
        closeBtn.innerHTML = '✕';
        closeBtn.onclick = () => {
          sheet.style.transform = 'translateY(100%)';
          setTimeout(() => overlay.remove(), 300);
        };
        header.append(h2, closeBtn);
        sheet.appendChild(header);

        const content = renderFn();
        if(content) {
          content.style.padding = '0';
          sheet.appendChild(content);
        }

        overlay.appendChild(sheet);
        requestAnimationFrame(() => { sheet.style.transform = 'translateY(0)'; });
        overlay.addEventListener('click', (e) => { if (e.target === overlay) closeBtn.click(); });
        document.body.appendChild(overlay);
      };
      return row;
    }

    // GERAL
    const secGeral = document.createElement('div');
    secGeral.className = 'settings-section-title';
    secGeral.textContent = 'GERAL';
    page.appendChild(secGeral);

    const listGeral = document.createElement('div');
    listGeral.className = 'settings-menu-list';

    listGeral.appendChild(createSettingsRow('Aparência', 'Tema, intensidade dourada e tamanho da interface', '🎨', renderAppearanceModal));
    listGeral.appendChild(createSettingsRow('Idioma', 'Escolhe o teu idioma preferido', '🌐', renderLanguageModal));
    listGeral.appendChild(createSettingsRow('Notificações', 'Alertas, lembretes e sons', '🔔', renderNotificationsModal));

    page.appendChild(listGeral);

    // FOCO E PRODUTIVIDADE
    const secFoco = document.createElement('div');
    secFoco.className = 'settings-section-title';
    secFoco.textContent = 'FOCO E PRODUTIVIDADE';
    page.appendChild(secFoco);

    const listFoco = document.createElement('div');
    listFoco.className = 'settings-menu-list';
    listFoco.appendChild(createSettingsRow('Pomodoro', 'Duração das sessões e pausas', '⏱️', renderPomodoro));
    page.appendChild(listFoco);

    // DADOS E SEGURANÇA
    const secDados = document.createElement('div');
    secDados.className = 'settings-section-title';
    secDados.textContent = 'DADOS E SEGURANÇA';
    page.appendChild(secDados);

    const listDados = document.createElement('div');
    listDados.className = 'settings-menu-list';
    listDados.appendChild(createSettingsRow('Backup', 'Cópias de segurança', '☁️', renderBackup));
    page.appendChild(listDados);

    // AVANÇADO
    const secAvancado = document.createElement('div');
    secAvancado.className = 'settings-section-title';
    secAvancado.textContent = 'AVANÇADO';
    page.appendChild(secAvancado);

    const listAvancado = document.createElement('div');
    listAvancado.className = 'settings-menu-list';

    const rowPerigo = createSettingsRow('Apagar todos os dados', 'Esta ação é irreversível', '🗑️', renderActions);
    rowPerigo.classList.add('settings-row-danger');
    listAvancado.appendChild(rowPerigo);
    page.appendChild(listAvancado);
  }

  _container.appendChild(page);
}


function renderAppearanceModal() {
  const wrap = document.createElement('div');
  const p = _state.prefs;
  // [TEMPORÁRIO - TESTES DE TEMA] Auto-save no select de tema
  const themeWrap = makeSelect('Tema', 'theme', p.theme, [
    { value: 'noir', label: 'Noir (escuro)' },
    { value: 'lumiere', label: 'Lumière (claro)' },
    { value: 'auto', label: 'Automático' }
  ]);
  const selectEl = themeWrap.querySelector('select');
  if (selectEl) {
    selectEl.addEventListener('change', (e) => {
      const newTheme = e.target.value;
      p.theme = newTheme;
      localStorage.setItem('lumierePreferences', JSON.stringify(p));
      applyTheme(newTheme);
      try { eventBus.emit('toast:show', { type: 'success', text: 'Tema alterado para testes.' }); } catch (_) {}
    });
  }
  wrap.appendChild(themeWrap);
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

function renderPreferences() {
  const sec = document.createElement('section');
  sec.className = 'settings-section';

  const t = document.createElement('h3');
  t.className = 'settings-section__title';
  t.textContent = 'Preferências';
  sec.appendChild(t);

  const p = _state.prefs;

  sec.appendChild(makeSelect('Tema', 'theme', p.theme, [
    { value: 'noir', label: 'Noir (escuro)' },
    { value: 'lumiere', label: 'Lumière (claro)' },
    { value: 'auto', label: 'Automático' }
  ]));

  sec.appendChild(makeSelect('Intensidade dourada', 'goldIntensity', p.goldIntensity, [
    { value: 'subtle', label: 'Sutil' },
    { value: 'balanced', label: 'Equilibrada' },
    { value: 'strong', label: 'Forte' }
  ]));

  sec.appendChild(makeSelect('Tamanho da interface', 'interfaceSize', p.interfaceSize, [
    { value: 'compact', label: 'Compacto' },
    { value: 'balanced', label: 'Equilibrado' },
    { value: 'comfortable', label: 'Confortável' }
  ]));

  sec.appendChild(makeSelect('Idioma', 'language', p.language, [
    { value: 'pt', label: 'Português' },
    { value: 'en', label: 'English (brevemente)' }
  ]));

  sec.appendChild(makeHourPicker());

  // Notificações (checkbox)
  const wrap = document.createElement('div');
  wrap.className = 'settings-field settings-field--row';
  const label = document.createElement('label');
  label.setAttribute('for', 'set-notifications');
  label.textContent = 'Notificações';
  wrap.appendChild(label);
  const cb = document.createElement('input');
  cb.type = 'checkbox';
  cb.id = 'set-notifications';
  cb.checked = Boolean(p.notificationsEnabled);
  wrap.appendChild(cb);
  sec.appendChild(wrap);

  // Comandos de voz (experimental) — controla visibilidade do botão de mic
  const voiceWrap = document.createElement('div');
  voiceWrap.className = 'settings-field settings-field--row';
  voiceWrap.style.marginTop = '16px';
  voiceWrap.style.paddingTop = '14px';
  voiceWrap.style.borderTop = '1px solid rgba(212,175,55,0.15)';
  const voiceLabel = document.createElement('label');
  voiceLabel.setAttribute('for', 'set-voice-enabled');
  voiceLabel.textContent = 'Comandos de voz (experimental)';
  voiceWrap.appendChild(voiceLabel);
  const voiceCb = document.createElement('input');
  voiceCb.type = 'checkbox';
  voiceCb.id = 'set-voice-enabled';
  voiceCb.checked = getVoiceEnabled();
  voiceCb.addEventListener('change', () => {
    setVoiceEnabled(voiceCb.checked);
    try { eventBus.emit('toast:show', { type: 'success', text: voiceCb.checked ? 'Comandos de voz ativados' : 'Comandos de voz escondidos' }); } catch (_) {}
  });
  voiceWrap.appendChild(voiceCb);
  sec.appendChild(voiceWrap);

  const voiceHint = document.createElement('p');
  voiceHint.className = 'settings-hint';
  voiceHint.style.marginTop = '6px';
  voiceHint.style.fontSize = '11px';
  voiceHint.style.color = 'rgba(240,230,210,0.45)';
  voiceHint.textContent = 'Mostra o botão de microfone no ecrã principal. Esta função está em desenvolvimento — comandos curtos funcionam melhor.';
  sec.appendChild(voiceHint);

  const hint = document.createElement('p');
  hint.className = 'settings-hint';
  hint.textContent = 'Estas preferências são guardadas no dispositivo.';
  sec.appendChild(hint);

  // Secção Avançado — só visível em modo dev
  if (isDevMode()) {
    const advSep = document.createElement('div');
    advSep.style.margin = '18px 0 12px';
    advSep.style.paddingTop = '14px';
    advSep.style.borderTop = '1px dashed rgba(255,119,119,0.35)';
    sec.appendChild(advSep);

    const advTitle = document.createElement('h4');
    advTitle.textContent = 'Avançado (dev)';
    advTitle.style.color = '#ff9999';
    advTitle.style.fontSize = '12px';
    advTitle.style.letterSpacing = '1px';
    advTitle.style.textTransform = 'uppercase';
    advTitle.style.margin = '0 0 10px 0';
    sec.appendChild(advTitle);

    const btnReload = document.createElement('button');
    btnReload.type = 'button';
    btnReload.className = 'settings-btn';
    btnReload.textContent = '🧹 Limpar cache + recarregar';
    btnReload.style.background = 'rgba(255,119,119,0.10)';
    btnReload.style.borderColor = 'rgba(255,119,119,0.5)';
    btnReload.style.color = '#ff9999';
    btnReload.addEventListener('click', () => { hardReload(); });
    sec.appendChild(btnReload);

    const devHint = document.createElement('p');
    devHint.className = 'settings-hint';
    devHint.style.marginTop = '8px';
    devHint.style.fontSize = '11px';
    devHint.style.color = 'rgba(240,230,210,0.4)';
    devHint.textContent = 'Desregistra o Service Worker, apaga todas as caches e recarrega a app com URL única.';
    sec.appendChild(devHint);

    // Botão: Simular trial expirado
    const btnExpire = document.createElement('button');
    btnExpire.type = 'button';
    btnExpire.className = 'settings-btn';
    btnExpire.textContent = '\u23F1 Simular trial expirado (60s)';
    btnExpire.style.background = 'rgba(255,153,153,0.10)';
    btnExpire.style.borderColor = 'rgba(255,153,153,0.5)';
    btnExpire.style.color = '#ff9999';
    btnExpire.style.marginTop = '12px';
    btnExpire.addEventListener('click', () => {
      setForceExpired(true);
      try { eventBus.emit('toast:show', { type: 'warning', text: 'Trial simulado expirado (60s)' }); } catch (_) {}
      console.log('[Settings] forceExpired = true, hasAccess =', hasActiveAccess());
      btnExpire.disabled = true;
      btnExpire.textContent = '\u23F1 Expirado... aguarda 60s';
      setTimeout(() => {
        setForceExpired(false);
        btnExpire.disabled = false;
        btnExpire.textContent = '\u23F1 Simular trial expirado (60s)';
        console.log('[Settings] forceExpired reset, hasAccess =', hasActiveAccess());
        try { eventBus.emit('toast:show', { type: 'success', text: 'Trial restaurado' }); } catch (_) {}
      }, 60000);
    });
    sec.appendChild(btnExpire);

    const expireHint = document.createElement('p');
    expireHint.className = 'settings-hint';
    expireHint.style.marginTop = '6px';
    expireHint.style.fontSize = '11px';
    expireHint.style.color = 'rgba(240,230,210,0.4)';
    expireHint.textContent = 'Força hasActiveAccess() a devolver false durante 60 segundos. Não altera o Firestore. Só para testar a UI.';
    sec.appendChild(expireHint);
  }

  const btnSave = document.createElement('button');
  btnSave.type = 'button';
  btnSave.className = 'settings-btn settings-btn--primary';
  btnSave.textContent = 'Guardar preferências';
  btnSave.addEventListener('click', () => handleSavePrefs(sec));
  sec.appendChild(btnSave);

  return sec;
}

function makeSelect(labelText, name, value, options) {
  const wrap = document.createElement('div');
  wrap.className = 'settings-field';
  const label = document.createElement('label');
  label.setAttribute('for', 'set-' + name);
  label.textContent = labelText;
  wrap.appendChild(label);

  const sel = document.createElement('select');
  sel.id = 'set-' + name;
  sel.name = name;
  for (const opt of options) {
    const o = document.createElement('option');
    o.value = opt.value;
    o.textContent = opt.label;
    if (opt.value === value) o.selected = true;
    sel.appendChild(o);
  }
  wrap.appendChild(sel);
  return wrap;
}

function renderPomodoro() {
  const sec = document.createElement('section');
  sec.className = 'settings-section';

  const t = document.createElement('h3');
  t.className = 'settings-section__title';
  t.textContent = 'Pomodoro';
  sec.appendChild(t);

  const hint = document.createElement('p');
  hint.className = 'settings-hint';
  hint.style.marginBottom = '12px';
  hint.textContent = 'Define os tempos predefinidos para as sessões de foco. Estes valores aparecem pré-preenchidos quando inicias uma sessão.';
  sec.appendChild(hint);

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'settings-btn';
  btn.textContent = 'Configurar tempos Pomodoro';
  btn.addEventListener('click', () => {
    try {
      openConfigFor(
        { type: 'habit', id: 'settings-default', name: 'Tempos padrão' },
        { configOnly: true }
      );
    } catch (e) {
      console.error('[Settings] Erro a abrir config Pomodoro:', e);
      try { eventBus.emit('toast:show', { type: 'error', text: 'Não foi possível abrir a configuração' }); } catch (_) {}
    }
  });
  sec.appendChild(btn);

  return sec;
}

function renderBackup() {
  const sec = document.createElement('section');
  sec.className = 'settings-section';

  const t = document.createElement('h3');
  t.className = 'settings-section__title';
  t.textContent = 'Backup';
  sec.appendChild(t);

  const hint = document.createElement('p');
  hint.className = 'settings-hint';
  hint.style.marginBottom = '12px';
  hint.textContent = 'Mantém os teus dados seguros na cloud. O backup é feito automaticamente uma vez por dia, mas podes forçar um agora.';
  sec.appendChild(hint);

  const statusTxt = document.createElement('p');
  statusTxt.className = 'settings-hint';
  statusTxt.style.marginBottom = '12px';
  statusTxt.style.color = 'var(--color-gold)';
  statusTxt.textContent = 'A verificar último backup...';
  sec.appendChild(statusTxt);

  const btnBackup = document.createElement('button');
  btnBackup.type = 'button';
  btnBackup.className = 'settings-btn';
  btnBackup.textContent = 'Fazer Backup Agora';

  const user = getCurrentUser();
  if (!user) {
    btnBackup.disabled = true;
    statusTxt.textContent = 'Inicia sessão para ativar o backup.';
    statusTxt.style.color = 'rgba(240,230,210,0.5)';
  } else {
    // Procurar último backup assincronamente
    getLatestCloudBackup(user.uid).then(backup => {
      if (backup) {
        statusTxt.textContent = 'Último backup: ' + backup.date;
      } else {
        statusTxt.textContent = 'Nenhum backup encontrado na cloud.';
      }
    }).catch(() => {
      statusTxt.textContent = 'Erro ao verificar backup.';
    });

    btnBackup.addEventListener('click', async () => {
      btnBackup.disabled = true;
      const original = btnBackup.textContent;
      btnBackup.textContent = 'A enviar...';

      const res = await forceUploadBackup(user.uid);
      if (res.ok) {
        statusTxt.textContent = 'Último backup: ' + res.date;
        btnBackup.textContent = 'Backup concluído!';
        try { eventBus.emit('toast:show', { type: 'success', text: 'Backup guardado na cloud.' }); } catch (_) {}
      } else {
        btnBackup.textContent = 'Erro. Tentar novamente';
        try { eventBus.emit('toast:show', { type: 'error', text: res.error || 'Falha no backup.' }); } catch (_) {}
      }

      setTimeout(() => {
        btnBackup.disabled = false;
        btnBackup.textContent = original;
      }, 3000);
    });
  }
  sec.appendChild(btnBackup);

  return sec;
}

function renderActions() {
  const sec = document.createElement('section');
  sec.className = 'settings-section';

  const t = document.createElement('h3');
  t.className = 'settings-section__title';
  t.textContent = 'Ações';
  sec.appendChild(t);

  // Reiniciar onboarding
  const btnReset = document.createElement('button');
  btnReset.type = 'button';
  btnReset.className = 'settings-btn';
  btnReset.textContent = 'Reiniciar onboarding';
  btnReset.addEventListener('click', handleResetOnboarding);
  sec.appendChild(btnReset);

  const hintReset = document.createElement('p');
  hintReset.className = 'settings-hint';
  hintReset.textContent = 'Apaga o nome e as preferências. Os dados ficam intactos.';
  sec.appendChild(hintReset);

  // Apagar todos os dados
  const btnWipe = document.createElement('button');
  btnWipe.type = 'button';
  btnWipe.className = 'settings-btn settings-btn--danger';
  btnWipe.textContent = 'Apagar TODOS os dados';
  btnWipe.addEventListener('click', handleWipeAll);
  sec.appendChild(btnWipe);

  const hintWipe = document.createElement('p');
  hintWipe.className = 'settings-hint';
  hintWipe.textContent = 'Atenção: operação irreversível. Apaga tudo do dispositivo.';
  sec.appendChild(hintWipe);

  return sec;
}

function renderState(message, isError = false) {
  const div = document.createElement('div');
  div.className = 'settings-state' + (isError ? ' settings-state--error' : '');
  div.textContent = message;
  return div;
}

/* ============================================================
   AÇÕES
   ============================================================ */

function applyTheme(theme) {
  const valid = ['noir', 'lumiere', 'auto'];
  const t = valid.includes(theme) ? theme : 'noir';
  document.documentElement.setAttribute('data-theme', t);
}

async function handleSavePrefs(sec) {
  const prefs = {
    theme: sec.querySelector('#set-theme').value,
    goldIntensity: sec.querySelector('#set-goldIntensity').value,
    interfaceSize: sec.querySelector('#set-interfaceSize').value,
    language: sec.querySelector('#set-language').value,
    notificationsEnabled: sec.querySelector('#set-notifications').checked
  };

  try {
    localStorage.setItem(PREF_KEY, JSON.stringify(prefs));
    applyTheme(prefs.theme);
    _state.prefs = prefs;
    console.log('[Settings] Preferências guardadas:', prefs);
    eventBus.emit('preferences:changed', prefs);
    alert('Preferências guardadas. Recarregue para aplicar (Fase 11 aplicará ao vivo).');
  } catch (err) {
    console.error('[Settings] Erro ao guardar:', err);
    alert('Erro ao guardar: ' + (err.message || err));
  }
}

function handleResetOnboarding() {
  if (!confirm('Reiniciar onboarding? O nome e preferências serão apagados.')) return;
  try {
    localStorage.removeItem('lumiereUserName');
    localStorage.removeItem(PREF_KEY);
    console.log('[Settings] Onboarding reiniciado');
    alert('Onboarding reiniciado. A recarregar...');
    location.reload();
  } catch (err) {
    console.error('[Settings] Erro ao reiniciar onboarding:', err);
  }
}

async function handleWipeAll() {
  if (!confirm('TEM CERTEZA? Isto apaga TODOS os dados (tarefas, hábitos, finanças, etc.).')) return;
  if (!confirm('Confirmação final: esta operação é IRREVERSÍVEL. Continuar?')) return;

  try {
    const collections = [
      'userProfiles','tasks','habits','habitLogs','studies','studySessions',
      'goals','goalMilestones','calendarEvents','financeAccounts','financeTransactions',
      'budgets','notes','lumiereBusinesses','lumiereProducts','lumiereCustomers',
      'lumiereSales','reminders','categories','tags','preferences'
    ];
    for (const col of collections) {
      try { await storageManager.clear(col); } catch (e) { /* ignora coleção em falta */ }
    }
    localStorage.clear();
    console.log('[Settings] Todos os dados apagados');
    alert('Dados apagados. A recarregar...');
    location.reload();
  } catch (err) {
    console.error('[Settings] Erro ao apagar:', err);
    alert('Erro: ' + (err.message || err));
  }
}

export const settingsPage = { init: initSettings };
export default settingsPage;

function makeHourPicker() {
  const wrap = document.createElement('div');
  wrap.className = 'settings-hour-row';
  wrap.setAttribute('role', 'button');
  wrap.setAttribute('tabindex', '0');

  const ico = document.createElement('span');
  ico.className = 'settings-hour-row__icon';
  ico.textContent = '🕐';
  wrap.appendChild(ico);

  const textWrap = document.createElement('div');
  textWrap.className = 'settings-hour-row__text';

  const label = document.createElement('div');
  label.className = 'settings-hour-row__label';
  label.textContent = 'Hora da revisão diária';
  textWrap.appendChild(label);

  const hint = document.createElement('div');
  hint.className = 'settings-hour-row__hint';
  hint.textContent = 'A revisão aparece a partir desta hora. Por defeito: 18:00.';
  textWrap.appendChild(hint);

  wrap.appendChild(textWrap);

  const valueEl = document.createElement('span');
  valueEl.className = 'settings-hour-row__value';
  const initial = dailyReviewTrigger.getConfiguredHour();
  valueEl.textContent = String(initial).padStart(2, '0') + ':00';
  wrap.appendChild(valueEl);

  const chev = document.createElement('span');
  chev.className = 'settings-hour-row__chevron';
  chev.textContent = '›';
  wrap.appendChild(chev);

  const open = function() {
    const items = [];
    for (let i = 0; i < 24; i++) {
      items.push({
        label: String(i).padStart(2, '0') + ':00',
        value: i
      });
    }
    const sheet = createSheet({
      title: 'Hora da revisão diária',
      items: items,
      onSelect: function(item) {
        const ok = dailyReviewTrigger.setConfiguredHour(item.value);
        if (ok) {
          valueEl.textContent = String(item.value).padStart(2, '0') + ':00';
          try { eventBus.emit('toast:show', { type: 'success', text: 'Hora atualizada: ' + valueEl.textContent }); } catch (e) {}
        }
      }
    });
    sheet.open();
  };

  wrap.addEventListener('click', open);
  wrap.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
  });

  return wrap;
}
