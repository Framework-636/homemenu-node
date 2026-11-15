// Applies pending SQL migrations from db/migrations, in name order.
// Each applied file is recorded in schema_migrations so it never runs twice.
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import mysql from 'mysql2/promise';
import type { RowDataPacket } from 'mysql2';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

const migrationsDir = path.join(import.meta.dirname, '..', 'db', 'migrations');

// Migrations need CREATE/ALTER/DROP, which the app's database user doesn't have.
// MIGRATE_DB_USER/PASSWORD point at a separate user for this; locally they can be omitted.
const conn = await mysql.createConnection({
  host: requireEnv('DB_HOST'),
  port: Number(requireEnv('DB_PORT')),
  database: requireEnv('DB_NAME'),
  user: process.env.MIGRATE_DB_USER || requireEnv('DB_USER'),
  password: process.env.MIGRATE_DB_PASSWORD || requireEnv('DB_PASSWORD'),
  multipleStatements: true, // a migration file may contain several statements
});

try {
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

  if (pending.length === 0) {
    console.log('Migrations: up to date');
  }

  for (const file of pending) {
    console.log(`Applying ${file} ...`);
    const sql = await readFile(path.join(migrationsDir, file), 'utf8');
    await conn.query(sql);
    await conn.query('INSERT INTO schema_migrations (name) VALUES (?)', [file]);
    console.log(`Applied  ${file}`);
  }
} catch (err) {
  console.error('Migration failed:', err instanceof Error ? err.message : err);
  process.exitCode = 1;
} finally {
  await conn.end();
}
