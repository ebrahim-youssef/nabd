# CONVENTIONS.md — nabd

Code conventions. Every file should look like the same person wrote it.

## Exports & style

- **Named exports everywhere.** Default exports only where the framework requires them
  (Next.js `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, `route.ts` handlers,
  `middleware.ts`).
- **Functions only — no classes.** Behavior is composed from functions and modules. If a
  pattern seems to want a class, it wants a factory function or a module instead.
- **Comments explain the non-obvious.** Write a comment when logic is complex or has many
  steps, when a constraint isn't visible from the code, or when something serves a
  non-obvious use case. Don't narrate what the next line plainly does. Write comments in a
  natural human voice, not as machine annotations.

## Naming

| Kind | Convention | Example |
| --- | --- | --- |
| Logic / helper files | `camelCase.ts`, verb+noun for actions | `checkOffWird.ts`, `computeAreaStats.ts` |
| Components | `PascalCase.tsx` | `WirdChecklist.tsx` |
| Static content / data files | `snake_case.ts` | `adhkar_morning.ts` |
| Repository interfaces / types | `{Thing}Repository` | `WirdRepository` |
| Hooks | `use{Thing}.ts` in a feature `hooks/` | `useDhikrCounter.ts` |

## Logging & errors

- **Central `Logger` only.** `console.*` is banned in committed code (lint-enforced). Import
  the Logger from `/lib/logger`.
- **Typed result objects.** Repository and use-case-style functions catch their own errors,
  log full detail via the Logger, and return `{ ok: true, value } | { ok: false, error }`.
  The UI never sees a raw exception.
- **Logs are richer than user messages.** The detail sent to the Logger (and Sentry) must be
  more specific than what the user sees — the user gets a short, friendly message; the log
  carries the cause, ids, and context needed to debug.

```ts
export async function checkOffItem(id: string, at: number): Promise<Result<WirdEntry>> {
  try {
    const entry = await db.entries.add({ id, checkedAt: at })
    return { ok: true, value: entry }
  } catch (cause) {
    logger.error('wird.checkOffItem failed', { id, at, cause })  // full detail
    return { ok: false, error: 'checkoff_failed' }               // UI maps to a friendly line
  }
}
```

## Constants

No magic numbers or strings. Extract them to named constants (a feature `constants.ts` or a
shared module). A named constant beats a literal even when used once — the name is the
documentation.

## Reuse before create

Before writing anything new, search first:

1. **Functions/components** — is there already a function or component that does this? Use it.
2. **UI values** — check `DESIGN_SYSTEM.md` / the design tokens before hardcoding any color,
   size, or shadow. New token beats new magic value.
3. **Data shape** — check the schema and `/types` before naming anything DB-adjacent.

Only create once the search comes up empty.

## Shared domain ownership during migration

- Put platform-neutral domain types, Arabic product content, pure calculations, repository
  contracts, and cross-platform tokens in `packages/shared` first.
- Root `lib/pure`, `content`, and feature `logic.ts` compatibility files may re-export
  `@nabd/shared`; do not copy the implementation back into a client.
- Repository contracts live in shared, but Dexie, SQLite, Supabase, browser, Expo, and device I/O
  implementations stay in their client.
- Shared logic receives dates, times, ids, and data as parameters. `Date.now()`, `Math.random()`,
  platform globals, and framework/I/O imports are lint errors.

## Commits & versioning

**Conventional Commits**, scope = the feature or module most affected, enforced by commitlint.

```
feat(wird): auto-mark linked item when dhikr counter completes
fix(stats): keep history stable when the wird version changes mid-week
chore(ci): add colocated-test-check workflow
```

**Version bump** in the same commit as the change:

| Change type | Bump |
| --- | --- |
| `feat` | MINOR |
| `fix`, `perf`, `refactor` | PATCH |
| `docs`, `test`, `chore` | none |

Pre-1.0: MAJOR stays `0`; a breaking change bumps MINOR.

**Git hard rules:**

- Never `git add -A` — stage specific files.
- Never commit `.env*`, build artifacts, or generated files.
- Never `--no-verify` — if a hook fails, fix the cause.
- Delete the branch after merge.
- Branch name: `<user>/<issue-number>-<slug>` (e.g. `ibrahim/42-checkoff-row`); the issue
  number is the GitHub issue.

## Testing patterns

Tests are colocated in `features/<name>/__tests__/` and ship in the **same PR** as the code
(CI-enforced — a PR touching a feature's `logic.ts`/`db.ts` without a test in the diff cannot
merge).

| Layer | Runner | Style |
| --- | --- | --- |
| `logic.ts` (pure) | Vitest (node) | synchronous, table-driven, zero mocks; property-based for combinatorial logic |
| `db.ts` (repositories) | Vitest + fake-indexeddb | one test per method; empty/duplicate/concurrent edge cases |
| components | Vitest (jsdom) + Testing Library | interaction correctness, not visual |
| flows | Playwright (Chromium) | full user flow; offline path when applicable |

**Mandatory e2e paths** (must always have an e2e test when touched):

1. Offline persistence: check off wird → go offline → reload → still checked, zero network
   requests.
2. Sync to stats: reconnect → syncs to Supabase → appears in statistics.
3. Counter to wird: dhikr counter completion → linked wird item auto-marked.

No numeric coverage gate — the colocated rule plus review is the bar.
