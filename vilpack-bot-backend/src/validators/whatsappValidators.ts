import { z } from 'zod';

export const sendMessageSchema = z.object({
  conversationId: z.string().uuid(),
  text: z.string().min(1).max(4096),
});

export const handoffSchema = z.object({
  conversationId: z.string().uuid(),
});

export const updateConversationSchema = z.object({
  status: z.enum(['open', 'resolved', 'pending']).optional(),
  botEnabled: z.boolean().optional(),
});

export const webhookEventSchema = z.object({
  event: z.string(),
  instance: z.string(),
  data: z.record(z.string(), z.unknown()),
});
