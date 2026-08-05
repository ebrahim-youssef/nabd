import tsParser from '@typescript-eslint/parser'
import { defineConfig } from 'eslint/config'

const PURE_LOGIC_RESTRICTED_IMPORTS = [
  'react',
  'react-dom',
  'react/*',
  'react-dom/*',
  'dexie',
  'dexie-react-hooks',
  '@supabase/*',
  '@supabase/**',
  'next',
  'next/*',
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
    files: ['src/logic/**/*.ts'],
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
    },
  },
])
