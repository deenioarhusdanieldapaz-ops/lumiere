const fs = require('fs');
let css = fs.readFileSync('pages/settings/settings.css', 'utf8');

css += `

/* =========================================
   AJUSTES FINAIS (V499)
   ========================================= */

/* 1. Fundo a cobrir o ecrã todo e remover o buraco preto */
body:has(.settings-page) {
  background-image: linear-gradient(180deg, rgba(10,10,10,0.4) 0%, rgba(10,10,10,0.85) 100%), url('../../assets/bg/settings-bg.webp') !important;
  background-size: cover !important;
  background-position: center top !important;
  background-repeat: no-repeat !important;
  background-attachment: scroll !important; /* Faz o fundo deslizar com a página */
}

/* Remover o fundo duplicado da página */
.settings-page::before {
  display: none !important;
}

/* Garantir que não há espaços mortos */
body:has(.settings-page) .app-content {
  padding-top: 0 !important;
  margin-top: 0 !important;
}
.settings-page {
  background: transparent !important;
  padding-top: max(16px, env(safe-area-inset-top)) !important;
}

/* 2. Aumentar Marca (Vermelho) em 18% */
.settings-brand-symbol {
  width: 38px !important;  /* 32 * 1.18 */
  height: 38px !important;
}
.settings-brand-name {
  font-size: 1.18rem !important; /* 1.0 * 1.18 */
}

/* 3. Diminuir Frase (Azul) em 13% */
.settings-quote {
  font-size: 0.61rem !important; /* 0.7 * 0.87 */
}

/* 4. Linha divisória dourada (Amarelo) */
.settings-quote {
  border-left: 1px solid rgba(212, 175, 55, 0.5) !important;
  padding-left: 12px !important;
}
`;
fs.writeFileSync('pages/settings/settings.css', css);
console.log('Ajustes finais aplicados com sucesso!');
