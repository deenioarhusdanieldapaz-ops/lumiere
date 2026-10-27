const fs = require('fs');
let js = fs.readFileSync('pages/cards/overview/overview.js', 'utf8');

// Import
if (!js.includes('onboardingRecommendations')) {
    js = js.replace(
        "import { lumiereIndex } from '../../../core/intelligence/lumiereIndex.js';",
        "import { lumiereIndex } from '../../../core/intelligence/lumiereIndex.js';\nimport { getOnboardingRecommendation } from '../../../core/intelligence/onboardingRecommendations.js';"
    );
}

// Injeção no final
const anchor = "  container.appendChild(section);";
const injection = `  // --- CARTÃO DE RECOMENDAÇÃO ---
  const rec = getOnboardingRecommendation(collections);
  if (rec) {
    const recCard = document.createElement('div');
    recCard.className = 'overview__today-card';
    recCard.style.marginTop = '16px';
    const header = document.createElement('div');
    header.className = 'overview__today-header';
    const title = document.createElement('span');
    title.className = 'overview__today-header-title';
    title.textContent = rec.title;
    header.appendChild(title);
    const textWrap = document.createElement('div');
    textWrap.className = 'overview__today-empty';
    textWrap.style.padding = '16px'; textWrap.style.fontSize = '0.9rem'; textWrap.style.lineHeight = '1.4'; textWrap.style.color = '#F5F0EB';
    textWrap.textContent = rec.text;
    recCard.append(header, textWrap);
    section.appendChild(recCard);
  }

  container.appendChild(section);`;

if (js.includes(anchor) && !js.includes('CARTÃO DE RECOMENDAÇÃO')) {
    js = js.replace(anchor, injection);
    fs.writeFileSync('pages/cards/overview/overview.js', js);
    console.log('Cartão restaurado no Dashboard!');
}
