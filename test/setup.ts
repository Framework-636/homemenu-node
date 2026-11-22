import { existsSync } from 'node:fs';
import { testDatabaseName } from './test-database.ts';

// Load local settings from .env when it exists.
// In CI there's no .env file; the variables are set directly instead.
if (existsSync('.env')) {
  process.loadEnvFile('.env');
}

// Point the app at the test database before any test imports src/db.ts.
// test/global-setup.ts has already rebuilt it for this run.
process.env.DB_NAME = testDatabaseName();
