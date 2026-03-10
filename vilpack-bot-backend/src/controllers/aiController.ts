import { Request, Response, NextFunction } from 'express';
import { aiService } from '../services/aiService';
import { aiChatSchema } from '../validators/aiChatSchema';

export const aiController = {
  async chat(req: Request, res: Response, next: NextFunction) {
    try {
      const { sessionId, message } = aiChatSchema.parse(req.body);
      const response = await aiService.generateSellerResponse(sessionId, message);
      res.json({ reply: response });
    } catch (error) {
      next(error);
    }
  },

  async history(req: Request, res: Response, next: NextFunction) {
    try {
      const rawSessionId = req.params.sessionId;
      const sessionId = Array.isArray(rawSessionId) ? rawSessionId[0] : rawSessionId;

      if (!sessionId) {
        res.status(400).json({ error: 'sessionId é obrigatório.' });
        return;
      }

      const history = await aiService.getChatHistory(sessionId);
      res.json(history);
    } catch (error) {
      next(error);
    }
  }
};
