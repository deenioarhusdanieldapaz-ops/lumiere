export const preferencesContract = {
  schema: {
    id: { type: 'string', required: true },
    userId: { type: 'string', required: true },
    theme: { type: 'string', enum: ['noir','lumiere','auto'], default: 'noir' },
    goldIntensity: { type: 'string', enum: ['subtle','balanced','strong'], default: 'balanced' },
    interfaceSize: { type: 'string', enum: ['compact','balanced','comfortable'], default: 'balanced' },
    language: { type: 'string', default: 'pt' },
    notificationsEnabled: { type: 'boolean', default: true },
    createdAt: { type: 'string', required: true },
    updatedAt: { type: 'string', required: true }
  },
  defaults: () => ({
    id: crypto.randomUUID?.() || Date.now().toString(36) + Math.random().toString(36).substr(2,5),
    userId: '', theme: 'noir', goldIntensity: 'balanced', interfaceSize: 'balanced',
    language: 'pt', notificationsEnabled: true,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
  }),
  validate: (data) => {
    const errors = [];
    if (!data.userId) errors.push('userId é obrigatório.');
    if (data.theme && !preferencesContract.schema.theme.enum.includes(data.theme)) errors.push('Tema inválido.');
    if (data.goldIntensity && !preferencesContract.schema.goldIntensity.enum.includes(data.goldIntensity)) errors.push('Intensidade dourada inválida.');
    return { valid: errors.length === 0, errors };
  },
  relations: { userId: 'userProfiles' }
};
export default preferencesContract;
