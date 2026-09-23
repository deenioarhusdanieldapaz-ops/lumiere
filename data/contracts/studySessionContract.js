export const studySessionContract = {
  schema: {
    id: { type: 'string', required: true },
    studyId: { type: 'string', required: true },
    date: { type: 'string', required: true },
    duration: { type: 'number', required: true },
    notes: { type: 'string' },
    createdAt: { type: 'string', required: true },
    updatedAt: { type: 'string', required: true }
  },
  defaults: () => ({
    id: crypto.randomUUID?.() || Date.now().toString(36) + Math.random().toString(36).substr(2,5),
    studyId: '', date: new Date().toISOString().split('T')[0], duration: 0, notes: '',
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
  }),
  validate: (data) => {
    const errors = [];
    if (!data.studyId) errors.push('studyId é obrigatório.');
    if (!data.date) errors.push('Data é obrigatória.');
    if (data.duration === undefined || typeof data.duration !== 'number' || data.duration < 0) errors.push('Duração inválida.');
    return { valid: errors.length === 0, errors };
  },
  relations: { studyId: 'studies' }
};
export default studySessionContract;
