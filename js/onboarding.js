(function() {
    const steps = {
        1: document.getElementById('step-1'),
        2: document.getElementById('step-2'),
        3: document.getElementById('step-3'),
        4: document.getElementById('step-4')
    };
    let userData = { name: '', theme: 'noir', gold: 'balanced', size: 'balanced' };

    function showStep(n) {
        Object.values(steps).forEach(el => el.classList.remove('active'));
        steps[n].classList.add('active');
    }

    document.getElementById('btn-start').addEventListener('click', () => showStep(2));

    document.getElementById('btn-name').addEventListener('click', () => {
        const name = document.getElementById('userName').value.trim();
        if (!name) {
            document.getElementById('nameError').style.display = 'block';
            return;
        }
        document.getElementById('nameError').style.display = 'none';
        userData.name = name;
        showStep(3);
    });

    document.getElementById('btn-personalize').addEventListener('click', () => {
        userData.theme = document.getElementById('theme').value;
        userData.gold = document.getElementById('goldIntensity').value;
        userData.size = document.getElementById('interfaceSize').value;
        const summary = document.getElementById('summary');
        summary.innerHTML = `
            <div class="summary-item"><span>Nome</span><span>${userData.name}</span></div>
            <div class="summary-item"><span>Tema</span><span>${userData.theme}</span></div>
            <div class="summary-item"><span>Dourado</span><span>${userData.gold}</span></div>
            <div class="summary-item"><span>Tamanho</span><span>${userData.size}</span></div>
        `;
        showStep(4);
    });

    document.getElementById('btn-finish').addEventListener('click', () => {
        alert('Bem-vindo, ' + userData.name + '! (Onboarding concluído)');
        // Aqui depois será integrado com o Core/State
        location.reload();
    });

    document.getElementById('userName').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') document.getElementById('btn-name').click();
    });
})();
