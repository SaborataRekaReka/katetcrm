import { defineConfig, devices } from '@playwright/test';

const localBaseUrl = 'http://localhost:5173';
const baseURL = process.env.E2E_BASE_URL ?? localBaseUrl;
const shouldStartLocalFrontend = !process.env.E2E_SKIP_WEB_SERVER && baseURL === localBaseUrl;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: shouldStartLocalFrontend
    ? {
        command: 'npm run dev -- --host 127.0.0.1 --port 5173',
        url: localBaseUrl,
        reuseExistingServer: true,
        timeout: 120_000,
      }
    : undefined,
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
