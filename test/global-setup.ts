// Runs once before the tests start (see vitest.config.ts).
// Builds the test database from scratch, so every run begins with the same data
// and nothing in the development database can change a test's result:
//   1. drop the test database and create it again
//   2. load db/init (schema, demo data, test users)
//   3. apply the migrations
// The development database is never touched.
import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import mysql from 'mysql2/promise';
import type { RowDataPacket } from 'mysql2';
import { applyMigrations } from '../scripts/lib/migrations.ts';
import { testDatabaseName } from './test-database.ts';

const initDir = path.join(import.meta.dirname, '..', 'db', 'init');

function requireEnv(name: string, why?: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}${why ? ` (${why})` : ''}`);
  }
  return value;
}

export default async function setup(): Promise<void> {
  if (existsSync('.env')) process.loadEnvFile('.env');

  const database = testDatabaseName();
  // A last guard before DROP DATABASE: only ever a plainly named test database.
  if (!/^[A-Za-z0-9_]+_test$/.test(database)) {
    throw new Error(`Refusing to rebuild "${database}": not a test database name.`);
  }
  const appUser = requireEnv('DB_USER');

  // Creating a database takes more rights than the app's own user has, so this
  // connects as root. Locally that is the Docker database's root password in .env.
  const conn = await mysql.createConnection({
    host: requireEnv('DB_HOST'),
    port: Number(requireEnv('DB_PORT')),
    user: 'root',
    password: requireEnv(
      'DB_ROOT_PASSWORD',
      'the tests use it to build the test database; see .env.example'
    ),
    multipleStatements: true,
  });

  try {
    await conn.query(`DROP DATABASE IF EXISTS \`${database}\``);
    await conn.query(
      `CREATE DATABASE \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    // Let the app's own user in. It may be registered under more than one host name.
    const [hosts] = await conn.query<RowDataPacket[]>(
      'SELECT Host AS host FROM mysql.user WHERE User = ?',
      [appUser]
    );
    if (hosts.length === 0) throw new Error(`The database has no user named "${appUser}".`);
    for (const { host } of hosts) {
      await conn.query(`GRANT ALL PRIVILEGES ON \`${database}\`.* TO ?@?`, [appUser, host]);
    }
    await conn.query(`USE \`${database}\``);

    const files = (await readdir(initDir)).filter((f) => f.endsWith('.sql')).sort();
    for (const file of files) {
      await conn.query(await readFile(path.join(initDir, file), 'utf8'));
    }
    await applyMigrations(conn, () => {}); // quiet: no progress lines in the test output
  } finally {
    await conn.end();
  }
}
