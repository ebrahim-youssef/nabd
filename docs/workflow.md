# The Dev Loop — idea → production (nabd)

The master workflow. The building AI follows it for EVERY feature — no shortcuts, no
reordering.

---

## Session startup (top of every session, before touching code)

1. Read `AGENTS.md` (entry point of the repo).
2. Ask which ticket/feature this session is for.
3. Read the ADR(s) relevant to the layers this ticket touches.
4. `git status` + `git log --oneline -10` — understand branch state.
5. State which phase the work is entering (fresh / continuing / finishing).

---

## Phase 0 — Bootstrap (one-time only)

Run the stack module's bootstrap sequence (`docs/stack.md` §1). Create the feature-folder
skeleton and the import-boundary lint rules (`docs/architecture.md`); verify the boundary
rule by committing one deliberate bad import (e.g. `logic.ts` importing `db.ts`) and watching
lint fail. Skeleton must be fully green (`pnpm lint && pnpm typecheck && pnpm test &&
pnpm build` all exit 0) before any feature work.

## Phase 1 — Spec intake & clarification

Trigger: user asks for a feature, in any form. Before coding, answer ALL of:

1. What exactly does it do? Acceptance criteria — one verifiable sentence each.
2. Which ticket? (NBD-XXX in `docs/backlog.md` → its GitHub issue number — existing, or flag
   that one must be created)
3. Which features/modules will be touched?
4. Does anything conflict with a locked ADR? (If yes → conversation, not code.)
5. Any open design question? → write a new ADR first. Never code around an undecided
   question. (For nabd, the wird versioning model — ADR-0006 — must be settled before stats
   or checklist persistence.)

Output: a short feature brief (what / ticket / criteria / features). STOP and get user
confirmation of the brief before Phase 2.

## Phase 2 — Branch & task planning

1. Branch `<user>/<issue-number>-<slug>` (e.g. `ibrahim/42-checkoff-row`) cut from `dev`.
2. Task list in dependency order — inner pieces first:
   **content/types → `logic.ts` (pure) → `db.ts` (repository) → hooks → components → route.**
3. For each piece touched, add its test task from the test matrix (`docs/stack.md` §7).
4. All user-facing copy is Arabic (no i18n layer) — keep it out of scattered JSX literals;
   put reused strings in the feature's constants.

### Native / device-feature planning (do this in Phase 1–2 for any device capability)

Before writing ANY feature that touches a device/OS capability — location, notifications, alarms,
camera, filesystem, background work, permissions — spec the **full state matrix first**, not just the
happy path. (Lesson from the location feature, which churned across three rounds — NBD-48/63/68 —
because it was specced happy-path-only.) Cover every axis:

1. **Permission state** — not-asked / granted / denied / denied-forever (the last needs a settings
   deep-link, not a re-prompt).
2. **Device toggle** — the OS switch (GPS, notifications, DND) is _separate_ from the app permission;
   handle both.
3. **Connectivity** — does the API silently need a network? (Android geolocation's network provider,
   reverse-geocode). Test offline explicitly.
4. **Accuracy / mode flags** — the defaults are often wrong (`enableHighAccuracy`, fg vs bg, timeout,
   maximumAge). Set them deliberately.
5. **OEM skin** — Xiaomi/Samsung/OnePlus/Huawei battery-savers throttle/kill background work; plan the
   exemption path.
6. **API level** — behavior shifts by Android version (exact alarms A14, notif permission A13, FGS
   types, edge-to-edge).
7. **App lifecycle** — foreground / background / killed / after-reboot: does the feature survive each?
8. **Failure = actionable** — every failure branch gives the user a real next step, never a dead-end.
9. **Real-device verify** — CI cannot cover native runtime; an on-device check by the owner is the
   merge gate. Say so in the PR.

Meta-note: official Capacitor plugins are deliberately minimal — decide up front whether a **small
custom native plugin** is needed (e.g. Play Services `SettingsClient` for the enable-GPS dialog)
rather than discovering it mid-build. The canonical, cross-project copy of this checklist lives in
`~/.claude/caveats.md`.

## Phase 3 — Implementation (piece by piece)

Never start a piece before the one it depends on type-checks clean. Per-piece rules live in
`docs/architecture.md` and `CONVENTIONS.md` — re-read the section as you enter each piece.
Cross-cutting rules: strict types, central Logger (no `console.*`), no magic values, no dead
code, reuse-before-create, fetch current library docs before first use. Keep `logic.ts` pure;
keep all I/O in `db.ts`.

