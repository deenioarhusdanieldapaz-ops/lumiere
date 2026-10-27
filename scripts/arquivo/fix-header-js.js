const fs = require('fs');
let js = fs.readFileSync('pages/settings/settings.js', 'utf8');

// Substituir a criação do cabeçalho antigo pelo novo cabeçalho personalizado
const oldHeaderBlock = `  const header = document.createElement('header');
  header.className = 'settings-header';
  const title = document.createElement('h2');
  title.className = 'settings-header__title';
  title.textContent = 'Definições';
  header.appendChild(title);
  page.appendChild(header);`;

const newHeaderBlock = `  // --- CABEÇALHO PERSONALIZADO ---
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
`;

if (js.includes(oldHeaderBlock)) {
    js = js.replace(oldHeaderBlock, newHeaderBlock);
    fs.writeFileSync('pages/settings/settings.js', js);
    console.log('Novo cabeçalho injetado no JS com sucesso!');
} else {
    console.log('ERRO: Bloco do cabeçalho antigo não encontrado.');
}
