export const lumiereProductContract = {
  schema: {
    id: { type: 'string', required: true },
    name: { type: 'string', required: true },
    description: { type: 'string' },
    businessId: { type: 'string', required: true },
    price: { type: 'number', required: true, default: 0 },
    currency: { type: 'string', required: true, enum: ['MZN','USD'], default: 'MZN' },
    cost: { type: 'number', default: 0 },
    category: { type: 'string', required: true, enum: ['personal','work','study','health','finance','home','lumiere','leisure','other'], default: 'lumiere' },
    stock: { type: 'number', default: 0 },
    sku: { type: 'string' },
    tags: { type: 'array', items: { type: 'string' }, default: [] },
    notes: { type: 'string' },
    createdAt: { type: 'string', required: true },
    updatedAt: { type: 'string', required: true }
  },
  defaults: () => ({
    id: crypto.randomUUID?.() || Date.now().toString(36) + Math.random().toString(36).substr(2,5),
    name: '', description: '', businessId: '', price: 0, currency: 'MZN', cost: 0, category: 'lumiere', stock: 0, sku: '', tags: [], notes: '',
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
  }),
  validate: (data) => {
    const errors = [];
    if (!data.name || data.name.trim() === '') errors.push('Nome é obrigatório.');
    if (!data.businessId) errors.push('businessId é obrigatório.');
    if (data.price === undefined || typeof data.price !== 'number' || data.price < 0) errors.push('Preço inválido.');
    if (data.category && !lumiereProductContract.schema.category.enum.includes(data.category)) errors.push('Categoria inválida.');
    return { valid: errors.length === 0, errors };
  },
  relations: { businessId: 'lumiereBusinesses' }
};
export default lumiereProductContract;
