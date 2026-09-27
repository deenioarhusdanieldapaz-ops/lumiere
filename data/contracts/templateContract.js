/**
 * Template Contract — modelos reutilizáveis de registos.
 *
 * Aplica-se a: tasks, habits, studies, goals, notes
 * O campo `payload` contém valores por defeito que pré-preenchem
 * o formulário do módulo destino (regra B1 — utilizador revê antes
 * de gravar).
 *
 * Sub-schemas por módulo: o validate() garante que o payload só
 * contém chaves permitidas para o appliesTo escolhido.
 */

// Chaves permitidas no payload, por módulo
const PAYLOAD_KEYS = {
  tasks: ['name', 'description', 'category', 'priority', 'status', 'dueDate', 'tags', 'notes'],
  habits: ['name', 'description', 'category', 'frequency', 'target', 'unit', 'daysOfWeek', 'notes'],
  studies: ['name', 'description', 'category', 'subject', 'duration', 'notes'],
  goals: ['name', 'description', 'category', 'targetDate', 'notes'],
  notes: ['title', 'content', 'category', 'tags']
};

export const templateContract = {
  schema: {
    id: { type: 'string', required: true },
    name: { type: 'string', required: true },
    description: { type: 'string' },
    category: {
      type: 'string',
      required: true,
      enum: ['personal', 'work', 'study', 'health', 'finance', 'home', 'lumiere', 'leisure', 'other']
    },
    appliesTo: {
      type: 'string',
      required: true,
      enum: ['tasks', 'habits', 'studies', 'goals', 'notes']
    },
    payload: { type: 'object', required: true, default: {} },
    icon: { type: 'string' },
    tags: { type: 'array', items: { type: 'string' }, default: [] },
    usageCount: { type: 'number', default: 0 },
    lastUsedAt: { type: 'string' },
    createdAt: { type: 'string', required: true },
    updatedAt: { type: 'string', required: true }
  },

  defaults: () => ({
    id: crypto.randomUUID?.() || Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
    name: '',
    description: '',
    category: 'personal',
    appliesTo: 'tasks',
    payload: {},
    icon: '',
    tags: [],
    usageCount: 0,
    lastUsedAt: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }),

  validate: (data) => {
    const errors = [];

    // Nome obrigatório
    if (!data.name || data.name.trim() === '') {
      errors.push('Nome é obrigatório.');
    }

    // Categoria válida
    if (data.category && !templateContract.schema.category.enum.includes(data.category)) {
      errors.push('Categoria inválida.');
    }

    // appliesTo obrigatório e válido
    if (!data.appliesTo || !templateContract.schema.appliesTo.enum.includes(data.appliesTo)) {
      errors.push('Campo "appliesTo" é obrigatório e deve ser um módulo válido.');
    }

    // Payload deve ser objeto
    if (data.payload !== undefined && (typeof data.payload !== 'object' || data.payload === null || Array.isArray(data.payload))) {
      errors.push('Payload deve ser um objeto.');
    }

    // Sub-schema: validar chaves do payload contra o appliesTo
    if (data.appliesTo && PAYLOAD_KEYS[data.appliesTo] && data.payload) {
      const allowed = PAYLOAD_KEYS[data.appliesTo];
      const unknown = Object.keys(data.payload).filter((k) => !allowed.includes(k));
      if (unknown.length > 0) {
        errors.push(`Payload contém chaves não permitidas para "${data.appliesTo}": ${unknown.join(', ')}.`);
      }
    }

    return { valid: errors.length === 0, errors };
  },

  // Exportado para uso interno (testes, UI de ajuda)
  payloadKeys: PAYLOAD_KEYS,

  relations: {}
};

export default templateContract;
