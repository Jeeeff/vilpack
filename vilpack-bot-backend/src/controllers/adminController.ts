import { Request, Response, NextFunction } from 'express';
import prisma from '../config/prisma';
import jwt from 'jsonwebtoken';

const getSingleValue = (value: unknown): string | undefined => { 
  if (typeof value === 'string') return value; 
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0]; 
  return undefined; 
};

// ─── Usuários admin hardcoded ─────────────────────────────────────────────────
// Dois logins fixos sem dependência de banco de dados.
// ATENÇÃO: nunca commitar senhas em texto plano em produção.
// Aqui é intencional por decisão do cliente.
const ADMIN_USERS: Record<string, { id: string; role: string; password: string }> = {
  Vilpack: { id: 'user-vilpack', role: 'admin', password: 'Savisu07*' },
  Jeeeff:  { id: 'user-jeeeff', role: 'admin', password: 'ShinOO87190707' },
};

export const adminController = {
  /**
   * Realiza o login administrativo (credenciais hardcoded — sem banco)
   */
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        res.status(400).json({ error: 'Usuário e senha são obrigatórios' });
        return;
      }

      const user = ADMIN_USERS[username as string];

      if (!user || user.password !== password) {
        res.status(401).json({ error: 'Credenciais inválidas' });
        return;
      }

      const token = jwt.sign(
        { id: user.id, username, role: user.role },
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
      const limit = Math.min(parseInt(getSingleValue(req.query.limit) || '100', 10) || 100, 200);
      const page  = Math.max(parseInt(getSingleValue(req.query.page)  || '1',   10) || 1,  1);
      const skip  = (page - 1) * limit;

      const [leads, total] = await Promise.all([
        prisma.lead.findMany({
          orderBy: { lastInteractionAt: 'desc' },
          take: limit,
          skip,
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
        }),
        prisma.lead.count(),
      ]);
      res.json({ leads, total, page, limit });
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
                orderBy: { createdAt: 'asc' },
                take: 200,
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
  },

  /**
   * Atualiza a ficha comercial do lead (campos de histórico de compras e CRM)
   */
  async updateLeadComercial(req: Request, res: Response, next: NextFunction) {
    try {
      const id = getSingleValue(req.params.id);

      if (!id) {
        res.status(400).json({ error: 'ID do lead é obrigatório' });
        return;
      }

      const {
        city,
        companyName,
        lastPurchaseAt,
        lastPurchaseValue,
        lastUnitPrice,
        mainProducts,
        purchaseFrequency,
        avgTicket,
        commercialCondition,
        nextAction,
        internalNotes,
        followUpAt,
      } = req.body;

      // Build update object with only provided fields
      const data: Record<string, unknown> = {};
      if (city !== undefined)               data.city = city;
      if (companyName !== undefined)        data.companyName = companyName;
      if (lastPurchaseAt !== undefined)     data.lastPurchaseAt = lastPurchaseAt ? new Date(lastPurchaseAt) : null;
      if (lastPurchaseValue !== undefined)  data.lastPurchaseValue = lastPurchaseValue !== null && lastPurchaseValue !== '' ? parseFloat(lastPurchaseValue) : null;
      if (lastUnitPrice !== undefined)      data.lastUnitPrice = lastUnitPrice;
      if (mainProducts !== undefined)       data.mainProducts = mainProducts;
      if (purchaseFrequency !== undefined)  data.purchaseFrequency = purchaseFrequency;
      if (avgTicket !== undefined)          data.avgTicket = avgTicket !== null && avgTicket !== '' ? parseFloat(avgTicket) : null;
      if (commercialCondition !== undefined) data.commercialCondition = commercialCondition;
      if (nextAction !== undefined)         data.nextAction = nextAction;
      if (internalNotes !== undefined)      data.internalNotes = internalNotes;
      if (followUpAt !== undefined)         data.followUpAt = followUpAt ? new Date(followUpAt) : null;

      const lead = await prisma.lead.update({
        where: { id },
        data
      });

      res.json(lead);
    } catch (error) {
      next(error);
    }
  }
};
