import { Request, Response, NextFunction } from 'express';
import { sessionService } from '../services/sessionService';
import { sessionSchema } from '../validators/sessionSchema';

export const sessionController = {
  async createSession(req: Request, res: Response, next: NextFunction) {
    try {
      console.log('[SESSION DEBUG] Iniciando createSession. Body:', req.body);
      const { storeSlug } = sessionSchema.parse(req.body);
      
      console.log(`[SESSION DEBUG] Buscando loja com slug: ${storeSlug}`);
      const session = await sessionService.createSession(storeSlug);
      console.log(`[SESSION DEBUG] Sessão criada com sucesso: ${session.id}`);
      
      res.status(201).json({
        sessionId: session.id,
        storeId: session.storeId,
        cartId: session.cart?.id
      });
    } catch (error: any) {
      console.error('[SESSION DEBUG] Erro em createSession:', error);
      if (error.message === 'Loja não encontrada') {
        res.status(404).json({ error: error.message });
      } else {
        next(error);
      }
    }
  },

  async getSession(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const session = await sessionService.getSession(id as string);
      res.json(session);
    } catch (error: any) {
      if (error.message === 'Sessão não encontrada') {
        res.status(404).json({ error: error.message });
      } else {
        next(error);
      }
    }
  }
};
