const fs = require('fs');
let css = fs.readFileSync('pages/settings/settings.css', 'utf8');

// 1. Remover todas as regras antigas e duplicadas do cabeçalho e do padding errado
css = css.replace(/\.settings-custom-header\s*\{[^}]*\}/g, '');
css = css.replace(/\.settings-header-top\s*\{[^}]*\}/g, '');
css = css.replace(/\.settings-back-btn\s*\{[^}]*\}/g, '');
css = css.replace(/\.settings-brand\s*\{[^}]*\}/g, '');
css = css.replace(/\.settings-brand-symbol\s*\{[^}]*\}/g, '');
css = css.replace(/\.settings-brand-name\s*\{[^}]*\}/g, '');
css = css.replace(/\.settings-brand-tagline\s*\{[^}]*\}/g, '');
css = css.replace(/\.settings-quote\s*\{[^}]*\}/g, '');
css = css.replace(/\.settings-page-title\s*\{[^}]*\}/g, '');
css = css.replace(/\.settings-page-subtitle\s*\{[^}]*\}/g, '');
css = css.replace(/\.settings-page\s*\{\n  padding-top:[^}]*\}/g, ''); // Remove o padding errado

// 2. Adicionar o bloco final e limpo
css += `

/* =========================================
   DEFINIÇÕES: LAYOUT FINAL (V498)
   ========================================= */

/* Esconder a topbar global */
body:has(.settings-page) .app-topbar {
  display: none !important;
}

/* Garantir que a página começa no topo sem buracos */
.settings-page {
  padding-top: max(16px, env(safe-area-inset-top)) !important;
}

/* Cabeçalho Personalizado */
.settings-custom-header {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 24px;
  width: 100%;
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
console.log('CSS definitivo aplicado com sucesso!');
