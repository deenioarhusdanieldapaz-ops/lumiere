const fs = require('fs');
let js = fs.readFileSync('pages/settings/settings.js', 'utf8');

const oldElseBlock = `  } else {
    page.appendChild(renderPreferences());
    page.appendChild(renderPomodoro());
    page.appendChild(renderBackup());
    page.appendChild(renderActions());
  }`;

const newElseBlock = `  } else {
    // Cartão de Perfil
    const profileCard = document.createElement('div');
    profileCard.className = 'settings-profile-card';
    profileCard.innerHTML = \`
      <div class="settings-profile-avatar">DA</div>
      <div class="settings-profile-info">
        <p class="settings-profile-name">Arrhinuis</p>
        <p class="settings-profile-sub">Daniel Alfredo</p>
        <p class="settings-profile-loc">📍 Marromeu, Moçambique</p>
      </div>
      <div class="settings-profile-arrow">›</div>
    \`;
    page.appendChild(profileCard);

    function createSettingsRow(title, sub, icon, renderFn) {
      const row = document.createElement('div');
      row.className = 'settings-menu-row';
      row.innerHTML = \`
        <div class="settings-menu-icon">\${icon}</div>
        <div class="settings-menu-text">
          <p class="settings-menu-title">\${title}</p>
          <p class="settings-menu-sub">\${sub}</p>
        </div>
        <div class="settings-menu-arrow">›</div>
      \`;
      row.onclick = () => {
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.8);z-index:9998;display:flex;flex-direction:column;justify-content:flex-end;';
        const sheet = document.createElement('div');
        sheet.style.cssText = 'background:#0A0A0A;border-top:1px solid #D4AF37;border-radius:20px 20px 0 0;padding:20px;max-height:80vh;overflow-y:auto;transform:translateY(100%);transition:transform 0.3s;';
        const header = document.createElement('div');
        header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;';
        const h2 = document.createElement('h2');
        h2.style.cssText = 'color:#D4AF37;font-family:"Cinzel",serif;font-size:1.2rem;margin:0;';
        h2.textContent = title;
        const closeBtn = document.createElement('button');
        closeBtn.style.cssText = 'background:transparent;border:none;color:#F5F0EB;font-size:1.5rem;cursor:pointer;';
        closeBtn.innerHTML = '✕';
        closeBtn.onclick = () => {
          sheet.style.transform = 'translateY(100%)';
          setTimeout(() => overlay.remove(), 300);
        };
        header.append(h2, closeBtn);
        sheet.appendChild(header);
        
        const content = renderFn();
        if(content) {
          content.style.padding = '0';
          sheet.appendChild(content);
        }

        overlay.appendChild(sheet);
        requestAnimationFrame(() => { sheet.style.transform = 'translateY(0)'; });
        overlay.addEventListener('click', (e) => { if (e.target === overlay) closeBtn.click(); });
        document.body.appendChild(overlay);
      };
      return row;
    }

    // GERAL
    const secGeral = document.createElement('div');
    secGeral.className = 'settings-section-title';
    secGeral.textContent = 'GERAL';
    page.appendChild(secGeral);
    
    const listGeral = document.createElement('div');
    listGeral.className = 'settings-menu-list';
    listGeral.appendChild(createSettingsRow('Preferências', 'Tema, idioma e notificações', '⚙️', renderPreferences));
    page.appendChild(listGeral);

    // FOCO E PRODUTIVIDADE
    const secFoco = document.createElement('div');
    secFoco.className = 'settings-section-title';
    secFoco.textContent = 'FOCO E PRODUTIVIDADE';
    page.appendChild(secFoco);

    const listFoco = document.createElement('div');
    listFoco.className = 'settings-menu-list';
    listFoco.appendChild(createSettingsRow('Pomodoro', 'Duração das sessões e pausas', '⏱️', renderPomodoro));
    page.appendChild(listFoco);

    // DADOS E SEGURANÇA
    const secDados = document.createElement('div');
    secDados.className = 'settings-section-title';
    secDados.textContent = 'DADOS E SEGURANÇA';
    page.appendChild(secDados);

    const listDados = document.createElement('div');
    listDados.className = 'settings-menu-list';
    listDados.appendChild(createSettingsRow('Backup', 'Cópias de segurança', '☁️', renderBackup));
    page.appendChild(listDados);

    // AVANÇADO
    const secAvancado = document.createElement('div');
    secAvancado.className = 'settings-section-title';
    secAvancado.textContent = 'AVANÇADO';
    page.appendChild(secAvancado);

    const listAvancado = document.createElement('div');
    listAvancado.className = 'settings-menu-list';
    
    const rowPerigo = createSettingsRow('Apagar todos os dados', 'Esta ação é irreversível', '🗑️', renderActions);
    rowPerigo.classList.add('settings-row-danger');
    listAvancado.appendChild(rowPerigo);
    page.appendChild(listAvancado);
  }`;

if (js.includes(oldElseBlock)) {
    js = js.replace(oldElseBlock, newElseBlock);
    fs.writeFileSync('pages/settings/settings.js', js);
    console.log('Estrutura do menu aplicada!');
} else {
    console.log('ERRO: Bloco original não encontrado.');
}
