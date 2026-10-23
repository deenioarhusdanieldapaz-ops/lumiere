(function() {
    // Verifica se o onboarding já foi concluído
    if (localStorage.getItem('lumiere_onb_completed') === 'true') {
        console.log('[Onboarding] Já concluído. A preparar a App Shell...');
        
        // Esconde a tela do onboarding (a div #app)
        const appEl = document.getElementById('app');
        if (appEl) {
            appEl.classList.add('onb-hidden');
            appEl.hidden = true;
        }
        
        // Mostra a App Shell (remove o hidden)
        const appShell = document.getElementById('app-shell');
        if (appShell) {
            appShell.hidden = false;
            appShell.removeAttribute('hidden');
        }
        
        // Sai do script do onboarding para o app.js assumir
        return; 
    }

    const state = { step: 1, name: '', priorityAreas: [], aspirations: [], otherAspiration: '' };
    const appEl = document.getElementById('app');
    
    // Esconde a app principal e remove HTMLs antigos de onboarding se existirem
    if (appEl) appEl.classList.add('onb-hidden');
    document.querySelectorAll('.onboarding').forEach(el => el.remove());

    // Criação da estrutura base
    const container = document.createElement('div');
    container.className = 'onb-container';
    const overlay = document.createElement('div');
    overlay.className = 'onb-overlay';
    const content = document.createElement('div');
    content.className = 'onb-content';

    container.appendChild(overlay);
    container.appendChild(content);
    document.body.appendChild(container);

    // Funções Utilitárias
    function createProgress() {
        const prog = document.createElement('div');
        prog.className = 'onb-progress';
        for (let i = 1; i <= 4; i++) {
            const dot = document.createElement('div');
            dot.className = `onb-dot ${i === state.step ? 'active' : ''}`;
            prog.appendChild(dot);
        }
        return prog;
    }

    function createBtn(text, onClick, isBack = false) {
        const btn = document.createElement('button');
        btn.className = 'onb-btn';
        if (isBack) {
            btn.style.background = 'transparent';
            btn.style.border = 'none';
            btn.style.color = '#B9B2A8';
            btn.style.marginTop = '10px';
        }
        btn.textContent = text;
        btn.addEventListener('click', onClick);
        return btn;
    }

    function createOptionCard(titleText, value, isMultiple) {
        const card = document.createElement('button');
        card.className = 'onb-option';
        card.style.cssText = 'width:100%; padding:16px; margin-bottom:10px; background:#171512; border:1px solid #40351D; border-radius:12px; color:#F5F0EB; text-align:left; font-size:1rem; cursor:pointer; transition: all 0.2s;';
        
        card.onclick = () => {
            const isPressed = card.getAttribute('aria-pressed') === 'true';
            if (!isMultiple) {
                document.querySelectorAll('.onb-option').forEach(c => {
                    c.setAttribute('aria-pressed', 'false');
                    c.style.borderColor = '#40351D';
                    c.style.boxShadow = 'none';
                });
            }
            const nextState = !isPressed;
            card.setAttribute('aria-pressed', nextState.toString());
            card.style.borderColor = nextState ? '#E8C968' : '#40351D';
            card.style.boxShadow = nextState ? '0 0 0 1px rgba(212,175,55,.22)' : 'none';
            
            if (isMultiple) {
                const idx = state.priorityAreas.indexOf(value);
                if (nextState && idx === -1) state.priorityAreas.push(value);
                if (!nextState && idx > -1) state.priorityAreas.splice(idx, 1);
            } else {
                state.aspirations = nextState ? [value] : [];
            }
        };
        card.textContent = titleText;
        return card;
    }

    function clearContent() { content.replaceChildren(); }

    // --- ECRÃS ---


    function createSVGIcon(pathData, size = 24) {
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("width", size);
        svg.setAttribute("height", size);
        svg.setAttribute("viewBox", "0 0 24 24");
        svg.setAttribute("fill", "none");
        svg.setAttribute("stroke", "#D4AF37");
        svg.setAttribute("stroke-width", "2");
        svg.setAttribute("stroke-linecap", "round");
        svg.setAttribute("stroke-linejoin", "round");
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", pathData);
        svg.appendChild(path);
        return svg;
    }

    function createBrand() {
        const brandContainer = document.createElement('div');
        brandContainer.className = 'onb-brand';
        
        const logo = document.createElement('img');
        logo.src = 'assets/bg/logo.svg'; 
        logo.className = 'onb-logo-symbol';
        logo.alt = 'Lumière';
        
        const brandText = document.createElement('div');
        brandText.className = 'onb-brand-text';
        
        const brandName = document.createElement('h2');
        brandName.textContent = 'LUMIÈRE';
        
        const brandTagline = document.createElement('div');
        brandTagline.className = 'onb-brand-tagline';
        brandTagline.textContent = 'LIFE MANAGER';
        
        brandText.append(brandName, brandTagline);
        brandContainer.append(logo, brandText);
        
        return brandContainer;
    }

    function createTopBar(step) {
        const topBar = document.createElement('div');
        topBar.className = 'onb-topbar';
        
        const backBtn = document.createElement('button');
        backBtn.className = 'onb-back-btn';
        backBtn.textContent = 'Voltar';
        backBtn.onclick = () => { state.step = step - 1; if(step === 2) renderStep1(); else if(step === 3) renderStep2(); else if(step === 4) renderStep3(); };
        
        const progressBar = document.createElement('div');
        progressBar.className = 'onb-topbar-progress';
        
        const barContainer = document.createElement('div');
        barContainer.className = 'onb-bar-container';
        const barFill = document.createElement('div');
        barFill.className = 'onb-bar-fill';
        barFill.style.width = ((step / 4) * 100) + '%';
        barContainer.appendChild(barFill);
        
        const text = document.createElement('span');
        text.textContent = step + ' de 4';
        
        progressBar.append(barContainer, text);
        topBar.append(backBtn, progressBar);
        return topBar;
    }

    function renderStep1() {
        clearContent();
        container.classList.remove('onb-view-2', 'onb-view-3');
        
        const brandContainer = document.createElement('div');
        brandContainer.className = 'onb-brand';
        
        const logo = document.createElement('img');
        logo.src = 'assets/bg/logo.svg'; 
        logo.className = 'onb-logo-symbol';
        logo.alt = 'Lumière';

        const brandText = document.createElement('div');
        brandText.className = 'onb-brand-text';
        const brandName = document.createElement('h2');
        brandName.textContent = 'LUMIÈRE';
        const brandTagline = document.createElement('div');
        brandTagline.className = 'onb-brand-tagline';
        brandTagline.textContent = 'LIFE MANAGER';
        brandText.append(brandName, brandTagline);
        brandContainer.append(logo, brandText);

        const titleWrapper = document.createElement('div');
        titleWrapper.className = 'onb-title-wrapper';

        const title = document.createElement('h1');
        title.className = 'onb-title';
        const span = document.createElement('span');
        span.textContent = 'BEM-VINDO À LUMIÈRE';
        title.appendChild(span);
        const line1 = document.createElement('span');
        line1.className = 'onb-title-line';
        line1.textContent = 'A tua vida,';
        const line2 = document.createElement('span');
        line2.className = 'onb-title-line';
        line2.textContent = 'melhor organizada.';
        title.append(line1, line2);

        const subtitle = document.createElement('p');
        subtitle.className = 'onb-subtitle';
        subtitle.textContent = 'Um gestor pessoal completo para te ajudar a planear, focar e evoluir em todas as áreas da tua vida.';
        titleWrapper.append(title, subtitle);

        const progress = createProgress();
        const btn = createBtn('COMEÇAR', () => { state.step = 2; renderStep2(); });
        const arrow = document.createElement('span');
        arrow.textContent = '→';
        arrow.className = 'onb-arrow';
        btn.appendChild(arrow);
        
        // Ordem correta: Marca -> Título -> Pontos -> Botão
        content.append(brandContainer, titleWrapper, progress, btn);
    }

    function renderStep2() {
        container.classList.remove('onb-view-3');
        container.classList.add('onb-view-2');
        const screen = document.createElement('div');
        screen.className = 'onb-temp-screen';
        
        const topBar = createTopBar(2);
        const backBtn = topBar.querySelector('.onb-back-btn');
        if (backBtn) backBtn.textContent = 'Voltar';

                const titleWrapper = document.createElement('div');
        titleWrapper.className = 'onb-title-wrapper';

        const span = document.createElement('span');
        span.textContent = 'VAMOS COMEÇAR';
        
        const title = document.createElement('h1');
        title.className = 'onb-title';
        title.style.fontSize = '2.2rem'; 
        title.textContent = 'Qual é o seu nome?';

        const subtitle = document.createElement('p');
        subtitle.className = 'onb-subtitle';
        subtitle.textContent = 'É só para personalizar a sua experiência na Lumière.';
        
        titleWrapper.append(title, subtitle);

        // Input
        const inputWrapper = document.createElement('div');
        inputWrapper.className = 'onb-input-wrapper';
        const userIcon = createSVGIcon("M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"); 
        inputWrapper.appendChild(userIcon);

        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = 'Digite o seu nome';
        input.autocomplete = 'name';
        input.className = 'onb-input';
        if (state.name) input.value = state.name;
        inputWrapper.appendChild(input);

        // Privacidade
        const privacy = document.createElement('div');
        privacy.className = 'onb-privacy';
        const shieldIcon = createSVGIcon("M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z", 18); 
        const privacyText = document.createElement('span');
        privacyText.textContent = 'Seus dados estão seguros e serão usados apenas na sua conta.';
        privacy.append(shieldIcon, privacyText);

        const error = document.createElement('p');
        error.className = 'onb-error-msg';
        error.textContent = 'Por favor, insira o seu nome.';

        const btn = createBtn('CONTINUAR', () => {
            if (!input.value.trim()) { error.style.display = 'block'; return; }
            state.name = input.value.trim();
            state.step = 3; 
            renderStep3();
        });
        btn.className = 'onb-btn onb-btn-solid';
        const arrow = document.createElement('span');
        arrow.textContent = '→';
        arrow.className = 'onb-arrow-dark';
        btn.appendChild(arrow);

        const progress = createProgress();

        // Montar a árvore no contentor temporário
        screen.append(topBar, titleWrapper, inputWrapper, privacy, error, progress, btn);

        // Só agora limpamos o ecrã antigo e anexamos o novo
        clearContent();
        container.style.backgroundImage = 'url("assets/bg/onboarding-bg-02.webp")';
        while (screen.firstChild) {
            content.appendChild(screen.firstChild);
        }
    }

    function renderStep3() {
        container.classList.remove('onb-view-2');
        container.classList.add('onb-view-3');
        
        const screen = document.createElement('div');
        screen.className = 'onb-temp-screen';
        
        const topBar = createTopBar(3);
        const backBtn = topBar.querySelector('.onb-back-btn');
        if (backBtn) backBtn.textContent = 'Voltar';

                const titleWrapper = document.createElement('div');
        titleWrapper.className = 'onb-title-wrapper';

        const title = document.createElement('h1');
        title.className = 'onb-title';
        title.textContent = 'Qual é o seu objetivo com o Lumière?';

        const subtitle = document.createElement('p');
        subtitle.className = 'onb-subtitle';
        subtitle.textContent = 'Isso nos ajuda a personalizar a sua experiência e mostrar o que realmente importa para você.';

        titleWrapper.append(title, subtitle);

        const grid = document.createElement('div');
        grid.className = 'onb-grid';

        const opcoes = [
            { id: 'produtividade', text: 'Ser mais produtivo', icon: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16zm0-11a3 3 0 1 0 0 6 3 3 0 0 0 0-6z' },
            { id: 'habitos', text: 'Melhorar hábitos', icon: 'M6 5v14M18 5v14M6 12h12M6 5a3 3 0 0 0-3 3v8a3 3 0 0 0 3 3M18 5a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3' },
            { id: 'estudos', text: 'Estudar e aprender', icon: 'M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3zm6.82 6L12 12.72 5.18 9 12 5.28 18.82 9z' },
            { id: 'objetivos', text: 'Atingir objetivos', icon: 'M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8zm0-14a6 6 0 1 0 6 6 6 6 0 0 0-6-6zm0 10a4 4 0 1 1 4-4 4 4 0 0 1-4 4z' },
            { id: 'financas', text: 'Organizar finanças', icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h-2v2H9v-2H7v-2h2v-2H7v-2h2V9H7V7h2V5h2v2h2V5h2v2h2v2h-2v2h2v2h-2v2h2v2h-2v2z' },
            { id: 'negocios', text: 'Desenvolver negócios', icon: 'M20 7h-4V5c0-1.1-.9-2-2-2h-4c-1.1 0-2 .9-2 2v2H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2zM10 5h4v2h-4V5zm10 12H4V9h16v8z' },
            { id: 'saude', text: 'Cuidar da saúde', icon: 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z' },
            { id: 'notas', text: 'Organizar notas e ideias', icon: 'M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z' }
        ];

        opcoes.forEach(opt => {
            const card = document.createElement('button');
            card.className = 'onb-card';
            card.type = 'button';
            
            const iconContainer = document.createElement('div');
            iconContainer.className = 'onb-card-icon';
            iconContainer.appendChild(createSVGIcon(opt.icon, 24));
            
            const text = document.createElement('span');
            text.className = 'onb-card-text';
            text.textContent = opt.text;
            
            const radio = document.createElement('div');
            radio.className = 'onb-card-radio';

            card.append(iconContainer, text, radio);
            
            card.onclick = () => {
                document.querySelectorAll('.onb-card').forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                state.priorityAreas = [opt.id];
            };

            grid.appendChild(card);
        });

        const outroBtn = document.createElement('button');
        outroBtn.className = 'onb-btn-outro';
        outroBtn.innerHTML = '<span>+</span> Outro objetivo';
        
        outroBtn.onclick = () => {
            outroBtn.style.display = 'none';
            
            const inputWrapper = document.createElement('div');
            inputWrapper.className = 'onb-input-wrapper onb-input-other';
            
            const input = document.createElement('input');
            input.type = 'text';
            input.placeholder = 'Digite o seu objetivo...';
            input.className = 'onb-input';
            input.value = state.otherAspiration || '';
            
            input.addEventListener('input', (e) => {
                state.otherAspiration = e.target.value;
            });

            inputWrapper.appendChild(input);
            grid.appendChild(inputWrapper); // Adiciona à grelha
        };

        const progress = createProgress();
        const btn = createBtn('CONTINUAR', () => {
            state.step = 4; 
            renderStep4();
        });
        btn.className = 'onb-btn onb-btn-solid';
        const arrow = document.createElement('span');
        arrow.textContent = '→';
        arrow.className = 'onb-arrow-dark';
        btn.appendChild(arrow);

        screen.append(topBar, titleWrapper, grid, outroBtn, progress, btn);

        clearContent();
        container.style.backgroundImage = 'url("assets/bg/onboarding-bg-03.webp")';
        while (screen.firstChild) content.appendChild(screen.firstChild);
    }

    function renderStep4() {
        container.classList.remove('onb-view-2', 'onb-view-3');
        container.classList.add('onb-view-4');
        
        const screen = document.createElement('div');
        screen.className = 'onb-temp-screen';
        
        const topBar = createTopBar(4);
        const backBtn = topBar.querySelector('.onb-back-btn');
        if (backBtn) backBtn.innerHTML = '&larr; Voltar';

                const titleWrapper = document.createElement('div');
        titleWrapper.className = 'onb-title-wrapper';

        const span = document.createElement('span');
        span.textContent = 'ÚLTIMO PASSO';
        
        const title = document.createElement('h1');
        title.className = 'onb-title';
        title.textContent = 'Qual é o seu maior sonho agora?';

        const subtitle = document.createElement('p');
        subtitle.className = 'onb-subtitle';
        subtitle.textContent = 'Conte-nos o que mais te motiva no momento. Isso vai ajudar a tornar a sua experiência ainda mais relevante.';
        
        titleWrapper.append(span, title, subtitle);

        const grid = document.createElement('div');
        grid.className = 'onb-grid';

        const opcoes = [
            { id: 'estudos', title: 'Concluir meus estudos', sub: 'Construir o meu futuro', icon: 'M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3zm6.82 6L12 12.72 5.18 9 12 5.28 18.82 9z' },
            { id: 'objetivos', title: 'Alcançar meus objetivos', sub: 'Realizar grandes metas', icon: 'M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8zm0-14a6 6 0 1 0 6 6 6 6 0 0 0-6-6zm0 10a4 4 0 1 1 4-4 4 4 0 0 1-4 4z' },
            { id: 'financas', title: 'Estabilidade financeira', sub: 'Mais liberdade e segurança', icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h-2v2H9v-2H7v-2h2v-2H7v-2h2V9H7V7h2V5h2v2h2V5h2v2h2v2h-2v2h2v2h-2v2h2v2h-2v2z' },
            { id: 'saude', title: 'Ter mais saúde', sub: 'Viver com mais energia', icon: 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z' },
            { id: 'negocios', title: 'Fazer crescer meu negócio', sub: 'Construir algo meu', icon: 'M20 7h-4V5c0-1.1-.9-2-2-2h-4c-1.1 0-2 .9-2 2v2H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2zM10 5h4v2h-4V5zm10 12H4V9h16v8z' },
            { id: 'equilibrio', title: 'Equilíbrio de vida', sub: 'Tempo para o que importa', icon: 'M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7z' },
            { id: 'notas', title: 'Organizar notas e ideias', sub: 'Transformar planos em ações', icon: 'M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z' },
            { id: 'outro', title: 'Outra opção', sub: 'Quero algo diferente', icon: 'M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z' }
        ];

        opcoes.forEach(opt => {
            const card = document.createElement('button');
            card.className = 'onb-card onb-card-2lines';
            card.type = 'button';
            
            const iconContainer = document.createElement('div');
            iconContainer.className = 'onb-card-icon';
            iconContainer.appendChild(createSVGIcon(opt.icon, 24));
            
            const textContainer = document.createElement('div');
            textContainer.className = 'onb-card-text-container';
            const titleTxt = document.createElement('span');
            titleTxt.className = 'onb-card-title';
            titleTxt.textContent = opt.title;
            const subTxt = document.createElement('span');
            subTxt.className = 'onb-card-subtitle';
            subTxt.textContent = opt.sub;
            textContainer.append(titleTxt, subTxt);
            
            const radio = document.createElement('div');
            radio.className = 'onb-card-radio';

            card.append(iconContainer, textContainer, radio);
            
            card.onclick = () => {
                const isSelected = card.classList.contains('selected');
                
                if (isSelected) {
                    // Desmarcar
                    card.classList.remove('selected');
                    state.aspirations = state.aspirations.filter(id => id !== opt.id);
                    
                    if (opt.id === 'outro') {
                        const existingInput = document.querySelector('.onb-input-other-4');
                        if (existingInput) existingInput.remove();
                        state.otherAspiration = '';
                    }
                } else {
                    // Marcar
                    card.classList.add('selected');
                    if (!state.aspirations.includes(opt.id)) {
                        state.aspirations.push(opt.id);
                    }
                    
                    if (opt.id === 'outro') {
                        if (!document.querySelector('.onb-input-other-4')) {
                            const inputWrapper = document.createElement('div');
                            inputWrapper.className = 'onb-input-wrapper onb-input-other-4';
                            inputWrapper.style.gridColumn = 'span 2';
                            inputWrapper.style.marginTop = '4px';
                            
                            const input = document.createElement('input');
                            input.type = 'text';
                            input.placeholder = 'Digite o seu maior sonho...';
                            input.className = 'onb-input';
                            input.value = state.otherAspiration || '';
                            
                            input.addEventListener('input', (e) => {
                                state.otherAspiration = e.target.value;
                            });

                            inputWrapper.appendChild(input);
                            grid.appendChild(inputWrapper);
                        }
                    }
                }
            };

            grid.appendChild(card);
        });

        // Botão Pular
        const skipBtn = document.createElement('button');
        skipBtn.className = 'onb-skip-btn';
        skipBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#B9B2A8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 4 15 12 5 20 5 4"></polygon><line x1="19" y1="5" x2="19" y2="19"></line></svg> Pular esta etapa';
        
        const finishOnboarding = () => {
            // 1. Guardar os dados
            localStorage.setItem('lumiere_onb_completed', 'true');
            localStorage.setItem('lumiere_onb_data', JSON.stringify(state));
            
            // Guardar na chave que o app.js espera
            if (state.name) {
                localStorage.setItem('lumiereUserName', state.name);
            }
            
            // 2. Esconder o Onboarding
            if (container) container.remove();
            if (appEl) {
                appEl.hidden = true;
                appEl.classList.add('onb-hidden');
            }
            
            // 3. Mostrar a App Shell
            const appShell = document.getElementById('app-shell');
            if (appShell) {
                appShell.hidden = false;
                appShell.removeAttribute('hidden');
            }

            // 4. Avisar o app.js com o evento que ele espera
            document.dispatchEvent(new CustomEvent('onboarding:complete', { detail: state }));
        };

        skipBtn.onclick = finishOnboarding;

        const progress = createProgress();
        const btn = createBtn('CONTINUAR', finishOnboarding);
        btn.className = 'onb-btn onb-btn-solid';
        const arrow = document.createElement('span');
        arrow.textContent = '→';
        arrow.className = 'onb-arrow-dark';
        btn.appendChild(arrow);

        screen.append(topBar, titleWrapper, grid, skipBtn, progress, btn);

        clearContent();
        container.style.backgroundImage = 'url("assets/bg/onboarding-bg-04.webp")';
        while (screen.firstChild) content.appendChild(screen.firstChild);
    }

    // Inicia
    renderStep1();
})();
