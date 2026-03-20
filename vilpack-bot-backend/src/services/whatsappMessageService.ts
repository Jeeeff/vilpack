/**
 * whatsappMessageService — persistência de mensagens.
 *
 * ISOLAMENTO: Opera exclusivamente em WhatsappMessage e WhatsappAttachment.
 * NÃO usa Message do SmartChat público.
 *
 * Deduplicação dupla:
 *   - providerMessageId: ID da mensagem no provider (Evolution API)
 *   - providerEventId:   ID do evento webhook (evita processar o mesmo evento duas vezes)
 *
 * Paginação cursor-based:
 *   - listMessages(conversationId, limit, cursor?)
 *     → retorna até `limit` mensagens antes do cursor (ID de mensagem)
 *     → sem cursor: retorna as `limit` mais recentes, em ordem cronológica asc
 */
import prisma from '../config/prisma.js';

// ─── tipos de dados ───────────────────────────────────────────────────────────

export interface UpsertMessageInput {
  conversationId:     string;
  providerMessageId?: string;  // ID da mensagem no provider (deduplicação)
  providerEventId?:   string;  // ID do evento webhook (deduplicação de entrega dupla)
  direction:          'inbound' | 'outbound';
  fromMe:             boolean;
  type:               string;
  content?:           string;
  status?:            string;
  timestamp?:         Date;
}

export interface MessagePage {
  messages:   MessageRow[];
  nextCursor: string | null;  // ID da mensagem mais antiga retornada (usar como cursor na próxima req)
  hasMore:    boolean;
}

export interface MessageRow {
  id:                string;
  conversationId:    string;
  providerMessageId: string | null;
  direction:         string;
  fromMe:            boolean;
  type:              string;
  content:           string | null;
  status:            string;
  timestamp:         Date;
  createdAt:         Date;
  attachments:       unknown[];
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

  /**
   * Lista mensagens de uma conversa com paginação cursor-based.
   *
   * Estratégia:
   *   - Sem cursor: busca as `limit` mensagens mais recentes (ordem timestamp desc),
   *     inverte para retornar em ordem cronológica asc.
   *   - Com cursor (ID de mensagem): busca `limit` mensagens com timestamp anterior
   *     ao da mensagem do cursor, também invertendo para ordem asc.
   *
   * Retorna `nextCursor` = ID da mensagem mais antiga do resultado (para a próxima
   * chamada de "carregar mais"), e `hasMore` para saber se existem mensagens anteriores.
   */
  async listMessages(
    conversationId: string,
    limit  = 50,
    cursor?: string,
  ): Promise<MessagePage> {
    // Resolve timestamp do cursor, se fornecido
    let cursorTimestamp: Date | undefined;
    if (cursor) {
      const pivot = await prisma.whatsappMessage.findUnique({
        where: { id: cursor },
        select: { timestamp: true },
      });
      cursorTimestamp = pivot?.timestamp ?? undefined;
    }

    // Busca limit+1 para saber se existe página anterior
    const rows = await prisma.whatsappMessage.findMany({
      where: {
        conversationId,
        ...(cursorTimestamp ? { timestamp: { lt: cursorTimestamp } } : {}),
      },
      include: { attachments: true },
      orderBy: { timestamp: 'desc' },
      take: limit + 1,
    });

    const hasMore = rows.length > limit;
    if (hasMore) rows.pop(); // remove o extra

    // Retorna em ordem cronológica asc (mais antiga primeiro)
    const messages = rows.reverse() as MessageRow[];

    return {
      messages,
      nextCursor: hasMore ? (messages[0]?.id ?? null) : null,
      hasMore,
    };
  },

  /** Atualiza status de uma mensagem pelo providerMessageId (delivered, read, failed) */
  async updateStatus(providerMessageId: string, status: string) {
    return prisma.whatsappMessage.updateMany({
      where: { providerMessageId },
      data:  { status },
    });
  },

  /** Busca uma mensagem pelo providerMessageId (para retornar dados após updateStatus) */
  async findByProviderMessageId(providerMessageId: string) {
    return prisma.whatsappMessage.findUnique({
      where: { providerMessageId },
      select: { id: true, conversationId: true, providerMessageId: true, status: true },
    });
  },
};
