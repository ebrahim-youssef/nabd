import { defineConfig } from 'vite-plus'

export default defineConfig({
  staged: {
    '**/*.{ts,tsx}': ['pnpm exec eslint --fix', 'prettier --write'],
    'vite.config.ts': ['prettier --write'],
    '*.{js,mjs,cjs,json,css,md}': ['prettier --write'],
  },
})
