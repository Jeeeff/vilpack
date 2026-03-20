/**
 * socketServer — inicialização isolada do Socket.IO.
 *
 * Encapsula a criação do servidor Socket.IO e o expõe para injeção
 * nos services de realtime. Chamado uma única vez em server.ts.
 *
 * Canal 'admin': sala exclusiva do painel admin. Clientes entram
 * via evento 'join_admin' após autenticação no frontend.
 */
import { Server as SocketServer } from 'socket.io';
import type { Server as HttpServer } from 'node:http';

let io: SocketServer | null = null;

export function initSocketServer(httpServer: HttpServer): SocketServer {
  if (io) return io; // idempotente — não recria se já inicializado

  io = new SocketServer(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || '*',
      methods: ['GET', 'POST'],
    },
    path: '/socket.io',
  });

  io.on('connection', (socket) => {
    socket.on('join_admin', () => {
      socket.join('admin');
    });

    socket.on('leave_admin', () => {
      socket.leave('admin');
    });
  });

  console.log('[Socket.IO] Servidor inicializado');
  return io;
}

export function getSocketServer(): SocketServer | null {
  return io;
}
