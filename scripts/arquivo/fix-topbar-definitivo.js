const fs = require('fs');
let css = fs.readFileSync('pages/settings/settings.css', 'utf8');

// Remover TUDO o que foi feito antes para a topbar
css = css.replace(/\.settings-header-top[\s\S]*?\{[^}]*\}/g, '');
css = css.replace(/\.settings-back-btn[\s\S]*?\{[^}]*\}/g, '');
css = css.replace(/\.settings-brand[\s\S]*?\{[^}]*\}/g, '');
css = css.replace(/\.settings-brand-name[\s\S]*?\{[^}]*\}/g, '');
css = css.replace(/\.settings-brand-tagline[\s\S]*?\{[^}]*\}/g, '');
css = css.replace(/\.settings-brand-tagline::before[\s\S]*?\{[^}]*\}/g, '');
css = css.replace(/\.settings-brand-tagline::after[\s\S]*?\{[^}]*\}/g, '');
css = css.replace(/\.settings-quote[\s\S]*?\{[^}]*\}/g, '');

// Adicionar o novo bloco limpo
css += `

/* =========================================
   TOPBAR DEFINITIVA E EQUILIBRADA (V503)
   ========================================= */

.settings-header-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding: 0 10px;
  gap: 8px; /* Espaçamento entre os blocos */
}

/* A Seta */
.settings-back-btn {
  background: transparent;
  border: none;
  color: #D4AF37;
  font-size: 1.6rem;
  cursor: pointer;
  padding: 0;
  line-height: 1;
  width: 24px;
  flex-shrink: 0; /* Impede a seta de ser esmagada */
}

/* A Marca (Símbolo à esquerda, Texto à direita) */
.settings-brand {
  display: grid;
  grid-template-columns: auto auto;
  grid-template-rows: auto auto;
  column-gap: 8px;
  align-items: center;
  justify-content: center;
  flex: 1; /* Ocupa o espaço central */
}

/* O Símbolo */
.settings-brand-symbol {
  grid-column: 1;
  grid-row: 1 / span 2;
  width: 36px;
  height: 36px;
  margin: 0;
}

/* LUMIÈRE */
.settings-brand-name {
  grid-column: 2;
  grid-row: 1;
  font-family: 'Cinzel', serif;
  font-size: 1.15rem; /* Ligeiramente mais pequeno para caber */
  color: #D4AF37;
  letter-spacing: 5px;
  margin: 0;
  line-height: 1;
  font-weight: 700;
  white-space: nowrap; /* Impede quebra de linha */
}

/* LIFE MANAGER (e as suas linhas) */
.settings-brand-tagline {
  grid-column: 2;
  grid-row: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-family: 'Manrope', sans-serif;
  font-size: 0.5rem;
  color: #F5F0EB;
  letter-spacing: 2px;
  text-transform: uppercase;
  white-space: nowrap; /* OBRIGATÓRIO para não quebrar o texto */
}

.settings-brand-tagline::before,
.settings-brand-tagline::after {
  content: '';
  height: 1px;
  width: 12px; /* Linhas curtas e elegantes */
  background: rgba(212, 175, 55, 0.6);
  flex-shrink: 0;
}

/* A Frase Inspiradora */
.settings-quote {
  font-family: 'Playfair Display', serif;
  font-style: italic;
  font-size: 0.55rem; /* Tamanho mais pequeno para caber */
  color: #F5F0EB;
  text-align: right;
  line-height: 1.2;
  border-left: 1px solid rgba(212, 175, 55, 0.6);
  padding-left: 8px;
  width: 75px; /* Largura fixa para não ser esmagada */
  flex-shrink: 0; /* Impede a frase de desaparecer */
}
`;

fs.writeFileSync('pages/settings/settings.css', css);
console.log('Topbar definitiva aplicada com sucesso!');
