const fs = require('fs');
let js = fs.readFileSync('pages/settings/settings.js', 'utf8');

// 1. Onde o contentor da página é criado
const oldAnchor = `  const page = document.createElement('div');
  page.className = 'settings-page';`;

const newAnchor = `  const page = document.createElement('div');
  page.className = 'settings-page';

  // --- CABEÇALHO PERSONALIZADO ---
  const customHeader = document.createElement('div');
  customHeader.className = 'settings-custom-header';
  customHeader.innerHTML = \`
    <div class="settings-header-top">
      <button class="settings-back-btn" id="btn-back-settings">&lt;</button>
      <div class="settings-brand">
        <img src="public/brand/master/app-icon-v3.svg" class="settings-brand-symbol">
        <h2 class="settings-brand-name">LUMIÈRE</h2>
        <span class="settings-brand-tagline">Life Manager</span>
      </div>
      <div class="settings-quote">Disciplina hoje,<br>liberdade amanhã.</div>
    </div>
    <h1 class="settings-page-title">DEFINIÇÕES</h1>
    <p class="settings-page-subtitle">Personaliza a tua experiência</p>
  \`;
  page.appendChild(customHeader);

  const backBtn = customHeader.querySelector('#btn-back-settings');
  if (backBtn) {
    backBtn.onclick = () => {
      if (window.__lumiere && window.__lumiere.stateManager) {
        window.__lumiere.stateManager.navigateTo('overview');
      }
    };
  }
  
  const title = customHeader.querySelector('.settings-page-title');`;

// 2. Remover o título antigo (que estava a duplicar a palavra "Definições")
const oldHeaderBlock = `  const header = document.createElement('header');
  header.className = 'settings-header';
  const title = document.createElement('h2');
  title.className = 'settings-header__title';
  title.textContent = 'Definições';
  header.appendChild(title);
  page.appendChild(header);`;

if (js.includes(oldAnchor) && js.includes(oldHeaderBlock)) {
    js = js.replace(oldAnchor, newAnchor);
    js = js.replace(oldHeaderBlock, ''); // Remove o título antigo
    fs.writeFileSync('pages/settings/settings.js', js);
    console.log('Cabeçalho injetado e título duplicado removido com sucesso!');
} else {
    console.log('ERRO: Âncora não encontrada no settings.js.');
}
