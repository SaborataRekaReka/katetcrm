import { defineConfig } from '@playwright/test'

const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:5173'
const apiBaseURL = process.env.E2E_API_BASE_URL ?? 'http://localhost:3001/api/v1'

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: [
    {
      command: 'npm --prefix ../backend run start',
      url: `${apiBaseURL}/health`,
      reuseExistingServer: true,
      timeout: 180_000,
    },
    {
      command: 'npm run dev -- --host localhost --port 5173',
      url: baseURL,
      reuseExistingServer: true,
      timeout: 180_000,
      env: {
        VITE_USE_API: 'true',
        VITE_API_BASE_URL: apiBaseURL,
      },
    },
  ],
  reporter: [['list']],
})
