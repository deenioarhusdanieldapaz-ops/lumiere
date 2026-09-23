/**
 * i18n - Traduções UI (valores internos → labels em português).
 *
 * Os VALORES internos (enums nos contratos e no IndexedDB) mantêm-se em inglês
 * para estabilidade. Aqui mapeamos apenas para exibição na UI.
 */

export const CATEGORY_LABELS = {
  // Universais (todos os módulos)
  personal: 'Pessoal',
  work: 'Trabalho',
  study: 'Estudo',
  health: 'Saúde',
  finance: 'Finanças',
  home: 'Casa',
  lumiere: 'Lumière',
  leisure: 'Lazer',
  other: 'Outro',
  // Finanças (específicas)
  income: 'Renda',
  food: 'Alimentação',
  transport: 'Transporte',
  utilities: 'Contas',
  shopping: 'Compras',
  subscription: 'Assinaturas',
  savings: 'Poupança',
  investment: 'Investimento',
  debt: 'Dívidas',
  insurance: 'Seguros',
  family: 'Família'
};

export const PRIORITY_LABELS = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
  urgent: 'Urgente'
};

export const STATUS_LABELS = {
  pending: 'Pendente',
  'in-progress': 'Em progresso',
  completed: 'Concluída',
  cancelled: 'Cancelada'
};

export const BUSINESS_STATUS_LABELS = {
  active: 'Ativo',
  inactive: 'Inativo',
  archived: 'Arquivado'
};

export const FREQUENCY_LABELS = {
  daily: 'Diário',
  weekly: 'Semanal',
  monthly: 'Mensal'
};

export const HABIT_STATUS_LABELS = {
  active: 'Ativo',
  paused: 'Pausado',
  archived: 'Arquivado'
};

export const GOAL_STATUS_LABELS = {
  draft: 'Rascunho',
  active: 'Ativo',
  completed: 'Concluído',
  abandoned: 'Abandonado'
};

export const STUDY_STATUS_LABELS = {
  planned: 'Planeado',
  active: 'Ativo',
  completed: 'Concluído',
  paused: 'Pausado'
};

/**
 * Traduz um valor de enum para o label visual.
 * @param {string} type - 'category' | 'priority' | 'status'
 * @param {string} value
 * @returns {string}
 */
export function t(type, value) {
  const maps = {
    category: CATEGORY_LABELS,
    priority: PRIORITY_LABELS,
    status: STATUS_LABELS,
    frequency: FREQUENCY_LABELS,
    businessStatus: BUSINESS_STATUS_LABELS,
    habitStatus: HABIT_STATUS_LABELS,
    goalStatus: GOAL_STATUS_LABELS,
    studyStatus: STUDY_STATUS_LABELS
  };
  const map = maps[type];
  if (!map) return value || '';
  return map[value] || value || '';
}


export const CURRENCY_LABELS = {
  MZN: 'Mts',
  USD: '$'
};

/**
 * Formata um valor monetário com a moeda correta.
 * MZN -> "1500.00 Mts"
 * USD -> "$ 100.00"
 */
export function formatMoney(value, currency) {
  const n = Number(value);
  if (Number.isNaN(n)) return '';
  const c = currency || 'MZN';

  // Formatar com vírgula decimal e ponto de milhares (padrão PT/MZ)
  const fixed = Math.abs(n).toFixed(2);          // "990.00"
  const [intPart, decPart] = fixed.split('.');   // ["990", "00"]
  const intWithDots = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const sign = n < 0 ? '-' : '';
  const formatted = sign + intWithDots + ',' + decPart;

  if (c === 'USD') return '$ ' + formatted;
  return formatted + ' MT';
}
