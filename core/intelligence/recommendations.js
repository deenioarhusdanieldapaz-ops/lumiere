/**
 * Recommendations - sugestões acionáveis, só quando há base mínima.
 *
 * Regras:
 *  - Nunca sugere sem contexto suficiente.
 *  - Cada recomendação aponta para uma ação concreta.
 *  - Recebe `collections` + `insights` via parâmetro.
 *  - Formato: { id, priority, category, title, action }
 */

const DAY_MS = 24 * 60 * 60 * 1000;

function daysBetween(isoA, isoB) {
  const a = new Date(isoA);
  const b = new Date(isoB);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return 0;
  return Math.round((b - a) / DAY_MS);
}

function today() {
  return new Date().toISOString().split('T')[0];
}

export const recommendations = {
  /**
   * Gera recomendações a partir das coleções e insights.
   * @param {Object} collections
   * @param {Array} insights
   * @returns {Array<{id, priority, category, title, action}>}
   */
  generate(collections = {}, insights = []) {
    const list = [];
    const now = today();

    const tasks = Array.isArray(collections.tasks) ? collections.tasks : [];
    const habitLogs = Array.isArray(collections.habitLogs) ? collections.habitLogs : [];
    const habits = Array.isArray(collections.habits) ? collections.habits : [];
    const goals = Array.isArray(collections.goals) ? collections.goals : [];
    const calendarEvents = Array.isArray(collections.calendarEvents) ? collections.calendarEvents : [];
    const transactions = Array.isArray(collections.financeTransactions) ? collections.financeTransactions : [];

    const hasInsight = (id) => insights.some(i => i.id === id);

    /* ---------- 1) Tarefas vencidas → começar pela mais antiga ---------- */
    if (hasInsight('tasks-overdue')) {
      const overdue = tasks.filter(t =>
        t.status !== 'completed' &&
        t.status !== 'cancelled' &&
        t.dueDate &&
        t.dueDate.split('T')[0] < now
      ).sort((a, b) => a.dueDate.localeCompare(b.dueDate));

      if (overdue.length > 0) {
        list.push({
          id: 'rec-overdue-first',
          priority: 'high',
          category: 'tasks',
          title: 'Começa pela tarefa mais antiga',
          action: '"' + (overdue[0].name || 'Tarefa sem nome') + '" está em atraso desde ' + overdue[0].dueDate.split('T')[0] + '.'
        });
      }
    }

    /* ---------- 2) Sem registo de hábitos → voltar a registar hoje ---------- */
    if (hasInsight('habits-inactive') && habits.length > 0) {
      list.push({
        id: 'rec-habit-restart',
        priority: 'medium',
        category: 'habits',
        title: 'Regista um hábito hoje',
        action: 'Mesmo 1 registo reinicia o ciclo de consistência.'
      });
    }

    /* ---------- 3) Muitos pendentes → agendar 3 para hoje ---------- */
    const pending = tasks.filter(t => t.status === 'pending');
    if (pending.length >= 5) {
      const todayEventsCount = calendarEvents.filter(e => e.start && e.start.split('T')[0] === now).length;
      list.push({
        id: 'rec-plan-3',
        priority: 'medium',
        category: 'tasks',
        title: 'Agenda 3 tarefas para hoje',
        action: 'Tens ' + pending.length + ' pendentes. Escolhe 3 para hoje e adia o resto.' +
                (todayEventsCount > 0 ? ' Já tens ' + todayEventsCount + ' evento(s) marcado(s).' : '')
      });
    }

    /* ---------- 4) Objetivo quase concluído → finalizar ---------- */
    const almostDone = goals.filter(g =>
      g.status === 'active' &&
      typeof g.progress === 'number' &&
      g.progress >= 75 &&
      g.progress < 100
    );
    if (almostDone.length > 0) {
      list.push({
        id: 'rec-goal-finish',
        priority: 'medium',
        category: 'goals',
        title: 'Finaliza um objetivo quase concluído',
        action: '"' + (almostDone[0].name || 'Objetivo') + '" está a ' + almostDone[0].progress + '%.' 
      });
    }

    /* ---------- 5) Orçamento apertado → revisão ---------- */
    if (hasInsight('finance-tight') || hasInsight('finance-negative')) {
      list.push({
        id: 'rec-finance-review',
        priority: 'high',
        category: 'finances',
        title: 'Revisão financeira urgente',
        action: 'Confirma as transações do mês e ajusta o orçamento.'
      });
    }

    /* ---------- 6) Contas sem saldo registado há muito tempo ---------- */
    const accounts = Array.isArray(collections.financeAccounts) ? collections.financeAccounts : [];
    if (accounts.length > 0) {
      const neverUpdated = accounts.filter(a => {
        if (!a.updatedAt) return true;
        return daysBetween(a.updatedAt, now) >= 30;
      });
      if (neverUpdated.length > 0) {
        list.push({
          id: 'rec-accounts-stale',
          priority: 'low',
          category: 'finances',
          title: 'Atualiza saldos das contas',
          action: neverUpdated.length + ' conta' + (neverUpdated.length > 1 ? 's' : '') + ' sem atualização há mais de 30 dias.'
        });
      }
    }

    /* ---------- 7) Sem dados nenhuns → começar por algum lado ---------- */
    if (list.length === 0 && tasks.length === 0 && goals.length === 0) {
      list.push({
        id: 'rec-first-steps',
        priority: 'low',
        category: 'general',
        title: 'Primeiros passos',
        action: 'Cria a tua primeira tarefa ou objetivo para começares a usar o Lumière.'
      });
    }

    return list;
  }
};

export default recommendations;
