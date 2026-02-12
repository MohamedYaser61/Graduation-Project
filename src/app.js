// Define the express app

import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { env } from './config/env.js';
import authRoutes from './routes/auth.routes.js';

const app = express();

app.use(cors({ origin: env.CORS_ORIGIN }));
app.use(morgan(env.NODE_ENV === 'development' ? 'dev' : 'combined'));
app.use(express.json());

// Routes (order matters – specific routes before 404)
app.get('/', (req, res) => {
  res.json({ app: 'LifeLink', status: 'ok' });
});

app.use('/auth', authRoutes);

app.get('/test', (req, res) => {
  res.json({ message: 'Test route is working' });
});

// 404 handler – must be last so it only runs when no route matched
app.use((req, res) => {
  res.status(404).json({ error: `${req.method} ${req.originalUrl} not found` });
});



export default app;
