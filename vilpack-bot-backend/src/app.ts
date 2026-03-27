import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import routes from './routes';
import { errorHandler } from './middlewares/errorHandler';

import path from 'path';

const app = express();

// CORS — em produção aceita apenas o domínio próprio; em dev aceita localhost
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? ['https://vilpack.com', 'https://www.vilpack.com']
  : ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:4173'];

app.use(cors({
  origin: (origin, callback) => {
    // Permite requisições sem origin (mobile apps, curl, Postman em dev)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS bloqueado para origem: ${origin}`));
  },
  credentials: true,
}));

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Em produção usa formato 'combined' (IP, user-agent, referrer) — nunca 'dev'
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// Routes
app.use('/api', routes);

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Error Handling
app.use(errorHandler as any);

export default app;
