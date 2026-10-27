const fs = require('fs');
let js = fs.readFileSync('pages/settings/settings.js', 'utf8');

// Encontrar o ponto onde o header antigo é criado e substituir
const oldHeader = `  const header = document.createElement('header');
  header.className = 'settings-header';
  const title = document.createElement('h2');
  title.className = 'settings-header__title';
  title.textContent = 'Definições';
  header.appendChild(title);
  page.appendChild(header);`;

const newHeader = `  // --- CABEÇALHO PERSONALIZADO ---
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

  // Lógica do botão de voltar
  const backBtn = customHeader.querySelector('#btn-back-settings');
  if (backBtn) {
    backBtn.onclick = () => {
      if (window.__lumiere && window.__lumiere.stateManager) {
        window.__lumiere.stateManager.navigateTo('overview');
      }
    };
  }

  // Mantém a referência para o gesto secreto
  const title = customHeader.querySelector('.settings-page-title');`;

if (js.includes(oldHeader)) {
    js = js.replace(oldHeader, newHeader);
    fs.writeFileSync('pages/settings/settings.js', js);
    console.log('Cabeçalho injetado com sucesso!');
} else {
    console.log('ERRO: Header antigo não encontrado.');
}
