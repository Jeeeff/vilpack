/**
 * whatsappBotService — lógica do bot WhatsApp.
 * Camada completamente separada do aiService (SmartChat).
 * Usa contexto do catálogo, lead e histórico da conversa.
 * Implementação completa na Etapa 6.
 */
import { featureFlags } from '../config/featureFlags.js';

export const whatsappBotService = {
  /**
   * Processa mensagem recebida e decide ação do bot.
   * Retorna null se bot desabilitado ou conversa em modo humano.
   */
  async process(opts: {
    conversationId: string;
    contactPhone: string;
    message: string;
    botEnabled: boolean;
  }): Promise<{ reply: string | null; decision: string }> {
    if (!featureFlags.ENABLE_WHATSAPP_BOT || !opts.botEnabled) {
      return { reply: null, decision: 'bot_disabled' };
    }

    // TODO (Etapa 6): implementar lógica completa com Groq + catálogo + lead
    return { reply: null, decision: 'not_implemented' };
  },
};
