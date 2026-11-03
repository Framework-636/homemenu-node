import { existsSync } from 'node:fs';

// Load local settings from .env when it exists.
// In CI there's no .env file; the variables are set directly instead.
if (existsSync('.env')) {
  process.loadEnvFile('.env');
}
