const fs = require('fs');
let css = fs.readFileSync('pages/settings/settings.css', 'utf8');

// 1. Remover todas as regras antigas relacionadas com a topbar global
css = css.replace(/\/\* =========================================[\s\S]*?TOPBAR TRANSPARENTE[\s\S]*?\}\n/g, '');
css = css.replace(/body:has\(\.settings-page\) \.app-topbar[\s\S]*?\}/g, '');
css = css.replace(/body:has\(\.settings-page\) \.app-topbar[\s\S]*?\{[^}]*\}/g, '');
css = css.replace(/\.settings-page \{\n  padding-top: calc[^\}]*\}/g, '');

// 2. Adicionar as regras limpas: esconder a topbar global e estilizar o cabeçalho novo
css += `

/* =========================================
   DEFINIÇÕES: CABEÇALHO PERSONALIZADO
   ========================================= */

/* Esconder a topbar global apenas nas Definições */
body:has(.settings-page) .app-topbar {
  display: none !important;
}

/* Estilo do novo cabeçalho (construído no JS) */
.settings-custom-header {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 24px;
  padding-top: max(16px, env(safe-area-inset-top));
}

.settings-header-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.settings-back-btn {
  background: transparent;
  border: none;
  color: #D4AF37;
  font-size: 1.8rem;
  cursor: pointer;
  padding: 0;
  line-height: 1;
  font-family: 'Manrope', sans-serif;
  font-weight: 300;
}

.settings-brand {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
}

.settings-brand-symbol {
  width: 32px;
  height: 32px;
  margin-bottom: 2px;
}

.settings-brand-name {
  font-family: 'Cinzel', serif;
  font-size: 1rem;
  color: #D4AF37;
  letter-spacing: 4px;
  margin: 0;
  line-height: 1;
}

.settings-brand-tagline {
  font-family: 'Manrope', sans-serif;
  font-size: 0.55rem;
  color: #F5F0EB;
  letter-spacing: 3px;
  text-transform: uppercase;
}

.settings-quote {
  font-family: 'Playfair Display', serif;
  font-style: italic;
  font-size: 0.7rem;
  color: #F5F0EB;
  text-align: right;
  max-width: 90px;
  line-height: 1.2;
}

.settings-page-title {
  font-family: 'Cinzel', serif;
  font-size: 1.6rem;
  color: #D4AF37;
  margin: 16px 0 4px 0;
  letter-spacing: 2px;
  text-transform: uppercase;
}

.settings-page-subtitle {
  font-family: 'Manrope', sans-serif;
  font-size: 0.9rem;
  color: #B9B2A8;
  margin: 0;
}
`;
fs.writeFileSync('pages/settings/settings.css', css);
console.log('CSS limpo e cabeçalho personalizado estilizado!');
