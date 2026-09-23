export const categoryContract = {
  schema: {
    id: { type: 'string', required: true },
    name: { type: 'string', required: true },
    type: { type: 'string', required: true, enum: ['task','habit','study','goal','event','finance','note','lumiere','reminder'] },
    color: { type: 'string' },
    icon: { type: 'string' },
    description: { type: 'string' },
    createdAt: { type: 'string', required: true },
    updatedAt: { type: 'string', required: true }
  },
  defaults: () => ({
    id: crypto.randomUUID?.() || Date.now().toString(36) + Math.random().toString(36).substr(2,5),
    name: '', type: 'task', color: '#000000', icon: '', description: '',
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
  }),
  validate: (data) => {
    const errors = [];
    if (!data.name || data.name.trim() === '') errors.push('Nome é obrigatório.');
    if (data.type && !categoryContract.schema.type.enum.includes(data.type)) errors.push('Tipo inválido.');
    return { valid: errors.length === 0, errors };
  },
  relations: {}
};
export default categoryContract;
