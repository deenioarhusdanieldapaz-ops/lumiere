export const financeAccountContract = {
  schema: {
    id: { type: 'string', required: true },
    name: { type: 'string', required: true },
    type: { type: 'string', required: true, enum: ['checking','savings','credit','investment','cash'] },
    balance: { type: 'number', required: true, default: 0 },
    currency: { type: 'string', required: true, default: 'USD' },
    description: { type: 'string' },
    institution: { type: 'string' },
    color: { type: 'string' },
    tags: { type: 'array', items: { type: 'string' }, default: [] },
    createdAt: { type: 'string', required: true },
    updatedAt: { type: 'string', required: true }
  },
  defaults: () => ({
    id: crypto.randomUUID?.() || Date.now().toString(36) + Math.random().toString(36).substr(2,5),
    name: '', type: 'checking', balance: 0, currency: 'USD', description: '', institution: '', color: '#000000', tags: [],
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
  }),
  validate: (data) => {
    const errors = [];
    if (!data.name || data.name.trim() === '') errors.push('Nome é obrigatório.');
    if (data.type && !financeAccountContract.schema.type.enum.includes(data.type)) errors.push('Tipo de conta inválido.');
    if (data.balance === undefined || typeof data.balance !== 'number') errors.push('Saldo deve ser número.');
    return { valid: errors.length === 0, errors };
  },
  relations: {}
};
export default financeAccountContract;
