/**
 * Section: Insights
 *
 * Usa os 4 serviços de Intelligence:
 *  - lumiereIndex: score 0-100 com sinais explicáveis
 *  - priorities: o que merece atenção agora
 *  - insights: observações
 *  - recommendations: sugestões acionáveis
 */
import { insights } from '../../../core/intelligence/insights.js';
import { recommendations } from '../../../core/intelligence/recommendations.js';
import { priorities } from '../../../core/intelligence/priorities.js';
import { lumiereIndex } from '../../../core/intelligence/lumiereIndex.js';

export const insightsSection = {
  id: 'insights',
  order: 100,

  render(container, context = {}) {
    const collections = context.collections || {};

    const idx = lumiereIndex.calculate(collections);
    const ins = insights.generate(collections);
    const recs = recommendations.generate(collections, ins);
    const prios = priorities.rank(collections, 5);

    const wrapper = document.createElement('section');
    wrapper.className = 'dashboard-section dashboard-section--insights';
    wrapper.setAttribute('aria-label', 'Insights');

    const title = document.createElement('h3');
    title.className = 'dashboard-section__title';
    title.textContent = 'Insights';
    wrapper.appendChild(title);

    // ---------- Índice de Evolução ----------
    wrapper.appendChild(renderIndexBlock(idx));

    // ---------- Prioridades ----------
    if (prios.length > 0) {
      wrapper.appendChild(renderPrioritiesBlock(prios));
    }

    // ---------- Observações ----------
    if (ins.length > 0) {
      wrapper.appendChild(renderInsightsBlock(ins));
    }

    // ---------- Recomendações ----------
    if (recs.length > 0) {
      wrapper.appendChild(renderRecommendationsBlock(recs));
    }

    // ---------- Vazio ----------
    if (prios.length === 0 && ins.length === 0 && recs.length === 0 && idx.score === null) {
      const empty = document.createElement('p');
      empty.className = 'dashboard-section__empty';
      empty.textContent = 'Sem base mínima de dados. Cria tarefas, hábitos ou objetivos para começar.';
      wrapper.appendChild(empty);
    }

    container.appendChild(wrapper);
  }
};

function renderIndexBlock(idx) {
  const wrap = document.createElement('div');
  wrap.className = 'dashboard-insights__index';

  if (idx.score === null) {
    const msg = document.createElement('p');
    msg.className = 'dashboard-insights__hint';
    msg.textContent = 'Índice de Evolução: ' + (idx.reason || 'não calculável');
    wrap.appendChild(msg);
    return wrap;
  }

  const label = document.createElement('div');
  label.className = 'dashboard-insights__index-label';
  label.textContent = 'Índice de Evolução Lumière';
  wrap.appendChild(label);

  const score = document.createElement('div');
  score.className = 'dashboard-insights__score';
  score.textContent = String(idx.score);
  wrap.appendChild(score);

  const hint = document.createElement('div');
  hint.className = 'dashboard-insights__hint';
  hint.textContent = idx.reason;
  wrap.appendChild(hint);

  // Lista de sinais
  const sigWrap = document.createElement('div');
  sigWrap.className = 'dashboard-insights__signals';
  for (const s of idx.signals) {
    const row = document.createElement('div');
    row.className = 'dashboard-insights__signal';
    const l = document.createElement('span');
    l.className = 'dashboard-insights__signal-label';
    l.textContent = s.label;
    row.appendChild(l);
    const v = document.createElement('span');
    v.className = 'dashboard-insights__signal-value';
    v.textContent = s.raw + ' · ' + s.value;
    row.appendChild(v);
    sigWrap.appendChild(row);
  }
  wrap.appendChild(sigWrap);

  return wrap;
}

function renderPrioritiesBlock(items) {
  const wrap = document.createElement('div');
  wrap.className = 'dashboard-insights__block';

  const title = document.createElement('h4');
  title.className = 'dashboard-insights__block-title';
  title.textContent = 'Prioridades agora';
  wrap.appendChild(title);

  const list = document.createElement('div');
  list.className = 'dashboard-insights__list';

  for (const p of items) {
    const row = document.createElement('div');
    row.className = 'dashboard-insights__item dashboard-insights__item--priority';

    const t = document.createElement('div');
    t.className = 'dashboard-insights__item-title';
    t.textContent = p.title;
    row.appendChild(t);

    const d = document.createElement('div');
    d.className = 'dashboard-insights__item-detail';
    d.textContent = p.detail;
    row.appendChild(d);

    const badge = document.createElement('span');
    badge.className = 'dashboard-insights__badge';
    badge.textContent = '#' + p.score;
    row.appendChild(badge);

    list.appendChild(row);
  }
  wrap.appendChild(list);
  return wrap;
}

function renderInsightsBlock(items) {
  const wrap = document.createElement('div');
  wrap.className = 'dashboard-insights__block';

  const title = document.createElement('h4');
  title.className = 'dashboard-insights__block-title';
  title.textContent = 'Observações';
  wrap.appendChild(title);

  const list = document.createElement('div');
  list.className = 'dashboard-insights__list';

  for (const i of items) {
    const row = document.createElement('div');
    row.className = 'dashboard-insights__item dashboard-insights__item--' + (i.severity || 'info');

    const t = document.createElement('div');
    t.className = 'dashboard-insights__item-title';
    t.textContent = i.title;
    row.appendChild(t);

    const d = document.createElement('div');
    d.className = 'dashboard-insights__item-detail';
    d.textContent = i.description;
    row.appendChild(d);

    list.appendChild(row);
  }
  wrap.appendChild(list);
  return wrap;
}

function renderRecommendationsBlock(items) {
  const wrap = document.createElement('div');
  wrap.className = 'dashboard-insights__block';

  const title = document.createElement('h4');
  title.className = 'dashboard-insights__block-title';
  title.textContent = 'Recomendações';
  wrap.appendChild(title);

  const list = document.createElement('div');
  list.className = 'dashboard-insights__list';

  for (const r of items) {
    const row = document.createElement('div');
    row.className = 'dashboard-insights__item dashboard-insights__item--rec';

    const t = document.createElement('div');
    t.className = 'dashboard-insights__item-title';
    t.textContent = r.title;
    row.appendChild(t);

    const d = document.createElement('div');
    d.className = 'dashboard-insights__item-detail';
    d.textContent = r.action;
    row.appendChild(d);

    list.appendChild(row);
  }
  wrap.appendChild(list);
  return wrap;
}

export default insightsSection;
