/**
 * whatsappHandoffService — controle de takeover humano.
 * Pausa/retoma o bot por conversa e notifica via realtime.
 * Implementação completa na Etapa 6.
 */
import prisma from '../config/prisma.js';
import { whatsappRealtimeService } from './whatsappRealtimeService.js';

export const whatsappHandoffService = {
  /** Ativa atendimento humano — pausa o bot para esta conversa */
  async takeOver(conversationId: string, adminUserId: string) {
    await prisma.whatsappConversation.update({
      where: { id: conversationId },
      data: { botEnabled: false },
    });

    // Registra atribuição
    await prisma.whatsappAssignment.create({
      data: { conversationId, adminUserId },
    });

    whatsappRealtimeService.emitHandoffChange(conversationId, false);
    return { success: true, botEnabled: false };
  },

  /** Devolve conversa ao bot */
  async releaseToBot(conversationId: string) {
    await prisma.whatsappConversation.update({
      where: { id: conversationId },
      data: { botEnabled: true },
    });

    whatsappRealtimeService.emitHandoffChange(conversationId, true);
    return { success: true, botEnabled: true };
  },
};
