import express from 'express';
import cors from 'cors';
import { authRoutes } from './routes/auth.routes';
import { ticketRoutes } from './routes/tickets.routes';
import { userRoutes } from './routes/users.routes';
import { errorHandler } from './middleware/errorHandler';

export function createApp() {
  const app = express();

  const corsOrigins = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  app.use(cors(corsOrigins.length ? { origin: corsOrigins } : { origin: true }));
  app.use(express.json());

  app.use((req, res, next) => {
    if (req.path.startsWith('/api/')) {
      res.set('Cache-Control', 'no-store');
    }
    next();
  });

  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

  app.use('/api/auth', authRoutes);
  app.use('/api/tickets', ticketRoutes);
  app.use('/api/users', userRoutes);

  app.use(errorHandler);
  return app;
}
