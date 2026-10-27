const fs = require('fs');
let js = fs.readFileSync('pages/lumiere/lumiere.js', 'utf8');

// Import
if (!js.includes('onboardingRecommendations')) {
    const lastImport = js.lastIndexOf('import ');
    const endOfLine = js.indexOf(';', lastImport) + 1;
    js = js.slice(0, endOfLine) + "\nimport { getOnboardingRecommendation } from '../../core/intelligence/onboardingRecommendations.js';" + js.slice(endOfLine);
}

// Carregar dados e lógica
js = js.replace(
    "const [businesses, products, customers, sales] = await Promise.all([\n      dataManager.list('lumiereBusinesses'),\n      dataManager.list('lumiereProducts'),\n      dataManager.list('lumiereCustomers'),\n      dataManager.list('lumiereSales')\n    ]);",
    "const [businesses, products, customers, sales, tasks, habits, goals, financeTransactions] = await Promise.all([\n      dataManager.list('lumiereBusinesses'),\n      dataManager.list('lumiereProducts'),\n      dataManager.list('lumiereCustomers'),\n      dataManager.list('lumiereSales'),\n      dataManager.list('tasks').catch(() => []),\n      dataManager.list('habits').catch(() => []),\n      dataManager.list('goals').catch(() => []),\n      dataManager.list('financeTransactions').catch(() => [])\n    ]);"
);
js = js.replace(
    "_state.data = {\n      businesses: Array.isArray(businesses) ? businesses : [],\n      products:   Array.isArray(products)   ? products   : [],\n      customers:  Array.isArray(customers)  ? customers  : [],\n      sales:      Array.isArray(sales)      ? sales      : []\n    };",
    "_state.data = {\n      businesses: Array.isArray(businesses) ? businesses : [],\n      products:   Array.isArray(products)   ? products   : [],\n      customers:  Array.isArray(customers)  ? customers  : [],\n      sales:      Array.isArray(sales)      ? sales      : []\n    };\n    _state.recommendation = getOnboardingRecommendation({ tasks, habits, goals, financeTransactions });"
);

// Injeção no render()
const anchor = "page.appendChild(renderHeader());";
const injection = `
  page.appendChild(renderHeader());

  if (_state.recommendation) {
    const recCard = document.createElement('div');
    recCard.style.cssText = 'margin-bottom: 16px; padding: 16px; border: 1px solid #D4AF37; border-radius: 12px; background: rgba(23, 21, 18, 0.6); display: flex; flex-direction: column; gap: 8px;';
    const recTitle = document.createElement('h3');
    recTitle.style.cssText = 'font-family: "Playfair Display", serif; font-size: 1.1rem; color: #E8C968; margin: 0;';
    recTitle.textContent = _state.recommendation.title;
    const recText = document.createElement('p');
    recText.style.cssText = 'font-size: 0.85rem; color: #F5F0EB; margin: 0; line-height: 1.4;';
    recText.textContent = _state.recommendation.text;
    recCard.append(recTitle, recText);
    page.appendChild(recCard);
  }
`;

if (js.includes(anchor) && !js.includes('recCard')) {
    js = js.replace(anchor, injection);
    fs.writeFileSync('pages/lumiere/lumiere.js', js);
    console.log('Cartão restaurado na Lumière!');
}
