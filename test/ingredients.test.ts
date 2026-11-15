import { afterAll, describe, expect, it } from 'vitest';
import type { RowDataPacket } from 'mysql2';
import { pool } from '../src/db.ts';

describe('starter ingredient list', () => {
  afterAll(async () => {
    await pool.end();
  });

  it('loads at least 60 shared system ingredients', async () => {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT COUNT(*) AS n FROM ingredients WHERE created_by IS NULL'
    );
    expect(Number(rows[0]?.n)).toBeGreaterThanOrEqual(60);
  });

  it('uses lowercase, hyphenated slugs', async () => {
    // BINARY makes the pattern case-sensitive, so "Bell-Pepper" would fail.
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT slug FROM ingredients WHERE BINARY slug NOT REGEXP '^[a-z0-9]+(-[a-z0-9]+)*$'"
    );
    expect(rows).toEqual([]);
  });

  it('keeps fresh and canned tomatoes as separate ingredients', async () => {
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT slug FROM ingredients WHERE slug IN ('tomatoes', 'crushed-tomatoes')"
    );
    expect(rows).toHaveLength(2);
  });

  it('links every demo recipe ingredient to the catalog', async () => {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT ingredient FROM recipe_ingredients WHERE recipe_id BETWEEN 1 AND 5 AND ingredient_id IS NULL'
    );
    expect(rows).toEqual([]);
  });
});
