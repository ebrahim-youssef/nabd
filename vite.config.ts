import { defineConfig } from 'vite-plus'

const PURE_LOGIC_RESTRICTED_IMPORTS = [
  'react',
  'react-dom',
  'react/*',
  'react-dom/*',
  'react-native',
  'react-native/*',
  'expo',
  'expo/*',
  'expo-*',
  '@expo/*',
  'node:*',
  'fs',
  'fs/*',
  'path',
  'path/*',
  'http',
  'https',
  'net',
  'tls',
  'child_process',
  'worker_threads',
  'axios',
  'dom',
  'dom/*',
  'jsdom',
  'happy-dom',
  '@testing-library/dom',
  '@testing-library/*',
  '**/db/*',
  '**/db/database',
  '**/db/sqlite*',
  '!**/db/schemaVersion',
  '**/device/*',
  '!**/device/logic',
  '!**/device/types',
  '!**/device/copy',
  '**/observability/*',
]

const PURE_LOGIC_MESSAGE =
  'Pure native logic receives data and time as parameters and cannot import platform or I/O APIs.'

const DOM_GLOBALS = [
  'window',
  'document',
  'navigator',
  'location',
  'history',
  'localStorage',
  'sessionStorage',
  'indexedDB',
  'DOMParser',
  'MutationObserver',
  'HTMLElement',
  'Node',
  'Event',
  'CustomEvent',
  'XMLHttpRequest',
  'WebSocket',
  'fetch',
  'process',
  'Buffer',
  'require',
  'module',
  '__dirname',
  '__filename',
]

export default defineConfig({
  fmt: {
    semi: false,
    singleQuote: true,
    trailingComma: 'all',
    printWidth: 100,
    tabWidth: 2,
    // Preserve the established ignore list, including legacy docs formatting.
    ignorePatterns: [
      // Local agent settings are untracked and ignored only by the global gitignore, which fmt does not read.
      '.claude/**',
      'node_modules/',
      'pnpm-lock.yaml',
      'coverage/',
      '/android/',
      '/ios/',
      '.expo/',
      'dist/',
      'CONVENTIONS.md',
      'README.md',
      'README.en.md',
      'docs/architecture.md',
      'docs/backlog.md',
      'docs/run-locally.md',
    ],
  },
  lint: {
    ignorePatterns: ['android/**', 'coverage/**', 'dist/**'],
    plugins: ['react'],
    jsPlugins: ['./lint/pure-logic.mjs'],
    overrides: [
      {
        files: ['app/**/*.{ts,tsx}', 'src/**/*.{ts,tsx}'],
        rules: {
          'no-unused-vars': 'off',
          'no-console': 'error',
          'react/rules-of-hooks': 'error',
          'react/exhaustive-deps': 'error',
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
        files: ['src/**/logic.ts', 'src/lib/**/*.ts'],
        rules: {
          'no-restricted-imports': [
            'error',
            { patterns: [{ group: PURE_LOGIC_RESTRICTED_IMPORTS, message: PURE_LOGIC_MESSAGE }] },
          ],
          'no-restricted-globals': [
            'error',
            { globals: DOM_GLOBALS.map((name) => ({ name, message: PURE_LOGIC_MESSAGE })) },
          ],
          'nabd/no-ambient-time': 'error',
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
        rules: { 'no-console': 'off' },
      },
    ],
  },
  staged: {
    '**/*.{ts,tsx}': [
      'pnpm exec vp lint --fix',
      'pnpm exec vp fmt --write --no-error-on-unmatched-pattern',
    ],
    '**/*.{js,mjs,cjs,json,css,md}': ['pnpm exec vp fmt --write --no-error-on-unmatched-pattern'],
  },
})
