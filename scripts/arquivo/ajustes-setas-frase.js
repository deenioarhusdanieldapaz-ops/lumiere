const fs = require('fs');
let css = fs.readFileSync('pages/settings/settings.css', 'utf8');

css += `

/* =========================================
   AJUSTES FINAIS (V504)
   ========================================= */

/* 1. Diminuir a Frase (Azul) em 17% */
.settings-quote {
  font-size: 0.46rem !important; /* 0.55 * 0.83 = 0.4565 */
}

/* 2. Mover a Seta (Vermelho) para a esquerda */
.settings-header-top {
  padding-left: 0 !important; /* Remove o padding do contentor */
}

.settings-back-btn {
  margin-left: -6px !important; /* Puxa a seta mais para a esquerda */
  padding-left: 0 !important;
}
`;

fs.writeFileSync('pages/settings/settings.css', css);
console.log('Ajustes na frase e na seta aplicados!');
