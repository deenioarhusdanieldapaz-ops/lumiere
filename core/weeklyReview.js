import { dataManager } from './dataManager.js';

function toLocalYMD(date) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
}

export async function getWeeklyStats() {
  const now = new Date();
  const day = now.getDay() || 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - day + 1);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  const weekStart = toLocalYMD(monday);
  const weekEnd = toLocalYMD(sunday);

  const tasks = await dataManager.list('tasks') || [];
  const habits = await dataManager.list('habits') || [];
  const goals = await dataManager.list('goals') || [];

  const weekTasks = tasks.filter(t => t.dueDate && t.dueDate >= weekStart && t.dueDate <= weekEnd);
  const tasksTotal = weekTasks.length;
  const tasksCompleted = weekTasks.filter(t => t.status === 'completed').length;
  const tasksPercent = tasksTotal === 0 ? 0 : Math.round((tasksCompleted / tasksTotal) * 100);

  const activeHabits = habits.filter(h => h.status !== 'archived');
  const habitsList = activeHabits.map(h => ({
    name: h.name, icon: h.icon || '🔥', target: h.target || 1, unit: h.unit || 'x', done: h._doneToday || false
  }));
  const habitsTotal = activeHabits.length;
  const habitsCompleted = activeHabits.filter(h => h._doneToday).length;

  const goalsList = goals.map(g => ({ name: g.name, status: g.status }));
  const goalsTotal = goals.length;
  const goalsCompleted = goals.filter(g => g.status === 'completed').length;

  return {
    weekStart, weekEnd,
    tasks: { total: tasksTotal, completed: tasksCompleted, percent: tasksPercent },
    habits: { total: habitsTotal, completed: habitsCompleted, list: habitsList },
    goals: { total: goalsTotal, completed: goalsCompleted, list: goalsList }
  };
}

export async function saveWeeklyReview(stats, extraData) {
  const data = {
    weekStart: stats.weekStart,
    weekEnd: stats.weekEnd,
    tasksTotal: stats.tasks.total,
    tasksCompleted: stats.tasks.completed,
    tasksPercent: stats.tasks.percent,
    habitsTotal: stats.habits.total,
    habitsCompleted: stats.habits.completed,
    goalsTotal: stats.goals.total,
    goalsCompleted: stats.goals.completed,
    notes: extraData.notes || '',
    reflection: extraData.reflection || {},
    wellbeing: extraData.wellbeing || '',
    priorities: extraData.priorities || []
  };
  return await dataManager.create('weeklyReviews', data);
}
