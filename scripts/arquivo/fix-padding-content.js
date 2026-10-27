const fs = require('fs');
let css = fs.readFileSync('pages/settings/settings.css', 'utf8');

css += `

/* =========================================
   FUNDO A COBRIR O ECRÃ INTEIRO (V509)
   ========================================= */

/* Remove a "moldura" do contentor pai quando estamos nas Definições */
body:has(.settings-page) .app-content {
  padding: 0 !important;
  margin: 0 !important;
}

/* A página agora pode ocupar todo o espaço disponível */
.settings-page {
  min-height: 100vh !important;
  width: 100% !important;
  padding-left: var(--space-md, 1rem) !important;
  padding-right: var(--space-md, 1rem) !important;
  padding-bottom: 80px !important; /* Compensa a barra de navegação */
  box-sizing: border-box !important;
}
`;

fs.writeFileSync('pages/settings/settings.css', css);
console.log('Padding do contentor removido!');
