import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../config/prisma';
import bcrypt from 'bcryptjs';

export const login = async (req: Request, res: Response) => {
  console.log("Login Request Body:", req.body);
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Usuário e senha são obrigatórios' });
  }

  try {
    const user = await prisma.adminUser.findUnique({ where: { username } });
    
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET as string,
      { expiresIn: '24h' }
    );
    
    res.json({ token, user: { username: user.username, role: user.role } });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao realizar login' });
  }
};

export const getOrders = async (req: Request, res: Response) => {
  try {
    const orders = await prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        customerName: true,
        customerPhone: true,
        status: true,
        total: true,
        createdAt: true,
        sessionId: true,
      }
    });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar pedidos' });
  }
};

export const getOrderChat = async (req: Request, res: Response) => {
  const id = req.params.id as string;
  try {
    const order = await prisma.order.findUnique({
      where: { id },
      select: { sessionId: true }
    });

    if (!order || !order.sessionId) {
      return res.status(404).json({ error: 'Pedido ou sessão não encontrada' });
    }

    const messages = await prisma.message.findMany({
      where: { sessionId: order.sessionId },
      orderBy: { createdAt: 'asc' }
    });

    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar histórico do chat' });
  }
};
