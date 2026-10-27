const fs = require('fs');
let js = fs.readFileSync('core/intelligence/onboardingRecommendations.js', 'utf8');

const newLogic = `import { insights } from './insights.js';
import { recommendations } from './recommendations.js';

export function getOnboardingRecommendation(collections = {}) {
  // 1. PRIMEIRO: Tenta gerar recomendações com base nos dados REAIS da app
  const generatedInsights = insights.generate(collections);
  const generatedRecs = recommendations.generate(collections, generatedInsights);

  if (generatedRecs.length > 0) {
    // Se houver dados, devolve a recomendação mais prioritária
    return {
      title: generatedRecs[0].title,
      text: generatedRecs[0].description || generatedRecs[0].text || 'Ação recomendada pela Lumière.'
    };
  }

  // 2. SEGUNDO: Se a app estiver vazia, usa os dados do onboarding como fallback
  const onbDataStr = localStorage.getItem('lumiere_onb_data');
  let onbData = null;
  
  try {
    if (onbDataStr) onbData = JSON.parse(onbDataStr);
  } catch (e) {
    console.warn('[Recommendations] Erro ao ler dados do onboarding:', e);
  }

  if (onbData) {
    const name = onbData.name || 'Utilizador';
    
    // Tenta usar as aspirações ou áreas prioritárias
    let foco = 'as suas metas';
    if (onbData.aspirations && onbData.aspirations.length > 0) {
        foco = onbData.aspirations.join(' e ');
    } else if (onbData.priorityAreas && onbData.priorityAreas.length > 0) {
        foco = onbData.priorityAreas.join(' e ');
    }

    return {
      title: 'Bem-vindo, ' + name,
      text: 'O seu foco inicial é ' + foco + '. Que tal criar a sua primeira tarefa para começar?'
    };
  }

  // 3. Último recurso
  return {
    title: 'Primeiros passos',
    text: 'A Lumière está pronta para ajudar. Comece por criar uma tarefa ou hábito.'
  };
}`;

fs.writeFileSync('core/intelligence/onboardingRecommendations.js', newLogic);
console.log('Lógica da Lumière atualizada: Dados reais primeiro, onboarding depois.');
