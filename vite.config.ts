import { defineConfig } from 'vite-plus'

export default defineConfig({
  staged: {
    'apps/native/**/*.{ts,tsx}': ['pnpm --dir apps/native exec eslint --fix', 'prettier --write'],
    'packages/shared/**/*.{ts,tsx}': [
      'pnpm --dir packages/shared exec eslint --fix',
      'prettier --write',
    ],
    'vite.config.ts': ['prettier --write'],
    '*.{js,mjs,cjs,json,css,md}': ['prettier --write'],
  },
})
