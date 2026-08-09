# ADR-0014 — SPA + native client split

- **Status:** accepted (owner decision 2026-08-05), amended 2026-08-09 (see "Amendment")
- **Date:** 2026-08-05

## Context

The live Next.js application is a client-heavy PWA wrapped by Capacitor, although Next.js's
primary value is server-first rendering. Its current source, Supabase integration, and bundled
Android WebView remain a live reference during migration, but they are not the architecture for
new work. The owner chose a client-only web and native split that gives each platform a direct
runtime while preserving shared product rules.

## Decision

Supersede ADR-0001 for the go-forward client architecture: Next.js is no longer the locked
stack. `apps/spa` is a Vite + React Router client application using Dexie/IndexedDB, with no PWA,
service worker, or offline claim; `apps/native` is an Android Expo React Native application and
the shipped native path; `packages/shared` holds platform-neutral pure logic, types, Arabic copy,
and design tokens. No backend is introduced.

ADR-0001 remains an accurate frozen record for the old Next.js application only: its strict
TypeScript, pnpm, Tailwind/shadcn, Dexie, Supabase, Next route-handler, Zustand, Serwist, Vitest/
Playwright, Vercel, hygiene, Sentry, and Vercel Analytics decisions continue to describe that
untouched app. For new applications, its Next.js, Next route-handler, Serwist/PWA,
local-first-with-Supabase-sync/auth, Vercel Analytics, and `@sentry/nextjs` assumptions are
superseded; only the applicable practices and platform-neutral choices carry forward.

ADR-0012 and ADR-0013 are superseded in full: Expo React Native replaces Capacitor and the
`android/` project as the native shipping path. The PWA and local-first-with-Supabase-sync
assumptions in `docs/product/spec.md` are also superseded for these new apps specifically:
neither carries sign-in or Supabase sync, and offline support belongs to native only. The old
Next.js application's source, Supabase wiring, Capacitor project, and `android/` directory stay
untouched and deployed/live throughout migration; deleting them requires separate, later,
explicit owner approval and is not authorized by this ADR or its migration plan.

Both new applications remain Arabic-only and RTL-first, without an i18n framework. The SPA's
landing page (`/`) alone owns public search ranking; all product routes live under `/app/*` and
must not be indexed. Vercel Analytics is removed; Google Analytics is deferred until after the
migration. Sentry uses `@sentry/react` in the SPA and `@sentry/react-native` in native, not
`@sentry/nextjs`. Native is Android-only for now, keeps application id `com.nabd.app`, and owns
offline operation, background notifications, and exact alarms.

