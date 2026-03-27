
import dotenv from 'dotenv';
dotenv.config();

import http from 'node:http';
import app from './app';
import prisma from './config/prisma';
import bcrypt from 'bcryptjs';
import { initSocketServer } from './config/socketServer';
import { whatsappRealtimeService } from './services/whatsappRealtimeService';
import { salesNotificationService } from './services/salesNotificationService';

const PORT = process.env.PORT || 3001;

async function start() {
  console.log('Starting server on port ' + PORT);
  
  // Validate Env Vars
  if (!process.env.GROQ_API_KEY) {
      console.warn('⚠️ GROQ_API_KEY is missing! AI features will fail.');
  }
  if (!process.env.JWT_SECRET) {
      console.warn('⚠️ JWT_SECRET is missing! Authentication may fail.');
  }

  try {
    // Check DB Connection
    await prisma.$connect();
    console.log('✅ Database connected');

    // Seed Master Admin
    const adminCount = await prisma.adminUser.count();
    if (adminCount === 0) {
      console.log('🌱 Seeding Master Admin User...');
      const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'vilpack2026', 10);
      await prisma.adminUser.create({
        data: {
          username: 'admin',
          password: hashedPassword,
          role: 'MASTER'
        }
      });
      console.log('✅ Master Admin created: admin / ' + (process.env.ADMIN_PASSWORD || 'vilpack2026'));
    }

    const server = http.createServer(app);

    // Socket.IO — inicializado uma única vez, injetado no realtime service
    const io = initSocketServer(server);
    whatsappRealtimeService.init(io);

    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📚 Environment: ${process.env.NODE_ENV || 'development'}`);
    });

    // Job de inatividade — verifica sessões paradas a cada 60s
    // Só loga se SALES_NOTIFICATIONS_ENABLED=true
    if (process.env.SALES_NOTIFICATIONS_ENABLED === 'true') {
      const INTERVAL_MS = 60 * 1000; // 1 minuto
      setInterval(() => {
        salesNotificationService.checkInactiveSessions().catch((err) =>
          console.warn('[salesNotif] Erro no job de inatividade:', err?.message),
        );
      }, INTERVAL_MS);
      console.log('✅ Job de notificação de inatividade ativo (intervalo: 60s)');
    }
    
    // Graceful Shutdown
    const shutdown = async () => {
        console.log('🛑 Shutting down server...');
        server.close(async () => {
            console.log('HTTP server closed.');
            await prisma.$disconnect();
            console.log('Database disconnected.');
            process.exit(0);
        });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    if (error instanceof Error && error.message.includes('ECONNREFUSED')) {
        console.error('⚠️  Database connection refused. Please ensure Docker is running and the database container is up.');
    }
    process.exit(1);
  }
}

start();
