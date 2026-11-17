import { Router, type Request, type Response } from 'express';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { z } from 'zod';
import { pool } from '../db.ts';
import { requireUser } from '../auth/middleware.ts';
import { canUseIngredient, validationError } from './shared.ts';

interface StapleNeedRow extends RowDataPacket {
  id: number;
  name: string;
  category: string;
  emoji: string;
  not_found_on: string | null; // 'YYYY-MM-DD'
}

interface ItemRow extends RowDataPacket {
  id: number;
  name: string;
  category: string;
  emoji: string;
  not_found_on: string | null;
  recipe_id: number | null;
  recipe_name: string | null;
}

const idParams = z.object({
  id: z.coerce.number().int().positive(),
});

// Add by catalog ingredient (name and category come from the catalog), or by free text.
const addItemBody = z
  .object({
    ingredient_id: z.number().int().positive().optional(),
    name: z.string().trim().min(1).max(160).optional(),
    recipe_id: z.number().int().positive().optional(),
  })
  .refine((body) => body.ingredient_id !== undefined || body.name !== undefined, {
    message: 'Give an ingredient_id or a name',
  });

const router = Router();

router.use(requireUser);

// GET /api/grocery — out-of-stock staples + manual and recipe items, by category
router.get('/', async (req, res) => {
  const userId = res.locals.user!.id;

  const [staples] = await pool.query<StapleNeedRow[]>(
    `SELECT k.id, i.name, i.category, i.emoji,
            DATE_FORMAT(k.not_found_on, '%Y-%m-%d') AS not_found_on
       FROM kitchen_items k
       JOIN ingredients i ON i.id = k.ingredient_id
      WHERE k.user_id = ? AND k.kind = 'staple' AND k.in_stock = 0`,
    [userId]
  );

  const [items] = await pool.query<ItemRow[]>(
    `SELECT g.id, g.name, g.category, COALESCE(i.emoji, '🛒') AS emoji,
            DATE_FORMAT(g.not_found_on, '%Y-%m-%d') AS not_found_on,
            g.recipe_id, r.name AS recipe_name
       FROM grocery_items g
       LEFT JOIN ingredients i ON i.id = g.ingredient_id
       LEFT JOIN recipes r ON r.id = g.recipe_id
      WHERE g.user_id = ?`,
    [userId]
  );

  const list = [
    ...staples.map((s) => ({
      source: 'staple' as const,
      id: s.id,
      name: s.name,
      category: s.category,
      emoji: s.emoji,
      not_found_on: s.not_found_on,
      recipe_name: null,
    })),
    ...items.map((g) => ({
      source: (g.recipe_id === null ? 'manual' : 'recipe') as 'manual' | 'recipe',
      id: g.id,
      name: g.name,
      category: g.category,
      emoji: g.emoji,
      not_found_on: g.not_found_on,
      recipe_name: g.recipe_name,
    })),
  ].sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));

  res.json(list);
});

// POST /api/grocery/items { ingredient_id? | name?, recipe_id? } — add to the list
router.post('/items', async (req, res) => {
  const parsed = addItemBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(validationError(parsed.error, 'Invalid grocery item'));
    return;
  }
  const userId = res.locals.user!.id;
  const { ingredient_id, recipe_id } = parsed.data;
  let name = parsed.data.name;
  let category = 'Other';

  if (ingredient_id !== undefined) {
    if (!(await canUseIngredient(userId, ingredient_id))) {
      res.status(400).json({ error: 'Unknown ingredient' });
      return;
    }
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT name, category FROM ingredients WHERE id = ?',
      [ingredient_id]
    );
    name = rows[0]?.name as string;
    category = rows[0]?.category as string;
  }

  if (recipe_id !== undefined) {
    // Same visibility rule as the recipe pages: public, or your own.
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT id FROM recipes WHERE id = ? AND (visibility = 'public' OR user_id = ?)",
      [recipe_id, userId]
    );
    if (rows.length === 0) {
      res.status(400).json({ error: 'Unknown recipe' });
      return;
    }
  }

  const [result] = await pool.query<ResultSetHeader>(
    'INSERT INTO grocery_items (user_id, ingredient_id, recipe_id, name, category) VALUES (?, ?, ?, ?, ?)',
    [userId, ingredient_id ?? null, recipe_id ?? null, name, category]
  );
  res.status(201).json({ id: result.insertId });
});

// Shared shape of every action below: parse :id, run one statement scoped to
// the logged-in user, 204 if a row matched, 404 if not (not yours / not there).
async function runAction(req: Request, res: Response, sql: string) {
  const params = idParams.safeParse(req.params);
  if (!params.success) {
    res.status(404).json({ error: 'Not on your grocery list' });
    return;
  }
  const [result] = await pool.query<ResultSetHeader>(sql, [params.data.id, res.locals.user!.id]);
  if (result.affectedRows === 0) {
    res.status(404).json({ error: 'Not on your grocery list' });
    return;
  }
  res.status(204).end();
}

// Staples: Got it (back in stock) / Couldn't find it (stays on the list, dated)
router.post('/staples/:id/got-it', (req, res) =>
  runAction(
    req,
    res,
    "UPDATE kitchen_items SET in_stock = 1, not_found_on = NULL WHERE id = ? AND user_id = ? AND kind = 'staple'"
  )
);

router.post('/staples/:id/not-found', (req, res) =>
  runAction(
    req,
    res,
    "UPDATE kitchen_items SET not_found_on = CURDATE() WHERE id = ? AND user_id = ? AND kind = 'staple' AND in_stock = 0"
  )
);

// Manual and recipe items: Got it / Couldn't find it / Remove
router.post('/items/:id/got-it', (req, res) =>
  runAction(req, res, 'DELETE FROM grocery_items WHERE id = ? AND user_id = ?')
);

router.post('/items/:id/not-found', (req, res) =>
  runAction(
    req,
    res,
    'UPDATE grocery_items SET not_found_on = CURDATE() WHERE id = ? AND user_id = ?'
  )
);

router.delete('/items/:id', (req, res) =>
  runAction(req, res, 'DELETE FROM grocery_items WHERE id = ? AND user_id = ?')
);

export default router;
