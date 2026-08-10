# Run locally — nabd

Prerequisites: **Node.js** (LTS) and **pnpm**. The root application is the current legacy client;
the migration workspaces are `packages/shared`, `apps/spa`, and `apps/native`.

## Environment

Copy the example env file and fill in real values (from the Supabase and Sentry dashboards):

```bash
cp .env.example .env.local
```

`.env.local` is gitignored. `.env.example` documents variables for the root application.
`apps/native/.env.example` documents the native Sentry variable. The replacement clients do not
use Supabase during this migration.

## Install & run

```bash
pnpm install          # install dependencies
pnpm dev              # current Next.js client (http://localhost:3000)
pnpm --filter apps-spa dev       # replacement SPA
pnpm --filter apps-native start  # replacement Android client and Metro
```

The native command requires an Android development environment and a connected emulator or
device. CI builds the standalone release APK.

## Quality gates (must all exit 0 before any push)

```bash
pnpm lint             # ESLint, incl. import-boundary rules
pnpm typecheck        # tsc --noEmit (strict)
pnpm test             # Vitest — unit + component
pnpm build            # production build
pnpm test:e2e         # Playwright end-to-end (real browser)
```

Combined local gate:

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

Migration-workspace gates:

```bash
pnpm --filter @nabd/shared lint
pnpm --filter @nabd/shared typecheck
pnpm --filter @nabd/shared test
pnpm --filter apps-spa lint
pnpm --filter apps-spa typecheck
pnpm --filter apps-spa test
pnpm --filter apps-spa build
pnpm --filter apps-native lint
pnpm --filter apps-native typecheck
pnpm --filter apps-native test
pnpm --filter apps-native build
```

The native onboarding slice is covered by a real SQLite file close/reopen integration test plus
rendered remount tests. Its final physical Android cold-restart check is intentionally held for the
end-of-migration owner gate; Expo Go is not a target for this project.

First-time Playwright setup (once): `pnpm dlx playwright install chromium`.

See `docs/workflow.md` for the full idea → production loop.
