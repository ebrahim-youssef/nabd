# Migration execution brief — 2026-08-09

Owner brief captured 2026-08-09. This is the execution contract for finishing the
Next.js → SPA + native migration. It sits on top of, and does not replace:

- `docs/adr/0014-spa-native-split.md`
- `docs/superpowers/plans/2026-08-05-nextjs-to-spa-native-migration.md` (phase roadmap)

Read both before executing. Where this brief and ADR-0014 disagree, the disagreements are
listed under "New owner decisions" below; ADR-0014's 2026-08-09 amendment records them.

> **Correction, 2026-08-09 (PR 0).** This brief was written believing ADR-0014 and the phase
> roadmap were unmerged. They are not: both landed on `dev` in commit `8bd742f` (PR #160). The
> repo-state table and the PR 0 scope below have been corrected. PR 0 is docs-only.
>
> **Reassessment, 2026-08-09.** The plan was reviewed against the goal, twice and independently.
> Two of ADR-0014's premises are wrong, PR 1 and PR 2 are too large to review, and the sequence
> risks porting the product UI twice. Read alongside this brief:
>
> - `docs/migration/architecture-reassessment.md` — the three architectures now on the table and
>   the spike that decides between them. Owner decision required.
> - `docs/migration/parity-ledger.md` — the behavioral contract the migration must not silently
>   break. Applies under every architecture.
>
> Where this brief and the reassessment disagree about PR 1 and PR 2, the reassessment is newer.

---

## Repo state as of 2026-08-09

| Fact              | Value                                                                                                                                        |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Current branch    | `ibrahim/phase1-spa-scaffold` (contains `dev`)                                                                                               |
| `dev` vs `master` | dev 27 ahead, 5 behind. Benign: the 5 are `dev`→`master` merge commits, `git log --no-merges origin/dev..origin/master` is empty. Left as is |
| `master`          | the production branch — `docs/workflow.md` Phase 8 releases `dev`→`master` and that merge auto-deploys                                       |
| ADR-0014 merged?  | **Yes** — on `dev` (`8bd742f`, PR #160). Not on `master`, and not on `phase1-spa-scaffold`, which branched before the merge                  |
| `apps/spa`        | exists — Vite + React Router, landing page, consumes `@nabd/shared`                                                                          |
| `apps/native`     | **does not exist** — Phase 2 not started                                                                                                     |
| `packages/shared` | exists — `logic/{day,format,wird}`, `tokens/`, `copy/landing`, `types/wird`                                                                  |
| Open PRs          | none                                                                                                                                         |

Phase 1 branch commits (on top of `dev`):

```
43c3400 ci: add SPA + shared package gate
5fb24ea feat(spa): build landing page from shared copy, real metadata
6f472cc feat(spa): scaffold Vite + React Router app, consumes @nabd/shared
b3788dd feat(shared): scaffold packages/shared with ported pure logic, tokens, copy
5740038 chore: scope root gates to exclude apps/ and packages/ workspaces
```

**Phase 1 was audited on 2026-08-09. It is a working scaffold, not a landing surface.**

The branch was 2 commits ahead of origin and unpushed; those commits are now pushed, so origin
and local agree. What genuinely landed: `packages/shared` with logic (day/format/wird), tokens,
copy, types and two test files; a Vite + React Router app that really does consume
`@nabd/shared`; `apps/spa/public/favicon.ico` and `apple-icon.png`; a title, description and icon
links in `index.html`; and `spa-ci.yml`.

What did not land, despite the commit titled "build landing page from shared copy, real
metadata":

- No CSS or Tailwind anywhere in `apps/spa`. The landing route is a 16-line unstyled component
  that renders the primary colour's hex value as body text.
- No SPA tests. `apps/spa` runs `vitest run --passWithNoTests`, so its CI gate is green on zero
  tests.
- No Open Graph, no canonical, no sitemap, no robots.

So "finish Phase 1" means finishing tasks 4 and 5, not verifying them.

---

## New owner decisions (2026-08-09)

These change ADR-0014 and must be recorded in it, not applied silently.

1. **Delete the Next.js application.** ADR-0014 says the old app's source, Supabase wiring,
   Capacitor project and `android/` directory "stay untouched and deployed/live throughout
   migration; deleting them requires separate, later, explicit owner approval." That approval
   is now given. Deletion happens in PR 3, _after_ native parity is verified — the Next.js
   source is the reference implementation for the native port, so it cannot be removed first.
2. **Both apps ship production-ready.** SPA gets full branding, SEO and performance; owner
   sets up SPA deployment themselves. Native ships as an APK the owner will install and test.
3. **No duplicated code between the two apps.** Anything shared belongs in `packages/shared`.
   This is a gate, not an aspiration — see "Duplication gate" below.
4. **Everything documented**, smallest to largest.
5. **Integration target is `dev`** for all three PRs.

Unchanged from ADR-0014: Android-only (no iOS), app id `com.nabd.app`, `expo-sqlite` for
native persistence, Dexie/IndexedDB for the SPA, no PWA/service worker, no Supabase/auth,
no Vercel Analytics, Arabic-only + RTL-first, `/` is the only indexed route and all product
routes live under `/app/*`.

---

## PR plan

Owner reviews at each checkpoint before the next PR starts.

### PR 0 — land the gate (docs only)

The ADR merge this PR originally called for already happened in PR #160. What remains:

- **Amend ADR-0014** to record the five decisions above, by quoting each superseded sentence
  and reversing it rather than editing it away. Leaving the ADR saying "deletion requires later
  approval" while PR 3 deletes it makes the decision record contradict the shipped state. Two
  sentences need reversing, not one: the Decision clause about approval, and the Consequences
  bullet saying the Phase 5 cutover "does not retire the old application".
- **Add a migration-status pointer to `AGENTS.md`.** `AGENTS.md` is the first file every agent
  and delegate reads, and it currently states PWA / offline-first / Supabase-sync as fact.
  Full rewrite waits for PR 3, but until then the pointer stops delegates on PR 1 and PR 2
  starting from the superseded architecture.
- **Commit this brief and the Phase 1 plan.** Both were untracked; the contract for three PRs
  should be in git.
- **`dev`/`master` divergence: leave it**, with the reason recorded in the ADR amendment (A6).
  `master` carries no source `dev` lacks.
- **`.gitignore` had no `.env*` rule** — only a `!.env.example` negation under a "never commit
  real values" comment, so the untracked `.env.local` (Supabase keys, `SENTRY_AUTH_TOKEN`) was
  one `git add -A` away from being committed. Fixed here. `.env.local` was never committed.

### PR 1 — SPA to full parity → `dev`

Phase 1 verification + Phase 3.

> **Paused pending the architecture decision.** See
> `docs/migration/architecture-reassessment.md`. Two of ADR-0014's premises turned out to be
> wrong, and the route-porting half of this PR is the work most at risk of being thrown away if
> the architecture changes. The landing page, SEO and branding half is safe under every option
> and can proceed. Do not port `/app/*` until the Expo device-capability spike reports.

- **First, rebase `ibrahim/phase1-spa-scaffold` onto `dev`.** It branched before the ADR merge.
  Without the rebase, PR 1's diff reintroduces the ADR and its `AGENTS.md` base predates the
  migration pointer.
- Verify Phase 1 acceptance before building on it.
- Port every current `app/*` route under `/app/*`: home/today, adhkar, niyyat, libraries,
  stats, settings, prayer-times, qada — built on `packages/shared` pure logic.
- Dexie/IndexedDB persistence. The database name is already nabd-specific in the current app
  (`new Dexie('nabd')`, `lib/db/db.ts:49`), so this is a carry-forward, not a change. The store
  and index contract is in `docs/migration/parity-ledger.md` section B, including the dead
  `checkedAt` index that should not be carried forward as-is.
- Landing page (`/`) at production quality: real brand assets, full SEO/meta (sitemap,
  robots, OG, canonical), performance pass. `/app/*` explicitly excluded from indexing.
- Favicon + apple-icon: `apps/spa/public/` has both, sourced from the existing `app/favicon.ico`
  and `app/apple-icon.png` brand assets rather than regenerated. Confirmed 2026-08-09.
- Settings page structured and clear (explicit owner request).
- Sentry via `@sentry/react`. No Vercel Analytics.
- Tests: Vitest units per feature, Playwright e2e rewritten against the SPA's routing.
  The offline-reload suite is dropped (no service worker).

### PR 2 — native Expo app + APK → `dev`

Phase 2 + Phase 4. This is the bulk of the remaining work.

> **Not a reviewable unit as scoped, and blocked on the architecture decision.** As written this
> PR combines Expo build tooling, a new persistence layer and schema, a complete second UI, every
> device integration, native test tooling, CI, branding and release signing. That is a program of
> work, and one giant native PR followed by one owner test makes review ceremonial. Whatever
> architecture wins, it splits into: a feasibility and build PR; a device-capability go/no-go
> spike verified on the owner's device; onboarding and settings; the daily-wird slice; content
> flows; the prayer-times slice; then stats, qada and export. Each ends in a runnable build.
>
> The device-capability spike comes first and is the gate for everything else. See
> `docs/migration/architecture-reassessment.md`.

- Scaffold `apps/native` (Expo managed, Android-only, app id `com.nabd.app`).
- Onboarding → persisted state vertical slice on `expo-sqlite`, proven on a real Android
  build. Onboarding quality is an explicit owner request.
- Every screen at parity, on `packages/shared` pure logic + native presentation.
- Port native-only capabilities from `lib/impure/*`: notifications (channels, audio, exact
  alarms), location + reverse-geocode + location-enabler, haptics, status bar, back button,
  battery-optimization prompt, keyboard-aware inputs, splash lifecycle, share/export-download,
  appearance init.
- **Branding**: launcher icon, adaptive icon and splash in `app.json`. Commit `1b47933`
  already shipped branded launcher/splash/Play-store assets — but for the _Capacitor_
  `android/` project. Source Expo's assets from `resources/` and `store-assets/` rather than
  regenerating them, so the two do not drift.
- **Storage naming**: the `expo-sqlite` database filename must be nabd-specific.
- Settings structured and clear, matching the SPA.
- Sentry via `@sentry/react-native`.
- Resolve RN test tooling (Jest + RN Testing Library; Detox vs Maestro) and wire a CI gate.
- Produce an **APK build** — owner installs and tests it personally.

### PR 3 — Next.js removal + dedupe → `dev`

Only after PR 2 is verified.

- Remove the Next.js application: `app/`, `components/`, `features/`, `lib/`, `stores/`,
  `content/`, `types/`, `e2e/`, `android/`, `capacitor.config.ts`, `next.config.ts`,
  `next-env.d.ts`, `proxy.ts`, `instrumentation*.ts`, `sentry.*.config.ts`,
  `playwright.config.ts`, `vitest*.ts`, `supabase/`, `out/`, `public/`, and every Next/
  Capacitor/Serwist/Supabase/Vercel-Analytics dependency and script in the root
  `package.json`. Root becomes a workspace root only.
- Retire the superseded CI workflows (`build.yml`, `e2e.yml`, and the root-scoped
  `lint`/`test`/`typecheck` gates) in favour of per-workspace gates.
- Supersede ADR-0001, ADR-0012, ADR-0013 in the ADR index; update `docs/architecture.md`,
  `docs/stack.md`, `docs/workflow.md`, `docs/run-locally.md`, `docs/release-android.md`,
  `README.md`, `README.en.md`, `AGENTS.md`, `CLAUDE.md`, `CONVENTIONS.md`.
- No trace of Next.js in the working tree. Git history keeps it — that is fine and intended.

**Duplication gate.** After both apps exist, assert mechanically that no pure-logic, token,
type or Arabic-copy definition lives inside `apps/spa/src` or `apps/native/src` — it must be
imported from `@nabd/shared`. Phase 1's acceptance already states "no duplicated token/logic
definitions"; reuse that as the check and wire it into CI if practical.

---

## Gates

nabd is **pnpm**, not npm. Vitest, not Jest (until native adds its own runner).

Root: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e`, `pnpm check:colocated`,
`pnpm build`.

Two local-only traps, both verified on 2026-08-09 and neither a real failure:

- `pnpm format:check` already fails on `dev` across 159 files and is not in CI. Do not treat a
  red run as a regression. Format the files you touch; leave the rest.
- `pnpm lint` goes red locally if `apps/spa/dist` is on disk (leftover build artifact, 15
  `no-console` errors in the minified bundle). Root eslint does not ignore `apps/**` on `dev`
  yet; commit `5740038` on `ibrahim/phase1-spa-scaffold` fixes it and lands with PR 1. CI is
  clean because the directory does not exist there.
  Per workspace: `pnpm --filter apps-spa <lint|typecheck|test|build>`,
  `pnpm --filter @nabd/shared <lint|typecheck|test>`.

CI workflows: `build.yml`, `colocated-test-check.yml`, `e2e.yml`, `lint.yml`, `spa-ci.yml`,
`test.yml`, `typecheck.yml`.

Before every PR: security-review the diff (XSS/`dangerouslySetInnerHTML`, injection,
committed secrets, authz gaps, unsafe deserialization / SSRF / path traversal).

Device/native features: plan the full state matrix before coding — permission denied,
permission permanently denied, OS-level feature off, background-restricted, no network,
cold start, app killed. Never ship a device feature specced only for the happy path.

---

## Working agreement

- Delegate freely. Bulky and mechanical work (route porting, sweeps, running gates) goes to
  subagents and to the `opencode` / codex delegates; architecture, security review and diff
  review stay in the main thread. Delegates never commit.
- Owner reviews at each PR checkpoint before the next begins.
- Commit trailer convention for nabd: `Co-Authored-By` is kept (nabd is the project that
  specifies it).
- Human-readable text under the owner's name (README, PR descriptions, public docs): plain
  and understated. No em-dashes, no buzzwords, no emoji headers, no CTA endings.

## Owner acceptance criteria, stated in their words

- Both apps look like production-ready, clean, readable, maintainable code that is easy to
  add features to.
- Everything documented, from the smallest thing to the largest.
- SPA: full branding, full SEO, performance, working landing page matching the design folders
  and the app's branding.
- Native: no landing page; onboarding works well; settings are clear and structured.
- Favicon present on the SPA; real launcher icon on the installed Android app.
- Data saved under names that relate to the application.
- No trace of Next.js in the folders after migration (git history exempt).
- An APK build produced for the owner to install and test.
