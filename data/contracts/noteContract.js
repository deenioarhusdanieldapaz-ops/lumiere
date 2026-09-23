export const noteContract = {
  schema: {
    id: { type: 'string', required: true },
    title: { type: 'string', required: true },
    content: { type: 'string', required: true },
    category: { type: 'string', enum: ['personal','work','study','health','finance','home','lumiere','leisure','other'], default: 'personal' },
    pinned: { type: 'boolean', default: false },
    archived: { type: 'boolean', default: false },
    tags: { type: 'array', items: { type: 'string' }, default: [] },
    attachments: { type: 'array', items: { type: 'string' }, default: [] },
    createdAt: { type: 'string', required: true },
    updatedAt: { type: 'string', required: true }
  },
  defaults: () => ({
    id: crypto.randomUUID?.() || Date.now().toString(36) + Math.random().toString(36).substr(2,5),
    title: '', content: '', category: 'personal', pinned: false, archived: false, tags: [], attachments: [],
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
  }),
  validate: (data) => {
    const errors = [];
    if (!data.title || data.title.trim() === '') errors.push('Título é obrigatório.');
    if (!data.content || data.content.trim() === '') errors.push('Conteúdo é obrigatório.');
    if (data.category && !noteContract.schema.category.enum.includes(data.category)) errors.push('Categoria inválida.');
    return { valid: errors.length === 0, errors };
  },
  relations: {}
};
export default noteContract;
