export const reminderContract = {
  schema: {
    id: { type: 'string', required: true },
    title: { type: 'string', required: true },
    description: { type: 'string' },
    datetime: { type: 'string', required: true },
    done: { type: 'boolean', default: false },
    category: { type: 'string', enum: ['personal','work','study','health','finance','home','lumiere','leisure','other'], default: 'personal' },
    priority: { type: 'string', enum: ['low','medium','high'], default: 'medium' },
    tags: { type: 'array', items: { type: 'string' }, default: [] },
    notes: { type: 'string' },
    createdAt: { type: 'string', required: true },
    updatedAt: { type: 'string', required: true }
  },
  defaults: () => ({
    id: crypto.randomUUID?.() || Date.now().toString(36) + Math.random().toString(36).substr(2,5),
    title: '', description: '', datetime: new Date().toISOString(), done: false, category: 'personal',
    priority: 'medium', tags: [], notes: '',
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
  }),
  validate: (data) => {
    const errors = [];
    if (!data.title || data.title.trim() === '') errors.push('Título é obrigatório.');
    if (!data.datetime || isNaN(Date.parse(data.datetime))) errors.push('Data/hora inválida.');
    if (data.category && !reminderContract.schema.category.enum.includes(data.category)) errors.push('Categoria inválida.');
    return { valid: errors.length === 0, errors };
  },
  relations: {}
};
export default reminderContract;
