const fs = require('fs');
let css = fs.readFileSync('pages/settings/settings.css', 'utf8');

css += `

/* =========================================
   FORÇAR FUNDO A OCUPAR O ECRÃ INTEIRO (V508)
   ========================================= */

/* Garantir que a página de Definições tem sempre a altura do ecrã */
.settings-page {
  min-height: 100vh !important;
  min-height: 100dvh !important; /* Melhor para browsers móveis */
  display: flex !important;
  flex-direction: column !important;
}

/* Remover qualquer fundo ou margem do contentor pai que possa causar cortes */
.app-content {
  background: transparent !important;
  padding-bottom: 0 !important;
}

/* Garantir que o body também está escuro para não haver faixas brancas */
body {
  background-color: #0A0A0A !important;
}
`;

fs.writeFileSync('pages/settings/settings.css', css);
console.log('Altura do fundo corrigida para 100vh!');
