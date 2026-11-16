import { Router } from 'express';
import type { RowDataPacket } from 'mysql2';
import { z } from 'zod';
import { pool } from '../db.ts';
import { requireUser } from '../auth/middleware.ts';

interface IngredientRow extends RowDataPacket {
  id: number;
  name: string;
  category: string;
  emoji: string;
}

// ?q= is optional; an empty search returns the whole catalog.
const searchQuery = z.object({
  q: z.string().trim().max(60).default(''),
});

const router = Router();

// GET /api/ingredients?q=chick — search the shared catalog (plus the user's own ingredients)
router.get('/', requireUser, async (req, res) => {
  const parsed = searchQuery.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid search' });
    return;
  }

  // Escape LIKE's wildcard characters so "50%" searches for the literal text.
  const pattern = `%${parsed.data.q.replace(/[\\%_]/g, '\\$&')}%`;

  const [rows] = await pool.query<IngredientRow[]>(
    `SELECT id, name, category, emoji
       FROM ingredients
      WHERE (created_by IS NULL OR created_by = ?)
        AND name LIKE ?
      ORDER BY category, name
      LIMIT 200`,
    [res.locals.user!.id, pattern]
  );
  res.json(rows);
});

export default router;
