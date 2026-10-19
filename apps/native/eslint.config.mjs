import tsParser from '@typescript-eslint/parser'
import reactHooks from 'eslint-plugin-react-hooks'
import { defineConfig } from 'eslint/config'

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
    files: ['src/**/logic.ts', 'src/lib/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [{ group: PURE_LOGIC_RESTRICTED_IMPORTS, message: PURE_LOGIC_MESSAGE }],
        },
      ],
      'no-restricted-globals': [
        'error',
        ...DOM_GLOBALS.map((name) => ({ name, message: PURE_LOGIC_MESSAGE })),
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.object.name='Date'][callee.property.name='now']",
          message: 'Pure native logic receives time as a parameter; Date.now() is forbidden.',
        },
        {
          selector: "CallExpression[callee.object.name='Math'][callee.property.name='random']",
          message:
            'Pure native logic receives generated values as parameters; Math.random() is forbidden.',
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
