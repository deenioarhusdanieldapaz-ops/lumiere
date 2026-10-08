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

  const header = document.createElement('header');
  header.className = 'settings-header';
  const title = document.createElement('h2');
  title.className = 'settings-header__title';
  title.textContent = 'Definições';
  header.appendChild(title);
  page.appendChild(header);

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
    page.appendChild(renderPreferences());
    page.appendChild(renderActions());
  }

  _container.appendChild(page);
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
