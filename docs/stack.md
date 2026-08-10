# Stack — nabd

> Migration scope: the stack below describes the legacy root application. The replacement
> architecture is Vite + React Router + Dexie for `apps/spa`, Expo + SQLite for `apps/native`, and
> platform-neutral code in `packages/shared`. See ADR-0014 and
> `docs/migration/2026-08-10-execution-plan.md` before applying this file to new work.

Next.js (App Router) + TypeScript strict + Tailwind v4 + shadcn/ui + Vitest + Playwright +
pnpm + Vercel. Data: Dexie (local-first, offline source of truth) synced to Supabase
(Postgres + Auth). UI state: Zustand. PWA: Serwist. No i18n layer (Arabic-only).

This is the local copy of stack knowledge for the building AI. Architecture and module
boundaries live in `docs/architecture.md`; this file is the toolchain and code-pattern
reference.

---

## 1. Bootstrap sequence (target repo, in order)

```bash
pnpm create next-app@latest .   # App Router: yes · TypeScript: yes · src/ dir: no · ESLint: yes
                                # Tailwind prompt: follow current installer; verify v4 config after
pnpm add -D prettier husky lint-staged @commitlint/cli @commitlint/config-conventional
pnpm dlx husky init             # pre-commit → lint-staged · commit-msg → commitlint
pnpm dlx shadcn@latest init     # then add components as needed, never hand-edit /components/ui
pnpm add -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/user-event
pnpm add -D @playwright/test && pnpm dlx playwright install chromium
pnpm add dexie dexie-react-hooks && pnpm add -D fake-indexeddb   # local-first data
pnpm add @supabase/supabase-js @supabase/ssr                     # sync + auth
pnpm add zustand                                                # UI state
pnpm add @serwist/next serwist                                  # PWA
pnpm add @sentry/nextjs && pnpm add @vercel/analytics           # observability (public product)
```

After bootstrap, all of these must exit 0 before any feature work:
`pnpm lint && pnpm typecheck && pnpm test && pnpm build`

package.json scripts to define:
`lint`, `typecheck` (`tsc --noEmit`), `test` (vitest run), `test:e2e` (playwright test),
`build`.

## 2. Folder structure (feature folders)

nabd uses **feature folders** (see ADR-0002), not a hexagonal layer tree. Each feature owns
its pure logic, its data access, its hooks, and its components. The full folder map and the
lint-enforced import-boundary table live in `docs/architecture.md` — do not duplicate the
rules; read them there. In short:

```
/app             — Next.js routes only (App Router); UI shells + route groups
/components/ui    — shadcn/ui generated (never hand-edit)
/components/shared— cross-feature components
/features/<name>  — logic.ts (pure) · db.ts (repository) · hooks/ · components/ · types.ts · __tests__/
/lib/db           — Dexie schema + Supabase client
/lib              — logger.ts, utils (cn), pure/impure helpers
/content          — authored static data (adhkar, intentions, wird templates); no imports
/stores           — Zustand stores (UI state only)
/types            — shared types
/e2e              — Playwright specs
```

## 3. Canonical code patterns

**Pure logic (feature `logic.ts`).** All wird and statistics calculations are pure functions
that take data and time as parameters — no I/O, no `Date.now()`, no DB, no React. This is
where the malleable-wird math lives; it is directly testable with zero mocks.

```ts
// features/stats/logic.ts
export function computeAreaStats(
  entries: WirdEntry[],
  versions: WirdVersion[],
  today: DayId,
): AreaStats {
  // pure: derive stats from entries against the wird version in force on each day
}
```

**Repository module (feature `db.ts`).** All Dexie/Supabase access for a feature lives in one
file, imported directly (no DI container). Returns typed result objects, never raw
exceptions.

```ts
// features/wird/db.ts
export async function checkOffItem(id: string, at: number): Promise<Result<WirdEntry>> {
  try { /* Dexie write, queue sync */ }
  catch (e) { logger.error('wird.checkOff failed', e); return { ok: false, error: 'checkoff_failed' } }
}
```

**Read hooks** — `useLiveQuery` (dexie-react-hooks) returns `undefined` while in-flight;
render a skeleton, never coerce to null. Dexie is the source of truth — never mirror its data
into a Zustand store.

