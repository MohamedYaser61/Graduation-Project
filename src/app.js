import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import { resolve } from 'path';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger.js';

import { env } from './config/env.js';

import authRoutes from './routes/auth.routes.js';
import donorRoutes from './routes/donor.routes.js';
import hospitalRoutes from './routes/hospital.routes.js';
import adminRoutes from './routes/admin.routes.js';
import rewardRoutes from './routes/reward.routes.js';
import donationRoutes from './routes/donation.routes.js';
import appointmentRoutes from './routes/appointment.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import discoveryRoutes from './routes/discovery.routes.js';
import helpRoutes from './routes/help.routes.js';
import supportRoutes from './routes/support.routes.js';

import errorMiddleware from './middlewares/error.middleware.js';
import { authLimiter, limiter } from './middlewares/rateLimit.middleware.js';
import maintenanceMiddleware from './middlewares/maintenance.middleware.js';

const app = express();
const startedAt = new Date().toISOString();

/* ================= Middleware ================= */

app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN }));
app.use(morgan(env.NODE_ENV === 'development' ? 'dev' : 'combined'));
app.use(express.json({ limit: '1mb' }));

/* ===== Simple Mongo sanitize (safe for Express 5) ===== */

const sanitizeInPlace = (obj, { replaceWith = '_', request, onSanitize } = {}) => {
  if (!obj || typeof obj !== 'object') return obj;

  const seen = new Set();

  const recurse = (current) => {
    if (!current || typeof current !== 'object' || seen.has(current)) return;
    seen.add(current);

    for (const key of Object.keys(current)) {
      const value = current[key];

      if (key.includes('$') || key.includes('.')) {
        const newKey = key.replace(/\$/g, replaceWith).replace(/\./g, replaceWith);

        current[newKey] = value;

        try {
          if (typeof onSanitize === 'function') onSanitize({ req: request, key });
        } catch {}

        delete current[key];
        recurse(current[newKey]);
      } else {
        recurse(value);
      }
    }
  };

  recurse(obj);
  return obj;
};

app.use((req, res, next) => {
  try {
    const opts = {
      replaceWith: '_',
      onSanitize: ({ key }) => console.warn(`Sanitized key: ${key}`),
    };

    if (req.body) sanitizeInPlace(req.body, { ...opts, request: req });
    if (req.params) sanitizeInPlace(req.params, { ...opts, request: req });
    if (req.query) sanitizeInPlace(req.query, { ...opts, request: req });
  } catch (err) {
    console.warn('[sanitize] error', err?.message || err);
  }

  next();
});

/* ================= Swagger (ALWAYS ON) ================= */

app.use(express.static(resolve(process.cwd(), 'public')));

app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    explorer: true,
    customSiteTitle: 'LifeLink API Docs',
    swaggerOptions: {
      persistAuthorization: true,
    },
  })
);

app.get('/openapi.json', (req, res) => {
  res.json(swaggerSpec);
});

/* ================= Health & Root ================= */

app.get('/', (req, res) => {
  res.json({ app: 'LifeLink', status: 'ok' });
});

app.get('/health', (req, res) => {
  res.json({
    app: 'LifeLink',
    status: 'ok',
    pid: process.pid,
    startedAt,
    port: env.PORT,
    env: env.NODE_ENV,
  });
});

app.get('/favicon.ico', (req, res) => {
  res.status(204).end();
});

/* ================= Routes ================= */

// Admin (قبل maintenance)
app.use('/admin', limiter, adminRoutes);
app.use('/api/v1/admin', limiter, adminRoutes);

// Maintenance middleware
app.use(maintenanceMiddleware);

// باقي routes
app.use('/auth', authLimiter, authRoutes);
app.use('/api/v1/auth', authLimiter, authRoutes);

app.use('/donor', limiter, donorRoutes);
app.use('/api/v1/donor', limiter, donorRoutes);

app.use('/hospital', limiter, hospitalRoutes);
app.use('/api/v1/hospital', limiter, hospitalRoutes);

app.use('/rewards', limiter, rewardRoutes);
app.use('/api/v1/rewards', limiter, rewardRoutes);

app.use('/donations/book-appointment', limiter, appointmentRoutes);
app.use('/api/v1/donations/book-appointment', limiter, appointmentRoutes);

app.use('/donations', limiter, donationRoutes);
app.use('/api/v1/donations', limiter, donationRoutes);

app.use('/notifications', limiter, notificationRoutes);
app.use('/api/v1/notifications', limiter, notificationRoutes);

app.use('/hospitals', limiter, discoveryRoutes);
app.use('/api/v1/hospitals', limiter, discoveryRoutes);

app.use('/help', helpRoutes);
app.use('/api/v1/help', helpRoutes);

app.use('/support', supportRoutes);
app.use('/api/v1/support', supportRoutes);

/* ================= 404 ================= */

app.use((req, res, next) => {
  const err = new Error(`${req.method} ${req.originalUrl} not found`);
  err.statusCode = 404;
  next(err);
});

/* ================= Error Handler ================= */

app.use(errorMiddleware);

export default app;