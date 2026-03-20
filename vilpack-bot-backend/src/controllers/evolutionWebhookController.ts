/**
 * evolutionWebhookController — recebe eventos da Evolution API.
 *
 * Rota pública (sem JWT), validada por segredo compartilhado (EVOLUTION_WEBHOOK_SECRET).
 * Fluxo de cada evento:
 *   1. Valida segredo → rejeita imediatamente se inválido
 *   2. Valida schema Zod → rejeita se mal formado
 *   3. Deduplicação por providerEventId → ignora se já processado
 *   4. Delega ao handler correto pelo campo `event`
 *   5. Persiste contato, conversa e mensagem
 *   6. Emite via Socket.IO para o painel admin
 */
import type { Request, Response, NextFunction } from 'express';
import { webhookEventSchema } from '../validators/whatsappValidators.js';
import { whatsappConversationService } from '../services/whatsappConversationService.js';
import { whatsappMessageService } from '../services/whatsappMessageService.js';
import { whatsappRealtimeService } from '../services/whatsappRealtimeService.js';
import { featureFlags } from '../config/featureFlags.js';
import prisma from '../config/prisma.js';

// ─── endpoint principal ───────────────────────────────────────────────────────

export async function handleEvolutionWebhook(req: Request, res: Response, next: NextFunction) {
  // 1. feature flag guard
  if (!featureFlags.ENABLE_EVOLUTION_WEBHOOKS) {
    res.status(503).json({ error: 'Webhooks não habilitados' });
    return;
  }

  // 2. validação de segredo
  const secret = process.env.EVOLUTION_WEBHOOK_SECRET;
  if (secret) {
    const provided = req.headers['x-webhook-secret'] ?? req.query['secret'];
    const providedStr = Array.isArray(provided) ? provided[0] : provided;
    if (providedStr !== secret) {
      res.status(401).json({ error: 'Segredo inválido' });
      return;
    }
  }

  // 3. validação de schema
  const parsed = webhookEventSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const { event, instance: instanceName, data } = parsed.data;

  // Responde imediatamente — processamento é assíncrono
  res.json({ received: true });

  try {
    await processEvent(event, instanceName, data);
  } catch (err) {
    // Loga mas não deixa bater no cliente (já respondeu 200)
    console.error('[Webhook] Erro ao processar evento:', event, err);
  }
}

// ─── roteador de eventos ──────────────────────────────────────────────────────

async function processEvent(
  event:        string,
  instanceName: string,
  data:         Record<string, unknown>,
) {
  switch (event) {
    case 'MESSAGES_UPSERT':
      await handleMessagesUpsert(instanceName, data);
      break;
    case 'MESSAGES_UPDATE':
      await handleMessagesUpdate(data);
      break;
    case 'CONNECTION_UPDATE':
      await handleConnectionUpdate(instanceName, data);
      break;
    case 'QRCODE_UPDATED':
      await handleQrcodeUpdated(instanceName, data);
      break;
    default:
      // Evento desconhecido — ignorado silenciosamente
      break;
  }
}

// ─── handlers por tipo de evento ─────────────────────────────────────────────

