const fs = require('fs');
let css = fs.readFileSync('pages/settings/settings.css', 'utf8');

css += `

/* =========================================
   ESTILOS DA LISTA DE DEFINIÇÕES (V510)
   ========================================= */

/* Cartão de Perfil */
.settings-profile-card {
  display: flex;
  align-items: center;
  background: rgba(23, 21, 18, 0.6);
  border: 1px solid rgba(212, 175, 55, 0.3);
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 24px;
  gap: 16px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
}

.settings-profile-card::before {
  content: '';
  position: absolute;
  inset: 0;
  background: url('../../assets/bg/settings-bg.webp') center/cover;
  opacity: 0.2;
  z-index: 0;
}

.settings-profile-avatar {
  position: relative;
  z-index: 1;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: #333;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #D4AF37;
  font-weight: bold;
  border: 2px solid #D4AF37;
}

.settings-profile-info {
  position: relative;
  z-index: 1;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.settings-profile-name {
  font-family: 'Manrope', sans-serif;
  font-size: 1.1rem;
  color: #F5F0EB;
  font-weight: 600;
  margin: 0;
}

.settings-profile-sub {
  font-family: 'Manrope', sans-serif;
  font-size: 0.8rem;
  color: #B9B2A8;
  margin: 2px 0 0 0;
}

.settings-profile-loc {
  font-family: 'Manrope', sans-serif;
  font-size: 0.75rem;
  color: #D4AF37;
  margin-top: 4px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.settings-profile-arrow {
  position: relative;
  z-index: 1;
  color: #B9B2A8;
  font-size: 1.2rem;
}

/* Títulos de Secção */
.settings-section-title {
  display: flex;
  align-items: center;
  gap: 12px;
  font-family: 'Manrope', sans-serif;
  font-size: 0.75rem;
  color: #B9B2A8;
  letter-spacing: 2px;
  text-transform: uppercase;
  margin: 24px 0 12px 0;
}

.settings-section-title::after {
  content: '';
  flex: 1;
  height: 1px;
  background: rgba(185, 178, 168, 0.2);
}

/* Linhas de Menu */
.settings-menu-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.settings-menu-row {
  display: flex;
  align-items: center;
  background: rgba(23, 21, 18, 0.6);
  border: 1px solid rgba(64, 53, 29, 0.5);
  border-radius: 12px;
  padding: 12px 16px;
  cursor: pointer;
  transition: background 0.2s;
}

.settings-menu-row:active {
  background: rgba(212, 175, 55, 0.1);
}

.settings-menu-icon {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(212, 175, 55, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
  color: #D4AF37;
}

.settings-menu-text {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.settings-menu-title {
  font-family: 'Manrope', sans-serif;
  font-size: 0.95rem;
  color: #F5F0EB;
  margin: 0;
}

.settings-menu-sub {
  font-family: 'Manrope', sans-serif;
  font-size: 0.75rem;
  color: #B9B2A8;
  margin: 2px 0 0 0;
}

.settings-menu-arrow {
  color: #B9B2A8;
  font-size: 1.2rem;
  margin-left: 8px;
}

/* Botão Apagar Dados (Vermelho) */
.settings-row-danger {
  border-color: rgba(231, 76, 60, 0.4);
  background: rgba(231, 76, 60, 0.05);
}
.settings-row-danger .settings-menu-icon {
  color: #e74c3c;
  background: rgba(231, 76, 60, 0.1);
}
.settings-row-danger .settings-menu-title {
  color: #e74c3c;
}
`;
fs.writeFileSync('pages/settings/settings.css', css);
console.log('CSS dos cartões aplicado!');
