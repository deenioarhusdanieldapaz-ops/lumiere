import { insights } from './insights.js';
import { recommendations } from './recommendations.js';

/**
 * Cruza os dados do onboarding com o motor de recomendações.
 * @param {Object} collections
 * @returns {Object|null} { title, text, action }
 */
export function getOnboardingRecommendation(collections = {}) {
  const onbDataStr = localStorage.getItem('lumiere_onb_data');
  let onbData = null;
  
  try {
    if (onbDataStr) onbData = JSON.parse(onbDataStr);
  } catch (e) {
    console.warn('[Recommendations] Erro ao ler dados do onboarding:', e);
  }

  // 1. Se o utilizador tem dados de onboarding, usamos isso como prioridade máxima
  if (onbData) {
    const name = onbData.name || 'Utilizador';
    const areas = onbData.priorityAreas && onbData.priorityAreas.length > 0 
        ? onbData.priorityAreas.join(' e ') 
        : 'as suas metas';
        
    const aspiration = onbData.otherAspiration 
        ? ' Rumo ao sonho: ' + onbData.otherAspiration 
        : '';

    return {
      title: 'Bem-vindo, ' + name,
      text: 'O seu foco inicial é ' + areas + '.' + aspiration + ' Que tal criar a sua primeira tarefa para começar?'
    };
  }

  // 2. Se não houver onboarding, usa o motor genérico
  const generatedInsights = insights.generate(collections);
  let generatedRecs = recommendations.generate(collections, generatedInsights);

  if (generatedRecs.length > 0) {
    return {
      title: generatedRecs[0].title,
      text: 'Sugestão da Lumière para hoje.'
    };
  }

  // 3. Fallback final
  return {
    title: 'Primeiros passos',
    text: 'A Lumière está pronta para ajudar. Comece por criar uma tarefa ou hábito.'
  };
}
