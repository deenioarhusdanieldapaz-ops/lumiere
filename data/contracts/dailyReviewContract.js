export const dailyReviewContract = {
  schema: {
    id: { type: 'string', required: true },
    date: { type: 'string', required: true },
    mood: { type: 'number', required: true },
    completedTaskIds: { type: 'array', items: { type: 'string' }, default: [] },
    completedHabitIds: { type: 'array', items: { type: 'string' }, default: [] },
    deferredTaskIds: { type: 'array', items: { type: 'string' }, default: [] },
    note: { type: 'string', default: '' },
    createdAt: { type: 'string', required: true },
    updatedAt: { type: 'string', required: true }
  },
  defaults: () => ({
    id: crypto.randomUUID?.() || Date.now().toString(36) + Math.random().toString(36).substr(2,5),
    date: new Date().toISOString().split('T')[0],
    mood: 3,
    completedTaskIds: [],
    completedHabitIds: [],
    deferredTaskIds: [],
    note: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }),
  validate: (data) => {
    const errors = [];
    if (!data.date || !/^\d{4}-\d{2}-\d{2}$/.test(data.date)) errors.push('Data inválida.');
    if (typeof data.mood !== 'number' || data.mood < 1 || data.mood > 5) errors.push('Humor deve ser 1-5.');
    return { valid: errors.length === 0, errors };
  },
  relations: {}
};
export default dailyReviewContract;
