// Applies pending SQL migrations from db/migrations, in name order.
// Each applied file is recorded in schema_migrations so it never runs twice.
// Shared by `npm run migrate` and by the test setup, which builds a fresh test database.
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import type { Connection } from 'mysql2/promise';
import type { RowDataPacket } from 'mysql2';

const migrationsDir = path.join(import.meta.dirname, '..', '..', 'db', 'migrations');

// The connection must be opened with multipleStatements: true, because a
// migration file may contain several statements.
// `log` receives progress lines; pass a function that does nothing to stay quiet.
export async function applyMigrations(
  conn: Connection,
  log: (line: string) => void = console.log
): Promise<number> {
  await conn.query(
    `CREATE TABLE IF NOT EXISTS schema_migrations (
       name VARCHAR(255) NOT NULL PRIMARY KEY,
       applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
     ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
  );

  const [rows] = await conn.query<RowDataPacket[]>('SELECT name FROM schema_migrations');
  const applied = new Set(rows.map((r) => r.name as string));

  const files = (await readdir(migrationsDir)).filter((f) => f.endsWith('.sql')).sort();
  const pending = files.filter((f) => !applied.has(f));

  if (pending.length === 0) log('Migrations: up to date');

  for (const file of pending) {
    log(`Applying ${file} ...`);
    const sql = await readFile(path.join(migrationsDir, file), 'utf8');
    await conn.query(sql);
    await conn.query('INSERT INTO schema_migrations (name) VALUES (?)', [file]);
    log(`Applied  ${file}`);
  }
  return pending.length;
}
