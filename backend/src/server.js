import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'path';

import prisma from './lib/prisma.js';
import { notFound, errorHandler } from './middleware/error.js';
import { ensureBootstrap } from './utils/bootstrap.js';

import authRoutes from './routes/auth.js';
import academyRoutes from './routes/academy.js';
import platformOwnerRoutes from './routes/platformOwner.js';
import studentRoutes from './routes/students.js';
import batchRoutes from './routes/batches.js';
import noteRoutes from './routes/notes.js';
import paymentRoutes from './routes/payments.js';
import announcementRoutes from './routes/announcements.js';
import notificationRoutes from './routes/notifications.js';
import developerRoutes from './routes/developer.js';
import reportRoutes from './routes/reports.js';

const app = express();

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(
  cors({
    origin: (process.env.CLIENT_ORIGIN || '*').split(',').map((s) => s.trim()),
    credentials: true,
  })
);
app.use(express.json({ limit: '2mb' }));
app.use(morgan('dev'));
app.use(
  '/uploads',
  express.static(path.resolve(process.cwd(), 'uploads'), {
    setHeaders: (res) => res.setHeader('Cache-Control', 'no-store'),
  })
);

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });

app.get('/api/health', (_req, res) => res.json({ ok: true, ts: Date.now() }));

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/academy', academyRoutes);
app.use('/api/platform-owner', platformOwnerRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/batches', batchRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/developer', developerRoutes);
app.use('/api/reports', reportRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

(async () => {
  try {
    await prisma.$connect();
    console.log('Prisma connected to Postgres');
    await ensureBootstrap();
    app.listen(PORT, () => console.log(`API listening on :${PORT}`));
  } catch (err) {
    console.error('Startup failed:', err);
    process.exit(1);
  }
})();

process.on('beforeExit', async () => {
  await prisma.$disconnect();
});
