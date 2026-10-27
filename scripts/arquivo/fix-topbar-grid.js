const fs = require('fs');
let css = fs.readFileSync('pages/settings/settings.css', 'utf8');

// Remover as regras antigas que estão a causar o overflow
css = css.replace(/\.settings-brand[\s\S]*?\{[^}]*\}/g, '');
css = css.replace(/\.settings-quote\s*\{[^}]*\}/g, '');
css = css.replace(/\.settings-back-btn\s*\{[^}]*\}/g, '');
css = css.replace(/\.settings-header-top\s*\{[^}]*\}/g, '');

css += `

/* =========================================
   TOPBAR FINAL COM GRID (V502)
   ========================================= */

.settings-header-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding: 0 16px;
}

/* Seta de voltar com largura fixa para não empurrar os outros elementos */
.settings-back-btn {
  background: transparent;
  border: none;
  color: #D4AF37;
  font-size: 1.6rem;
  cursor: pointer;
  padding: 0;
  line-height: 1;
  font-family: 'Manrope', sans-serif;
  font-weight: 300;
  width: 30px;
  flex-shrink: 0;
}

/* Bloco da Marca usando Grid (Símbolo | Textos) */
.settings-brand {
  display: grid;
  grid-template-columns: auto auto;
  grid-template-rows: auto auto;
  column-gap: 10px;
  row-gap: 2px;
  align-items: center;
  justify-content: center;
  flex: 1; /* Ocupa o centro */
}

/* O Símbolo ocupa as duas linhas da esquerda */
.settings-brand-symbol {
  grid-column: 1;
  grid-row: 1 / span 2;
  width: 40px;
  height: 40px;
  margin: 0;
}

/* LUMIÈRE na linha de cima */
.settings-brand-name {
  grid-column: 2;
  grid-row: 1;
  font-family: 'Cinzel', serif;
  font-size: 1.3rem;
  color: #D4AF37;
  letter-spacing: 6px;
  margin: 0;
  line-height: 1;
  font-weight: 700;
  text-shadow: 0 2px 4px rgba(0,0,0,0.5);
}

/* LIFE MANAGER na linha de baixo */
.settings-brand-tagline {
  grid-column: 2;
  grid-row: 2;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
  font-family: 'Manrope', sans-serif;
  font-size: 0.55rem;
  color: #F5F0EB;
  letter-spacing: 4px;
  text-transform: uppercase;
}

/* As linhas laterais do LIFE MANAGER */
.settings-brand-tagline::before,
.settings-brand-tagline::after {
  content: '';
  height: 1px;
  width: 15px;
  background: rgba(212, 175, 55, 0.6);
}

/* A frase inspiradora (largura fixa para não ser empurrada) */
.settings-quote {
  font-family: 'Playfair Display', serif;
  font-style: italic;
  font-size: 0.6rem;
  color: #F5F0EB;
  text-align: right;
  line-height: 1.2;
  border-left: 1px solid rgba(212, 175, 55, 0.6);
  padding-left: 10px;
  width: 90px;
  flex-shrink: 0; /* Impede que a marca a esmague */
  margin-left: 10px;
}
`;

fs.writeFileSync('pages/settings/settings.css', css);
console.log('CSS Grid aplicado na topbar!');
