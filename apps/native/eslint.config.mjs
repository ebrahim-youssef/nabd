import tsParser from '@typescript-eslint/parser'
import reactHooks from 'eslint-plugin-react-hooks'
import { defineConfig } from 'eslint/config'

export default defineConfig([
  { ignores: ['android/**', 'coverage/**', 'dist/**'] },
  {
    files: ['app/**/*.{ts,tsx}', 'src/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: { project: './tsconfig.json', tsconfigRootDir: import.meta.dirname },
    },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'no-console': 'error',
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'react-native',
              importNames: ['Text', 'TextInput'],
              message: 'Use the native app Text or TextInput wrapper for bundled typography.',
            },
          ],
        },
      ],
    },
  },
  {
    files: [
      'app/**/__tests__/**/*.{ts,tsx}',
      'src/**/__tests__/**/*.{ts,tsx}',
      'src/shell/Text.tsx',
      'src/shell/TextInput.tsx',
    ],
    rules: { 'no-restricted-imports': 'off' },
  },
  {
    files: ['src/observability/logger.ts'],
    rules: {
      'no-console': 'off',
    },
  },
])
