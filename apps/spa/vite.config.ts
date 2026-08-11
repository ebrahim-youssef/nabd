import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

import { injectPrePaintScript } from './pre-paint'
import { injectSiteMetadata } from './site-metadata'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'nabd-pre-paint',
      transformIndexHtml: {
        order: 'pre',
        handler: injectPrePaintScript,
      },
    },
    {
      name: 'nabd-site-metadata',
      transformIndexHtml: injectSiteMetadata,
    },
  ],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    // Colocated unit/component tests only. `e2e/` is Playwright's, and Vitest picking it up
    // fails with "Playwright Test did not expect test() to be called here".
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
})
