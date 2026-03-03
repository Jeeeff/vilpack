import { z } from 'zod';

export const updateCartItemSchema = z.object({
  sessionId: z.string().uuid('Session ID inválido'),
  productId: z.string().uuid('Product ID inválido'),
  quantity: z.number().int('Quantidade deve ser inteira').min(0, 'Quantidade não pode ser negativa'),
});
