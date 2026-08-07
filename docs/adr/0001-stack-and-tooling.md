# ADR-0001 — Stack & tooling

- **Status:** accepted; superseded by ADR-0014 for the go-forward client architecture
- **Date:** 2026-07-13

## Context

nabd is a public, offline-first PWA for tracking a daily wird, with data synced across a
user's devices. We needed one coherent toolchain the building AI can rely on before any
feature work starts.

## Decision

Next.js (App Router) + TypeScript **strict** (no `any`, no `as` except narrowing from
`unknown`), **pnpm**, Tailwind + **shadcn/ui**, **Dexie** as the local-first store, **Supabase**
(Postgres + Supabase Auth via OAuth) for sync and identity, **Next.js route handlers** for the
sync API, **Zustand** for UI state, **Serwist** for the PWA service worker, **Vitest +
Playwright** for tests, **Vercel** for deploys, and the standard hygiene set (ESLint, Prettier,
Husky, lint-staged, commitlint / Conventional Commits). Observability: **Sentry** + **Vercel
Analytics** (nabd is a public product).

Rejected: Better Auth + self-managed Postgres (more setup than Supabase, which bundles auth
with the DB we already need); raw IndexedDB (Dexie is the only IndexedDB access); Jest (Vitest
is the Vite-native default); Netlify/Cloudflare/self-host (Vercel is zero-config for Next.js).

## Consequences

- The building AI uses `docs/stack.md` §1 as the exact bootstrap sequence; `pnpm lint &&
pnpm typecheck && pnpm test && pnpm build` is the green bar.
- Supabase owns identity; a logged-in user's wird syncs across devices. Auth choice is settled
  (no separate auth library).
- Serwist means service-worker updates are deliberate (opt-in), never silent mid-session.
- Sentry/Vercel Analytics add env vars (`.env.example`) and a setup ticket (NBD-11).
- Revisit if the sync model outgrows what route handlers + Supabase comfortably serve.
