/**
 * Priorities - ordena o que merece atenção agora.
 *
 * Combina:
 *  - Tarefas vencidas (pontuação alta)
 *  - Tarefas com prazo hoje
 *  - Eventos de hoje
 *  - Objetivos próximos do prazo
 *  - Hábitos por registar hoje
 *
 * Devolve lista ordenada por score descendente.
 * Cada item: { score, type, refId, title, detail }
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

export const priorities = {
  /**
   * Gera a lista de prioridades ordenada.
   * @param {Object} collections
   * @param {number} [limit=5]
   * @returns {Array<{score, type, refId, title, detail}>}
   */
  rank(collections = {}, limit = 5) {
    const items = [];
    const now = today();

    const tasks = Array.isArray(collections.tasks) ? collections.tasks : [];
    const goals = Array.isArray(collections.goals) ? collections.goals : [];
    const calendarEvents = Array.isArray(collections.calendarEvents) ? collections.calendarEvents : [];
    const habits = Array.isArray(collections.habits) ? collections.habits : [];
    const habitLogs = Array.isArray(collections.habitLogs) ? collections.habitLogs : [];

    /* ---------- 1) Tarefas vencidas ---------- */
    for (const t of tasks) {
      if (t.status === 'completed' || t.status === 'cancelled') continue;
      if (!t.dueDate) continue;
      const due = t.dueDate.split('T')[0];
      if (due >= now) continue;
      const daysLate = daysBetween(due, now);
      items.push({
        score: 100 + daysLate * 5,
        type: 'task-overdue',
        refId: t.id,
        title: t.name || '(sem nome)',
        detail: 'Vencida há ' + daysLate + ' dia' + (daysLate !== 1 ? 's' : '')
      });
    }

    /* ---------- 2) Tarefas com prazo hoje ---------- */
    for (const t of tasks) {
      if (t.status === 'completed' || t.status === 'cancelled') continue;
      if (!t.dueDate) continue;
      if (t.dueDate.split('T')[0] !== now) continue;
      items.push({
        score: 80,
        type: 'task-today',
        refId: t.id,
        title: t.name || '(sem nome)',
        detail: 'Prazo hoje'
      });
    }

    /* ---------- 3) Eventos de hoje (não all-day) ---------- */
    for (const e of calendarEvents) {
      if (!e.start) continue;
      if (e.start.split('T')[0] !== now) continue;
      const hora = e.start.split('T')[1] || '';
      items.push({
        score: 70,
        type: 'event-today',
        refId: e.id,
        title: e.title || '(sem título)',
        detail: e.allDay ? 'Dia inteiro' : 'Às ' + hora.slice(0, 5)
      });
    }

    /* ---------- 4) Objetivos com prazo nos próximos 7 dias ---------- */
    for (const g of goals) {
      if (g.status === 'completed' || g.status === 'abandoned') continue;
      if (!g.targetDate) continue;
      const diff = daysBetween(now, g.targetDate);
      if (diff < 0 || diff > 7) continue;
      items.push({
        score: 60 - diff * 5,
        type: 'goal-due-soon',
        refId: g.id,
        title: g.name || '(sem nome)',
        detail: diff === 0 ? 'Prazo hoje' : 'Faltam ' + diff + ' dia' + (diff !== 1 ? 's' : '')
      });
    }

    /* ---------- 5) Hábitos por registar hoje ---------- */
    const todayLogs = new Set(
      habitLogs
        .filter(l => l.date === now && l.completed)
        .map(l => l.habitId)
    );
    for (const h of habits) {
      if (h.status !== 'active') continue;
      if (todayLogs.has(h.id)) continue;
      items.push({
        score: 40,
        type: 'habit-pending',
        refId: h.id,
        title: h.name || '(sem nome)',
        detail: 'Por registar hoje'
      });
    }

    // Ordenar por score desc, com tiebreak por título
    items.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return (a.title || '').localeCompare(b.title || '');
    });

    return items.slice(0, limit);
  }
};

export default priorities;
