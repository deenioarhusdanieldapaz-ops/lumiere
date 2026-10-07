/**
 * VoiceValidator
 *
 * Aplica política de confiança e campos obrigatórios antes de permitir criação.
 *
 * Regras (manual secção 13):
 *   - Confiança alta + campos suficientes → ACCEPT
 *   - Confiança média ou campo crítico em falta → NEED_CLARIFICATION
 *   - Confiança baixa / intent desconhecido → REJECT
 *   - Nunca assumir silenciosamente valores críticos
 *
 * NÃO cria entidades. Apenas decide se o Intent está pronto para o Router.
 */

export const CONFIDENCE = {
  HIGH: 0.85,
  MEDIUM: 0.55
};

export const POLICY = {
  ACCEPT: 'accept',
  NEED_CLARIFICATION: 'need_clarification',
  REJECT: 'reject'
};

/* ============================================================
   Campos críticos por intent
   ============================================================ */
const REQUIRED_FIELDS = {
  create_task:   ['title'],
  create_habit:  ['title'],
  create_event:  ['title'],
  create_note:   ['title', 'content'],
  create_expense:['amount'],
  create_goal:   ['title']
};

function isFieldPresent(intent, field) {
  if (!intent) return false;
  const v = intent[field];
  if (v === undefined || v === null) return false;
  if (typeof v === 'string' && v.trim() === '') return false;
  if (typeof v === 'number' && v === 0) return false;
  return true;
}

export const VoiceValidator = {
  /**
   * Valida um VoiceIntent.
   *
   * @param {Object} intent     — objeto devolvido pelo VoiceInterpreter
   * @param {Array}  [extra]    — campos obrigatórios extra (opcional)
   * @returns {{
   *   decision: string,
   *   confidence: number,
   *   missingFields: string[],
   *   ambiguousFields: string[],
   *   reason: string
   * }}
   */
  validate(intent, extra) {
    const base = {
      decision: POLICY.REJECT,
      confidence: 0,
      missingFields: [],
      ambiguousFields: [],
      reason: 'unknown'
    };

    if (!intent || typeof intent !== 'object') {
      base.reason = 'no-intent';
      return base;
    }

    const conf = typeof intent.confidence === 'number' ? intent.confidence : 0;
    base.confidence = conf;

    // 1. Intent tem de ser conhecido
    if (!intent.intent || intent.intent === 'unknown') {
      base.reason = 'unknown-intent';
      return base;
    }

    // 2. Confiança mínima
    if (conf < CONFIDENCE.MEDIUM) {
      base.reason = 'low-confidence';
      return base;
    }

    // 3. Campos obrigatórios
    let required = REQUIRED_FIELDS[intent.intent] || [];
    if (Array.isArray(extra) && extra.length) {
      required = required.concat(extra);
    }

    for (const f of required) {
      if (!isFieldPresent(intent, f)) {
        base.missingFields.push(f);
      }
    }

    if (base.missingFields.length > 0) {
      base.decision = POLICY.NEED_CLARIFICATION;
      base.reason = 'missing-fields';
      return base;
    }

    // 4. Ambiguidades do próprio interpreter
    if (Array.isArray(intent.ambiguousFields) && intent.ambiguousFields.length > 0) {
      base.ambiguousFields = intent.ambiguousFields.slice();
      base.decision = POLICY.NEED_CLARIFICATION;
      base.reason = 'ambiguous-fields';
      return base;
    }

    // 5. Confiança alta?
    if (conf >= CONFIDENCE.HIGH) {
      base.decision = POLICY.ACCEPT;
      base.reason = 'high-confidence';
      return base;
    }

    // 6. Zona cinzenta entre MEDIUM e HIGH — pedir clarificação
    base.decision = POLICY.NEED_CLARIFICATION;
    base.reason = 'medium-confidence';
    return base;
  }
};

export default VoiceValidator;
