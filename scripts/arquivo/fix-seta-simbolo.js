const fs = require('fs');
let css = fs.readFileSync('pages/settings/settings.css', 'utf8');

css += `

/* =========================================
   AJUSTE DA SETA E SÍMBOLO (V506)
   ========================================= */

/* 1. Seta - Diminuir 12% e colar à parede esquerda */
.settings-back-btn {
  font-size: 1.4rem !important; /* 1.6rem - 12% */
  margin-left: -12px !important; /* Puxa para a esquerda, para fora do padding */
  padding: 0 !important;
}

/* 2. Símbolo - Aumentar 17% */
.settings-brand-symbol {
  width: 42px !important; /* 36px + 17% */
  height: 42px !important;
}
`;

fs.writeFileSync('pages/settings/settings.css', css);
console.log('Seta e símbolo ajustados!');