## Phase 4 — Testing (colocated)

Tests ship in the same PR — write them now, not later. Follow the test matrix. Mandatory e2e
paths for this project:

1. Offline persistence — check off wird → go offline → reload → still checked, zero network
   requests.
2. Sync to stats — reconnect → syncs to Supabase → appears in statistics.
3. Counter to wird — dhikr counter completion → linked wird item auto-marked.

## Phase 5 — Quality gates (local, before any push)

**5a — Automated.** All must exit 0 — no informational-only tier:

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

**5b — Live browser verification.** Tests passing is not "it works". Start the dev server,
open the app in a real browser (or drive it with browser tooling if available), and walk
through EVERY acceptance criterion from the Phase 1 brief by actually clicking. Also check:
skeleton loading states show, errors surface gracefully, no console errors, and RTL renders
correctly (Arabic, right-to-left, logical properties). Fix anything broken before pushing.

**5c — Manual checks.** Did this branch touch a feature's `logic.ts`/`db.ts`? Then a test
file must be in the diff — if missing, write it now. Did this PR change how the code is really
structured, named, or styled? Then update `CONVENTIONS.md` / `docs/architecture.md` /
`DESIGN_SYSTEM.md` in the same PR — docs that lie are worse than no docs. Never `--no-verify`;
fix root causes.

## Phase 6 — Version bump, commit & push

1. Bump version per the table in `CONVENTIONS.md` (feat=MINOR, fix/perf/refactor=PATCH,
   docs/test/chore=none; pre-1.0: breaking bumps MINOR). Same commit as the feature.
2. Stage specific files (never `git add -A`; never `.env` or artifacts).
3. Conventional commit: `type(scope): imperative description` + body with the why + issue ref.
4. Push; confirm the preview URL is live.

## Phase 7 — Pull request (feature → dev)

1. PR description: What / Why (issue + ADR) / Acceptance criteria as checkboxes / Features
   touched / Test coverage / How to verify manually.
2. Wait for ALL CI checks green: `lint`, `typecheck`, `test`, `e2e`, `build`,
   `colocated-test-check`.
3. Self-review the full diff once, hunting bugs only (not style).
4. **Security review (before merge).** One focused pass over the added/changed code for: XSS
   (`dangerouslySetInnerHTML`, unsanitized HTML/URLs), injection (SQL/command), committed
   secrets/keys, auth/authz gaps, unsafe deserialization, SSRF, path traversal. Fix before merging.
5. Squash-merge; PR title = the commit → must be Conventional-Commits valid.
6. Merge auto-deploys `dev` to staging.

## Phase 8 — Production deploy (dev → master)

1. Smoke-test the STAGING URL in a real browser against the acceptance criteria.
2. Release PR `dev` → `master` with a changelog since last release. All CI checks again.
3. Squash-merge → auto-deploy to production.
4. Open the PRODUCTION URL, run the project success check: _I can log in, answer the
   questionnaire, check off a wird item, go offline and reload and it is still checked, then
   reconnect and see it synced and reflected in the statistics._
5. Mark the ticket done in `docs/backlog.md` (same commit as any release notes). New ideas
   discovered during the work → add as new backlog rows, never as silent scope creep.
6. Not done until step 4 passes.

---

## Hard stops (block progression — fix root cause, never work around)

- Open design question with no ADR → write the ADR first
- Any CI check red → fix before merge
- Feature `logic.ts`/`db.ts` change without a test in the diff → write the test first
- I/O, clock, or browser API inside a `logic.ts` → refactor first (data/time are parameters)
- `logic.ts` importing `db.ts` → restructure so the hook mediates
- Data mirrored into a Zustand store instead of read from Dexie → read from Dexie
- Physical directional CSS class where logical is required → replace first
- `console.*` in committed code → replace with Logger first
- `git add -A` → stage specific files instead

## End-of-feature verification checklist

- [ ] All quality-gate commands exit 0 locally
- [ ] Acceptance criteria verified by hand in a live local browser (Phase 5b)
- [ ] Docs updated if reality changed (conventions / architecture / design system)
- [ ] All CI checks green
- [ ] Works on staging URL (acceptance criteria met)
- [ ] Works on production URL (success check passes)
- [ ] Nothing previously working is broken (e2e suite green)
- [ ] Squashed with a valid Conventional Commits title
- [ ] Branches updated, feature branch deleted
