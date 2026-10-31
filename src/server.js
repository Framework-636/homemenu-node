import express from 'express';
import { pool } from './db.js';

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

// Start listening for requests 
app.listen(PORT, () => {
    console.log(`HomeMenu API running at http://localhost:${PORT}`);
});