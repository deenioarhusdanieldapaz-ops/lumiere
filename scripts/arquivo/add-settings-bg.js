const fs = require('fs');
let css = fs.readFileSync('pages/settings/settings.css', 'utf8');

// Substituir a regra original do .settings-page por uma versão com fundo
const oldRule = `.settings-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg, 1.5rem);
}`;

const newRule = `.settings-page {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--space-lg, 1.5rem);
  min-height: 100vh;
  padding: var(--space-md, 1rem);
  background-image: url('../../assets/bg/settings-bg.webp');
  background-size: cover;
  background-position: center top;
  background-repeat: no-repeat;
  background-attachment: fixed;
  z-index: 1;
}

/* Overlay escuro para garantir legibilidade dos cartões */
.settings-page::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at center, rgba(10,10,10,0.4) 0%, rgba(10,10,10,0.8) 100%);
  z-index: -1;
  pointer-events: none;
}`;

if (css.includes(oldRule)) {
    css = css.replace(oldRule, newRule);
    fs.writeFileSync('pages/settings/settings.css', css);
    console.log('Fundo injetado no Settings CSS com sucesso!');
} else {
    console.log('ERRO: Regra original .settings-page não encontrada exatamente.');
}
