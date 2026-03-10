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
      const { sessionId } = req.params;
      const history = await aiService.getChatHistory(sessionId);
      res.json(history);
    } catch (error) {
      next(error);
    }
  }
};
