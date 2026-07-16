import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'

// Import-boundary patterns (gitignore-style globs matched against the import source).
// Enforces docs/architecture.md §"Import-boundary table". The key edge: a feature's
// pure logic.ts may never import its db.ts or any I/O.
const DB_MODULES = ['./db', './db.ts', '*/db', '**/db', '**/db.ts', '@/lib/db', '@/lib/db/*']
const DEXIE_MODULES = ['dexie', 'dexie-react-hooks']
const SUPABASE_MODULES = ['@supabase/*', '@supabase/**']
const REACT_MODULES = ['react', 'react-dom', 'react/*', 'react-dom/*']
const NEXT_MODULES = ['next', 'next/*']
const CROSS_FEATURE_INTERNALS = ['@/features/*/db', '@/features/*/logic', '@/features/*/hooks/*']

const MSG_LOGIC_NO_IO =
  'features/*/logic.ts must stay pure: no db.ts, Dexie, Supabase, React, or Next imports. ' +
  'Data and time are passed in as parameters; the hook fetches via db.ts and hands data to logic.'
const MSG_NO_REACT = 'This layer must not import React (no UI here).'
const MSG_NO_DIRECT_DB =
  'Do not import a repository (db.ts)/Dexie/Supabase directly here — go through a feature hook.'
const MSG_NO_CROSS_FEATURE = "Do not import another feature's internals (logic.ts/db.ts/hooks)."

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    // Raw design-system handoff (source material, not app code).
    'design-import/**',
    // Capacitor Android project (NBD-46): native sources + Gradle build artifacts.
    'android/**',
    // Generated Serwist service worker bundle (build artifact).
    'public/sw.js',
    'public/sw.js.map',
    // Playwright artifacts (report + traces).
    'playwright-report/**',
    'test-results/**',
  ]),

  // console.* is banned everywhere; lib/logger.ts is the single allowed place (exempted below).
  {
    rules: {
      'no-console': 'error',
    },
  },
  {
    // lib/logger.ts is the one app module allowed to touch console; scripts/ are Node CLI tools.
    files: ['lib/logger.ts', 'scripts/**/*.mjs'],
    rules: {
      'no-console': 'off',
    },
  },

  // Pure logic: no I/O, no framework.
  {
    files: ['features/*/logic.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                ...DB_MODULES,
                ...DEXIE_MODULES,
                ...SUPABASE_MODULES,
                ...REACT_MODULES,
                ...NEXT_MODULES,
              ],
              message: MSG_LOGIC_NO_IO,
            },
          ],
        },
      ],
    },
  },

  // Repository: I/O lives here, but no React and no other feature's internals.
  {
    files: ['features/*/db.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: REACT_MODULES, message: MSG_NO_REACT },
            { group: CROSS_FEATURE_INTERNALS, message: MSG_NO_CROSS_FEATURE },
          ],
        },
      ],
    },
  },

  // Zustand stores: UI state only — no persistence layer, no feature logic.
  {
    files: ['stores/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [...DB_MODULES, ...DEXIE_MODULES, ...SUPABASE_MODULES, '@/features/*/logic'],
              message: MSG_NO_DIRECT_DB,
            },
          ],
        },
      ],
    },
  },

  // Routes and feature components: never reach the data layer directly.
  {
    files: ['app/**/*.{ts,tsx}', 'features/*/components/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [...DB_MODULES, ...DEXIE_MODULES, ...SUPABASE_MODULES],
              message: MSG_NO_DIRECT_DB,
            },
          ],
        },
      ],
    },
  },

  // Server route handlers (`route.ts`) are the one exception under `app/`: they are server-only
  // auth/session infrastructure (e.g. the OAuth callback's code-for-session exchange) with no
  // React hook to route through. They may use the Supabase SSR wrapper in `@/lib/db/supabase/*`,
  // but still must not import raw `@supabase/*`, Dexie, or another feature's internals. This
  // override sits after the rule above so it wins for `route.ts` files.
  {
    files: ['app/**/route.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [...DEXIE_MODULES, ...SUPABASE_MODULES, ...CROSS_FEATURE_INTERNALS],
              message: MSG_NO_DIRECT_DB,
            },
          ],
        },
      ],
    },
  },
])

export default eslintConfig
