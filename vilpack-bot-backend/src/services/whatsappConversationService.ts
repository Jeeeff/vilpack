/**
 * whatsappConversationService — CRUD de conversas e contatos.
 *
 * ISOLAMENTO: Este serviço opera exclusivamente nas tabelas do módulo WhatsApp
 * (WhatsappContact, WhatsappConversation). NÃO reutiliza Session, Message
 * nem Lead do SmartChat público. O campo leadId em WhatsappContact é apenas
 * uma referência de campo simples, sem @relation Prisma.
 */
import prisma from '../config/prisma.js';

// ─── tipos de dados ───────────────────────────────────────────────────────────

export interface UpdateConversationInput {
  status?:              string;
  botEnabled?:          boolean;
  botPaused?:           boolean;
  assignedAdminUserId?: string | null;
  unreadCount?:         number;
  lastMessageAt?:       Date;
}

// ─── service ─────────────────────────────────────────────────────────────────

export const whatsappConversationService = {
  /** Busca ou cria contato pelo número */
  async upsertContact(
    phone: string,
    opts?: { pushName?: string; name?: string; profilePicUrl?: string },
  ) {
    return prisma.whatsappContact.upsert({
      where: { phone },
      update: {
        pushName:      opts?.pushName      ?? undefined,
        name:          opts?.name          ?? undefined,
        profilePicUrl: opts?.profilePicUrl ?? undefined,
      },
      create: {
        phone,
        pushName:      opts?.pushName,
        name:          opts?.name,
        profilePicUrl: opts?.profilePicUrl,
      },
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

  /** Atualiza campos mutáveis de uma conversa */
  async updateConversation(
    id: string,
    data: UpdateConversationInput,
  ) {
    return prisma.whatsappConversation.update({ where: { id }, data });
  },

  /** Marca mensagens como lidas (zera unreadCount) */
  async markAsRead(conversationId: string) {
    return prisma.whatsappConversation.update({
      where: { id: conversationId },
      data: { unreadCount: 0 },
    });
  },

  /** Busca uma conversa por ID com dados completos */
  async getConversation(id: string) {
    return prisma.whatsappConversation.findUnique({
      where: { id },
      include: {
        contact:     true,
        instance:    true,
        assignments: { include: { adminUser: true }, orderBy: { assignedAt: 'desc' }, take: 1 },
        tags:        true,
      },
    });
  },
};
