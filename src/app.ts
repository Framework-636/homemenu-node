import express, { type ErrorRequestHandler } from 'express';
import { pool } from './db.ts';
import recipesRouter from './routes/recipes.ts';

export const app = express();

// Middleware: parse JSON request bodies
app.use(express.json());

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
