/**
 * Insights - observações determinísticas sobre dados reais.
 *
 * Regras:
 *  - Nunca inventa contexto.
 *  - Se não há base mínima, devolve [].
 *  - Cada insight tem: id, severity, category, title, description.
 *  - severity: 'info' | 'attention' | 'warning'
 *
 * Não fala com o Core diretamente — recebe `collections` via parâmetro.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

function daysBetween(isoA, isoB) {
  const a = new Date(isoA);
  const b = new Date(isoB);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return 0;
  return Math.round((b - a) / DAY_MS);
}

function today() {
  const d = new Date();
  return d.toISOString().split('T')[0];
}

export const insights = {
  /**
   * Gera a lista de insights a partir das coleções.
   * @param {Object} collections - { tasks, habits, habitLogs, goals, calendarEvents, financeTransactions, ... }
   * @returns {Array<{id, severity, category, title, description}>}
   */
  generate(collections = {}) {
    const list = [];
    const now = today();

    const tasks = Array.isArray(collections.tasks) ? collections.tasks : [];
    const habitLogs = Array.isArray(collections.habitLogs) ? collections.habitLogs : [];
    const goals = Array.isArray(collections.goals) ? collections.goals : [];
    const calendarEvents = Array.isArray(collections.calendarEvents) ? collections.calendarEvents : [];
    const transactions = Array.isArray(collections.financeTransactions) ? collections.financeTransactions : [];

    /* ---------- 1) Tarefas vencidas ---------- */
    const overdueTasks = tasks.filter(t =>
      t.status !== 'completed' &&
      t.status !== 'cancelled' &&
      t.dueDate &&
      t.dueDate.split('T')[0] < now
    );
    if (overdueTasks.length > 0) {
      const oldest = overdueTasks.reduce((min, t) => {
        const d = t.dueDate.split('T')[0];
        return d < min ? d : min;
      }, now);
      const days = daysBetween(oldest, now);
      list.push({
        id: 'tasks-overdue',
        severity: overdueTasks.length >= 5 ? 'warning' : 'attention',
        category: 'tasks',
        title: overdueTasks.length + ' tarefa' + (overdueTasks.length > 1 ? 's' : '') + ' vencida' + (overdueTasks.length > 1 ? 's' : ''),
        description: 'A mais antiga tem ' + days + ' dia' + (days !== 1 ? 's' : '') + ' de atraso.'
      });
    }

    /* ---------- 2) Tarefas criadas mas nunca iniciadas (pendentes há > 7 dias) ---------- */
    const staleTasks = tasks.filter(t => {
      if (t.status !== 'pending' || !t.createdAt) return false;
      return daysBetween(t.createdAt, now) >= 7;
    });
    if (staleTasks.length > 0) {
      list.push({
        id: 'tasks-stale',
        severity: 'info',
        category: 'tasks',
        title: staleTasks.length + ' tarefa' + (staleTasks.length > 1 ? 's' : '') + ' pendente' + (staleTasks.length > 1 ? 's' : '') + ' há mais de 7 dias',
        description: 'Considera reagendar ou cancelar.'
      });
    }

    /* ---------- 3) Sem registo de hábitos nos últimos 3 dias ---------- */
    if (habitLogs.length > 0) {
      const recent = habitLogs.filter(l => {
        if (!l.date) return false;
        return daysBetween(l.date, now) <= 3;
      });
      if (recent.length === 0) {
        const latest = habitLogs.reduce((max, l) => (l.date > max ? l.date : max), '');
        const days = latest ? daysBetween(latest, now) : 0;
        list.push({
          id: 'habits-inactive',
          severity: days >= 7 ? 'warning' : 'attention',
          category: 'habits',
          title: 'Sem registos de hábitos há ' + days + ' dia' + (days !== 1 ? 's' : ''),
          description: 'Volta a registar para manteres a consistência.'
        });
      }
    }

    /* ---------- 4) Objetivos atrasados (targetDate < hoje e não concluídos) ---------- */
    const lateGoals = goals.filter(g =>
      g.status !== 'completed' &&
      g.status !== 'abandoned' &&
      g.targetDate &&
      g.targetDate < now
    );
    if (lateGoals.length > 0) {
      list.push({
        id: 'goals-late',
        severity: 'attention',
        category: 'goals',
        title: lateGoals.length + ' objetivo' + (lateGoals.length > 1 ? 's' : '') + ' em atraso',
        description: 'A data limite já passou.'
      });
    }

    /* ---------- 5) Eventos de hoje ---------- */
    const todayEvents = calendarEvents.filter(e => {
      if (!e.start) return false;
      return e.start.split('T')[0] === now;
    });
    if (todayEvents.length > 0) {
      list.push({
        id: 'events-today',
        severity: 'info',
        category: 'calendar',
        title: todayEvents.length + ' evento' + (todayEvents.length > 1 ? 's' : '') + ' hoje',
        description: 'Consulta o calendário para detalhes.'
      });
    }

    /* ---------- 6) Saldo do mês (receitas vs despesas) ---------- */
    if (transactions.length >= 3) {
      const monthStart = now.slice(0, 8) + '01';
      const monthTrx = transactions.filter(t => t.date && t.date >= monthStart && t.date <= now);
      if (monthTrx.length > 0) {
        const income = monthTrx.filter(t => t.type === 'income').reduce((s, t) => s + (Number(t.amount) || 0), 0);
        const expense = monthTrx.filter(t => t.type === 'expense').reduce((s, t) => s + (Number(t.amount) || 0), 0);
        if (expense > income && income > 0) {
          list.push({
            id: 'finance-negative',
            severity: 'warning',
            category: 'finances',
            title: 'Despesas acima das receitas este mês',
            description: 'Diferença de ' + (expense - income).toFixed(2) + ' no saldo do mês.'
          });
        } else if (income > 0 && expense > 0 && expense / income > 0.8) {
          list.push({
            id: 'finance-tight',
            severity: 'attention',
            category: 'finances',
            title: 'Orçamento mensal apertado',
            description: 'Já gastaste ' + Math.round((expense / income) * 100) + '% das receitas do mês.'
          });
        }
      }
    }

    return list;
  }
};

export default insights;
