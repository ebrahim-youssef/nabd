import { defineConfig, devices } from '@playwright/test'

const PORT = 3000
const BASE_URL = `http://localhost:${PORT}`

export default defineConfig({
  testDir: './e2e',
  // Specs walk the full onboarding flow before their assertions; CI runners need headroom
  // over the 30s default.
  timeout: 60_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // Local parallel workers share one `next start`; a slow response can lose a pre-hydration
  // click, so one retry locally (CI runs a single worker and already retries).
  retries: process.env.CI ? 2 : 1,
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
