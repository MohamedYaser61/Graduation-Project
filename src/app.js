// Define the express app

import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { env } from './config/env.js';
import authRoutes from './routes/auth.routes.js';
import donorRoutes from './routes/donor.routes.js';
import hospitalRoutes from './routes/hospital.routes.js';
import adminRoutes from './routes/admin.routes.js';
import errorMiddleware from './middlewares/error.middleware.js';

const app = express();

app.use(cors({ origin: env.CORS_ORIGIN }));
app.use(morgan(env.NODE_ENV === 'development' ? 'dev' : 'combined'));
app.use(express.json());

// Routes (order matters – specific routes before 404)
app.get('/', (req, res) => {
  res.json({ app: 'LifeLink', status: 'ok' });
});

app.use('/auth', authRoutes);
app.use('/donor', donorRoutes);
app.use('/hospital', hospitalRoutes);
app.use('/admin', adminRoutes);

app.get('/test', (req, res) => {
  res.json({ message: 'Test route is working' });
});

// 404 handler – must be last so it only runs when no route matched
app.use((req, res, next) => {
  const err = new Error(`${req.method} ${req.originalUrl} not found`);
  err.statusCode = 404;
  next(err);
});

// Central error handler – always registered last
app.use(errorMiddleware);


export default app;
