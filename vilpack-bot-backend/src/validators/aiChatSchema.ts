import { z } from 'zod';

export const aiChatSchema = z.object({
  sessionId: z.string().uuid('Session ID inválido'),
  message: z.string().min(1, 'Mensagem não pode ser vazia'),
});
