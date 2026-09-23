/**
 * Índice de Evolução Lumière (0-100).
 *
 * Combina 6 sinais determinísticos com pesos explícitos:
 *   - Tarefas (peso 25): % concluídas nos últimos 30 dias
 *   - Hábitos (peso 25): registos nos últimos 7 dias / hábitos ativos
 *   - Objetivos (peso 20): média de progresso dos objetivos ativos
 *   - Finanças (peso 15): receitas vs despesas no mês (positivo = bom)
 *   - Estudos (peso 10): minutos estudados nos últimos 7 dias (cap 300 min)
 *   - Reflexão (peso 5): notas criadas/atualizadas nos últimos 7 dias (cap 5)
 *
 * Se um sinal não tiver base mínima, é excluído e o peso é redistribuído.
 * Se TODOS os sinais forem null → { score: null, reason: 'não calculável' }
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

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

export const lumiereIndex = {
  /**
   * Calcula o índice.
   * @param {Object} collections
   * @returns {{score: number|null, reason: string, signals: Array<{id,label,weight,value,raw}>}}
   */
  calculate(collections = {}) {
    const now = today();
    const signals = [];

    const tasks = Array.isArray(collections.tasks) ? collections.tasks : [];
    const habits = Array.isArray(collections.habits) ? collections.habits : [];
    const habitLogs = Array.isArray(collections.habitLogs) ? collections.habitLogs : [];
    const goals = Array.isArray(collections.goals) ? collections.goals : [];
    const transactions = Array.isArray(collections.financeTransactions) ? collections.financeTransactions : [];
    const studySessions = Array.isArray(collections.studySessions) ? collections.studySessions : [];
    const notes = Array.isArray(collections.notes) ? collections.notes : [];

    /* ---------- 1) Tarefas (peso 25) ---------- */
    const tasksLast30 = tasks.filter(t => t.createdAt && daysBetween(t.createdAt, now) <= 30);
    if (tasksLast30.length >= 3) {
      const completed = tasksLast30.filter(t => t.status === 'completed').length;
      const rate = Math.round((completed / tasksLast30.length) * 100);
      signals.push({
        id: 'tasks',
        label: 'Tarefas concluídas (30 dias)',
        weight: 25,
        value: clamp(rate, 0, 100),
        raw: completed + '/' + tasksLast30.length
      });
    }

    /* ---------- 2) Hábitos (peso 25) ---------- */
    const activeHabits = habits.filter(h => h.status === 'active');
    if (activeHabits.length > 0) {
      // Registos completos nos últimos 7 dias / (hábitos ativos * 7)
      const weekAgo = new Date(Date.now() - 7 * DAY_MS).toISOString().split('T')[0];
      const recentLogs = habitLogs.filter(l =>
        l.completed && l.date && l.date >= weekAgo && l.date <= now
      );
      const total = activeHabits.length * 7;
      const rate = Math.round((recentLogs.length / total) * 100);
      signals.push({
        id: 'habits',
        label: 'Consistência de hábitos (7 dias)',
        weight: 25,
        value: clamp(rate, 0, 100),
        raw: recentLogs.length + '/' + total
      });
    }

    /* ---------- 3) Objetivos (peso 20) ---------- */
    const activeGoals = goals.filter(g => g.status === 'active');
    if (activeGoals.length > 0) {
      const totalProgress = activeGoals.reduce((s, g) => s + (Number(g.progress) || 0), 0);
      const avg = Math.round(totalProgress / activeGoals.length);
      signals.push({
        id: 'goals',
        label: 'Progresso dos objetivos',
        weight: 20,
        value: clamp(avg, 0, 100),
        raw: avg + '%'
      });
    }

    /* ---------- 4) Finanças (peso 15) ---------- */
    const monthStart = now.slice(0, 8) + '01';
    const monthTrx = transactions.filter(t => t.date && t.date >= monthStart && t.date <= now);
    if (monthTrx.length >= 3) {
      const income = monthTrx.filter(t => t.type === 'income').reduce((s, t) => s + (Number(t.amount) || 0), 0);
      const expense = monthTrx.filter(t => t.type === 'expense').reduce((s, t) => s + (Number(t.amount) || 0), 0);
      let value = 50; // neutro
      if (income > 0 && expense >= 0) {
        // 50 + (margem normalizada entre -50 e +50)
        const margin = (income - expense) / income; // -inf .. +1
        value = clamp(50 + margin * 50, 0, 100);
      }
      signals.push({
        id: 'finances',
        label: 'Saúde financeira (mês)',
        weight: 15,
        value: Math.round(value),
        raw: 'Receita: ' + income.toFixed(0) + ' / Despesa: ' + expense.toFixed(0)
      });
    }

    /* ---------- 5) Estudos (peso 10) ---------- */
    const weekAgoStr = new Date(Date.now() - 7 * DAY_MS).toISOString().split('T')[0];
    const recentSessions = studySessions.filter(s => s.date && s.date >= weekAgoStr && s.date <= now);
    if (studySessions.length > 0) {
      const totalMin = recentSessions.reduce((s, x) => s + (Number(x.duration) || 0), 0);
      // 300 minutos na semana = 100%
      const value = clamp(Math.round((totalMin / 300) * 100), 0, 100);
      signals.push({
        id: 'studies',
        label: 'Minutos estudados (7 dias)',
        weight: 10,
        value,
        raw: totalMin + ' min'
      });
    }

    /* ---------- 6) Reflexão (peso 5) ---------- */
    if (notes.length > 0) {
      const recentNotes = notes.filter(n => n.updatedAt && daysBetween(n.updatedAt, now) <= 7);
      // 5 notas na semana = 100%
      const value = clamp(Math.round((recentNotes.length / 5) * 100), 0, 100);
      signals.push({
        id: 'reflection',
        label: 'Notas ativas (7 dias)',
        weight: 5,
        value,
        raw: recentNotes.length + ' notas'
      });
    }

    /* ---------- Cálculo final ---------- */
    if (signals.length === 0) {
      return {
        score: null,
        reason: 'não calculável — sem base mínima de dados',
        signals: []
      };
    }

    // Redistribuir pesos pelos sinais presentes
    const totalWeight = signals.reduce((s, x) => s + x.weight, 0);
    let weightedSum = 0;
    for (const s of signals) {
      const normalizedWeight = s.weight / totalWeight;
      weightedSum += s.value * normalizedWeight;
    }

    const score = Math.round(clamp(weightedSum, 0, 100));

    return {
      score,
      reason: 'calculado a partir de ' + signals.length + ' sinal(is)',
      signals
    };
  }
};

export default lumiereIndex;
