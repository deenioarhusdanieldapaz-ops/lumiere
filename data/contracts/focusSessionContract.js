export const focusSessionContract = {
  schema: {
    id: { type: 'string', required: true },
    entityType: { type: 'string', required: true, enum: ['task', 'habit', 'free'] },
    entityId: { type: 'string', required: false },
    entityName: { type: 'string', required: true },
    date: { type: 'string', required: true },
    startedAt: { type: 'string', required: true },
    endedAt: { type: 'string', required: false },
    totalMinutes: { type: 'number', default: 0 },
    focusMinutes: { type: 'number', default: 0 },
    pausedMinutes: { type: 'number', default: 0 },
    completedCycles: { type: 'number', default: 0 },
    wasCompleted: { type: 'boolean', default: false },
    note: { type: 'string', default: '' },
    createdAt: { type: 'string', required: true },
    updatedAt: { type: 'string', required: true }
  },
  defaults: () => ({
    id: crypto.randomUUID?.() || Date.now().toString(36) + Math.random().toString(36).substr(2,5),
    entityType: 'task',
    entityId: '',
    entityName: '',
    date: new Date().toISOString().split('T')[0],
    startedAt: new Date().toISOString(),
    endedAt: '',
    totalMinutes: 0,
    focusMinutes: 0,
    pausedMinutes: 0,
    completedCycles: 0,
    wasCompleted: false,
    note: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }),
  validate: (data) => {
    const errors = [];
    if (!data.entityType || !['task','habit','free'].includes(data.entityType)) errors.push('Tipo de entidade inválido.');
    if (!data.entityName || data.entityName.trim() === '') errors.push('Nome da entidade é obrigatório.');
    if (!data.date || !/^\d{4}-\d{2}-\d{2}$/.test(data.date)) errors.push('Data inválida.');
    if (!data.startedAt || isNaN(Date.parse(data.startedAt))) errors.push('Data/hora de início inválida.');
    return { valid: errors.length === 0, errors };
  },
  relations: {}
};
export default focusSessionContract;
