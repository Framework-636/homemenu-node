// Puts the demo back to its starting state. Run nightly on the live site.
//
//   npm run reset-demo                 the full demo: recipes, staples, cooking history
//   npm run reset-demo -- --baseline   only the five recipes a fresh database starts with
//
// It resets two accounts and nothing else (see src/demo/reset.ts):
//   demo      the account visitors log in to: one household's lists and cooking history
//   homemenu  "HomeMenu Kitchen", the library that owns every public demo recipe.
//             Nobody can log in to it: its password field holds no valid hash.
// Every other account, and everything those accounts own, is left alone.
//
// On a development machine use --baseline, or expect a few tests to fail: they
// count the public recipes, and the full demo adds more.
import type { PoolConnection } from 'mysql2/promise';
import type { RowDataPacket } from 'mysql2';
import { pool } from '../src/db.ts';
import { BASELINE, EMPTY, FULL, KITCHEN } from '../src/demo/demo-data.ts';
import { resetAccount } from '../src/demo/reset.ts';

const DEMO = 'demo';
const KITCHEN_USER = 'homemenu';
const baseline = process.argv.includes('--baseline');

async function userId(conn: PoolConnection, username: string): Promise<number | undefined> {
  const [rows] = await conn.query<RowDataPacket[]>('SELECT id FROM users WHERE username = ?', [
    username,
  ]);
  return rows[0]?.id as number | undefined;
}

const conn = await pool.getConnection();
try {
  const today = new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD' (UTC)

  const demoId = await userId(conn, DEMO);
  if (demoId === undefined) throw new Error(`There is no "${DEMO}" account in this database.`);

  // The second author is created the first time the full demo is loaded.
  let kitchenId = await userId(conn, KITCHEN_USER);
  if (kitchenId === undefined && !baseline) {
    await conn.query(
      `INSERT INTO users (username, display_name, email, password_hash, default_visibility)
       VALUES (?, 'HomeMenu Kitchen', 'kitchen@example.com', '!no-login', 'public')`,
      [KITCHEN_USER]
    );
    kitchenId = await userId(conn, KITCHEN_USER);
  }

  // Order matters, because recipes change hands between the two accounts:
  //   full      library first (it takes the public recipes), then the demo household
  //   baseline  demo first (it takes its five recipes back), then the library is emptied
  let kitchenCount = 0;
  const resetKitchen = async () => {
    if (kitchenId === undefined) return;
    const data = baseline ? EMPTY : KITCHEN;
    await resetAccount(conn, kitchenId, data, today);
    kitchenCount = data.recipes.length;
  };
  if (!baseline) await resetKitchen();
  const summary = await resetAccount(conn, demoId, baseline ? BASELINE : FULL, today);
  if (baseline) await resetKitchen();

  console.log(
    `Demo reset (${baseline ? 'baseline' : 'full'}): ` +
      `${kitchenCount} library recipes, ` +
      `${summary.recipesRestored + summary.recipesAdded} in the demo account, ` +
      `${summary.recipesRemoved} removed from the demo account.`
  );
} catch (err) {
  console.error('Demo reset failed:', err instanceof Error ? err.message : err);
  process.exitCode = 1;
} finally {
  conn.release();
  await pool.end();
}