Alternatives rejected: staying on Next.js with a client-first refactor — its server-first value
proposition benefits a Capacitor-wrapped, fully client application not at all, and fighting that
mismatch costs more long-term than a one-time migration; keeping Capacitor instead of a full React
Native rewrite — deliberately reverses ADR-0012/0013's earlier owner decision rejecting React
Native, rather than overlooking it; unifying web and native into one React Native Web / Expo
Router codebase — rejected on long-term maintenance grounds, not migration cost: it would discard
the already-shipped, actively-maintained Radix/shadcn web UI (Radix/shadcn cannot render in an
RN/RNW tree, so unifying means rebuilding the web UI from RN primitives too, permanently trading
away that ecosystem's accessibility/interaction maintenance for hand-rolled equivalents), adds a
third framework (react-native-web) to keep compatible on every future Expo/RN upgrade, tends to
decay into per-platform `.web.tsx`/`Platform.select` branching for an interaction- and RTL-heavy
app rather than staying genuinely single-codebase, and is not a stronger SEO story for the one page
that needs it (`/`, already a standalone static artifact regardless of framework) than the SPA's
static-site tooling.

## Consequences

- New SPA and native installs begin with fresh local state; there is no migration path from the
  old Capacitor/Dexie application.
- The SPA is not installable as a PWA and has no offline-reload guarantee; native is the sole
  offline-first surface.
- Expo `expo-sqlite` is the native persistence engine (revised from an initial `AsyncStorage`
  choice — AsyncStorage is persistent but flat key-value with no query/index support; SQLite
  matches the query/indexing model the event-sourced wird/qada ledger in ADR-0010 already needs,
  and keeps native's persistence mental model in parity with the SPA's Dexie/IndexedDB rather than
  requiring an in-memory JSON-rebuild pattern).
- The SPA deploys independently until an explicit Phase 5 root-domain cutover; that cutover does
  not retire the old application.

## Amendment (2026-08-09)

- **Status:** accepted (owner decision 2026-08-09)

This amends the Decision and Consequences sections above. The superseded sentences are left
in place there and quoted here, so the record shows what was reversed rather than hiding it.
The execution contract these decisions came from is
`docs/superpowers/plans/2026-08-09-migration-execution-brief.md`.

### A1 — deleting the Next.js application is authorized

Superseded, from Decision:

> The old Next.js application's source, Supabase wiring, Capacitor project, and `android/`
> directory stay untouched and deployed/live throughout migration; deleting them requires
> separate, later, explicit owner approval and is not authorized by this ADR or its migration
> plan.

The owner gave that approval on 2026-08-09. Removal is authorized, with sequencing:

- It happens in one dedicated PR, after native parity is verified against a real Android build.
  The Next.js source is the reference implementation for the native port, so it cannot be
  removed before native reaches parity.
- Scope: `app/`, `components/`, `features/`, `lib/`, `stores/`, `content/`, `types/`, `e2e/`,
  `android/`, `capacitor.config.ts`, `next.config.ts`, `next-env.d.ts`, `proxy.ts`,
  `instrumentation*.ts`, `sentry.*.config.ts`, `playwright.config.ts`, `vitest*.ts`,
  `supabase/`, `out/`, `public/`, and every Next, Capacitor, Serwist, Supabase and
  Vercel-Analytics dependency and script in the root `package.json`. The repository root
  becomes a workspace root only.
- Git history keeps the removed application. That is intended, and is the reason removal is
  safe to do in one PR.

### A2 — the Phase 5 cutover does retire the old application

Superseded, from Consequences:

> The SPA deploys independently until an explicit Phase 5 root-domain cutover; that cutover
> does not retire the old application.

The SPA still deploys independently up to the cutover. The cutover now does retire the old
application, following A1.

### A3 — production deploy sequencing

`master` is the production branch: `docs/workflow.md` Phase 8 releases `dev` into `master`, and
that merge auto-deploys. Migration work integrates into `dev`, so the removal PR is invisible to
production until the next release. The first `dev` to `master` release after it lands is
therefore the production cutover, and removes the Next.js application currently serving
production. That release must not happen before the SPA deployment the owner is setting up is
live.

### A4 — both applications ship production-ready

New; the original ADR did not scope quality.

- SPA: full branding, complete SEO (sitemap, robots, canonical, Open Graph), a performance pass,
  and a landing page matching the design folders. `/app/*` stays unindexed, as the Decision
  above already requires.
- Native: no landing page. Onboarding and a structured, readable settings screen are explicit
  acceptance items. It ships as an APK the owner installs and tests.
- Persisted data is named after the application on both platforms: the Dexie database name and
  the `expo-sqlite` filename are nabd-specific, not framework defaults.

### A5 — no duplicated code between the applications

New. Any pure logic, type, design token or Arabic copy string used by both applications lives in
`packages/shared` and is imported from `@nabd/shared`. This is a merge gate, not an aspiration:
once both applications exist it is asserted mechanically against `apps/spa/src` and
`apps/native/src`, and wired into CI if practical. Phase 1's acceptance criterion, "no
duplicated token/logic definitions", is the same check.

### A6 — integration target

New. Every migration PR integrates into `dev`.

`dev` and `master` report as diverged (dev 27 ahead, 5 behind). Those 5 commits are the GitHub
merge commits from earlier `dev` to `master` releases: `git log --no-merges origin/dev..origin/master`
is empty, so `master` holds no source that `dev` lacks. The divergence is merge topology rather
than content, and is deliberately left as is.

### A7 — documentation scope

New. Each migration PR documents what it changes, as it changes it.

The repository docs that describe the Next.js application (`AGENTS.md`, `docs/architecture.md`,
`docs/stack.md`, `docs/workflow.md`, `docs/run-locally.md`, `docs/release-android.md`,
`README.md`, `README.en.md`, `CONVENTIONS.md`) are corrected in the removal PR, alongside the
application they describe. Until then `AGENTS.md` carries a migration-status pointer to this
ADR, so that agents working in `apps/*` and `packages/shared` do not follow its superseded PWA
and Supabase statements.
