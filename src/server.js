import express from 'express';
import { pool } from './db.js';
import recipesRouter from './routes/recipes.js';

const app = express();
const PORT = process.env.PORT || 3000;

//Middleware: parse JSON request bodies
app.use(express.json());

// Route: health check
app.get('/api/health', async (req, res) => {
    try {
        await pool.query('SELECT 1');
        res.json({ status: 'ok', database: 'connected', time: new Date().toISOString() });
    } catch (err) {
        res.status(503).json({ status: 'error', database: 'unreachable', message: err.message });
    }
});

// Routes
app.use('/api/recipes', recipesRouter);

// Error handler (must be last, after all routes)
app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error'});
});

// Start listening for requests 
app.listen(PORT, () => {
    console.log(`HomeMenu API running at http://localhost:${PORT}`);
});