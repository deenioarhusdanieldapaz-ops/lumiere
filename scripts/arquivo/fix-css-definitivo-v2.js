const fs = require('fs');
let css = fs.readFileSync('pages/settings/settings.css', 'utf8');

// 1. Remover TODAS as regras antigas que possam estar a conflituar
const classesToRemove = [
  '.settings-page', '.settings-custom-header', '.settings-header-top', 
  '.settings-back-btn', '.settings-brand', '.settings-brand-symbol', 
  '.settings-brand-name', '.settings-brand-tagline', '.settings-quote', 
  '.settings-page-title', '.settings-page-subtitle', '.settings-profile-card', 
  '.settings-profile-avatar', '.settings-profile-info', '.settings-profile-name', 
  '.settings-profile-sub', '.settings-profile-loc', '.settings-profile-arrow', 
  '.settings-section-title', '.settings-menu-list', '.settings-menu-row', 
  '.settings-menu-icon', '.settings-menu-text', '.settings-menu-title', 
  '.settings-menu-sub', '.settings-menu-arrow', '.settings-row-danger'
];

classesToRemove.forEach(cls => {
  const regex = new RegExp(`\\${cls}[\\s\\S]*?\\{[^}]*\\}`, 'g');
  css = css.replace(regex, '');
});

// 2. Adicionar o bloco definitivo, limpo e organizado
css += `

/* =========================================
   DEFINIÇÕES: ESTILO FINAL DEFINITIVO (V512)
   ========================================= */

/* Esconder a topbar global e remover o padding do contentor principal */
body:has(.settings-page) .app-topbar { display: none !important; }
body:has(.settings-page) .app-content { padding: 0 !important; margin: 0 !important; }

/* O contentor principal das Definições */
.settings-page {
  position: relative;
  min-height: 100%;
  padding: max(16px, env(safe-area-inset-top)) 16px 80px 16px;
  background: linear-gradient(180deg, rgba(10,10,10,0.4) 0%, rgba(10,10,10,0.85) 100%), url('../../assets/bg/settings-bg.webp') center top / cover no-repeat;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* --- CABEÇALHO --- */
.settings-custom-header { display: flex; flex-direction: column; gap: 12px; }
.settings-header-top { display: flex; justify-content: space-between; align-items: center; }

.settings-back-btn {
  background: transparent; border: none; color: #D4AF37;
  font-size: 1.4rem; cursor: pointer; padding: 0; line-height: 1;
  width: 24px; flex-shrink: 0;
}

.settings-brand {
  display: grid; grid-template-columns: auto auto; grid-template-rows: auto auto;
  column-gap: 10px; row-gap: 2px; align-items: center; justify-content: center; flex: 1;
}
.settings-brand-symbol { grid-column: 1; grid-row: 1 / span 2; width: 50px; height: 50px; margin: 0; }
.settings-brand-name {
  grid-column: 2; grid-row: 1; font-family: 'Cinzel', serif;
  font-size: 1.3rem; color: #D4AF37; letter-spacing: 6px; margin: 0; line-height: 1; font-weight: 700;
}
.settings-brand-tagline {
  grid-column: 2; grid-row: 2; display: flex; align-items: center; justify-content: center;
  gap: 8px; font-family: 'Manrope', sans-serif; font-size: 0.55rem;
  color: #F5F0EB; letter-spacing: 4px; text-transform: uppercase;
}
.settings-brand-tagline::before, .settings-brand-tagline::after {
  content: ''; height: 1px; width: 15px; background: rgba(212, 175, 55, 0.6); flex-shrink: 0;
}
.settings-quote {
  font-family: 'Playfair Display', serif; font-style: italic; font-size: 0.46rem;
  color: #F5F0EB; text-align: right; line-height: 1.2;
  border-left: 1px solid rgba(212, 175, 55, 0.6); padding-left: 8px;
  width: 75px; flex-shrink: 0;
}
.settings-page-title {
  font-family: 'Cinzel', serif; font-size: 1.6rem; color: #D4AF37;
  margin: 10px 0 0 0; letter-spacing: 2px; text-transform: uppercase;
}
.settings-page-subtitle {
  font-family: 'Manrope', sans-serif; font-size: 0.9rem; color: #B9B2A8; margin: 0;
}

/* --- CARTÃO DE PERFIL --- */
.settings-profile-card {
  display: flex; align-items: center; background: rgba(23, 21, 18, 0.6);
  border: 1px solid rgba(212, 175, 55, 0.3); border-radius: 16px;
  padding: 16px; gap: 16px; position: relative; overflow: hidden;
}
.settings-profile-avatar {
  width: 50px; height: 50px; border-radius: 50%; background: #333;
  display: flex; align-items: center; justify-content: center;
  color: #D4AF37; font-weight: bold; border: 2px solid #D4AF37; flex-shrink: 0;
}
.settings-profile-info { flex: 1; display: flex; flex-direction: column; }
.settings-profile-name { font-family: 'Manrope', sans-serif; font-size: 1.1rem; color: #F5F0EB; font-weight: 600; margin: 0; }
.settings-profile-sub { font-family: 'Manrope', sans-serif; font-size: 0.8rem; color: #B9B2A8; margin: 2px 0 0 0; }
.settings-profile-loc { font-family: 'Manrope', sans-serif; font-size: 0.75rem; color: #D4AF37; margin-top: 4px; }
.settings-profile-arrow { color: #B9B2A8; font-size: 1.2rem; }

/* --- SECÇÕES E LINHAS --- */
.settings-section-title {
  display: flex; align-items: center; gap: 12px;
  font-family: 'Manrope', sans-serif; font-size: 0.75rem; color: #B9B2A8;
  letter-spacing: 2px; text-transform: uppercase; margin: 10px 0 0 0;
}
.settings-section-title::after {
  content: ''; flex: 1; height: 1px; background: rgba(185, 178, 168, 0.2);
}
.settings-menu-list { display: flex; flex-direction: column; gap: 12px; }
.settings-menu-row {
  display: flex; align-items: center; background: rgba(23, 21, 18, 0.6);
  border: 1px solid rgba(64, 53, 29, 0.5); border-radius: 12px;
  padding: 12px 16px; cursor: pointer;
}
.settings-menu-icon {
  width: 36px; height: 36px; border-radius: 50%; background: rgba(212, 175, 55, 0.1);
  display: flex; align-items: center; justify-content: center; margin-right: 12px; color: #D4AF37;
}
.settings-menu-text { flex: 1; display: flex; flex-direction: column; }
.settings-menu-title { font-family: 'Manrope', sans-serif; font-size: 0.95rem; color: #F5F0EB; margin: 0; }
.settings-menu-sub { font-family: 'Manrope', sans-serif; font-size: 0.75rem; color: #B9B2A8; margin: 2px 0 0 0; }
.settings-menu-arrow { color: #B9B2A8; font-size: 1.2rem; margin-left: 8px; }

/* --- BOTÃO PERIGO --- */
.settings-row-danger { border-color: rgba(231, 76, 60, 0.4); background: rgba(231, 76, 60, 0.05); }
.settings-row-danger .settings-menu-icon { color: #e74c3c; background: rgba(231, 76, 60, 0.1); }
.settings-row-danger .settings-menu-title { color: #e74c3c; }
`;

fs.writeFileSync('pages/settings/settings.css', css);
console.log('CSS limpo e reconstruído com sucesso!');
