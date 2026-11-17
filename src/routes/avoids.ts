import { Router } from 'express';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { z } from 'zod';
import { pool } from '../db.ts';
import { requireUser } from '../auth/middleware.ts';

interface AvoidRow extends RowDataPacket {
  ingredient_id: number;
  name: string;
  category: string;
  emoji: string;
}

const ingredientIdParams = z.object({
  ingredientId: z.coerce.number().int().positive(),
});

const addAvoidBody = z.object({
  ingredient_id: z.number().int().positive(),
});

function validationError(error: z.ZodError) {
  return {
    error: 'Invalid avoid entry',
    issues: error.issues.map((issue) => ({
      path: issue.path.map(String).join('.'),
      message: issue.message,
    })),
  };
}

function isDuplicateKey(err: unknown): boolean {
  return (err as { code?: string }).code === 'ER_DUP_ENTRY';
}

const router = Router();

router.use(requireUser);

// GET /api/avoids — ingredients the user never wants suggested
router.get('/', async (req, res) => {
  const [rows] = await pool.query<AvoidRow[]>(
    `SELECT a.ingredient_id, i.name, i.category, i.emoji
       FROM avoided_ingredients a
       JOIN ingredients i ON i.id = a.ingredient_id
      WHERE a.user_id = ?
      ORDER BY i.category, i.name`,
    [res.locals.user!.id]
  );
  res.json(rows);
});

// POST /api/avoids { ingredient_id } — add an ingredient to the avoid list
router.post('/', async (req, res) => {
  const parsed = addAvoidBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(validationError(parsed.error));
    return;
  }
  const userId = res.locals.user!.id;
  const { ingredient_id } = parsed.data;

  const [found] = await pool.query<RowDataPacket[]>(
    'SELECT id FROM ingredients WHERE id = ? AND (created_by IS NULL OR created_by = ?)',
    [ingredient_id, userId]
  );
  if (found.length === 0) {
    res.status(400).json({ error: 'Unknown ingredient' });
    return;
  }

  try {
    await pool.query('INSERT INTO avoided_ingredients (user_id, ingredient_id) VALUES (?, ?)', [
      userId,
      ingredient_id,
    ]);
    res.status(201).json({ ingredient_id });
  } catch (err) {
    if (isDuplicateKey(err)) {
      res.status(409).json({ error: 'That ingredient is already on your avoid list' });
      return;
    }
    throw err;
  }
});

// DELETE /api/avoids/:ingredientId — stop avoiding an ingredient
router.delete('/:ingredientId', async (req, res) => {
  const params = ingredientIdParams.safeParse(req.params);
  if (!params.success) {
    res.status(404).json({ error: 'Not on your avoid list' });
    return;
  }

  const [result] = await pool.query<ResultSetHeader>(
    'DELETE FROM avoided_ingredients WHERE user_id = ? AND ingredient_id = ?',
    [res.locals.user!.id, params.data.ingredientId]
  );
  if (result.affectedRows === 0) {
    res.status(404).json({ error: 'Not on your avoid list' });
    return;
  }
  res.status(204).end();
});

export default router;
