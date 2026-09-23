export const habitContract = {
  schema: {
    id: { type: 'string', required: true },
    name: { type: 'string', required: true },
    description: { type: 'string' },
    category: { type: 'string', required: true, enum: ['personal','work','study','health','finance','home','lumiere','leisure','other'] },
    frequency: { type: 'string', required: true, enum: ['daily','weekly','monthly'] },
    target: { type: 'number', required: false, default: 1 },
    unit: { type: 'string', required: false, default: 'times' },
    status: { type: 'string', required: true, enum: ['active','paused','archived'], default: 'active' },
    startDate: { type: 'string', required: false },
    daysOfWeek: { type: 'array', items: { type: 'string' }, default: [] },
    reminder: { type: 'boolean', default: false },
    reminderDateTime: { type: 'string' },
    tags: { type: 'array', items: { type: 'string' }, default: [] },
    notes: { type: 'string' },
    createdAt: { type: 'string', required: true },
    updatedAt: { type: 'string', required: true }
  },
  defaults: () => ({
    id: crypto.randomUUID?.() || Date.now().toString(36) + Math.random().toString(36).substr(2,5),
    name: '', description: '', category: 'personal', frequency: 'daily', target: 1, unit: 'times',
    status: 'active', startDate: '', daysOfWeek: [], reminder: false, reminderDateTime: '', tags: [], notes: '',
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
  }),
  validate: (data) => {
    const errors = [];
    if (!data.name || data.name.trim() === '') errors.push('Nome é obrigatório.');
    if (data.category && !habitContract.schema.category.enum.includes(data.category)) errors.push('Categoria inválida.');
    if (data.frequency && !habitContract.schema.frequency.enum.includes(data.frequency)) errors.push('Frequência inválida.');
    if (data.status && !habitContract.schema.status.enum.includes(data.status)) errors.push('Status inválido.');
    if (data.target && typeof data.target !== 'number') errors.push('Target deve ser número.');
    return { valid: errors.length === 0, errors };
  },
  relations: {}
};
export default habitContract;
