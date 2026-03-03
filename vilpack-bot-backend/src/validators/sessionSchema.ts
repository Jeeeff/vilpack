import { z } from 'zod';

export const sessionSchema = z.object({
  storeSlug: z.string({ message: 'O slug da loja é obrigatório' }).min(1, 'Slug inválido'),
});
