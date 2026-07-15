import { defineConfig, devices } from '@playwright/test'

const PORT = 3000
const BASE_URL = `http://localhost:${PORT}`

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // Run against a production build so the Serwist service worker is active (it is disabled in
    // dev). This is what makes the offline-persistence path testable.
    command: 'pnpm build && pnpm start',
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    // Covers a full production build + start; the build alone brushes 120s as pages grow.
    timeout: 180_000,
  },
})
