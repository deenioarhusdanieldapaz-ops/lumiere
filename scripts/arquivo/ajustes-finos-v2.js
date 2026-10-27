const fs = require('fs');
let css = fs.readFileSync('pages/settings/settings.css', 'utf8');

css += `

/* =========================================
   AJUSTES FINAIS V2 (V500)
   ========================================= */

/* 1. Frase (Vermelho) - Diminuir 23% */
.settings-quote {
  font-size: 0.47rem !important; /* 0.61 * 0.77 */
  line-height: 1.2 !important;
}

/* 2. Marca (Azul) - Aumentar 19% */
.settings-brand {
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
  transform: scale(1.19);
  transform-origin: center top;
}

/* 3. Texto LUMIÈRE (Laranja) - Aumentar densidade em 27% */
.settings-brand-name {
  font-weight: 700 !important; 
  letter-spacing: 5px !important;
  margin-top: 4px !important;
}

/* 4. Símbolo (Preto) - Garantir que fica acima do texto e sem sobreposição */
.settings-brand-symbol {
  display: block !important;
  margin-bottom: 0 !important;
  margin-top: 0 !important;
  position: relative;
  z-index: 2;
}
`;
fs.writeFileSync('pages/settings/settings.css', css);
console.log('Ajustes V2 aplicados com sucesso!');
