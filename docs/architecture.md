# Architecture — nabd

> Migration scope: the feature folders and Next.js route map below describe the legacy root
> application. Their pure-logic and I/O boundaries remain parity requirements, while the
> replacement folder and repository boundaries are governed by ADR-0014 and
> `docs/migration/2026-08-10-execution-plan.md`.

## Replacement shared-domain boundary

`packages/shared` is the canonical owner of platform-neutral product code used by the root,
SPA, and native clients:

- `src/types`: domain and view-result shapes.
- `src/content` and `src/copy`: Arabic product content and reusable copy.
- `src/logic`: pure calculations and state transitions.
- `src/contracts`: repository interfaces only, never storage implementations.
- `src/tokens`: cross-platform design-token values.

The root app's former pure/content modules are transitional compatibility re-exports from
`@nabd/shared`; they must not acquire a second implementation. Dexie stays in root feature
`db.ts` files, SQLite stays under `apps/native`, and SPA storage stays under `apps/spa`. Shared
modules receive data, dates, time, and generated values as parameters and cannot import a
framework, storage library, device API, network client, Node API, or browser global.

Native opens the named SQLite database at the root `SQLiteProvider`, which applies ordered schema
migrations before routes render. Native feature repositories keep parameterized SQLite access under
`apps/native/src/<feature>/db.ts`; the onboarding slice links its singleton completion state to the
immutable initial wird version in one exclusive transaction. Versions have no mutable `active` flag:
the version in force is always derived from `effectiveFrom` and `createdAt` per ADR-0006.

## The one rule

**Pure logic never touches I/O.** Every feature's calculations live in a pure `logic.ts`
(data and time passed in as parameters — no DB, no `Date.now()`, no browser APIs, no React);
every data access lives in a `db.ts` repository module. The lint boundary blocks `logic.ts`
from importing `db.ts` or any I/O. This is what keeps the malleable-wird statistics testable
and correct across redefinitions.

## Layers & folder map

nabd is organized by **feature**, not by technical layer (ADR-0002). Each feature is a
self-contained folder; shared plumbing lives in a small set of top-level folders.

```
/app                  Next.js App Router routes only — UI shells, no data access
  /(marketing)        public landing page (SEO), server-rendered
  /(app)              authenticated app shell (mostly client)
/components
  /ui                 shadcn/ui generated components (never hand-edit)
  /shared             cross-feature components
/features
  /<feature>          one folder per feature (wird, stats, counter, onboarding, …)
    logic.ts          PURE functions: data + time in, values out; no I/O, no Date.now()
    db.ts             repository: all Dexie/Supabase access for this feature; typed results
    hooks/            React hooks gluing logic + db + stores to the UI
    components/       feature-specific components
    types.ts          feature-local types
    __tests__/        colocated tests
/lib
  /db                 Dexie schema (db.ts) + Supabase client
  logger.ts           central Logger (console.* is banned everywhere else)
  utils.ts            cn() and small helpers
  /pure               deterministic shared helpers (importable by logic.ts)
  /impure             side-effecting helpers (clock provider, browser APIs)
/content              authored static data (adhkar, intentions, wird templates); zero imports
/stores               Zustand stores — UI state only
/types                shared cross-feature types
/e2e                  Playwright specs
```

## Import-boundary table (lint-enforced)

Enforced with ESLint (`eslint-plugin-boundaries` or `no-restricted-imports`). A deliberate
bad import is committed once during Phase 0 to confirm the rule actually fires.

| Module | May import | Hard no |
| --- | --- | --- |
| `features/*/logic.ts` | `/lib/pure`, `/types`, own feature `types.ts` | `db.ts`, Dexie, Supabase, any I/O, `Date.now()`, React |
| `features/*/db.ts` | `/lib/db`, `/content`, `/lib/logger`, `/types` | React, another feature's internals |
| `features/*/hooks` | own `logic.ts` + `db.ts`, `/stores`, `/types` | `/app`, another feature's `db.ts` |
| `features/*/components` | own hooks, `/components/ui`, `/components/shared` | any `db.ts` directly, Supabase directly |
| `/stores` | `/types` | `db.ts`, feature `logic.ts`, any I/O (UI state only) |
| `/content` | nothing | everything |
| `/app` | features (components/hooks), `/components` | any `db.ts` directly, Supabase directly |

The single most important edge: **`logic.ts` → `db.ts` is forbidden.** Data flows the other
way — hooks call `db.ts` to fetch, hand the data to `logic.ts`, then call `db.ts` to persist.

## Rendering strategy

**Mostly Client.** IndexedDB (Dexie) is browser-only, so every data-bound view is a Client
Component reading through `useLiveQuery`. Server Components are limited to static shells and
the public marketing/landing page (which needs SEO and no user data). `'use client'` is added
only for state, events, effects, or browser APIs — never reflexively.

## Canonical patterns

**Repository, not dependency injection.** nabd deliberately avoids a DI container (ADR-0002).
Instead of injecting dependencies, it isolates them: pure logic in `logic.ts`, all I/O in
`db.ts`, direct imports between them via hooks. Repositories return typed results
(`{ ok: true, value } | { ok: false, error }`) — the UI never sees a raw exception.

```ts
// features/counter/db.ts — repository module (all I/O for the counter feature)
export async function completeDhikr(id: string, at: number): Promise<Result<void>> {
  try {
    await db.transaction('rw', db.entries, async () => { /* mark counter + linked wird item */ })
    return { ok: true, value: undefined }
  } catch (e) {
    logger.error('counter.completeDhikr failed', e)
    return { ok: false, error: 'complete_failed' }
  }
}
```

```ts
// features/counter/hooks/useDhikrCounter.ts — glues store (UI) + db (I/O) + logic (pure)
// reads live state from Dexie, keeps only the active tap-session count in the Zustand store
```

**State.** Zustand stores hold UI state only (active counter session, dialogs, filters).
Persistent data is always read from Dexie via `useLiveQuery`; it is never mirrored into a
store (that duplication is a classic source of stale-state bugs).

**Versioned wird (the malleable-wird constraint).** A user's wird definition is stored as
versioned records; entries reference the version in force on their day. Statistics are
computed by `stats/logic.ts` against the correct version per day, so changing the wird
(adding sunan, growing the Quran portion) never rewrites history. The versioning model is
locked in ADR-0006 before any stats code is written.
