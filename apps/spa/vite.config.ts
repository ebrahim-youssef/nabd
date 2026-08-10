import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

import { injectSiteMetadata } from './site-metadata'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'nabd-site-metadata',
      transformIndexHtml: injectSiteMetadata,
    },
  ],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
})
