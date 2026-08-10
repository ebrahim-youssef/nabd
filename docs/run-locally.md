# Run locally — nabd

Prerequisites: **Node.js** (LTS) and **pnpm**. This repo is pre-bootstrap — until ticket
NBD-1 runs, the app scaffold does not exist yet; see `docs/stack.md` §1 for the bootstrap
sequence.

## Environment

Copy the example env file and fill in real values (from the Supabase and Sentry dashboards):

```bash
cp .env.example .env.local
```

`.env.local` is gitignored. `.env.example` documents every variable. Supabase URL + anon key
are required for auth and sync; Sentry vars are required for error tracking; Vercel Analytics
needs no local var.

## Install & run

```bash
pnpm install          # install dependencies
pnpm dev              # start the dev server (http://localhost:3000)
```

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

First-time Playwright setup (once): `pnpm dlx playwright install chromium`.

See `docs/workflow.md` for the full idea → production loop.
