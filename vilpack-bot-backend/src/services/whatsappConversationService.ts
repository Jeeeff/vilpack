/**
 * whatsappConversationService — CRUD de conversas e contatos.
 */
import prisma from '../config/prisma.js';

export const whatsappConversationService = {
  /** Busca ou cria contato pelo número */
  async upsertContact(phone: string, pushName?: string) {
    return prisma.whatsappContact.upsert({
      where: { phone },
      update: { pushName: pushName ?? undefined },
      create: { phone, pushName },
    });
  },

  /** Busca ou cria conversa para instância + contato */
  async upsertConversation(instanceId: string, contactId: string) {
    return prisma.whatsappConversation.upsert({
      where: { instanceId_contactId: { instanceId, contactId } },
      update: {},
      create: { instanceId, contactId },
      include: { contact: true },
    });
  },

  /** Lista conversas de uma instância, ordenadas pela última mensagem */
  async listConversations(instanceId: string) {
    return prisma.whatsappConversation.findMany({
      where: { instanceId },
      include: {
        contact: true,
        messages: {
          orderBy: { timestamp: 'desc' },
          take: 1,
        },
        assignments: { include: { adminUser: true } },
        tags: true,
      },
      orderBy: { lastMessageAt: 'desc' },
    });
  },

  /** Atualiza status e bot flag de uma conversa */
  async updateConversation(id: string, data: {
    status?: string;
    botEnabled?: boolean;
    unreadCount?: number;
    lastMessageAt?: Date;
  }) {
    return prisma.whatsappConversation.update({ where: { id }, data });
  },

  /** Marca mensagens como lidas (zera unreadCount) */
  async markAsRead(conversationId: string) {
    return prisma.whatsappConversation.update({
      where: { id: conversationId },
      data: { unreadCount: 0 },
    });
  },
};
