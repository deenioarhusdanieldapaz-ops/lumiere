/**
 * Section: Weekly
 *
 * Gráfico de linha com evolução dos últimos 7 dias (lineChart).
 * NÃO importa Core. Recebe tudo via context.
 */
import { createLineChart } from '../../../components/line-chart/lineChart.js';

const DAY_LABELS = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];

/**
 * Calcula pontos dos últimos 7 dias a partir das tarefas concluídas.
 * @param {Object} collections
 * @returns {{points: Array<{label:string,value:number}>, total:number}}
 */
function buildWeeklyPoints(collections = {}) {
  const tasks = Array.isArray(collections.tasks) ? collections.tasks : [];
  const now = new Date();
  const points = [];
  let total = 0;

  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const ymd = d.toISOString().split('T')[0];

    const count = tasks.filter(t => {
      if (t.status !== 'completed') return false;
      const when = t.completedAt || t.updatedAt || t.createdAt;
      if (!when) return false;
      return String(when).split('T')[0] === ymd;
    }).length;

    points.push({ label: DAY_LABELS[d.getDay()], value: count });
    total += count;
  }

  return { points, total };
}

export const weeklySection = {
  id: 'weekly',
  order: 30,

  /**
   * @param {HTMLElement} container
   * @param {Object} context
   */
  render(container, context = {}) {
    const wrapper = document.createElement('section');
    wrapper.className = 'dashboard-section dashboard-section--weekly';
    wrapper.setAttribute('aria-label', 'Semana');

    const title = document.createElement('h3');
    title.className = 'dashboard-section__title';
    title.textContent = 'Esta semana';
    wrapper.appendChild(title);

    const collections = context.collections || {};
    const { points, total } = buildWeeklyPoints(collections);

    // Se não há nenhuma atividade, mostra estado vazio
    const variant = total === 0 ? 'empty' : 'default';

    const chartWrap = document.createElement('div');
    chartWrap.className = 'dashboard-section__chart';

    const chart = createLineChart({
      points,
      variant,
      animate: true,
      showGrid: true
    });
    chartWrap.appendChild(chart);
    wrapper.appendChild(chartWrap);

    if (variant === 'empty') {
      const note = document.createElement('p');
      note.className = 'dashboard-section__empty';
      note.textContent = 'Sem dados suficientes para calcular a semana.';
      wrapper.appendChild(note);
    }

    container.appendChild(wrapper);
  }
};

export default weeklySection;
