export const goalContract = {
  schema: {
    id: { type: 'string', required: true },
    name: { type: 'string', required: true },
    description: { type: 'string' },
    category: { type: 'string', required: true, enum: ['personal','work','study','health','finance','home','lumiere','leisure','other'] },
    status: { type: 'string', required: true, enum: ['draft','active','completed','abandoned'], default: 'draft' },
    priority: { type: 'string', enum: ['low','medium','high'], default: 'medium' },
    targetDate: { type: 'string' },
    progress: { type: 'number', default: 0 },
    isPrimary: { type: 'boolean', default: false },
    tags: { type: 'array', items: { type: 'string' }, default: [] },
    notes: { type: 'string' },
    createdAt: { type: 'string', required: true },
    updatedAt: { type: 'string', required: true }
  },
  defaults: () => ({
    id: crypto.randomUUID?.() || Date.now().toString(36) + Math.random().toString(36).substr(2,5),
    name: '', description: '', category: 'personal', status: 'draft', priority: 'medium',
    targetDate: '', progress: 0, isPrimary: false, tags: [], notes: '',
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
  }),
  validate: (data) => {
    const errors = [];
    if (!data.name || data.name.trim() === '') errors.push('Nome é obrigatório.');
    if (data.category && !goalContract.schema.category.enum.includes(data.category)) errors.push('Categoria inválida.');
    if (data.status && !goalContract.schema.status.enum.includes(data.status)) errors.push('Status inválido.');
    return { valid: errors.length === 0, errors };
  },
  relations: {}
};
export default goalContract;
