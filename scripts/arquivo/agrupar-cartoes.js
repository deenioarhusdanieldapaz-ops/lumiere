const fs = require('fs');
let js = fs.readFileSync('pages/settings/settings.js', 'utf8');
let css = fs.readFileSync('pages/settings/settings.css', 'utf8');

// --- 1. JS: Criar o contentor de grupo e mover os itens para dentro dele ---
const oldGeral = `    const listGeral = document.createElement('div');
    listGeral.className = 'settings-menu-list';
    listGeral.appendChild(createSettingsRow('Aparência', 'Tema, intensidade dourada e tamanho da interface', '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z"></path></svg>', renderAppearanceModal));
    listGeral.appendChild(createSettingsRow('Idioma', 'Escolhe o teu idioma preferido', '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>', renderLanguageModal));
    listGeral.appendChild(createSettingsRow('Notificações', 'Alertas, lembretes e sons', '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>', renderNotificationsModal));
    page.appendChild(listGeral);`;

const newGeral = `    const groupGeral = document.createElement('div');
    groupGeral.className = 'settings-menu-group';
    groupGeral.appendChild(createSettingsRow('Aparência', 'Tema, intensidade dourada e tamanho da interface', '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z"></path></svg>', renderAppearanceModal));
    groupGeral.appendChild(createSettingsRow('Idioma', 'Escolhe o teu idioma preferido', '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>', renderLanguageModal));
    groupGeral.appendChild(createSettingsRow('Notificações', 'Alertas, lembretes e sons', '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>', renderNotificationsModal));
    page.appendChild(groupGeral);`;

if(js.includes(oldGeral)) {
    js = js.replace(oldGeral, newGeral);
    fs.writeFileSync('pages/settings/settings.js', js);
    console.log('JS agrupado com sucesso!');
} else {
    console.log('ERRO: Estrutura do GERAL não encontrada no JS.');
}

// --- 2. CSS: Estilizar o grupo ---
css += `

/* =========================================
   AGRUPAMENTO DE CARTÕES (V516)
   ========================================= */

.settings-menu-group {
  display: flex;
  flex-direction: column;
  background: rgba(23, 21, 18, 0.6);
  border-left: 3px solid #D4AF37; /* A linha dourada à esquerda */
  border-radius: 12px;
  overflow: hidden; /* Para os cantos arredondados funcionarem */
}

/* Ajustar as linhas dentro do grupo para ficarem coladas e sem bordas duplas */
.settings-menu-group .settings-menu-row {
  background: transparent !important;
  border: none !important;
  border-bottom: 1px solid rgba(212, 175, 55, 0.1) !important; /* Linha divisória fina */
  border-radius: 0 !important;
}

/* Remover a borda divisória do último item para não ficar dupla com o fecho */
.settings-menu-group .settings-menu-row:last-child {
  border-bottom: none !important;
}
`;

fs.writeFileSync('pages/settings/settings.css', css);
console.log('CSS do grupo aplicado!');
