import { Request, Response, NextFunction } from 'express';
import { cartService } from '../services/cartService';
import { addCartItemSchema } from '../validators/addCartItemSchema';
import { updateCartItemSchema } from '../validators/updateCartItemSchema';
import { whatsappService } from '../services/whatsappService';

export const cartController = {
  async getCart(req: Request, res: Response, next: NextFunction) {
    const { sessionId } = req.params;
    try {
      const cart = await cartService.getCart(sessionId as string);
      res.json(cart);
    } catch (error) {
      next(error);
    }
  },

  async addItem(req: Request, res: Response, next: NextFunction) {
    try {
      const { sessionId, productId, quantity } = addCartItemSchema.parse(req.body);
      const item = await cartService.addItem(sessionId, productId, quantity);
      res.status(201).json(item);
    } catch (error) {
      next(error);
    }
  },

  async updateItem(req: Request, res: Response, next: NextFunction) {
    try {
      const { sessionId, productId, quantity } = updateCartItemSchema.parse(req.body);
      const item = await cartService.updateItem(sessionId, productId, quantity);
      res.json(item);
    } catch (error) {
      next(error);
    }
  },

  async removeItem(req: Request, res: Response, next: NextFunction) {
    const { itemId } = req.params;
    try {
      await cartService.removeItem(itemId as string);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },

  async reorder(req: Request, res: Response, next: NextFunction) {
    const { orderId } = req.params;
    const { sessionId } = req.body;
    
    if (!sessionId) {
      res.status(400).json({ error: 'sessionId is required in body' });
      return;
    }

    try {
      const cart = await cartService.reorder(sessionId, orderId as string);
      res.json(cart);
    } catch (error) {
      next(error);
    }
  },

  async clearCart(req: Request, res: Response, next: NextFunction) {
    const { sessionId } = req.params;
    try {
      await cartService.clearCart(sessionId as string);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },

  async checkout(req: Request, res: Response, next: NextFunction) {
    const { sessionId, customerName, phone } = req.body;
    try {
      const { items, total } = await cartService.getSummary(sessionId);
      if (items.length === 0) {
        return res.status(400).json({ error: 'Carrinho vazio' });
      }

      const link = whatsappService.generateLink(phone, customerName, items, total);
      res.json({ link });
    } catch (error) {
      next(error);
    }
  }
};
