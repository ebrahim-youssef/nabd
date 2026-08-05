# ADR-0014 — SPA + native client split

- **Status:** accepted (owner decision 2026-08-05)
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
Native, rather than overlooking it.

## Consequences

- New SPA and native installs begin with fresh local state; there is no migration path from the
  old Capacitor/Dexie application.
- The SPA is not installable as a PWA and has no offline-reload guarantee; native is the sole
  offline-first surface.
- Expo `AsyncStorage` is the native persistence engine. Its key-value JSON model requires the
  event-sourced wird/qada ledger in ADR-0010 to rebuild an in-memory view from JSON rather than
  issue SQL-style queries; this is flagged for performance validation, not a migration blocker.
- The SPA deploys independently until an explicit Phase 5 root-domain cutover; that cutover does
  not retire the old application.
