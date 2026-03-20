/**
 * whatsappMessageService — persistência de mensagens.
 */
import prisma from '../config/prisma.js';

export const whatsappMessageService = {
  /** Persiste mensagem recebida/enviada, com deduplicação por evolutionId */
  async upsertMessage(data: {
    conversationId: string;
    evolutionId?: string;
    direction: 'inbound' | 'outbound';
    fromMe: boolean;
    type: string;
    content?: string;
    status?: string;
    timestamp?: Date;
  }) {
    if (data.evolutionId) {
      const existing = await prisma.whatsappMessage.findUnique({
        where: { evolutionId: data.evolutionId },
      });
      if (existing) return existing; // deduplicação
    }

    return prisma.whatsappMessage.create({ data });
  },

  /** Lista mensagens de uma conversa, paginadas */
  async listMessages(conversationId: string, take = 50, skip = 0) {
    return prisma.whatsappMessage.findMany({
      where: { conversationId },
      include: { attachments: true },
      orderBy: { timestamp: 'asc' },
      take,
      skip,
    });
  },

  /** Atualiza status de uma mensagem (delivered, read, failed) */
  async updateStatus(evolutionId: string, status: string) {
    return prisma.whatsappMessage.updateMany({
      where: { evolutionId },
      data: { status },
    });
  },
};
