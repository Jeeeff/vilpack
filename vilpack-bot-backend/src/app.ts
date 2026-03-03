import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import routes from './routes';
import { errorHandler } from './middlewares/errorHandler';

import path from 'path';

const app = express();

// Middlewares
app.use(cors());
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(morgan('dev'));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// Debug Logger
app.use((req, res, next) => {
  console.log(`[ROUTER DEBUG] Recebido: ${req.method} ${req.originalUrl}`);
  next();
});

// Routes
app.use('/api', routes);

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Error Handling
app.use(errorHandler as any);

export default app;
