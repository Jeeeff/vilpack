/**
 * whatsappMessageService — persistência de mensagens.
 *
 * ISOLAMENTO: Opera exclusivamente em WhatsappMessage e WhatsappAttachment.
 * NÃO usa Message do SmartChat público.
 *
 * Deduplicação dupla:
 *   - providerMessageId: ID da mensagem no provider (Evolution API)
 *   - providerEventId:   ID do evento webhook (evita processar o mesmo evento duas vezes)
 */
import prisma from '../config/prisma.js';

// ─── tipos de dados ───────────────────────────────────────────────────────────

export interface UpsertMessageInput {
  conversationId:    string;
  providerMessageId?: string;  // ID da mensagem no provider (deduplicação)
  providerEventId?:  string;   // ID do evento webhook (deduplicação de entrega dupla)
  direction:         'inbound' | 'outbound';
  fromMe:            boolean;
  type:              string;
  content?:          string;
  status?:           string;
  timestamp?:        Date;
}

// ─── service ─────────────────────────────────────────────────────────────────

export const whatsappMessageService = {
  /**
   * Persiste mensagem recebida/enviada com deduplicação por providerMessageId.
   * Se já existir mensagem com o mesmo providerMessageId, retorna a existente.
   */
  async upsertMessage(data: UpsertMessageInput) {
    if (data.providerMessageId) {
      const existing = await prisma.whatsappMessage.findUnique({
        where: { providerMessageId: data.providerMessageId },
      });
      if (existing) return existing; // deduplicação
    }

    return prisma.whatsappMessage.create({ data });
  },

  /**
   * Verifica se um evento webhook já foi processado (deduplicação por providerEventId).
   * Retorna true se o evento já existe (deve ser ignorado).
   */
  async isEventDuplicate(providerEventId: string): Promise<boolean> {
    if (!providerEventId) return false;
    const existing = await prisma.whatsappMessage.findUnique({
      where: { providerEventId },
    });
    return existing !== null;
  },

  /** Lista mensagens de uma conversa, paginadas (ordem cronológica) */
  async listMessages(conversationId: string, take = 50, skip = 0) {
    return prisma.whatsappMessage.findMany({
      where: { conversationId },
      include: { attachments: true },
      orderBy: { timestamp: 'asc' },
      take,
      skip,
    });
  },

  /** Atualiza status de uma mensagem pelo providerMessageId (delivered, read, failed) */
  async updateStatus(providerMessageId: string, status: string) {
    return prisma.whatsappMessage.updateMany({
      where: { providerMessageId },
      data:  { status },
    });
  },
};
