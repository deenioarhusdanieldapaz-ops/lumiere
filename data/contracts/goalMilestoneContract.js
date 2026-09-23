export const goalMilestoneContract = {
  schema: {
    id: { type: 'string', required: true },
    goalId: { type: 'string', required: true },
    name: { type: 'string', required: true },
    description: { type: 'string' },
    status: { type: 'string', required: true, enum: ['pending','completed','skipped'], default: 'pending' },
    dueDate: { type: 'string' },
    completedAt: { type: 'string' },
    createdAt: { type: 'string', required: true },
    updatedAt: { type: 'string', required: true }
  },
  defaults: () => ({
    id: crypto.randomUUID?.() || Date.now().toString(36) + Math.random().toString(36).substr(2,5),
    goalId: '', name: '', description: '', status: 'pending', dueDate: '', completedAt: '',
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
  }),
  validate: (data) => {
    const errors = [];
    if (!data.goalId) errors.push('goalId é obrigatório.');
    if (!data.name || data.name.trim() === '') errors.push('Nome é obrigatório.');
    if (data.status && !goalMilestoneContract.schema.status.enum.includes(data.status)) errors.push('Status inválido.');
    return { valid: errors.length === 0, errors };
  },
  relations: { goalId: 'goals' }
};
export default goalMilestoneContract;
