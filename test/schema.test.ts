import type { RowDataPacket } from 'mysql2';
import { afterAll, describe, expect, it } from 'vitest';
import { pool } from '../src/db.ts';

afterAll(async () => {
  await pool.end();
});

async function tableNames(): Promise<string[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT table_name AS name FROM information_schema.tables WHERE table_schema = DATABASE()`
  );
  return rows.map((r) => r.name as string);
}

describe('database schema (after migrations)', () => {
  it('has the kitchen v2 tables and none of the old ones', async () => {
    const names = await tableNames();
    expect(names).toContain('kitchen_items');
    expect(names).not.toContain('user_staples');
    expect(names).not.toContain('user_pantry');
    expect(names).not.toContain('user_ingredient_overrides');
    expect(names).not.toContain('master_ingredients');
    expect(names).not.toContain('v_unlinked_pantry');
  });

  it('uses one collation for every table', async () => {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT DISTINCT table_collation AS collation
       FROM information_schema.tables
       WHERE table_schema = DATABASE() AND table_type = 'BASE TABLE'`
    );
    expect(rows.map((r) => r.collation)).toEqual(['utf8mb4_unicode_ci']);
  });
});
