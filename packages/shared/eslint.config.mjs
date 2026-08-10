import tsParser from '@typescript-eslint/parser'
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
  '@capacitor/*',
  'dexie',
  'dexie-react-hooks',
  '@supabase/*',
  '@supabase/**',
  '@sentry/*',
  'next',
  'next/*',
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
]

const MSG_LOGIC_NO_PLATFORM =
  'src/logic/* must stay pure: no React, Dexie, Supabase, or DOM imports. Data and time are passed in as parameters.'

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
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: './tsconfig.json',
      },
    },
  },
  {
    files: ['src/{logic,types,content,copy,contracts,constants}/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: PURE_LOGIC_RESTRICTED_IMPORTS,
              message: MSG_LOGIC_NO_PLATFORM,
            },
          ],
        },
      ],
      'no-restricted-globals': [
        'error',
        ...DOM_GLOBALS.map((name) => ({ name, message: MSG_LOGIC_NO_PLATFORM })),
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.object.name='Date'][callee.property.name='now']",
          message: 'Shared domain modules receive time as a parameter; Date.now() is forbidden.',
        },
        {
          selector: "CallExpression[callee.object.name='Math'][callee.property.name='random']",
          message:
            'Shared domain modules receive generated values as parameters; Math.random() is forbidden.',
        },
      ],
    },
  },
])
