import { Request, Response, NextFunction } from 'express';
import { sessionService } from '../services/sessionService';
import { sessionSchema } from '../validators/sessionSchema';

export const sessionController = {
  async createSession(req: Request, res: Response, next: NextFunction) {
    try {
      const { storeSlug } = sessionSchema.parse(req.body);
      
      const session = await sessionService.createSession(storeSlug);
      
      res.status(201).json({
        sessionId: session.id,
        storeId: session.storeId,
        cartId: session.cart?.id
      });
    } catch (error: any) {
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