**Mutation hooks** — `isLoading` state + `inFlight` ref guard against double-fire:

```ts
const inFlight = useRef(false)
const execute = useCallback(async (...args) => {
  if (inFlight.current) return null
  inFlight.current = true; setIsLoading(true)
  try { /* call feature db.ts */ }
  finally { inFlight.current = false; setIsLoading(false) }
}, [])
```

**UI state (Zustand)** — stores hold *UI* state only: the active counter session, open
dialogs, filters. Data comes from Dexie via `useLiveQuery`. See ADR-0002.

**Client/server split** — `'use client'` only for state, events, effects, browser APIs.
nabd is Mostly Client (IndexedDB is browser-only); server components are limited to static
shells and the public landing page. `loading.tsx` + `error.tsx` on any route segment that
needs them.

**TypeScript** — strict; no `any`; no `as` except narrowing from `unknown`; named exports
except Next.js pages/layouts.

## 4. Styling & design tokens

Priority: shadcn/ui component → Tailwind utilities → CSS Modules (pseudo-element tricks
only) → never inline styles. `cn()` from `@/lib/utils` for conditional classes.

Tokens live as CSS variables in `app/globals.css` under `@theme inline`; fonts load via
`next/font` in the root layout and inject variables mapped to Tailwind utilities. nabd uses
multiple faces (Quran/adhkar text, headings, UI) — see `DESIGN_SYSTEM.md`. Design tokens and
fonts come from the project's Claude Design system (ADR-0007).

**RTL:** logical properties everywhere — `ps- pe- ms- me- start- end- text-start rounded-s-
rounded-e-`; ban `pl- pr- left- right-`; directional icons get `rtl:rotate-180`. Default
direction is RTL.

## 5. Local-first data (Dexie) + sync (Supabase)

- Dexie is the ONLY IndexedDB access — zero raw `indexedDB` calls anywhere. It is the offline
  source of truth.
- Each feature's `db.ts` owns its store access; `/lib/db` defines the Dexie schema and the
  Supabase client.
- **Sync**: local writes are queued and pushed to Supabase when online; remote changes pull
  back into Dexie. Auth (Supabase Auth, OAuth) ties a user's data together across devices.
  The sync strategy and conflict handling are an ADR before implementation (ADR-0006 covers
  the versioned wird model that sync depends on).
- Adapter tests: Vitest + `fake-indexeddb`, one test per repository method; edge cases: empty
  store, duplicate keys, concurrent writes.

## 6. PWA (Serwist)

- `app/sw.ts` service worker + `app/manifest.ts`, wired via `@serwist/next`.
- **Deliberate update strategy**: new SW waits; UI shows an "update available" notifier; user
  opts in. Never silent auto-update mid-session.
- Offline e2e is mandatory for any data-write feature: act → go offline → reload → data
  persisted, zero network requests.

## 7. Test matrix

| Layer | Runner | Style |
| --- | --- | --- |
| `logic.ts` (pure) | Vitest (node) | synchronous, table-driven, zero mocks; property-based for combinatorial logic (esp. stats across wird versions) |
| `db.ts` (repositories) | Vitest + fake-indexeddb | one test per method; empty/duplicate/concurrent edge cases |
| components | Vitest (jsdom) + Testing Library | interaction correctness, not visual |
| flows | Playwright (Chromium) | full user flow; offline path when applicable |

Colocated: `features/<name>/__tests__/x.test.ts`, shipped in the same PR (CI-enforced).

## 8. CI (GitHub Actions) + Vercel

Six workflow files, one check each, all required: `lint` · `typecheck` · `test` · `e2e` ·
`build` · `colocated-test-check`. Vercel: every branch push → preview URL; `dev` → staging;
`master` → production (auto-deploy on merge).

## 9. Observability

Public product → error tracking with Sentry and Vercel Analytics from the start. Env vars go
in `.env.example`; setup is a backlog ticket. Errors always log full detail via the Logger;
users see a friendly message.

## 10. Library docs rule

Before first use of any library in a session (Dexie, Supabase, Serwist, Zustand, Sentry, an
adhan/prayer-times lib, …), fetch its current docs (context7 MCP, official docs, or web
search). Versions move; training data is stale.
