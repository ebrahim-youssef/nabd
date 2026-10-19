# AGENTS.md — nabd

Instructions for any AI coding agent working in this repo. Read this first, every session.

## Product direction

[`docs/adr/0017-native-only.md`](./docs/adr/0017-native-only.md) makes the Expo app in
`apps/native` the sole product and release target. Android is first, with platform-neutral
boundaries for a future iOS target. The legacy SPA and root application were deleted in NBD-108.
All product code, domain logic, Arabic content, copy, contracts, and tests now live in the
feature folders under `apps/native`. The end state is the repository root as the Expo app:
`apps/native` will be lifted to the root in NBD-112 and the pnpm workspace will go. The order is in
[`docs/migration/2026-10-17-consolidation-plan.md`](./docs/migration/2026-10-17-consolidation-plan.md).
There is no backend or sign-in in the native product.

Still binding everywhere, root and workspaces alike: the 8-phase loop, pure-logic separation,
RTL-first with logical properties only, central Logger, no magic values, tests shipping with the
code, green gates before push, and security review before merge.

## What this is

Daily wird (ورد) companion for Muslims — helps you commit to a daily devotional routine,
track it, hold yourself accountable (محاسبة), and reflect on your worship over time.

Users: Muslims who want to keep a consistent daily wird. Core job: make the user stick to a
daily wird and give them self-accountability and reflection over everything they committed
to and did.

Platform: Expo React Native, Android first, with platform-neutral boundaries for iOS. Data: local
SQLite through feature repositories, with no backend or sign-in. Locales: Arabic (default ar, RTL,
Arabic-only, no i18n layer).

## The one workflow

Every piece of work — feature, fix, refactor — follows the 8-phase loop in
[`docs/workflow.md`](./docs/workflow.md), from spec intake to verified production deploy.
**Read it at the start of every session.** No shortcuts, no reordering.

**How to execute it (default, no need to ask):** plan non-trivial work first and research it
before writing code; delegate token-heavy coding to a runner from a precise brief; the orchestrator
reviews the diff, runs the gates, and commits (the runner never commits). This is the standing default;
the user should not have to restate it per task.

## Where decisions live (do not re-litigate locked ones)

| Question                         | Source of truth                              |
| -------------------------------- | -------------------------------------------- |
| What the app does and why        | `docs/product/spec.md`                       |
| Stack details & code patterns    | `docs/stack.md`                              |
| Architecture & module boundaries | `docs/architecture.md` + ADR-0002 + ADR-0017 |
| Code conventions                 | `CONVENTIONS.md`                             |
| Visual tokens & UX rules         | `DESIGN_SYSTEM.md`                           |
| All locked decisions & rationale | `docs/adr/`                                  |
| Tickets & backlog                | `docs/backlog.md`                            |
| How to run locally               | `docs/run-locally.md`                        |

If a design question is not answered in any of the above, it has not been decided:
that is a conversation with the user (and likely a new ADR) — never an assumption to
code around.

## Non-negotiables (summary — details in the docs above)

- **Follow the loop.** Every change runs through the 8 phases in `docs/workflow.md`. No
  reordering, no skipping spec intake.
- **Pure logic and feature folders.** Pure logic goes in `apps/native/src/<feature>/logic.ts`
  and cross-feature helpers go in `apps/native/src/lib`. Logic has no I/O or clock globals; time
  and data are passed in. Native feature folders are flat, with `db.ts`, components, and hooks
  side by side where present, and tests under `__tests__/`. The native ESLint config enforces
  React Hooks rules, `no-console`, pure-logic restrictions, and restricted direct imports of
  React Native `Text` and `TextInput`.
- **SQLite is the offline source of truth.** Feature repositories in `db.ts` own SQLite access.
  UI reads live from the repository, never from a duplicated copy in a store.
- **Tests ship with the code.** Colocated, same PR, CI-enforced. Mandatory native paths:
  restart persistence, the device state matrix, and backup/restore.
- **RTL-first.** CSS logical properties only (`ps-`, `pe-`, `me-`, `text-start`,
  `rounded-s-`); physical directional classes (`pl-`, `left-`) are banned.
- **Central Logger, no `console.*`** in committed code. Logs carry full detail; users see a
  friendly message.
- **No magic values, no hardcoded visual values.** Named constants for numbers/strings;
  design tokens for every color/size/shadow.
- **Green before push.** Run the shared and native gates listed in `docs/workflow.md`, and require
  every command to exit 0 locally before any push. Never `git add -A`, never `--no-verify`.
- **Plan device features fully; security-review before merge.** Any feature touching a device/OS
  capability (location, notifications, alarms, camera, filesystem, background work) is specced
  against the full state matrix first — see "Native / device-feature planning" in `docs/workflow.md`.
  Before merging any PR, scan the diff for security issues (XSS, injection, secrets, authz) —
  `docs/workflow.md` Phase 7.
- **One ticket, one branch, one PR.** A branch tracks a ticket, not a slice. A ticket that splits
  into slices keeps each slice as its own Conventional-Commits commit on that branch, and the whole
  ticket merges in a single PR using a normal merge commit through `gh pr merge --merge`, never
  rebase or squash. See the 2026-08-28 amendment in `docs/adr/0003-branching-and-environments.md`.
