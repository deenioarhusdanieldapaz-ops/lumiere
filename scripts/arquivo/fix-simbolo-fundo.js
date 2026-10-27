const fs = require('fs');
let css = fs.readFileSync('pages/settings/settings.css', 'utf8');

css += `

/* =========================================
   AJUSTE DE SÍMBOLO E MOVIMENTO DO FUNDO (V507)
   ========================================= */

/* 1. Símbolo - Aumentar 18% (de 42px para 50px) */
.settings-brand-symbol {
  width: 50px !important;
  height: 50px !important;
}

/* 2. Corrigir o movimento do fundo */
/* Remover o fundo do body (que estava fixo e causava o efeito estranho) */
body:has(.settings-page) {
  background-image: none !important;
}

/* Remover o fundo do pseudo-elemento */
.settings-page::before {
  display: none !important;
}

/* Aplicar o fundo diretamente à página de Definições para ele rolar junto com as letras */
.settings-page {
  background-image: linear-gradient(180deg, rgba(10,10,10,0.4) 0%, rgba(10,10,10,0.85) 100%), url('../../assets/bg/settings-bg.webp') !important;
  background-size: cover !important;
  background-position: center top !important;
  background-repeat: no-repeat !important;
  background-attachment: local !important; /* Faz o fundo acompanhar o scroll */
}
`;

fs.writeFileSync('pages/settings/settings.css', css);
console.log('Símbolo maior e fundo corrigido para rolar junto!');
