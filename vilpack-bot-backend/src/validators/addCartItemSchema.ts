import { z } from 'zod';

export const addCartItemSchema = z.object({
  sessionId: z.string().uuid('Session ID inválido'),
  productId: z.string().uuid('Product ID inválido'),
  quantity: z.number().int('Quantidade deve ser inteira').positive('Quantidade deve ser positiva'),
});
