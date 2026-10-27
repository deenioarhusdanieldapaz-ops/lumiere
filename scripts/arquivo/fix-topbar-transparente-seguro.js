const fs = require('fs');
let css = fs.readFileSync('pages/settings/settings.css', 'utf8');

css += `

/* =========================================
   TOPBAR TRANSPARENTE (APENAS NAS DEFINIÇÕES)
   ========================================= */
body:has(.settings-page) .app-topbar {
  background: transparent !important;
  border-bottom-color: transparent !important;
  box-shadow: none !important;
}

/* Sombras para os elementos da topbar continuarem legíveis */
body:has(.settings-page) .app-topbar__brand-name,
body:has(.settings-page) .app-topbar__brand-tagline-text,
body:has(.settings-page) .app-topbar__user-name,
body:has(.settings-page) .app-topbar__toggle-icon,
body:has(.settings-page) .app-topbar__action-icon {
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8) !important;
  color: #F5F0EB !important;
}

body:has(.settings-page) .app-topbar__brand-symbol {
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.8)) !important;
}

/* Compensar o espaço da topbar para o conteúdo não ficar por baixo */
.settings-page {
  padding-top: calc(var(--space-md, 1rem) + 60px) !important; 
}
`;
fs.writeFileSync('pages/settings/settings.css', css);
console.log('Topbar transparente nas Definições com segurança!');
