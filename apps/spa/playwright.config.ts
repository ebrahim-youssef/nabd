import { defineConfig } from '@playwright/test'

const previewUrl = 'http://127.0.0.1:8787'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['html', { open: 'never' }], ['list']] : 'list',
  use: {
    baseURL: previewUrl,
    locale: 'ar-EG',
    // Pinned so prayer times are reproducible: they are wall-clock values derived from the
    // runtime zone, and CI runs in UTC while a local machine does not. Without this, any
    // assertion about a displayed time passes on one and fails on the other.
    timezoneId: 'Africa/Cairo',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'pnpm preview:cloudflare',
    url: previewUrl,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    { name: 'phone-360', use: { viewport: { width: 360, height: 800 } } },
    { name: 'desktop', use: { viewport: { width: 1280, height: 900 } } },
  ],
})
