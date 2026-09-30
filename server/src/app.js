import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import { connectDB } from './config/db.js';
import authRoutes from './routes/auth.js';
import uploadRoutes from './routes/uploads.js';
import projectRoutes from './routes/projects.js';
import inviteRoutes from './routes/invites.js';
import boardRoutes from './routes/board.js';
import notificationRoutes from './routes/notifications.js';
import contactRoutes from './routes/contact.js';
import { withTab } from './services/context.js';

// Refuse to run with a missing or weak signing secret: every token depends on it.
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be set to at least 32 characters');
}

const app = express();
app.set('trust proxy', 1); // Vercel sits behind a proxy; needed for correct client IPs in rate limiting

app.disable('x-powered-by');
app.use(helmet());

app.use(
  '/api',
  rateLimit({ windowMs: 15 * 60 * 1000, limit: 1500, standardHeaders: true, legacyHeaders: false, message: { message: 'Too many requests. Slow down a little.' } })
);
// CLIENT_URL may hold several origins separated by commas (production plus a preview URL).
const origins = (process.env.CLIENT_URL || 'http://localhost:5173').split(',').map((o) => o.trim().replace(/\/$/, ''));
app.use(cors({ origin: origins }));
app.use(express.json({ limit: '1mb' }));
app.use(withTab);

// Health check answers without touching the database.
app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'huddle-api' }));

// Connect lazily per request so it works both locally and on Vercel.
app.use(async (_req, _res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    next(err);
  }
});

// Reports the live database name so the deployed setup can be checked.
app.get('/api/health/db', (_req, res) => res.json({ ok: true, database: mongoose.connection.name }));

app.use('/api/auth', authRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/projects', boardRoutes);
app.use('/api', inviteRoutes);
app.use('/api', notificationRoutes);
app.use('/api/contact', contactRoutes);

app.use((_req, res) => res.status(404).json({ message: 'Not found' }));

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error(err);
  if (err.code === 11000) return res.status(409).json({ message: 'Already in use' });
  const status = err.status || 500;
  res.status(status).json({ message: status === 500 ? 'Server error' : err.message });
});

export default app;
