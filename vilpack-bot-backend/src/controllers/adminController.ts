import { Request, Response, NextFunction } from 'express';
import prisma from '../config/prisma';

export const adminController = {
  /**
   * Lista todos os leads com paginação e filtros básicos
   */
  async listLeads(req: Request, res: Response, next: NextFunction) {
    try {
      const leads = await prisma.lead.findMany({
        orderBy: { lastInteractionAt: 'desc' },
        include: {
          summary: true,
          session: {
            select: {
              _count: {
                select: { messages: true }
              }
            }
          }
        }
      });
      res.json(leads);
    } catch (error) {
      next(error);
    }
  },

  /**
   * Detalhes de um lead específico
   */
  async getLead(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      
      // Marca como lido ao abrir os detalhes
      const lead = await prisma.lead.update({
        where: { id },
        data: { isRead: true },
        include: {
          summary: true,
          session: {
            include: {
              messages: {
                orderBy: { createdAt: 'asc' }
              }
            }
          }
        }
      });

      if (!lead) {
        res.status(404).json({ error: 'Lead não encontrado' });
        return;
      }

      res.json(lead);
    } catch (error) {
      next(error);
    }
  },

  /**
   * Atualiza a prioridade do lead manualmente
   */
  async updatePriority(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { priority } = req.body;

      const lead = await prisma.lead.update({
        where: { id },
        data: { priority }
      });

      res.json(lead);
    } catch (error) {
      next(error);
    }
  },

  /**
   * Atualiza o status do lead
   */
  async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const lead = await prisma.lead.update({
        where: { id },
        data: { status }
      });

      res.json(lead);
    } catch (error) {
      next(error);
    }
  },

  /**
   * Adiciona notas manuais ao lead
   */
  async updateNotes(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { notes } = req.body;

      const lead = await prisma.lead.update({
        where: { id },
        data: { internalNotes: notes }
      });

      res.json(lead);
    } catch (error) {
      next(error);
    }
  }
};
