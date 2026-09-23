export const calendarEventContract = {
  schema: {
    id: { type: 'string', required: true },
    title: { type: 'string', required: true },
    description: { type: 'string' },
    start: { type: 'string', required: true },
    end: { type: 'string', required: true },
    allDay: { type: 'boolean', default: false },
    category: { type: 'string', enum: ['personal','work','study','health','finance','home','lumiere','leisure','other'], default: 'personal' },
    location: { type: 'string' },
    reminder: { type: 'boolean', default: false },
    reminderDateTime: { type: 'string' },
    recurrence: { type: 'string', enum: ['none','daily','weekly','monthly','yearly'], default: 'none' },
    tags: { type: 'array', items: { type: 'string' }, default: [] },
    notes: { type: 'string' },
    createdAt: { type: 'string', required: true },
    updatedAt: { type: 'string', required: true }
  },
  defaults: () => ({
    id: crypto.randomUUID?.() || Date.now().toString(36) + Math.random().toString(36).substr(2,5),
    title: '', description: '', start: new Date().toISOString(), end: new Date().toISOString(),
    allDay: false, category: 'personal', location: '', reminder: false, reminderDateTime: '',
    recurrence: 'none', tags: [], notes: '',
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
  }),
  validate: (data) => {
    const errors = [];
    if (!data.title || data.title.trim() === '') errors.push('Título é obrigatório.');
    if (!data.start || isNaN(Date.parse(data.start))) errors.push('Data/hora de início inválida.');
    if (!data.end || isNaN(Date.parse(data.end))) errors.push('Data/hora de fim inválida.');
    if (data.start && data.end && new Date(data.start) > new Date(data.end)) errors.push('Início deve ser anterior ao fim.');
    if (data.category && !calendarEventContract.schema.category.enum.includes(data.category)) errors.push('Categoria inválida.');
    return { valid: errors.length === 0, errors };
  },
  relations: {}
};
export default calendarEventContract;
