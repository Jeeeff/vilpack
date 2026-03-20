/**
 * adminWhatsappController — endpoints do painel admin para o módulo WhatsApp.
 *
 * Rotas protegidas por authMiddleware (JWT).
 * Todas as chamadas à Evolution API passam pelo evolutionService — nunca direto.
 */
import type { Request, Response, NextFunction } from 'express';
import { evolutionService } from '../services/evolutionService.js';
import { whatsappConversationService } from '../services/whatsappConversationService.js';
import { whatsappMessageService } from '../services/whatsappMessageService.js';
import { whatsappHandoffService } from '../services/whatsappHandoffService.js';
import { whatsappRealtimeService } from '../services/whatsappRealtimeService.js';
import { featureFlags } from '../config/featureFlags.js';
import {
  sendMessageSchema,
  handoffSchema,
  updateConversationSchema,
} from '../validators/whatsappValidators.js';
import prisma from '../config/prisma.js';

// ─── helpers ─────────────────────────────────────────────────────────────────

function requireFlag(res: Response): boolean {
  if (!featureFlags.ENABLE_WHATSAPP_PANEL) {
    res.status(503).json({ error: 'Módulo WhatsApp não habilitado' });
    return false;
  }
  return true;
}

/** Express 5 tipifica params como string | string[] — garante string */
function param(value: string | string[]): string {
  return Array.isArray(value) ? value[0]! : value;
}

/** Express 5 tipifica query como string | string[] — garante número com fallback */
function queryNum(value: string | string[] | undefined, fallback: number): number {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw ? (Number(raw) || fallback) : fallback;
}

// ─── instância / QR Code ─────────────────────────────────────────────────────

export async function getInstanceStatus(req: Request, res: Response, next: NextFunction) {
  if (!requireFlag(res)) return;
  try {
    const data = await evolutionService.getInstanceStatus();
    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function getQRCode(req: Request, res: Response, next: NextFunction) {
  if (!requireFlag(res)) return;
  try {
    const data = await evolutionService.getQRCode();
    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function createInstance(req: Request, res: Response, next: NextFunction) {
  if (!requireFlag(res)) return;
  try {
    const data = await evolutionService.createInstance();
    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function setWebhook(req: Request, res: Response, next: NextFunction) {
  if (!requireFlag(res)) return;
  try {
    const { webhookUrl } = req.body as { webhookUrl?: string };
    if (!webhookUrl) {
      res.status(400).json({ error: 'webhookUrl obrigatório' });
      return;
    }
    const data = await evolutionService.setWebhook(webhookUrl);
    res.json(data);
  } catch (err) {
    next(err);
  }
}

// ─── conversas ───────────────────────────────────────────────────────────────

export async function listConversations(req: Request, res: Response, next: NextFunction) {
  if (!requireFlag(res)) return;
  try {
    // Busca a instância vinculada ao storeId do token (ou a primeira disponível)
    const instance = await prisma.whatsappInstance.findFirst({
      orderBy: { createdAt: 'asc' },
    });
    if (!instance) {
      res.json([]);
      return;
    }
    const conversations = await whatsappConversationService.listConversations(instance.id);
    res.json(conversations);
  } catch (err) {
    next(err);
  }
}

export async function getConversation(req: Request, res: Response, next: NextFunction) {
  if (!requireFlag(res)) return;
  try {
    const id = param(req.params['id']!);
    const conversation = await whatsappConversationService.getConversation(id);
    if (!conversation) {
      res.status(404).json({ error: 'Conversa não encontrada' });
      return;
    }
    res.json(conversation);
  } catch (err) {
    next(err);
  }
}

export async function updateConversation(req: Request, res: Response, next: NextFunction) {
  if (!requireFlag(res)) return;
  try {
    const id = param(req.params['id']!);
    const parsed = updateConversationSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const updated = await whatsappConversationService.updateConversation(id, parsed.data);
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

export async function markConversationAsRead(req: Request, res: Response, next: NextFunction) {
  if (!requireFlag(res)) return;
  try {
    const id = param(req.params['id']!);
    await whatsappConversationService.markAsRead(id);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

// ─── mensagens ────────────────────────────────────────────────────────────────

export async function listMessages(req: Request, res: Response, next: NextFunction) {
  if (!requireFlag(res)) return;
  try {
    const id     = param(req.params['id']!);
    const limit  = queryNum(req.query['limit'] as string | undefined, 50);
    const cursor = req.query['cursor'] as string | undefined;
    const page   = await whatsappMessageService.listMessages(id, limit, cursor);
    res.json(page);
  } catch (err) {
    next(err);
  }
}

export async function sendMessage(req: Request, res: Response, next: NextFunction) {
  if (!requireFlag(res)) return;
  try {
    const parsed = sendMessageSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const { conversationId, text } = parsed.data;

    // Busca contato pelo conversationId
    const conversation = await whatsappConversationService.getConversation(conversationId);
    if (!conversation) {
      res.status(404).json({ error: 'Conversa não encontrada' });
      return;
    }

    // Envia via Evolution API
    const result = await evolutionService.sendText(conversation.contact.phone, text);

    // Persiste a mensagem enviada
    const message = await whatsappMessageService.upsertMessage({
      conversationId,
      providerMessageId: result?.key?.id ?? undefined,
      direction:         'outbound',
      fromMe:            true,
      type:              'text',
      content:           text,
      status:            'sent',
    });

    // Emite em tempo real para o painel admin
    whatsappRealtimeService.emitNewMessage(conversationId, message);
    // Atualiza lastMessageAt na conversa
    await whatsappConversationService.updateConversation(conversationId, {
      lastMessageAt: new Date(),
    });
    whatsappRealtimeService.emitConversationUpdate({ id: conversationId, lastMessageAt: new Date() });

    res.json({ success: true, message });
  } catch (err) {
    next(err);
  }
}

// ─── takeover ─────────────────────────────────────────────────────────────────

export async function takeOver(req: Request, res: Response, next: NextFunction) {
  if (!requireFlag(res)) return;
  try {
    const parsed = handoffSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const adminUser = (req as any).user as { id: string };
    const result = await whatsappHandoffService.takeOver(parsed.data.conversationId, adminUser.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function releaseToBot(req: Request, res: Response, next: NextFunction) {
  if (!requireFlag(res)) return;
  try {
    const parsed = handoffSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const result = await whatsappHandoffService.releaseToBot(parsed.data.conversationId);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
