import { Router } from 'express';
import type { RowDataPacket } from 'mysql2';
import { pool } from '../db.ts';
import { z } from 'zod';

// Row shapes returned by each query
interface RecipeSummaryRow extends RowDataPacket {
  id: number;
  name: string;
  emoji: string;
  category: string;
  servings: number;
  prep_time: number;
  cook_time: number;
  season: string;
  last_made: Date | null;
}

interface RecipeDetailRow extends RecipeSummaryRow {
  description: string | null;
  visibility: 'private' | 'public';
  created_at: Date;
  updated_at: Date;
}

interface IngredientRow extends RowDataPacket {
  quantity: string;
  unit: string;
  ingredient: string;
  ingredient_id: number | null;
}

interface InstructionRow extends RowDataPacket {
  step_number: number;
  instruction: string;
}

interface TagRow extends RowDataPacket {
  tag: string;
}

// Request validation: the :id URL parameter must be a positive whole number
const recipeIdParams = z.object({
  id: z.coerce.number().int().positive(),
});

const router = Router();

// GET /api/recipes - list public recipes (summary fields)
router.get('/', async (req, res, next) => {
  try {
    const [rows] = await pool.query<RecipeSummaryRow[]>(
      `SELECT id, name, emoji, category, servings, prep_time, cook_time, season, last_made
       FROM recipes
       WHERE visibility = 'public'
       ORDER BY name`
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// GET /api/recipes/:id - one public recipe with ingredients, instructions and tags
router.get('/:id', async (req, res, next) => {
  const parsed = recipeIdParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: 'Recipe id must be a positive integer' });
    return;
  }
  const { id } = parsed.data;

  try {
    const [recipes] = await pool.query<RecipeDetailRow[]>(
      `SELECT id, name, emoji, category, servings, prep_time, cook_time,
              description, visibility, season, last_made, created_at, updated_at
       FROM recipes
       WHERE id = ? AND visibility = 'public'`,
      [id]
    );

    const recipe = recipes[0];
    if (!recipe) {
      res.status(404).json({ error: 'Recipe not found' });
      return;
    }

    const [[ingredients], [instructions], [tags]] = await Promise.all([
      pool.query<IngredientRow[]>(
        `SELECT quantity, unit, ingredient, ingredient_id
         FROM recipe_ingredients
         WHERE recipe_id = ?
         ORDER BY sort_order`,
        [id]
      ),
      pool.query<InstructionRow[]>(
        `SELECT step_number, instruction
         FROM recipe_instructions
         WHERE recipe_id = ?
         ORDER BY step_number`,
        [id]
      ),
      pool.query<TagRow[]>('SELECT tag FROM recipe_tags WHERE recipe_id = ? ORDER BY tag', [id]),
    ]);

    res.json({
      ...recipe,
      ingredients,
      instructions,
      tags: tags.map((t) => t.tag),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
