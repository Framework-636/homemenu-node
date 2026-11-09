import { Router } from 'express';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { PoolConnection } from 'mysql2/promise';
import { z } from 'zod';
import { pool } from '../db.ts';
import { requireUser } from '../auth/middleware.ts';

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

// Request validation for creating or updating a recipe.
// Limits match (or are stricter than) the database columns.
const recipeBody = z.object({
  name: z.string().trim().min(1).max(160),
  emoji: z.string().trim().min(1).max(8).default('🍽️'),
  category: z
    .enum(['Dinner', 'Lunch', 'Breakfast', 'Dessert', 'Snack', 'Soup', 'Baking', 'Other'])
    .default('Dinner'),
  servings: z.number().int().min(1).max(100).default(4),
  prep_time: z.number().int().min(0).max(2880).default(0), // minutes, up to 48 hours
  cook_time: z.number().int().min(0).max(2880).default(0),
  description: z.string().trim().max(2000).nullable().default(null),
  visibility: z.enum(['private', 'public']).default('private'),
  season: z.enum(['any', 'spring', 'summer', 'fall', 'winter']).default('any'),
  ingredients: z
    .array(
      z.object({
        quantity: z.string().trim().max(30).default(''),
        unit: z.string().trim().max(30).default(''),
        ingredient: z.string().trim().min(1).max(160),
      })
    )
    .max(100)
    .default([]),
  instructions: z.array(z.string().trim().min(1).max(2000)).max(100).default([]),
  tags: z
    .array(z.string().trim().toLowerCase().min(1).max(60))
    .max(20)
    .default([])
    .transform((tags) => [...new Set(tags)]), // remove duplicates
});

type RecipeInput = z.infer<typeof recipeBody>;

// Run several queries as one all-or-nothing unit.
// If anything throws, every change inside is undone.
async function withTransaction<T>(work: (conn: PoolConnection) => Promise<T>): Promise<T> {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await work(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release(); // always give the connection back to the pool
  }
}

// Insert a recipe's ingredients, steps and tags. Array order becomes sort order.
async function insertRecipeChildren(conn: PoolConnection, recipeId: number, input: RecipeInput) {
  if (input.ingredients.length > 0) {
    await conn.query(
      'INSERT INTO recipe_ingredients (recipe_id, sort_order, quantity, unit, ingredient) VALUES ?',
      [input.ingredients.map((ing, i) => [recipeId, i + 1, ing.quantity, ing.unit, ing.ingredient])]
    );
  }
  if (input.instructions.length > 0) {
    await conn.query(
      'INSERT INTO recipe_instructions (recipe_id, step_number, instruction) VALUES ?',
      [input.instructions.map((text, i) => [recipeId, i + 1, text])]
    );
  }
  if (input.tags.length > 0) {
    await conn.query('INSERT INTO recipe_tags (recipe_id, tag) VALUES ?', [
      input.tags.map((tag) => [recipeId, tag]),
    ]);
  }
}

const router = Router();

// GET /api/recipes - public recipes, plus the logged-in user's own private ones
router.get('/', async (req, res, next) => {
  const userId = res.locals.user?.id ?? null;
  try {
    const [rows] = await pool.query<RecipeSummaryRow[]>(
      `SELECT id, name, emoji, category, servings, prep_time, cook_time, season, last_made
       FROM recipes
       WHERE visibility = 'public' OR user_id = ?
       ORDER BY name`,
      [userId]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// GET /api/recipes/:id - one recipe the caller may see, with ingredients, instructions and tags
router.get('/:id', async (req, res, next) => {
  const parsed = recipeIdParams.safeParse(req.params);

  if (!parsed.success) {
    res.status(400).json({ error: 'Recipe id must be a positive integer' });
    return;
  }
  const { id } = parsed.data;
  const userId = res.locals.user?.id ?? null;
  try {
    const [recipes] = await pool.query<RecipeDetailRow[]>(
      `SELECT id, name, emoji, category, servings, prep_time, cook_time,
              description, visibility, season, last_made, created_at, updated_at
       FROM recipes
       WHERE id = ? AND (visibility = 'public' OR user_id = ?)`,
      [id, userId]
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

// POST /api/recipes - create a recipe owned by the logged-in user
router.post('/', requireUser, async (req, res, next) => {
  const parsed = recipeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: 'Invalid recipe',
      issues: parsed.error.issues.map((issue) => ({
        path: issue.path.map(String).join('.'),
        message: issue.message,
      })),
    });
    return;
  }
  const input = parsed.data;
  const userId = res.locals.user!.id; // requireUser guarantees a user

  try {
    const id = await withTransaction(async (conn) => {
      const [result] = await conn.query<ResultSetHeader>(
        `INSERT INTO recipes
           (user_id, name, emoji, category, servings, prep_time, cook_time, description, visibility, season)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          input.name,
          input.emoji,
          input.category,
          input.servings,
          input.prep_time,
          input.cook_time,
          input.description,
          input.visibility,
          input.season,
        ]
      );
      await insertRecipeChildren(conn, result.insertId, input);
      return result.insertId;
    });
    res.status(201).json({ id });
  } catch (err) {
    next(err);
  }
});

export default router;
