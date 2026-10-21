export const weeklyReviewContract = {
  schema: {
    id: { type: 'string', required: true },
    weekStart: { type: 'string', required: true },
    weekEnd: { type: 'string', required: true },
    tasksTotal: { type: 'number', default: 0 },
    tasksCompleted: { type: 'number', default: 0 },
    tasksPercent: { type: 'number', default: 0 },
    habitsTotal: { type: 'number', default: 0 },
    habitsCompleted: { type: 'number', default: 0 },
    goalsTotal: { type: 'number', default: 0 },
    goalsCompleted: { type: 'number', default: 0 },
    createdAt: { type: 'string', required: true },
    updatedAt: { type: 'string', required: true }
  },
  defaults: () => ({
    id: crypto.randomUUID?.() || Date.now().toString(36),
    weekStart: '', weekEnd: '',
    tasksTotal: 0, tasksCompleted: 0, tasksPercent: 0,
    habitsTotal: 0, habitsCompleted: 0,
    goalsTotal: 0, goalsCompleted: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }),
  validate: (data) => {
    const errors = [];
    if (!data.weekStart || !data.weekEnd) errors.push('Datas obrigatórias.');
    return { valid: errors.length === 0, errors };
  },
  relations: {}
};
export default weeklyReviewContract;
