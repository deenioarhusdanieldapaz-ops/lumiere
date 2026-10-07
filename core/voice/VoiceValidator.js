/**
 * VoiceValidator
 *
 * Aplica política de confiança e campos obrigatórios antes de permitir criação.
 *
 * Regras (secção 13 do manual):
 *   - Confiança alta + campos suficientes → ENTENDI ISTO
 *   - Confiança média ou campo crítico ambíguo → pedir correção
 *   - Confiança baixa → NÃO ENTENDI
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

export const VoiceValidator = {
  validate(_intent, _requiredFields) {
    // TODO: implementar (Bloco E)
    return {
      decision: POLICY.REJECT,
      confidence: 0,
      missingFields: [],
      ambiguousFields: [],
      reason: 'not-implemented'
    };
  }
};

export default VoiceValidator;
