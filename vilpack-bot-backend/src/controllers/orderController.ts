import { Request, Response, NextFunction } from 'express';
import prisma from '../config/prisma';
import { z } from 'zod';

const createDraftSchema = z.object({
  sessionId: z.string().uuid(),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  orderSummary: z.string().min(1),
});

export const orderController = {
  async createDraft(req: Request, res: Response, next: NextFunction) {
    try {
      const { sessionId, customerName, customerPhone, orderSummary } = createDraftSchema.parse(req.body);

      // Find the session to get the storeId
      const session = await prisma.session.findUnique({
        where: { id: sessionId },
      });

      if (!session) {
        res.status(404).json({ error: 'Session not found' });
        return;
      }

      // Create the Order in draft status
      const order = await prisma.order.create({
        data: {
          storeId: session.storeId,
          sessionId: sessionId,
          customerName: customerName,
          customerPhone: customerPhone,
          orderSummary: orderSummary,
          status: 'draft',
          total: 0, // Default value, as we might not have parsed items yet
        },
      });

      res.status(201).json({
        message: 'Draft order created successfully',
        orderId: order.id,
      });
    } catch (error) {
      next(error);
    }
  },
};
