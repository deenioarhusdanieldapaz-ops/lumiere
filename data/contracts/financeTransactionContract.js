export const financeTransactionContract = {
  schema: {
    id: { type: 'string', required: true },
    accountId: { type: 'string', required: true },
    type: { type: 'string', required: true, enum: ['income','expense','transfer'] },
    amount: { type: 'number', required: true },
    date: { type: 'string', required: true },
    description: { type: 'string' },
    category: { type: 'string', enum: ['personal','work','study','health','finance','home','lumiere','leisure','other','income','food','transport','utilities','shopping','subscription','savings','investment','debt','insurance','family'] },
    payee: { type: 'string' },
    tags: { type: 'array', items: { type: 'string' }, default: [] },
    notes: { type: 'string' },
    createdAt: { type: 'string', required: true },
    updatedAt: { type: 'string', required: true }
  },
  defaults: () => ({
    id: crypto.randomUUID?.() || Date.now().toString(36) + Math.random().toString(36).substr(2,5),
    accountId: '', type: 'expense', amount: 0, date: new Date().toISOString().split('T')[0],
    description: '', category: 'finance', payee: '', tags: [], notes: '',
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
  }),
  validate: (data) => {
    const errors = [];
    if (!data.accountId) errors.push('accountId é obrigatório.');
    if (data.type && !financeTransactionContract.schema.type.enum.includes(data.type)) errors.push('Tipo inválido.');
    if (data.amount === undefined || typeof data.amount !== 'number' || data.amount < 0) errors.push('Valor inválido.');
    if (!data.date || isNaN(Date.parse(data.date))) errors.push('Data inválida.');
    return { valid: errors.length === 0, errors };
  },
  relations: { accountId: 'financeAccounts' }
};
export default financeTransactionContract;
