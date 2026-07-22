# AGENTS.md — nabd

Instructions for any AI coding agent working in this repo. Read this first, every session.

## What this is

Daily wird (ورد) companion for Muslims — helps you commit to a daily devotional routine,
track it, hold yourself accountable (محاسبة), and reflect on your worship over time.

Users: Muslims who want to keep a consistent daily wird. Core job: make the user stick to a
daily wird and give them self-accountability and reflection over everything they committed
to and did.

Platform: PWA (installable, offline-first). Data: hybrid — local IndexedDB (Dexie) is the
source of truth offline, synced to Supabase. Locales: Arabic (default ar, RTL — Arabic-only,
no i18n layer).

## The one workflow

Every piece of work — feature, fix, refactor — follows the 8-phase loop in
[`docs/workflow.md`](./docs/workflow.md), from spec intake to verified production deploy.
**Read it at the start of every session.** No shortcuts, no reordering.

**How to execute it (default, no need to ask):** plan non-trivial work first and research it
before writing code; use Explore/subagents for the research sweep so the main context stays lean;
delegate token-heavy coding to opencode/agy from a precise brief — the orchestrator reviews the
diff, runs the gates, and commits (the delegate never commits). This is the standing default;
the user should not have to restate it per task.

## Where decisions live (do not re-litigate locked ones)

| Question                         | Source of truth                   |
| -------------------------------- | --------------------------------- |
| What the app does and why        | `docs/product/spec.md`            |
| Stack details & code patterns    | `docs/stack.md`                   |
| Architecture & module boundaries | `docs/architecture.md` + ADR-0002 |
| Code conventions                 | `CONVENTIONS.md`                  |
| Visual tokens & UX rules         | `DESIGN_SYSTEM.md`                |
| All locked decisions & rationale | `docs/adr/`                       |
| Tickets & backlog                | `docs/backlog.md`                 |
| How to run locally               | `docs/run-locally.md`             |

If a design question is not answered in any of the above, it has not been decided:
that is a conversation with the user (and likely a new ADR) — never an assumption to
code around.

## Non-negotiables (summary — details in the docs above)

- **Follow the loop.** Every change runs through the 8 phases in `docs/workflow.md`. No
  reordering, no skipping spec intake.
- **Feature folders, pure logic.** Each feature keeps pure functions in `logic.ts` (no I/O,
  no `Date.now()` — data and time are passed in as parameters) and all Dexie/Supabase access
  in `db.ts`. Lint blocks `logic.ts` from importing `db.ts` or any I/O.
- **Dexie is the offline source of truth.** It is the only IndexedDB access; state syncs to
  Supabase. UI reads via `useLiveQuery`, never a duplicated copy in a store.
- **Tests ship with the code.** Colocated, same PR, CI-enforced. Mandatory e2e paths:
  offline persistence, sync→stats, dhikr counter→wird auto-mark.
- **RTL-first.** CSS logical properties only (`ps-`, `pe-`, `me-`, `text-start`,
  `rounded-s-`); physical directional classes (`pl-`, `left-`) are banned.
- **Central Logger, no `console.*`** in committed code. Logs carry full detail; users see a
  friendly message.
- **No magic values, no hardcoded visual values.** Named constants for numbers/strings;
  design tokens for every color/size/shadow.
- **Green before push.** `pnpm lint && pnpm typecheck && pnpm test && pnpm build` all exit 0
  locally before any push. Never `git add -A`, never `--no-verify`.
