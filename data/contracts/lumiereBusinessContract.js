export const lumiereBusinessContract = {
  schema: {
    id: { type: 'string', required: true },
    name: { type: 'string', required: true },
    description: { type: 'string' },
    category: { type: 'string', required: true, enum: ['personal','work','study','health','finance','home','lumiere','leisure','other'], default: 'lumiere' },
    status: { type: 'string', required: true, enum: ['active','inactive','archived'], default: 'active' },
    contact: { type: 'string' },
    email: { type: 'string' },
    phone: { type: 'string' },
    website: { type: 'string' },
    monthlyGoal: { type: 'number', default: 10 },
    notes: { type: 'string' },
    tags: { type: 'array', items: { type: 'string' }, default: [] },
    createdAt: { type: 'string', required: true },
    updatedAt: { type: 'string', required: true }
  },
  defaults: () => ({
    id: crypto.randomUUID?.() || Date.now().toString(36) + Math.random().toString(36).substr(2,5),
    name: '', description: '', category: 'lumiere', status: 'active', contact: '', email: '', phone: '', website: '', monthlyGoal: 10, notes: '', tags: [],
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
  }),
  validate: (data) => {
    const errors = [];
    if (!data.name || data.name.trim() === '') errors.push('Nome é obrigatório.');
    if (data.category && !lumiereBusinessContract.schema.category.enum.includes(data.category)) errors.push('Categoria inválida.');
    if (data.status && !lumiereBusinessContract.schema.status.enum.includes(data.status)) errors.push('Status inválido.');
    return { valid: errors.length === 0, errors };
  },
  relations: {}
};
export default lumiereBusinessContract;
