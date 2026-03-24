/**
 * adminWhatsappController — endpoints do painel admin para o módulo WhatsApp.
 *
 * Rotas protegidas por authMiddleware (JWT).
 * Todas as chamadas à Evolution API passam pelo evolutionService — nunca direto.
 *
 * EvolutionError é tratado aqui com respostas HTTP semânticas:
 *   PROVIDER_OFFLINE    → 503 (Evolution indisponível)
 *   INSTANCE_NOT_FOUND  → 404 (instância não criada)
 *   AUTH_ERROR          → 502 (API key inválida)
 *   QR_NOT_AVAILABLE    → 202 (inicializando, tente novamente)
 *   ALREADY_CONNECTED   → 200 (já conectado, sem QR)
 *   CONFIG_MISSING      → 503 (variáveis de ambiente não configuradas)
 *   UNKNOWN             → 502 (erro inesperado upstream)
 */
import type { Request, Response, NextFunction } from 'express';
import { evolutionService, EvolutionError } from '../services/evolutionService.js';
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
    res.status(503).json({
      error: 'Módulo WhatsApp não habilitado',
      code: 'FEATURE_DISABLED',
      hint: 'Ative a variável de ambiente ENABLE_WHATSAPP_PANEL=true no servidor.',
    });
    return false;
  }
  return true;
}

/** Trata EvolutionError com resposta HTTP semântica.
 *  Retorna true se tratou (response já foi enviada), false se deve ir para next(). */
function handleEvolutionError(err: unknown, res: Response): boolean {
  if (!(err instanceof EvolutionError)) return false;

  const map: Record<string, { status: number; hint: string }> = {
    PROVIDER_OFFLINE:   { status: 503, hint: 'A Evolution API está offline ou inacessível. Verifique se o serviço está rodando e se EVOLUTION_BASE_URL está correto.' },
    INSTANCE_NOT_FOUND: { status: 404, hint: 'A instância não existe na Evolution API. Use POST /instance/create para criá-la primeiro.' },
    AUTH_ERROR:         { status: 502, hint: 'A Evolution API rejeitou a autenticação. Verifique EVOLUTION_API_KEY.' },
    QR_NOT_AVAILABLE:   { status: 202, hint: 'Instância inicializando, QR Code ainda não disponível. Tente novamente em alguns segundos.' },
    ALREADY_CONNECTED:  { status: 200, hint: 'Instância já está conectada ao WhatsApp.' },
    CONFIG_MISSING:     { status: 503, hint: 'Variáveis de ambiente EVOLUTION_BASE_URL e/ou EVOLUTION_API_KEY não configuradas no servidor.' },
    INVALID_RESPONSE:   { status: 502, hint: 'Evolution retornou resposta inesperada. Verifique a versão da Evolution API.' },
    UNKNOWN:            { status: 502, hint: 'Erro inesperado ao comunicar com a Evolution API.' },
  };

  const entry = map[err.code] ?? map['UNKNOWN']!;
  res.status(entry.status).json({
    error: err.message,
    code: err.code,
    hint: entry.hint,
  });
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
    if (!handleEvolutionError(err, res)) next(err);
  }
}

export async function getQRCode(req: Request, res: Response, next: NextFunction) {
  if (!requireFlag(res)) return;
  try {
    const data = await evolutionService.getQRCode();
    res.json(data);
  } catch (err) {
    if (!handleEvolutionError(err, res)) next(err);
  }
}

export async function createInstance(req: Request, res: Response, next: NextFunction) {
  if (!requireFlag(res)) return;
  try {
    const data = await evolutionService.createInstance();
    res.json(data);
  } catch (err) {
    if (!handleEvolutionError(err, res)) next(err);
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
    if (!handleEvolutionError(err, res)) next(err);
  }
}

// ─── conversas ───────────────────────────────────────────────────────────────

export async function listConversations(req: Request, res: Response, next: NextFunction) {
  if (!requireFlag(res)) return;
  try {
    const instance = await prisma.whatsappInstance.findFirst({
      orderBy: { createdAt: 'asc' },
    });
    if (!instance) {
      // Sem instância no banco → retorna lista vazia (não é erro)
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

    const conversation = await whatsappConversationService.getConversation(conversationId);
    if (!conversation) {
      res.status(404).json({ error: 'Conversa não encontrada' });
      return;
    }

    const result = await evolutionService.sendText(conversation.contact.phone, text);

    const message = await whatsappMessageService.upsertMessage({
      conversationId,
      providerMessageId: result?.key?.id ?? undefined,
      direction:         'outbound',
      fromMe:            true,
      type:              'text',
      content:           text,
      status:            'sent',
    });

    whatsappRealtimeService.emitNewMessage(conversationId, message);
    await whatsappConversationService.updateConversation(conversationId, {
      lastMessageAt: new Date(),
    });
    whatsappRealtimeService.emitConversationUpdate({ id: conversationId, lastMessageAt: new Date() });

    res.json({ success: true, message });
  } catch (err) {
    if (!handleEvolutionError(err, res)) next(err);
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
