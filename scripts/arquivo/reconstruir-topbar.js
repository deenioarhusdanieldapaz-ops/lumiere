const fs = require('fs');
let css = fs.readFileSync('pages/settings/settings.css', 'utf8');

// 1. Remover TODAS as regras relacionadas com a topbar para evitar conflitos
css = css.replace(/\.settings-custom-header\s*\{[^}]*\}/g, '');
css = css.replace(/\.settings-header-top\s*\{[^}]*\}/g, '');
css = css.replace(/\.settings-back-btn\s*\{[^}]*\}/g, '');
css = css.replace(/\.settings-brand[\s\S]*?\{[^}]*\}/g, ''); // apanha brand, brand-name, brand-symbol, brand-tagline
css = css.replace(/\.settings-quote\s*\{[^}]*\}/g, '');
css = css.replace(/\.settings-page-title\s*\{[^}]*\}/g, '');
css = css.replace(/\.settings-page-subtitle\s*\{[^}]*\}/g, '');

// 2. Escrever a nova estrutura limpa e idêntica à referência
css += `

/* =========================================
   TOPBAR DEFINITIVA (IGUAL À REFERÊNCIA)
   ========================================= */

.settings-custom-header {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 24px;
  width: 100%;
  padding-top: max(16px, env(safe-area-inset-top));
}

/* Alinhamento central de todos os elementos */
.settings-header-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

/* Seta de voltar */
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
  width: 40px; /* Garante espaço fixo para não desalinhar */
  text-align: left;
}

/* Bloco da Marca (Símbolo + Texto lado a lado) */
.settings-brand {
  display: flex;
  flex-direction: row; /* Coloca o símbolo ao lado do texto */
  align-items: center;
  justify-content: center;
  gap: 12px;
  flex: 1;
}

/* Símbolo */
.settings-brand-symbol {
  width: 42px;
  height: 42px;
  margin: 0;
  display: block;
}

/* Texto LUMIÈRE */
.settings-brand-name {
  font-family: 'Cinzel', serif;
  font-size: 1.3rem;
  color: #D4AF37;
  letter-spacing: 6px;
  margin: 0;
  line-height: 1;
  font-weight: 700;
  text-shadow: 0 2px 4px rgba(0,0,0,0.5);
}

/* Texto LIFE MANAGER + Linhas laterais */
.settings-brand-tagline {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-family: 'Manrope', sans-serif;
  font-size: 0.55rem;
  color: #F5F0EB;
  letter-spacing: 4px;
  text-transform: uppercase;
  margin-top: 4px;
}

/* As linhas laterais do LIFE MANAGER */
.settings-brand-tagline::before,
.settings-brand-tagline::after {
  content: '';
  height: 1px;
  width: 20px;
  background: rgba(212, 175, 55, 0.6);
}

/* Frase Inspiradora */
.settings-quote {
  font-family: 'Playfair Display', serif;
  font-style: italic;
  font-size: 0.65rem;
  color: #F5F0EB;
  text-align: right;
  line-height: 1.2;
  border-left: 1px solid rgba(212, 175, 55, 0.6); /* Linha divisória */
  padding-left: 12px;
  width: 100px; /* Largura fixa para não empurrar a marca */
  margin-left: 8px;
}

/* Título DEFINIÇÕES */
.settings-page-title {
  font-family: 'Cinzel', serif;
  font-size: 1.6rem;
  color: #D4AF37;
  margin: 10px 0 0 0;
  letter-spacing: 2px;
  text-transform: uppercase;
}

/* Subtítulo */
.settings-page-subtitle {
  font-family: 'Manrope', sans-serif;
  font-size: 0.9rem;
  color: #B9B2A8;
  margin: 0;
}
`;

fs.writeFileSync('pages/settings/settings.css', css);
console.log('CSS da topbar reconstruído com sucesso!');
