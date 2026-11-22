import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globalSetup: ['./test/global-setup.ts'], // once per run: rebuild the test database
    setupFiles: ['./test/setup.ts'], // in every test file: use the test database
  },
});
