export const habitLogContract = {
  schema: {
    id: { type: 'string', required: true },
    habitId: { type: 'string', required: true },
    date: { type: 'string', required: true },
    completed: { type: 'boolean', required: true, default: false },
    value: { type: 'number', required: false, default: 1 },
    notes: { type: 'string' },
    createdAt: { type: 'string', required: true },
    updatedAt: { type: 'string', required: true }
  },
  defaults: () => ({
    id: crypto.randomUUID?.() || Date.now().toString(36) + Math.random().toString(36).substr(2,5),
    habitId: '', date: new Date().toISOString().split('T')[0], completed: false, value: 1, notes: '',
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
  }),
  validate: (data) => {
    const errors = [];
    if (!data.habitId) errors.push('habitId é obrigatório.');
    if (!data.date) errors.push('Data é obrigatória.');
    if (data.completed === undefined) errors.push('completed é obrigatório.');
    if (data.value && typeof data.value !== 'number') errors.push('value deve ser número.');
    return { valid: errors.length === 0, errors };
  },
  relations: { habitId: 'habits' }
};
export default habitLogContract;
