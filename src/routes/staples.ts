import { Router } from 'express';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { z } from 'zod';
import { pool } from '../db.ts';
import { requireUser } from '../auth/middleware.ts';

interface StapleRow extends RowDataPacket {
  id: number;
  ingredient_id: number;
  name: string;
  category: string;
  emoji: string;
  in_stock: number; // MariaDB returns TINYINT as 0 or 1
}

const stapleIdParams = z.object({
  id: z.coerce.number().int().positive(),
});

const addStapleBody = z.object({
  ingredient_id: z.number().int().positive(),
});

const updateStapleBody = z.object({
  in_stock: z.boolean(),
});

// Turn Zod's validation errors into a consistent 400 response body.
function validationError(error: z.ZodError) {
  return {
    error: 'Invalid staple',
    issues: error.issues.map((issue) => ({
      path: issue.path.map(String).join('.'),
      message: issue.message,
    })),
  };
}

// MariaDB reports a UNIQUE key violation with this code.
function isDuplicateKey(err: unknown): boolean {
  return (err as { code?: string }).code === 'ER_DUP_ENTRY';
}

const router = Router();

// Every staples route needs a logged-in user.
router.use(requireUser);

// GET /api/staples — the user's staples, grouped by category
router.get('/', async (req, res) => {
  const [rows] = await pool.query<StapleRow[]>(
    `SELECT k.id, k.ingredient_id, i.name, i.category, i.emoji, k.in_stock
       FROM kitchen_items k
       JOIN ingredients i ON i.id = k.ingredient_id
      WHERE k.user_id = ? AND k.kind = 'staple'
      ORDER BY i.category, i.name`,
    [res.locals.user!.id]
  );
  // Send true/false instead of 1/0.
  res.json(rows.map((row) => ({ ...row, in_stock: row.in_stock === 1 })));
});

// POST /api/staples { ingredient_id } — add a staple
router.post('/', async (req, res) => {
  const parsed = addStapleBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(validationError(parsed.error));
    return;
  }
  const userId = res.locals.user!.id;
  const { ingredient_id } = parsed.data;

  // Only shared ingredients or the user's own can be added.
  const [found] = await pool.query<RowDataPacket[]>(
    'SELECT id FROM ingredients WHERE id = ? AND (created_by IS NULL OR created_by = ?)',
    [ingredient_id, userId]
  );
  if (found.length === 0) {
    res.status(400).json({ error: 'Unknown ingredient' });
    return;
  }

  try {
    const [result] = await pool.query<ResultSetHeader>(
      "INSERT INTO kitchen_items (user_id, ingredient_id, kind) VALUES (?, ?, 'staple')",
      [userId, ingredient_id]
    );
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    if (isDuplicateKey(err)) {
      res.status(409).json({ error: 'That ingredient is already in your kitchen' });
      return;
    }
    throw err; // anything else is a real error
  }
});

// PATCH /api/staples/:id { in_stock } — mark in stock or out
router.patch('/:id', async (req, res) => {
  const params = stapleIdParams.safeParse(req.params);
  const body = updateStapleBody.safeParse(req.body);
  if (!params.success) {
    res.status(404).json({ error: 'Staple not found' });
    return;
  }
  if (!body.success) {
    res.status(400).json(validationError(body.error));
    return;
  }

  const [result] = await pool.query<ResultSetHeader>(
    "UPDATE kitchen_items SET in_stock = ? WHERE id = ? AND user_id = ? AND kind = 'staple'",
    [body.data.in_stock, params.data.id, res.locals.user!.id]
  );
  if (result.affectedRows === 0) {
    res.status(404).json({ error: 'Staple not found' });
    return;
  }
  res.status(204).end();
});

// DELETE /api/staples/:id — remove a staple
router.delete('/:id', async (req, res) => {
  const params = stapleIdParams.safeParse(req.params);
  if (!params.success) {
    res.status(404).json({ error: 'Staple not found' });
    return;
  }

  const [result] = await pool.query<ResultSetHeader>(
    "DELETE FROM kitchen_items WHERE id = ? AND user_id = ? AND kind = 'staple'",
    [params.data.id, res.locals.user!.id]
  );
  if (result.affectedRows === 0) {
    res.status(404).json({ error: 'Staple not found' });
    return;
  }
  res.status(204).end();
});

export default router;
