import express, { type ErrorRequestHandler } from 'express';
import { pool } from './db.ts';
import recipesRouter from './routes/recipes.ts';
import cookieParser from 'cookie-parser';
import { loadUser } from './auth/middleware.ts';
import authRouter from './routes/auth.ts';
import helmet from 'helmet';

export const app = express();

// In production the API sits behind Apache, which forwards each request.
// Trust one proxy hop, so req.ip is the visitor's real address (not Apache's).
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

app.use(helmet()); // security headers on every response

// Middleware: parse JSON request bodies
app.use(express.json());
app.use(cookieParser());
app.use(loadUser);
app.use('/api/auth', authRouter);

// Route: health check (verifies the database too)
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected', time: new Date().toISOString() });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(503).json({ status: 'error', database: 'unreachable', message });
  }
});

// Routes
app.use('/api/recipes', recipesRouter);

// Error handler (must be last, after all routes)
const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal Server Error' });
};
app.use(errorHandler);
