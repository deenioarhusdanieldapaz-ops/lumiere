import { insights } from './insights.js';
import { recommendations } from './recommendations.js';

export function getOnboardingRecommendation(collections = {}) {
  const tasks = Array.isArray(collections.tasks) ? collections.tasks : [];
  const goals = Array.isArray(collections.goals) ? collections.goals : [];
  const habits = Array.isArray(collections.habits) ? collections.habits : [];
  const finance = Array.isArray(collections.financeTransactions) ? collections.financeTransactions : [];
  const calendar = Array.isArray(collections.calendarEvents) ? collections.calendarEvents : [];
  const todayStr = new Date().toISOString().split('T')[0];

  // 1. FINANÇAS NEGATIVAS (Prioridade Máxima)
  const monthStr = todayStr.slice(0, 7);
  const monthTx = finance.filter(t => t.date && t.date.startsWith(monthStr));
  const income = monthTx.filter(t => t.type === 'income').reduce((a, b) => a + Number(b.amount || 0), 0);
  const expense = monthTx.filter(t => t.type === 'expense').reduce((a, b) => a + Number(b.amount || 0), 0);
  
  if (income - expense < 0) {
    return {
      title: 'Atenção às Finanças',
      text: 'As suas despesas superaram as receitas este mês. Que tal rever os gastos na área de Finanças?'
    };
  }

  // 2. TAREFAS ATRASADAS
  const overdueTasks = tasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled' && t.dueDate && t.dueDate.split('T')[0] < todayStr)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  if (overdueTasks.length > 0) {
    const task = overdueTasks[0];
    const taskName = task.title || task.name || task.text || 'a sua tarefa antiga';
    return {
      title: 'Tarefa Atrasada',
      text: 'A sua tarefa mais antiga é "' + taskName + '". Que tal resolvê-la agora?'
    };
  }

  // 3. OBJETIVOS PARADOS
  const lateGoals = goals.filter(g => g.status !== 'completed' && g.targetDate && g.targetDate.split('T')[0] < todayStr);
  if (lateGoals.length > 0) {
    const goal = lateGoals[0];
    const goalName = goal.title || goal.name || 'o seu objetivo';
    return {
      title: 'Objetivo Atrasado',
      text: 'O objetivo "' + goalName + '" passou do prazo. Dê um passo em direção a ele hoje.'
    };
  }

  // 4. HÁBITOS INATIVOS (Sem registo há mais de 3 dias)
  const inactiveHabits = habits.filter(h => {
    if (!h.createdAt || h.archived) return false;
    const logs = collections.habitLogs || [];
    const habitLogs = logs.filter(l => l.habitId === h.id).sort((a, b) => b.date.localeCompare(a.date));
    if (habitLogs.length === 0) return true;
    const lastLog = habitLogs[0].date.split('T')[0];
    const diffDays = Math.round((new Date(todayStr) - new Date(lastLog)) / 86400000);
    return diffDays > 3;
  });

  if (inactiveHabits.length > 0) {
    const habit = inactiveHabits[0];
    const habitName = habit.name || habit.title || 'o seu hábito';
    return {
      title: 'Hábito Inativo',
      text: 'O hábito "' + habitName + '" está sem registo há alguns dias. Retome-o hoje!'
    };
  }

  // 5. EVENTOS PARA HOJE
  const todayEvents = calendar.filter(e => e.date && e.date.split('T')[0] === todayStr);
  if (todayEvents.length > 0) {
    const event = todayEvents[0];
    const eventName = event.title || event.name || 'o seu evento';
    return {
      title: 'Evento Hoje',
      text: 'Não se esqueça: "' + eventName + '" está agendado para hoje.'
    };
  }

  // 6. FALLBACK: Onboarding ou Genérico
  const onbDataStr = localStorage.getItem('lumiere_onb_data');
  let onbData = null;
  try {
    if (onbDataStr) onbData = JSON.parse(onbDataStr);
  } catch (e) {}

  if (onbData) {
    const name = onbData.name || 'Utilizador';
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

  return {
    title: 'Primeiros passos',
    text: 'A Lumière está pronta para ajudar. Comece por criar uma tarefa ou hábito.'
  };
}