import { Router, type Response } from 'express';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { z } from 'zod';
import { pool } from '../db.ts';
import { requireUser } from '../auth/middleware.ts';
import { isFutureDate, utcDate, validationError } from './shared.ts';

// Things a logged-in user does to a recipe without editing it:
//   "We made this" (cook_log) and bookmarking someone's public recipe (saved_recipes).
// Mounted at /api/recipes, next to the recipe routes. requireUser goes on each
// route here (not router.use), so guests can still browse GET /api/recipes.

interface RecipeOwnerRow extends RowDataPacket {
  user_id: number;
  visibility: 'private' | 'public';
}

interface LastMadeRow extends RowDataPacket {
  last_made: string | null; // 'YYYY-MM-DD'
}

const recipeIdParams = z.object({
  id: z.coerce.number().int().positive(),
});

// The browser sends its own date (see isFutureDate in shared.ts for why).
const cookedBody = z.object({
  cooked_on: z.iso.date().optional(), // 'YYYY-MM-DD'
});

const cookedDateParams = z.object({
  id: z.coerce.number().int().positive(),
  date: z.iso.date(),
});

// The recipe, if this user may see it (public, or their own). Same rule as the recipe pages.
async function findVisibleRecipe(recipeId: number, userId: number) {
  const [rows] = await pool.query<RecipeOwnerRow[]>(
    "SELECT user_id, visibility FROM recipes WHERE id = ? AND (visibility = 'public' OR user_id = ?)",
    [recipeId, userId]
  );
  return rows[0] ?? null;
}

async function lastMade(recipeId: number, userId: number): Promise<string | null> {
  const [rows] = await pool.query<LastMadeRow[]>(
    `SELECT DATE_FORMAT(MAX(cooked_on), '%Y-%m-%d') AS last_made
       FROM cook_log WHERE recipe_id = ? AND user_id = ?`,
    [recipeId, userId]
  );
  return rows[0]?.last_made ?? null;
}

function badId(res: Response) {
  res.status(400).json({ error: 'Recipe id must be a positive integer' });
}

function notFound(res: Response) {
  res.status(404).json({ error: 'Recipe not found' });
}

const router = Router();

// POST /api/recipes/:id/cooked { cooked_on? } — "We made this"
router.post('/:id/cooked', requireUser, async (req, res) => {
  const params = recipeIdParams.safeParse(req.params);
  if (!params.success) return badId(res);

  const body = cookedBody.safeParse(req.body ?? {});
  if (!body.success) {
    res.status(400).json(validationError(body.error, 'Invalid date'));
    return;
  }
  const cookedOn = body.data.cooked_on ?? utcDate();
  if (isFutureDate(cookedOn)) {
    res.status(400).json({ error: "That date hasn't happened yet" });
    return;
  }

  const userId = res.locals.user!.id;
  const { id } = params.data;
  if (!(await findVisibleRecipe(id, userId))) return notFound(res);

  // Tapping twice on the same day hits the unique key and changes nothing.
  await pool.query(
    `INSERT INTO cook_log (user_id, recipe_id, cooked_on) VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE cooked_on = cooked_on`,
    [userId, id, cookedOn]
  );
  res.json({ last_made: await lastMade(id, userId) });
});

// DELETE /api/recipes/:id/cooked/:date — undo a "We made this" for that day
router.delete('/:id/cooked/:date', requireUser, async (req, res) => {
  const params = cookedDateParams.safeParse(req.params);
  if (!params.success) return badId(res);

  const userId = res.locals.user!.id;
  const { id, date } = params.data;
  const [result] = await pool.query<ResultSetHeader>(
    'DELETE FROM cook_log WHERE user_id = ? AND recipe_id = ? AND cooked_on = ?',
    [userId, id, date]
  );
  if (result.affectedRows === 0) {
    res.status(404).json({ error: 'Nothing logged for that day' });
    return;
  }
  res.json({ last_made: await lastMade(id, userId) });
});

// PUT /api/recipes/:id/saved — bookmark someone else's public recipe
router.put('/:id/saved', requireUser, async (req, res) => {
  const params = recipeIdParams.safeParse(req.params);
  if (!params.success) return badId(res);

  const userId = res.locals.user!.id;
  const { id } = params.data;
  const recipe = await findVisibleRecipe(id, userId);
  if (!recipe) return notFound(res);
  if (recipe.user_id === userId) {
    res.status(400).json({ error: "That's already your recipe" });
    return;
  }

  // PUT means "make it so": saving twice is fine and leaves one row.
  await pool.query(
    `INSERT INTO saved_recipes (user_id, recipe_id) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE recipe_id = recipe_id`,
    [userId, id]
  );
  res.status(204).end();
});

// DELETE /api/recipes/:id/saved — remove the bookmark
router.delete('/:id/saved', requireUser, async (req, res) => {
  const params = recipeIdParams.safeParse(req.params);
  if (!params.success) return badId(res);

  const [result] = await pool.query<ResultSetHeader>(
    'DELETE FROM saved_recipes WHERE user_id = ? AND recipe_id = ?',
    [res.locals.user!.id, params.data.id]
  );
  if (result.affectedRows === 0) {
    res.status(404).json({ error: 'Not in your saved recipes' });
    return;
  }
  res.status(204).end();
});

export default router;
