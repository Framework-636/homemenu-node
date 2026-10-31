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

// GET /api/recipes/:id - one recipe with ingredients, instructions and tags
router.get('/:id', async (req, res, next) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Recipe id must be a positive integer' });
  }

  try {
    const [recipes] = await pool.query(
      `SELECT id, name, emoji, category, servings, prep_time, cook_time,
              description, visibility, season, last_made, created_at, updated_at
       FROM recipes
       WHERE id = ?`,
      [id]
    );

    if (recipes.length === 0) {
      return res.status(404).json({ error: 'Recipe not found' });
    }

    const [[ingredients], [instructions], [tags]] = await Promise.all([
      pool.query(
        `SELECT quantity, unit, ingredient, ingredient_id
         FROM recipe_ingredients
         WHERE recipe_id = ?
         ORDER BY sort_order`,
        [id]
      ),
      pool.query(
        `SELECT step_number, instruction
         FROM recipe_instructions
         WHERE recipe_id = ?
         ORDER BY step_number`,
        [id]
      ),
      pool.query(
        'SELECT tag FROM recipe_tags WHERE recipe_id = ? ORDER BY tag',
        [id]
      ),
    ]);

    res.json({
      ...recipes[0],
      ingredients,
      instructions,
      tags: tags.map((t) => t.tag),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
