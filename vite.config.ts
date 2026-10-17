import { defineConfig } from 'vite-plus'

export default defineConfig({
  staged: {
    '*.{ts,tsx}': ['eslint --fix', 'prettier --write'],
    '*.{js,mjs,cjs,json,css,md}': ['prettier --write'],
  },
})
