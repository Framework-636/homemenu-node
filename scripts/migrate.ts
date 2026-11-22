// Applies pending SQL migrations to the database named in the environment.
//   npm run migrate
import mysql from 'mysql2/promise';
import { applyMigrations } from './lib/migrations.ts';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

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
  await applyMigrations(conn);
} catch (err) {
  console.error('Migration failed:', err instanceof Error ? err.message : err);
  process.exitCode = 1;
} finally {
  await conn.end();
}
