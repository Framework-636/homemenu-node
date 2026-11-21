import { Router } from 'express';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { z } from 'zod';
import { pool } from '../db.ts';
import { requireUser } from '../auth/middleware.ts';
import { buildMenu, minutesAvailable, type Candidate } from '../menu/engine.ts';
import { isFutureDate, utcDate, validationError } from './shared.ts';

// This file does the database work for the menu: find what the user could be
// offered, hand it to the engine (src/menu/engine.ts), and send back its picks.

interface CandidateRow extends RowDataPacket {
  id: number;
  user_id: number;
  name: string;
  emoji: string;
  category: string;
  servings: number;
  prep_time: number;
  cook_time: number;
  times_cooked: number;
  last_made: string | null; // 'YYYY-MM-DD'
  saved: number; // 0 or 1
}

interface SnoozedRow extends RowDataPacket {
  id: number;
  name: string;
  emoji: string;
  snoozed_until: string; // 'YYYY-MM-DD'
}

interface IngredientLinkRow extends RowDataPacket {
  recipe_id: number;
  ingredient_id: number;
}

interface KnownRow extends RowDataPacket {
  ingredient_id: number;
}

// Which recipe categories count for each meal. Soup works for lunch or dinner.
const MEAL_CATEGORIES = {
  breakfast: ['Breakfast'],
  lunch: ['Lunch', 'Soup'],
  dinner: ['Dinner', 'Soup'],
  snack: ['Snack', 'Dessert', 'Baking'],
} as const;

const SNOOZE_DAYS = 7;

// When this household sits down to dinner. A constant for now; a setting later.
const DINNER_TIME = '18:30';

const menuQuery = z.object({
  meal: z.enum(['breakfast', 'lunch', 'dinner', 'snack']).default('dinner'),
  date: z.iso.date().optional(), // the browser's "today"
  roll: z.coerce.number().int().min(0).max(1000).default(0),
  time: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
    .optional(), // the browser's clock, 'HH:MM' in 24-hour time
});

const snoozeBody = z.object({
  recipe_id: z.number().int().positive(),
  date: z.iso.date().optional(), // the browser's "today"; the snooze counts from here
});

const recipeIdParams = z.object({
  recipeId: z.coerce.number().int().positive(),
});

const router = Router();

router.use(requireUser);

// GET /api/menu?meal=dinner&date=YYYY-MM-DD&roll=0 — three picks: safe, medium, new
router.get('/', async (req, res) => {
  const parsed = menuQuery.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json(validationError(parsed.error, 'Invalid menu request'));
    return;
  }
  const { meal, roll, time } = parsed.data;
  const date = parsed.data.date ?? utcDate();
  if (isFutureDate(date)) {
    res.status(400).json({ error: "That date hasn't happened yet" });
    return;
  }
  const userId = res.locals.user!.id;

  // Dinner has a deadline. When the page tells us the time, work out how long
  // a dish may take; otherwise (or for other meals) there is no limit.
  const maxMinutes =
    meal === 'dinner' && time !== undefined ? minutesAvailable(time, DINNER_TIME) : undefined;
  const max_minutes = maxMinutes ?? null;

  // 1. Recipes this user could be offered for this meal: ones they can see,
  //    minus any that use an avoided ingredient, minus any they've snoozed.
  const [rows] = await pool.query<CandidateRow[]>(
    `SELECT r.id, r.user_id, r.name, r.emoji, r.category, r.servings, r.prep_time, r.cook_time,
            (SELECT COUNT(*) FROM cook_log c
              WHERE c.recipe_id = r.id AND c.user_id = ?) AS times_cooked,
            (SELECT DATE_FORMAT(MAX(c.cooked_on), '%Y-%m-%d') FROM cook_log c
              WHERE c.recipe_id = r.id AND c.user_id = ?) AS last_made,
            EXISTS (SELECT 1 FROM saved_recipes s
                     WHERE s.recipe_id = r.id AND s.user_id = ?) AS saved
       FROM recipes r
      WHERE (r.visibility = 'public' OR r.user_id = ?)
        AND r.category IN (?)
        AND NOT EXISTS (SELECT 1 FROM recipe_ingredients ri
                          JOIN avoided_ingredients a ON a.ingredient_id = ri.ingredient_id
                         WHERE ri.recipe_id = r.id AND a.user_id = ?)
        AND NOT EXISTS (SELECT 1 FROM recipe_snoozes z
                         WHERE z.recipe_id = r.id AND z.user_id = ? AND z.snoozed_until > ?)`,
    [userId, userId, userId, userId, MEAL_CATEGORIES[meal], userId, userId, date]
  );

  // Dishes for this meal the user has snoozed, so the page can offer them back.
  const [snoozed] = await pool.query<SnoozedRow[]>(
    `SELECT r.id, r.name, r.emoji, DATE_FORMAT(z.snoozed_until, '%Y-%m-%d') AS snoozed_until
     FROM recipe_snoozes z
     JOIN recipes r ON r.id = z.recipe_id
    WHERE z.user_id = ? AND z.snoozed_until > ?
      AND r.category IN (?)
      AND (r.visibility = 'public' OR r.user_id = ?)
    ORDER BY r.name`,
    [userId, date, MEAL_CATEGORIES[meal], userId]
  );

  if (rows.length === 0) {
    res.json({ meal, date, roll, max_minutes, picks: [], snoozed });
    return;
  }

  // 2. Ingredients this household already uses: everything in their kitchen,
  //    plus every ingredient of a recipe they have cooked.
  // 3. Each candidate's catalog-linked ingredients.
  const [[knownRows], [linkRows]] = await Promise.all([
    pool.query<KnownRow[]>(
      `SELECT ingredient_id FROM kitchen_items WHERE user_id = ?
       UNION
       SELECT ri.ingredient_id
         FROM cook_log c
         JOIN recipe_ingredients ri ON ri.recipe_id = c.recipe_id
        WHERE c.user_id = ? AND ri.ingredient_id IS NOT NULL`,
      [userId, userId]
    ),
    pool.query<IngredientLinkRow[]>(
      `SELECT DISTINCT recipe_id, ingredient_id
         FROM recipe_ingredients
        WHERE recipe_id IN (?) AND ingredient_id IS NOT NULL`,
      [rows.map((r) => r.id)]
    ),
  ]);

  const known = new Set(knownRows.map((k) => k.ingredient_id));
  const linked = new Map<number, number[]>(); // recipe id -> its ingredient ids
  for (const link of linkRows) {
    const list = linked.get(link.recipe_id) ?? [];
    list.push(link.ingredient_id);
    linked.set(link.recipe_id, list);
  }

  const candidates: Candidate[] = rows.map((row) => {
    const ingredientIds = linked.get(row.id) ?? [];
    return {
      id: row.id,
      isOwn: row.user_id === userId,
      timesCooked: row.times_cooked,
      lastMade: row.last_made,
      linkedIngredients: ingredientIds.length,
      knownIngredients: ingredientIds.filter((id) => known.has(id)).length,
      totalMinutes: row.prep_time + row.cook_time,
    };
  });

  // The seed ties the menu to this user, this day and this meal.
  const picks = buildMenu({
    candidates,
    date,
    seed: `${userId}|${date}|${meal}`,
    roll,
    maxMinutes,
  });

  const byId = new Map(rows.map((row) => [row.id, row]));
  res.json({
    meal,
    date,
    roll,
    max_minutes,
    snoozed,
    picks: picks.map((pick) => {
      const row = byId.get(pick.recipeId)!;
      return {
        slot: pick.slot,
        reason: pick.reason,
        recipe: {
          id: row.id,
          name: row.name,
          emoji: row.emoji,
          category: row.category,
          servings: row.servings,
          prep_time: row.prep_time,
          cook_time: row.cook_time,
          last_made: row.last_made,
          times_cooked: row.times_cooked,
          saved: row.saved === 1,
        },
      };
    }),
  });
});

