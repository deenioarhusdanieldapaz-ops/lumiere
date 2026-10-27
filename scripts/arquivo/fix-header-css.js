const fs = require('fs');
let css = fs.readFileSync('pages/settings/settings.css', 'utf8');

// Substituir a regra antiga de transparência por display: none
css = css.replace(/body:has\(\.settings-page\) \.app-topbar \{[\s\S]*?\}/m, `body:has(.settings-page) .app-topbar { display: none !important; }`);

// Remover os text-shadows antigos que já não são precisos
css = css.replace(/body:has\(\.settings-page\) \.app-topbar \* \{[\s\S]*?\}/g, '');

// Adicionar estilos para o novo cabeçalho personalizado
css += `

/* =========================================
   CABEÇALHO PERSONALIZADO DAS DEFINIÇÕES
   ========================================= */
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
}

.settings-back-btn {
  background: transparent;
  border: none;
  color: #D4AF37;
  font-size: 1.8rem;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.settings-brand {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
}

.settings-brand-symbol {
  width: 40px;
  height: 40px;
  margin-bottom: 4px;
}

.settings-brand-name {
  font-family: 'Cinzel', serif;
  font-size: 1.2rem;
  color: #D4AF37;
  letter-spacing: 4px;
  margin: 0;
}

.settings-brand-tagline {
  font-family: 'Manrope', sans-serif;
  font-size: 0.6rem;
  color: #F5F0EB;
  letter-spacing: 3px;
  text-transform: uppercase;
}

.settings-quote {
  font-family: 'Playfair Display', serif;
  font-style: italic;
  font-size: 0.75rem;
  color: #F5F0EB;
  text-align: right;
  max-width: 100px;
  line-height: 1.2;
}

.settings-page-title {
  font-family: 'Cinzel', serif;
  font-size: 1.6rem;
  color: #D4AF37;
  margin: 16px 0 4px 0;
  letter-spacing: 2px;
}

.settings-page-subtitle {
  font-family: 'Manrope', sans-serif;
  font-size: 0.9rem;
  color: #B9B2A8;
  margin: 0;
}
`;
fs.writeFileSync('pages/settings/settings.css', css);
console.log('CSS do novo cabeçalho e topbar escondida aplicados!');
