
import dotenv from 'dotenv';
dotenv.config();

import app from './app';
import prisma from './config/prisma';

const PORT = process.env.PORT || 3001;

async function start() {
  console.log('Starting server on port ' + PORT);
  
  // Validate Env Vars
  if (!process.env.GEMINI_API_KEY) {
      console.warn('⚠️ GEMINI_API_KEY is missing! AI features will fail.');
  }

  try {
    // Check DB Connection
    await prisma.$connect();
    console.log('✅ Database connected');

    const server = app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📚 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
    
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
