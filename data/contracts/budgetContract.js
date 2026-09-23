export const budgetContract = {
  schema: {
    id: { type: 'string', required: true },
    name: { type: 'string', required: true },
    category: { type: 'string', required: true, enum: ['personal','work','study','health','finance','home','lumiere','leisure','other','income','food','transport','utilities','shopping','subscription','savings','investment','debt','insurance','family'] },
    amount: { type: 'number', required: true },
    spent: { type: 'number', default: 0 },
    period: { type: 'string', required: true, enum: ['weekly','monthly','yearly'] },
    startDate: { type: 'string' },
    endDate: { type: 'string' },
    color: { type: 'string' },
    tags: { type: 'array', items: { type: 'string' }, default: [] },
    notes: { type: 'string' },
    createdAt: { type: 'string', required: true },
    updatedAt: { type: 'string', required: true }
  },
  defaults: () => ({
    id: crypto.randomUUID?.() || Date.now().toString(36) + Math.random().toString(36).substr(2,5),
    name: '', category: 'finance', amount: 0, spent: 0, period: 'monthly',
    startDate: new Date().toISOString().split('T')[0], endDate: '', color: '#000000', tags: [], notes: '',
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
  }),
  validate: (data) => {
    const errors = [];
    if (!data.name || data.name.trim() === '') errors.push('Nome é obrigatório.');
    if (data.category && !budgetContract.schema.category.enum.includes(data.category)) errors.push('Categoria inválida.');
    if (data.amount === undefined || typeof data.amount !== 'number' || data.amount < 0) errors.push('Valor inválido.');
    if (data.period && !budgetContract.schema.period.enum.includes(data.period)) errors.push('Período inválido.');
    return { valid: errors.length === 0, errors };
  },
  relations: {}
};
export default budgetContract;
