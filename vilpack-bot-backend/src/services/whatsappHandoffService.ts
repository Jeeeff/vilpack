/**
 * whatsappHandoffService — controle de takeover humano.
 *
 * Diferença entre botEnabled e botPaused:
 *   botEnabled — configuração global da instância/conversa (on/off permanente)
 *   botPaused  — pausa temporária por intervenção humana (takeover/release)
 *
 * Implementação completa de regras e notificações na Etapa 6.
 */
import prisma from '../config/prisma.js';
import { whatsappRealtimeService } from './whatsappRealtimeService.js';

export const whatsappHandoffService = {
  /**
   * Ativa atendimento humano — pausa o bot para esta conversa.
   * Registra atribuição no histórico e atualiza assignedAdminUserId.
   */
  async takeOver(conversationId: string, adminUserId: string) {
    await prisma.whatsappConversation.update({
      where: { id: conversationId },
      data: {
        botPaused:           true,
        assignedAdminUserId: adminUserId,
      },
    });

    await prisma.whatsappAssignment.create({
      data: { conversationId, adminUserId },
    });

    whatsappRealtimeService.emitHandoffChange(conversationId, false);
    return { success: true, botPaused: true };
  },

  /** Devolve conversa ao bot — remove pausa humana */
  async releaseToBot(conversationId: string) {
    await prisma.whatsappConversation.update({
      where: { id: conversationId },
      data: {
        botPaused:           false,
        assignedAdminUserId: null,
      },
    });

    whatsappRealtimeService.emitHandoffChange(conversationId, true);
    return { success: true, botPaused: false };
  },
};
