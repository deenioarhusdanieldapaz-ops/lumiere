/**
 * VoiceCommandRouter
 *
 * Mapeia VoiceIntent (já validado) → módulo + ação + payload a pré-preencher.
 * NÃO cria entidades. NÃO fala com o DataManager.
 * Emite intenção de UI que o formulário real do módulo consome.
 *
 * Fluxo:
 *   Intent validado → Router → { page, action, payload, voiceOrigin: true }
 *                          → eventBus.emit('voice:prefill-form', {...})
 *                          → módulo real abre form preenchido
 *                          → utilizador revê e confirma
 *                          → DataManager.create()
 */

export const VoiceCommandRouter = {
  route(_intent) {
    // TODO: implementar (Bloco F)
    return null;
  }
};

export default VoiceCommandRouter;
