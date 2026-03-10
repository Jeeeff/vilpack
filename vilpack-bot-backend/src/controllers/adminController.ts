import { Request, Response, NextFunction } from 'express';
import prisma from '../config/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const getSingleValue = (value: unknown): string | undefined => { 
  if (typeof value === 'string') return value; 
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0]; 
  return undefined; 
};

export const adminController = {
  /**
   * Realiza o login administrativo
   */
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        res.status(400).json({ error: 'Usuário e senha são obrigatórios' });
        return;
      }

      const user = await prisma.adminUser.findUnique({
        where: { username }
      });

      if (!user) {
        res.status(401).json({ error: 'Credenciais inválidas' });
        return;
      }

      const isValid = await bcrypt.compare(password, user.password);

      if (!isValid) {
        res.status(401).json({ error: 'Credenciais inválidas' });
        return;
      }

      const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        process.env.JWT_SECRET || 'fallback_secret',
        { expiresIn: '8h' }
      );

      res.json({ token });
    } catch (error) {
      next(error);
    }
  },

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
      const id = getSingleValue(req.params.id);
      
      if (!id) {
        res.status(400).json({ error: 'ID do lead é obrigatório' });
        return;
      }

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
      const id = getSingleValue(req.params.id);
      const { priority } = req.body;

      if (!id) {
        res.status(400).json({ error: 'ID do lead é obrigatório' });
        return;
      }

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
      const id = getSingleValue(req.params.id);
      const { status } = req.body;

      if (!id) {
        res.status(400).json({ error: 'ID do lead é obrigatório' });
        return;
      }

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
      const id = getSingleValue(req.params.id);
      const { notes } = req.body;

      if (!id) {
        res.status(400).json({ error: 'ID do lead é obrigatório' });
        return;
      }

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
