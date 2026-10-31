import { Router } from 'express';
import { pool } from '../db.js';

const router = Router();

// GET /api/recipes - list all recipes (summary fields)
router.get('/', async (req, res, next) => {
    try {
        const [rows] = await pool.query('SELECT id, name, emoji, category, servings, prep_time, cook_time, season, last_made FROM recipes ORDER BY name');
        res.json(rows);
    } catch (err) {
        next(err);
    }
});

export default router;
