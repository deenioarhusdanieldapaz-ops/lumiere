export const studyContract = {
  schema: {
    id: { type: 'string', required: true },
    name: { type: 'string', required: true },
    description: { type: 'string' },
    subject: { type: 'string', required: true },
    category: { type: 'string', required: true, enum: ['personal','work','study','health','finance','home','lumiere','leisure','other'] },
    priority: { type: 'string', enum: ['low','medium','high'], default: 'medium' },
    status: { type: 'string', required: true, enum: ['planned','active','completed','paused'], default: 'planned' },
    targetHours: { type: 'number', required: false },
    progress: { type: 'number', default: 0 },
    startDate: { type: 'string' },
    dueDate: { type: 'string' },
    tags: { type: 'array', items: { type: 'string' }, default: [] },
    notes: { type: 'string' },
    createdAt: { type: 'string', required: true },
    updatedAt: { type: 'string', required: true }
  },
  defaults: () => ({
    id: crypto.randomUUID?.() || Date.now().toString(36) + Math.random().toString(36).substr(2,5),
    name: '', description: '', subject: '', category: 'study', priority: 'medium', status: 'planned',
    targetHours: 0, progress: 0, startDate: '', dueDate: '', tags: [], notes: '',
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
  }),
  validate: (data) => {
    const errors = [];
    if (!data.name || data.name.trim() === '') errors.push('Nome é obrigatório.');
    if (!data.subject) errors.push('Assunto é obrigatório.');
    if (data.category && !studyContract.schema.category.enum.includes(data.category)) errors.push('Categoria inválida.');
    if (data.status && !studyContract.schema.status.enum.includes(data.status)) errors.push('Status inválido.');
    if (data.targetHours && typeof data.targetHours !== 'number') errors.push('targetHours deve ser número.');
    return { valid: errors.length === 0, errors };
  },
  relations: {}
};
export default studyContract;
