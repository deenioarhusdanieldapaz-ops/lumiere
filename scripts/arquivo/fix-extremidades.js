const fs = require('fs');
let css = fs.readFileSync('pages/settings/settings.css', 'utf8');

css += `

/* =========================================
   ALINHAMENTO EXTREMO (V505)
   ========================================= */

/* O contentor ocupa 100% e remove o padding para colar às paredes */
.settings-header-top {
  display: flex !important;
  justify-content: space-between !important;
  align-items: center !important;
  width: 100% !important;
  padding: 0 !important; /* Remove qualquer margem interna */
  margin: 0 !important;
}

/* A seta cola à parede esquerda */
.settings-back-btn {
  margin-left: 0 !important;
  padding-left: 0 !important;
  justify-self: flex-start !important;
}

/* A frase cola à parede direita */
.settings-quote {
  margin-right: 0 !important;
  padding-right: 0 !important;
  justify-self: flex-end !important;
  border-right: none !important; /* Garante que a borda fica à esquerda da frase */
}

/* A marca fica no centro, mas damos-lhe um pequeno respiro para não tocar na seta/frase */
.settings-brand {
  padding: 0 10px !important; 
}
`;

fs.writeFileSync('pages/settings/settings.css', css);
console.log('Alinhamento extremo aplicado!');
