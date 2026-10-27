const fs = require('fs');
let css = fs.readFileSync('pages/settings/settings.css', 'utf8');

// Regex para apanhar a regra atual do .settings-page e do ::before
const oldPageRule = /\.settings-page\s*\{[^}]*\}/m;
const oldBeforeRule = /\.settings-page::before\s*\{[^}]*\}/m;

// Nova regra do contentor principal (limpo, sem imagem)
const newPageRule = `.settings-page {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--space-lg, 1.5rem);
  min-height: 100vh;
  padding: var(--space-md, 1rem);
  z-index: 1;
  background: transparent;
}`;

// Nova regra do fundo (fixo e a cobrir o ecrã todo)
const newBeforeRule = `.settings-page::before {
  content: '';
  position: fixed;
  inset: 0;
  background-image: linear-gradient(180deg, rgba(10,10,10,0.4) 0%, rgba(10,10,10,0.85) 100%), url('../../assets/bg/settings-bg.webp');
  background-size: cover;
  background-position: center top;
  background-repeat: no-repeat;
  z-index: -1;
  pointer-events: none;
}`;

css = css.replace(oldPageRule, newPageRule);
css = css.replace(oldBeforeRule, newBeforeRule);

fs.writeFileSync('pages/settings/settings.css', css);
console.log('Fundo das Definições corrigido para ecrã inteiro!');
