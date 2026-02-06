import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { env } from './config/env.js';

const app = express();

app.use(cors({ origin: env.CORS_ORIGIN }));
app.use(morgan(env.NODE_ENV === 'development' ? 'dev' : 'combined'));
app.use(express.json());

app.get('/health', (_, res) => {
  res.json({ status: 'ok' });
});

export default app;
