import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';

const PORT = 3457;
const preload = path.resolve('e2e/harness/preload.mjs');

// These override anything in .env.local, so the tests can never touch a real database or inbox
const testEnv = {
  POSTGRES_URL: 'postgresql://test:test@e2e.invalid/test',
  ADMIN_PIN: 'e2e-pin',
  NEXT_PUBLIC_APP_URL: `http://localhost:${PORT}`,
  RESEND_API_KEY: 'test-key',
  ORDER_FROM_EMAIL: 'orders@gross.example',
  ORDER_NOTIFY_EMAIL: 'sales@gross.example',
  NODE_OPTIONS: `--import=${preload}`,
};

export default defineConfig({
  testDir: './e2e',
  // One shared database, and each flow builds on what the last one created
  workers: 1,
  fullyParallel: false,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    ...devices['Desktop Chrome'],
    viewport: { width: 1360, height: 900 },
  },
  webServer: [
    {
      command: 'node e2e/harness/db-server.mjs',
      url: 'http://127.0.0.1:5499/health',
      reuseExistingServer: false,
    },
    {
      command: `node scripts/migrate.mjs && node src/lib/seed.ts && npx next build && npx next start -p ${PORT}`,
      url: `http://localhost:${PORT}/admin/login`,
      reuseExistingServer: false,
      timeout: 240_000,
      env: testEnv,
    },
  ],
});