// POST /api/menu/snooze { recipe_id, date? } — keep a recipe off the menu for 7 days
router.post('/snooze', async (req, res) => {
  const parsed = snoozeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(validationError(parsed.error, 'Invalid snooze'));
    return;
  }
  const from = parsed.data.date ?? utcDate();
  if (isFutureDate(from)) {
    res.status(400).json({ error: "That date hasn't happened yet" });
    return;
  }
  const userId = res.locals.user!.id;

  const { recipe_id } = parsed.data;

  // Same visibility rule as the recipe pages: public, or your own.
  const [visible] = await pool.query<RowDataPacket[]>(
    "SELECT id FROM recipes WHERE id = ? AND (visibility = 'public' OR user_id = ?)",
    [recipe_id, userId]
  );
  if (visible.length === 0) {
    res.status(404).json({ error: 'Recipe not found' });
    return;
  }

  // Snoozing again moves the date instead of adding a second row.
  await pool.query(
    `INSERT INTO recipe_snoozes (user_id, recipe_id, snoozed_until)
     VALUES (?, ?, DATE_ADD(?, INTERVAL ? DAY))
     ON DUPLICATE KEY UPDATE snoozed_until = VALUES(snoozed_until)`,
    [userId, recipe_id, from, SNOOZE_DAYS]
  );
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT DATE_FORMAT(snoozed_until, '%Y-%m-%d') AS snoozed_until
       FROM recipe_snoozes WHERE user_id = ? AND recipe_id = ?`,
    [userId, recipe_id]
  );
  res.json({ recipe_id, snoozed_until: rows[0]?.snoozed_until as string });
});

// DELETE /api/menu/snooze/:recipeId — bring a snoozed recipe back early
router.delete('/snooze/:recipeId', async (req, res) => {
  const params = recipeIdParams.safeParse(req.params);
  if (!params.success) {
    res.status(404).json({ error: 'Not snoozed' });
    return;
  }
  const [result] = await pool.query<ResultSetHeader>(
    'DELETE FROM recipe_snoozes WHERE user_id = ? AND recipe_id = ?',
    [res.locals.user!.id, params.data.recipeId]
  );
  if (result.affectedRows === 0) {
    res.status(404).json({ error: 'Not snoozed' });
    return;
  }
  res.status(204).end();
});

export default router;
