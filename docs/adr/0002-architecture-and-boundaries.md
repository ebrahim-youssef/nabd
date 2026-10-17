# ADR-0002 — Architecture & module boundaries

- **Status:** accepted
- **Status note:** Its client storage and UI boundary details are superseded by
  [ADR-0017](./0017-native-only.md); the pure-logic and repository boundary remains.
- **Date:** 2026-07-13

## Context

nabd is mostly a client-side app with a genuinely tricky core: the wird definition changes
over time, and statistics must stay correct across those changes. We needed a structure that
keeps that logic testable without dragging in a heavy architecture. Full hexagonal /
ports-and-adapters with dependency injection was considered and judged too much ceremony for
this project.

## Decision

Use **feature folders** with a **pure-logic + repository** split, and **no DI container**.
Each feature (`features/<name>/`) holds:

- `logic.ts` — **pure functions**: data and time are passed in as parameters; no I/O, no
  `Date.now()`, no DB, no browser APIs, no React.
- `db.ts` — the **repository**: all Dexie/Supabase access for the feature; returns typed
  result objects.
- `hooks/`, `components/`, `types.ts`, `__tests__/`.

Dependencies are **isolated, not injected**: hooks call `db.ts` for I/O and hand data to
`logic.ts`. The one hard boundary, lint-enforced: **`logic.ts` must not import `db.ts` or any
I/O.** UI state lives in **Zustand** stores (UI concerns only); persistent data is always read
from Dexie via `useLiveQuery`, never mirrored into a store.

Rejected: hexagonal + DI (too much ceremony); simple `components/`+`lib/` layering (too weak
a boundary for the stats/versioning logic); Redux Toolkit (more boilerplate; tempts
duplicating DB data into the store).

## Consequences

- The malleable-wird statistics are pure and directly testable with zero mocks (table-driven
  - property-based).
- An ESLint boundary rule enforces the import table in `docs/architecture.md`; Phase 0 commits
  a deliberate bad import to prove the rule fires.
- Rendering is Mostly Client (Dexie is browser-only); server components are limited to static
  shells and the public landing page.
- No global data store to keep in sync — Dexie + `useLiveQuery` is the single source of truth.
- Revisit if features start needing to reach deep into each other (would signal a missing
  shared module or a real need for stronger boundaries).