async function handleMessagesUpsert(instanceName: string, data: Record<string, unknown>) {
  const messages = (data['messages'] as unknown[]) ?? [data];

  for (const raw of messages) {
    const msg = raw as Record<string, unknown>;

    // Campos básicos da mensagem Evolution
    const providerMessageId = (msg['key'] as Record<string, unknown>)?.['id'] as string | undefined;
    const providerEventId   = providerMessageId; // Evolution usa o mesmo ID para evento e mensagem
    const fromMe            = Boolean((msg['key'] as Record<string, unknown>)?.['fromMe']);
    const phone             = (
      fromMe
        ? (msg['key'] as Record<string, unknown>)?.['remoteJid']
        : (msg['key'] as Record<string, unknown>)?.['remoteJid']
    ) as string | undefined;

    const messageType = (msg['messageType'] as string) ?? 'text';
    const content     = extractTextContent(msg);
    const timestamp   = msg['messageTimestamp']
      ? new Date(Number(msg['messageTimestamp']) * 1000)
      : new Date();

    if (!phone || !providerMessageId) continue;

    // Deduplicação
    if (await whatsappMessageService.isEventDuplicate(providerMessageId)) continue;

    // Busca instância
    const instance = await prisma.whatsappInstance.findUnique({
      where: { instanceName },
    });
    if (!instance) continue;

    // Upsert contato
    const pushName = (msg['pushName'] as string) ?? undefined;
    const contact  = await whatsappConversationService.upsertContact(
      normalizePhone(phone),
      { pushName },
    );

    // Upsert conversa
    const conversation = await whatsappConversationService.upsertConversation(
      instance.id,
      contact.id,
    );

    // Persiste mensagem
    const message = await whatsappMessageService.upsertMessage({
      conversationId:    conversation.id,
      providerMessageId,
      providerEventId,
      direction:         fromMe ? 'outbound' : 'inbound',
      fromMe,
      type:              messageType,
      content,
      status:            fromMe ? 'sent' : 'delivered',
      timestamp,
    });

    // Atualiza última mensagem da conversa
    await whatsappConversationService.updateConversation(conversation.id, {
      lastMessageAt: timestamp,
      unreadCount:   fromMe ? 0 : conversation.unreadCount + 1,
    });

    // Emite para o painel em tempo real
    whatsappRealtimeService.emitNewMessage(conversation.id, message);
    whatsappRealtimeService.emitConversationUpdate({ ...conversation, lastMessageAt: timestamp });
  }
}

async function handleMessagesUpdate(data: Record<string, unknown>) {
  const updates = (data['messages'] as unknown[]) ?? [data];
  for (const raw of updates) {
    const upd = raw as Record<string, unknown>;
    const providerMessageId = (upd['key'] as Record<string, unknown>)?.['id'] as string | undefined;
    const status = (upd['update'] as Record<string, unknown>)?.['status'] as string | undefined;
    if (providerMessageId && status) {
      const normalizedStatus = status.toLowerCase();
      await whatsappMessageService.updateStatus(providerMessageId, normalizedStatus);

      // Emite atualização de status em tempo real para o painel admin
      const msg = await whatsappMessageService.findByProviderMessageId(providerMessageId);
      if (msg) {
        whatsappRealtimeService.emit('whatsapp:message_status', {
          conversationId:    msg.conversationId,
          providerMessageId: msg.providerMessageId,
          messageId:         msg.id,
          status:            normalizedStatus,
        });
      }
    }
  }
}

async function handleConnectionUpdate(instanceName: string, data: Record<string, unknown>) {
  const state = (data['state'] as string) ?? 'disconnected';
  const status = state === 'open' ? 'connected' : state === 'connecting' ? 'connecting' : 'disconnected';

  await prisma.whatsappInstance.updateMany({
    where: { instanceName },
    data:  { status },
  });

  whatsappRealtimeService.emitInstanceStatus(status);
}

async function handleQrcodeUpdated(instanceName: string, data: Record<string, unknown>) {
  const qrCode = (data['qrcode'] as Record<string, unknown>)?.['base64'] as string | undefined;

  if (qrCode) {
    await prisma.whatsappInstance.updateMany({
      where: { instanceName },
      data:  { qrCode, status: 'connecting' },
    });
    whatsappRealtimeService.emitInstanceStatus('connecting', qrCode);
  }
}

// ─── utilitários ─────────────────────────────────────────────────────────────

/** Extrai texto de mensagem Evolution (suporta text, extendedText, conversation) */
function extractTextContent(msg: Record<string, unknown>): string | undefined {
  const message = msg['message'] as Record<string, unknown> | undefined;
  if (!message) return undefined;
  return (
    (message['conversation'] as string) ??
    (message['extendedTextMessage'] as Record<string, unknown>)?.['text'] as string ??
    undefined
  );
}

/** Normaliza número: remove @s.whatsapp.net e garante só dígitos */
function normalizePhone(raw: string): string {
  return raw.replace('@s.whatsapp.net', '').replace('@g.us', '').replace(/\D/g, '');
}
