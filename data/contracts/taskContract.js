export const taskContract = {
  schema: {
    id: { type: 'string', required: true },
    name: { type: 'string', required: true, minLength: 1 },
    description: { type: 'string', required: false },
    category: { type: 'string', required: true, enum: ['personal','work','study','health','finance','home','lumiere','leisure','other'] },
    priority: { type: 'string', required: false, enum: ['low','medium','high','urgent'], default: 'medium' },
    status: { type: 'string', required: true, enum: ['pending','in-progress','completed','cancelled'], default: 'pending' },
    startDate: { type: 'string', required: false },
    startTime: { type: 'string', required: false },
    dueDate: { type: 'string', required: false },
    goalId: { type: 'string', required: false },
    recurrence: { type: 'string', required: false, enum: ['none','daily','weekly','monthly','yearly'], default: 'none' },
    reminder: { type: 'boolean', required: false, default: false },
    reminderDateTime: { type: 'string', required: false },
    tags: { type: 'array', items: { type: 'string' }, required: false, default: [] },
    attachments: { type: 'array', items: { type: 'string' }, required: false, default: [] },
    notes: { type: 'string', required: false },
    createdAt: { type: 'string', required: true },
    updatedAt: { type: 'string', required: true }
  },
  defaults: () => ({
    id: crypto.randomUUID?.() || Date.now().toString(36) + Math.random().toString(36).substr(2,5),
    name: '', description: '', category: 'personal', priority: 'medium', status: 'pending',
    startDate: '', startTime: '', dueDate: '', goalId: '', recurrence: 'none', reminder: false, reminderDateTime: '',
    tags: [], attachments: [], notes: '',
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
  }),
  validate: (data) => {
    const errors = [];
    if (!data.name || data.name.trim() === '') errors.push('Nome é obrigatório.');
    if (data.category && !taskContract.schema.category.enum.includes(data.category)) errors.push('Categoria inválida.');
    if (data.priority && !taskContract.schema.priority.enum.includes(data.priority)) errors.push('Prioridade inválida.');
    if (data.status && !taskContract.schema.status.enum.includes(data.status)) errors.push('Status inválido.');
    if (data.recurrence && !taskContract.schema.recurrence.enum.includes(data.recurrence)) errors.push('Recorrência inválida.');
    if (data.startDate && isNaN(Date.parse(data.startDate))) errors.push('Data de início inválida.');
    if (data.dueDate && isNaN(Date.parse(data.dueDate))) errors.push('Prazo inválido.');
    if (data.reminderDateTime && isNaN(Date.parse(data.reminderDateTime))) errors.push('Data/hora do lembrete inválida.');
    return { valid: errors.length === 0, errors };
  },
  relations: {}
};
export default taskContract;
