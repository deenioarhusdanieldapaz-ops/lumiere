/**
 * Calculations Manager - Métricas oficiais
 * Calcula progresso, saldos, consistência e indicadores.
 * Não depende de UI, apenas de dados e regras determinísticas.
 */
import { dataManager } from './dataManager.js';
import { eventBus } from './eventBus.js';

export const calculationsManager = {
  /**
   * Calcular progresso geral de tarefas
   * @param {Array} tasks - Lista de tarefas
   * @returns {Object} { total, completed, pending, inProgress, cancelled, completionRate }
   */
  calculateTaskProgress(tasks) {
    if (!tasks || tasks.length === 0) {
      return { total: 0, completed: 0, pending: 0, inProgress: 0, cancelled: 0, completionRate: 0 };
    }
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'completed').length;
    const pending = tasks.filter(t => t.status === 'pending').length;
    const inProgress = tasks.filter(t => t.status === 'in-progress').length;
    const cancelled = tasks.filter(t => t.status === 'cancelled').length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, pending, inProgress, cancelled, completionRate };
  },

  /**
   * Calcular progresso de hábitos
   * @param {Array} habits - Lista de hábitos
   * @param {Array} habitLogs - Lista de logs
   * @param {string} period - 'daily', 'weekly', 'monthly'
   * @returns {Object} { total, completed, completionRate }
   */
  calculateHabitProgress(habits, habitLogs, period = 'daily') {
    if (!habits || habits.length === 0) {
      return { total: 0, completed: 0, completionRate: 0 };
    }
    const total = habits.length;
    // Para simplificar, calcula baseado no período
    const now = new Date();
    let startDate;
    if (period === 'daily') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (period === 'weekly') {
      const day = now.getDay();
      startDate = new Date(now);
      startDate.setDate(now.getDate() - day);
    } else { // monthly
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }
    const filteredLogs = habitLogs ? habitLogs.filter(log => new Date(log.date) >= startDate) : [];
    const completed = filteredLogs.filter(log => log.completed).length;
    const completionRate = total > 0 ? Math.round((completed / (total * 1)) * 100) : 0; // simplificado
    return { total, completed, completionRate };
  },

  /**
   * Calcular saldo financeiro total
   * @param {Array} accounts - Lista de contas
   * @param {Array} transactions - Lista de transações
   * @returns {Object} { totalBalance, income, expense, net }
   */
  calculateFinanceSummary(accounts, transactions) {
    const totalBalance = accounts ? accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0) : 0;
    const income = transactions ? transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0) : 0;
    const expense = transactions ? transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0) : 0;
    return { totalBalance, income, expense, net: income - expense };
  },

  /**
   * Calcular consistência de dados (verificar integridade referencial)
   * @param {Object} collections - Dicionário com todas as coleções
   * @returns {Object} { valid, errors }
   */
  checkDataConsistency(collections) {
    const errors = [];
    // Verificar se todas as referências de IDs existem
    // Exemplo: tasks devem referenciar categories existentes
    if (collections.tasks && collections.categories) {
      const categoryIds = new Set(collections.categories.map(c => c.id));
      for (const task of collections.tasks) {
        if (task.category && !categoryIds.has(task.category)) {
          errors.push(`Tarefa ${task.id} referencia categoria ${task.category} inexistente`);
        }
      }
    }
    // HabitLogs -> Habits
    if (collections.habitLogs && collections.habits) {
      const habitIds = new Set(collections.habits.map(h => h.id));
      for (const log of collections.habitLogs) {
        if (log.habitId && !habitIds.has(log.habitId)) {
          errors.push(`HabitLog ${log.id} referencia hábito ${log.habitId} inexistente`);
        }
      }
    }
    // StudySessions -> Studies
    if (collections.studySessions && collections.studies) {
      const studyIds = new Set(collections.studies.map(s => s.id));
      for (const session of collections.studySessions) {
        if (session.studyId && !studyIds.has(session.studyId)) {
          errors.push(`StudySession ${session.id} referencia estudo ${session.studyId} inexistente`);
        }
      }
    }
    return { valid: errors.length === 0, errors };
  },

  /**
   * Calcular indicadores gerais
   * @param {Object} collections - Dicionário com todas as coleções
   * @returns {Object} { totalTasks, totalHabits, totalStudies, totalGoals, totalNotes, totalEvents }
   */
  calculateGeneralIndicators(collections) {
    return {
      totalTasks: collections.tasks ? collections.tasks.length : 0,
      totalHabits: collections.habits ? collections.habits.length : 0,
      totalStudies: collections.studies ? collections.studies.length : 0,
      totalGoals: collections.goals ? collections.goals.length : 0,
      totalNotes: collections.notes ? collections.notes.length : 0,
      totalEvents: collections.calendarEvents ? collections.calendarEvents.length : 0
    };
  }
};

export default calculationsManager;
