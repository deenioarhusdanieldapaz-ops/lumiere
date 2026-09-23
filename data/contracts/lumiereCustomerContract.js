export const lumiereCustomerContract = {
  schema: {
    id: { type: 'string', required: true },
    name: { type: 'string', required: true },
    email: { type: 'string' },
    phone: { type: 'string' },
    address: { type: 'string' },
    notes: { type: 'string' },
    tags: { type: 'array', items: { type: 'string' }, default: [] },
    createdAt: { type: 'string', required: true },
    updatedAt: { type: 'string', required: true }
  },
  defaults: () => ({
    id: crypto.randomUUID?.() || Date.now().toString(36) + Math.random().toString(36).substr(2,5),
    name: '', email: '', phone: '', address: '', notes: '', tags: [],
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
  }),
  validate: (data) => {
    const errors = [];
    if (!data.name || data.name.trim() === '') errors.push('Nome é obrigatório.');
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errors.push('Email inválido.');
    return { valid: errors.length === 0, errors };
  },
  relations: {}
};
export default lumiereCustomerContract;
