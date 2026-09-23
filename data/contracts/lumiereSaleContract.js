export const lumiereSaleContract = {
  schema: {
    id: { type: 'string', required: true },
    productId: { type: 'string', required: true },
    customerId: { type: 'string', required: true },
    quantity: { type: 'number', required: true },
    unitPrice: { type: 'number', required: true },
    currency: { type: 'string', required: true, enum: ['MZN','USD'], default: 'MZN' },
    total: { type: 'number', required: true },
    date: { type: 'string', required: true },
    status: { type: 'string', required: true, enum: ['pending','paid','cancelled'], default: 'pending' },
    notes: { type: 'string' },
    tags: { type: 'array', items: { type: 'string' }, default: [] },
    createdAt: { type: 'string', required: true },
    updatedAt: { type: 'string', required: true }
  },
  defaults: () => ({
    id: crypto.randomUUID?.() || Date.now().toString(36) + Math.random().toString(36).substr(2,5),
    productId: '', customerId: '', quantity: 1, unitPrice: 0, currency: 'MZN', total: 0, date: new Date().toISOString().split('T')[0],
    status: 'pending', notes: '', tags: [],
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
  }),
  validate: (data) => {
    const errors = [];
    if (!data.productId) errors.push('productId é obrigatório.');
    if (!data.customerId) errors.push('customerId é obrigatório.');
    if (data.quantity === undefined || typeof data.quantity !== 'number' || data.quantity < 1) errors.push('Quantidade inválida.');
    if (data.unitPrice === undefined || typeof data.unitPrice !== 'number' || data.unitPrice < 0) errors.push('Preço unitário inválido.');
    if (data.total === undefined || typeof data.total !== 'number' || data.total < 0) errors.push('Total inválido.');
    if (data.status && !lumiereSaleContract.schema.status.enum.includes(data.status)) errors.push('Status inválido.');
    return { valid: errors.length === 0, errors };
  },
  relations: { productId: 'lumiereProducts', customerId: 'lumiereCustomers' }
};
export default lumiereSaleContract;
