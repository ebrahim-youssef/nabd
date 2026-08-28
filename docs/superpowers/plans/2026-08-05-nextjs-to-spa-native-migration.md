# Next.js → SPA + Native Migration — Phase Roadmap

> **For agentic workers:** This is a roadmap-level plan covering 3 subsystems (SPA, native app,
> shared package) across 6 phases. It is NOT a bite-sized TDD task list. When execution starts on
> a given phase, write that phase's own bite-sized implementation plan using
> superpowers:writing-plans, then execute with superpowers:subagent-driven-development or
> superpowers:executing-plans. This document is the decision record + scope boundary those
> per-phase plans must respect.
>
> Reviewed twice by Codex (read-only, repo-grounded) — round 1 shaped the constraints below, round
> 2 verified them against actual repo state and forced the Phase 1 split and the fixes noted inline.

**Goal:** Replace the Next.js App Router app with a pure client-side split — a Vite + React
Router SPA for web and an Expo React Native app for mobile — sharing pure logic, types, copy, and
design tokens. The Next.js app's _source_ stays untouched as a live reference throughout; deletion
is a separate, later, owner-gated step, not part of this plan.

**Architecture:** Three top-level packages: `apps/spa` (Vite + React Router, IndexedDB/Dexie for
storage, no offline/PWA), `apps/native` (Expo, becomes the shipped native app — Capacitor/`android/`
are superseded as the shipping path, but not deleted mid-migration, same as the rest of the Next.js
source), `packages/shared` (platform-neutral: types, pure logic ported from `lib/pure/*`, Arabic
copy, design tokens). No backend is introduced. Supabase is currently wired into the live app
(`SyncProvider`, `AuthStatus`, OAuth session handling) — this migration deliberately drops that
integration (no sign-in in the new apps for now); real Supabase re-wiring for cross-device sync is
out of scope, tracked as post-migration follow-up.

**Tech Stack:** Vite, React Router, Dexie (SPA) · Expo (managed), NativeWind v4 + custom RN
components (native) · Tailwind v4 CSS vars + shadcn/radix (existing web design system, ported to
shared tokens) · Vitest + Playwright (SPA), Jest/RN Testing Library + Detox-or-Maestro (native, TBD
in Phase 2) · Sentry vanilla SDKs (`@sentry/react`, `@sentry/react-native`) — no Next SDK, no
Vercel Analytics.

## Global Constraints

- Old Next.js app: source stays untouched, remains deployed/live throughout the migration. Its
  Capacitor/`android/` project is superseded as the shipping native path once `apps/native` lands,
  but is not deleted mid-migration — it stays frozen alongside the rest of the Next.js source until
  the owner reviews the finished migration (post-Phase 5) and gives a separate, later go-ahead to
  delete the whole Next.js app.
- ADR-0014 must exist and be merged before any Phase 1 code lands. It supersedes:
  - ADR-0001 (stack-and-tooling) — Next.js is no longer the locked stack.
  - ADR-0012 (Capacitor shell) and ADR-0013 (bundled native webview) — Capacitor is superseded by
    Expo React Native.
  - Any PWA / local-first-with-Supabase-sync assumptions baked into `docs/product/spec.md` — ADR-
    0014 must explicitly state these are superseded for the new apps (no PWA, Supabase deferred),
    not leave the contradiction implicit.
  - It also records the new architecture of record: `apps/spa` + `apps/native` + `packages/shared`.
- RTL-first, Arabic-only UI stays mandatory on both platforms (logical CSS on web; RTL-aware layout
  - Arabic-Indic numerals on native) — same rule as current `AGENTS.md`, no i18n framework.
- No data migration path between the current Capacitor/Dexie app and the new apps. On first launch
  of either new app, local state starts fresh (explicit product decision — app isn't in production
  yet).
- SPA ships with no service worker, no Serwist, not installable as a PWA. Offline is a native-only
  capability going forward.
- Public search-ranking ownership is the landing page (`/`) only. Everything that is today an app
  route moves under `/app/*` in the SPA and must NOT be indexed or gain search visibility — this
  boundary applies to every phase that touches SEO/meta, not just the initial pass.
- Vercel Analytics is removed outright in this migration, no replacement shipped in Phases 1-5.
  Google Analytics is deferred to post-migration work (tracked as follow-up, not a phase task).
- Supabase is live-wired today (`SyncProvider`, `AuthStatus`, OAuth) but out of scope to carry
  forward: the new apps ship with no sign-in and no sync. Real Supabase wiring is deferred to
  post-migration work. Existing Supabase code/deps in the Next.js app are untouched (reference);
  nothing from it is ported into `packages/shared`.
- Package/app id: no Play Store listing exists yet, so there is no store-continuity constraint.
  Default to keeping `com.nabd.app` for the Expo app unless told otherwise.
- Deployment ownership: the SPA deploys to its own preview/staging URL during Phases 1-4 (not the
  production root domain). The root domain (`/`) only changes hands from the Next.js app to the
  SPA at the end of Phase 5, as an explicit, deliberate cutover step — never implicitly.

---

## Feature ownership matrix

This is the answer to "what does feature-for-feature parity mean" — it means matching
_capability_, not forcing identical implementations where the platform doesn't support it.

| Capability                                               | SPA (web)                                                                       | Native (Expo)                                                                                                                                                             |
| -------------------------------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Core wird/adhkar/niyyat/qada UI & logic                  | Full — via `packages/shared` pure logic                                         | Full — via `packages/shared` pure logic                                                                                                                                   |
| Local persistence                                        | Dexie/IndexedDB (unchanged engine)                                              | `expo-sqlite`                                                                                                                                                             |
| Offline usage                                            | **Not supported** (no SW, no PWA)                                               | **Required** — primary offline surface                                                                                                                                    |
| Notifications                                            | Foreground/browser Notification API only, best-effort, no reliability guarantee | Full — background delivery, exact alarms, custom notification channels/audio (ports current `lib/impure/notifications.ts`, `countdown-notification.ts`, `alarm-audio.ts`) |
| Location                                                 | Browser Geolocation API                                                         | Expo Location, plus reverse-geocode + location-enabler flow ported from `lib/impure/reverse-geocode.ts`, `location-enabler.ts`                                            |
| Haptics / status bar / back-button / battery-opt prompts | N/A (not web concepts)                                                          | Full — Expo equivalents of `lib/impure/haptics.ts`, `status-bar.ts`, `back-button.ts`, `battery.ts`                                                                       |
| Keyboard-aware inputs                                    | Native browser behavior                                                         | Full — Expo equivalent of `lib/impure/keyboard.ts`                                                                                                                        |
| Splash screen lifecycle                                  | N/A                                                                             | Full — Expo equivalent of `lib/impure/splash.ts`                                                                                                                          |
| Share / export-download                                  | Web Share API where available, else download fallback                           | Full — Expo equivalents of `lib/impure/share.ts`, `download.ts`                                                                                                           |
| Appearance (theme/mode) init                             | CSS-var based, pre-paint script (as today)                                      | Full — port of `lib/impure/appearance.ts` logic to RN theming                                                                                                             |
| Design system                                            | Tailwind v4 CSS vars + shadcn/radix components                                  | NativeWind v4 + hand-built RN components mirroring shadcn visually, sourced from shared tokens                                                                            |
| SEO / discoverability                                    | Landing page only (`/`)                                                         | N/A                                                                                                                                                                       |
| Auth / Supabase sync                                     | Deferred (see Global Constraints)                                               | Deferred (see Global Constraints)                                                                                                                                         |

Anything not in this table (day-to-day checklist screens, stats, settings UI, etc.) is assumed
full-parity UI/UX on both, built from the same `packages/shared` pure logic, with platform-specific
presentation components.

---

## Open technical spikes

1. **Tailwind v4 → NativeWind bridge** _(resolve in Phase 1)_. Current web tokens live in
   `app/globals.css` as Tailwind v4 `@theme` CSS variables (no `tailwind.config.js`). NativeWind v4
   typically expects a JS/TS Tailwind config to share values with RN. Needs a single
   source-of-truth token format (JSON or TS object in `packages/shared`) that both the web `@theme`
   CSS and the NativeWind config generate from or read from — not two hand-maintained copies.
2. **RN local storage engine** — **resolved: `expo-sqlite`** (owner decision, revised from an
   initial AsyncStorage pick — see "Owner decisions" below). No further spike work needed; Phase 2
   implements against it directly.
3. **RN test tooling** _(resolve in Phase 2)_. Unit/component test runner (Jest + RN Testing
   Library, likely) and an on-device/E2E tool (Detox vs Maestro) — pick one, wire a CI gate.
4. **iOS scope** — **resolved: deferred, Android-only** (owner decision, see "Owner decisions"
   below). No iOS build target anywhere in this plan.

---

## Phase 0 — ADR-0014 (gate before Phase 1)

**Deliverable:** `docs/adr/0014-spa-native-split.md`, merged.

- Supersedes ADR-0001, ADR-0012, ADR-0013 (see Global Constraints for exact scope of each).
- Explicitly states the disposition of `docs/product/spec.md`'s PWA and local-first-with-Supabase-
  sync assumptions for the new apps (superseded, not silently dropped).
- Captures the rest of the Global Constraints above as binding decisions (no data migration, no
  PWA, GA/Supabase deferred, old Next.js retirement is manual/owner-gated, deployment cutover is
  explicit and happens only at end of Phase 5).

## Phase 1 — SPA scaffolding + shared package foundation

**Deliverable:** SPA skeleton and shared package both real and consumed together, independently
reviewable from the native skeleton (Phase 2).

- Repo layout: `apps/spa/`, `packages/shared/` (pnpm workspaces — matches existing `pnpm` usage).
  `apps/native/` folder is created empty/placeholder here; its real scaffolding is Phase 2.
- `apps/spa`: Vite + React Router, one real landing page (copy sourced from `README.en.md` /
  `README.md` value-prop content), real favicon/icons/app metadata, deployed to its own
  preview/staging URL (see Global Constraints — not the production root domain yet).
- `packages/shared`: pure logic ported from `lib/pure/*`, design tokens (resolves spike #1), Arabic
  copy/content, shared TS types. Consumed by `apps/spa` — prove the import actually works, not just
  present in the folder.
- Routing namespace decision locked here: SPA lands on `/` (within its own preview domain), future
  full app lives under `/app/*`.
- CI: add SPA gate (lint/typecheck/unit/Playwright, no offline-reload test since no SW) alongside —
  not replacing — existing Next.js gates.
- Acceptance: landing page live on its preview URL, shared package consumed by the SPA with no
  duplicated token/logic definitions, SPA CI gate green.

## Phase 2 — Native scaffolding

**Deliverable:** Expo app skeleton, real (not faked) onboarding-to-storage vertical slice, running
on a real Android build.

- `apps/native`: Expo app, onboarding flow, then a bare "congratulations, you're onboarded" screen,
  real icon/splash/app name (نبض / nabd), running on Android device/emulator.
- Storage engine already resolved (`expo-sqlite`, see Owner decisions); resolve spike #3 (test
  tooling) here — needed because the vertical slice below needs it to prove itself, not just static
  screens.
- Vertical slice: onboarding → persisted local state → confirm `expo-sqlite` actually round-trips
  data on a real Android build.
- `packages/shared` consumption proven from the native side too (same tokens/logic as `apps/spa`,
  no divergence).
- CI: add native gate (lint/typecheck/unit + Android build) alongside existing gates.
- Acceptance: onboarding-to-congratulations flow works end to end on a real Android build, shared
  package consumed identically by both apps, native CI gate green.

## Phase 3 — Full SPA build

**Deliverable:** SPA at feature parity per the ownership matrix, landing page gains a "Go" action
into `/app/*`.

- Replicate all current `app/*` routes (home/today, adhkar, niyyat, libraries, stats, settings,
  prayer-times, qada) under `/app/*`, built on `packages/shared` pure logic.
- Web-supportable capabilities only (per ownership matrix) — no offline claims, notifications stay
  best-effort/foreground.
- Adapt (don't copy) the test suite: Vitest units carry over conceptually per feature, Playwright
  e2e rewritten against the SPA's actual routing/build, offline-reload suite dropped entirely.
- SEO/meta infra for the SPA (equivalents of `manifest.ts`/`robots.ts`/`sitemap.ts`/OG image) is
  _drafted_ here for the landing page (`/`) only — `/app/*` stays explicitly out of sitemap/
  indexing at every stage, this is not revisited later to "add more" indexing. Full pass across the
  now-stable landing surface is finished in Phase 5.
- Sentry wired via `@sentry/react` (release/version tagging defined, no Vercel Analytics).

## Phase 4 — Full native build

**Deliverable:** Expo app at feature parity per the ownership matrix, becomes the native app the
owner will eventually ship (Capacitor/`android/` superseded as shipping path, still not deleted).

- Replicate all current app screens on `packages/shared` pure logic + native-only presentation.
- Port native-only capabilities from `lib/impure/*`: notifications (channels/audio/exact alarms),
  location + reverse-geocode + location-enabler, haptics, status bar, back-button,
  battery-optimization prompt, keyboard-aware inputs, splash lifecycle, share/export-download,
  appearance init.
- Resolve spike #4 (iOS scope) at the start of this phase before deciding whether an iOS build
  target is included here.
- Native CI gate matures: unit + Android build + device/emulator smoke suite (E2E tool from spike
  #3).
- Sentry wired via `@sentry/react-native`.

## Phase 5 — SEO polish, verification, cleanup, cutover

**Deliverable:** everything from Phases 1-4 confirmed working together; SEO/meta infra finished;
production cutover; report handed to owner for manual sign-off.

- Finish SEO/meta pass across the landing surface (sitemap, robots, OG, canonical) — `/app/*`
  explicitly excluded, per the Global Constraints boundary carried through every phase.
- Full regression pass: SPA + native both exercised against the ownership matrix, CI gates all
  green on both.
- Explicit statement of what's deferred (Supabase real wiring, Google Analytics, iOS if deferred at
  spike #4, Play Store submission) so it's tracked, not silently dropped.
- Production cutover: root domain (`/`) moves from the Next.js app to the SPA — the one deliberate
  point where that handoff happens.
- Report to owner: "here's what's live, here's what's deferred, please verify." Old Next.js app
  deletion (source + Capacitor/`android/`) is a separate, later, manually-triggered step — not part
  of this phase's deliverable.

---

## Explicitly deferred / out of scope for this migration

- Real Supabase auth/sync wiring (cross-device continuity) — currently live in the Next.js app,
  deliberately not carried into the new apps.
- Google Analytics integration.
- Play Store submission / listing (prep material already exists in `docs/play-store-listing.md`,
  unaffected by this migration).
- iOS build — pending spike #4 answer.
- Deleting the old Next.js app (source + Capacitor/`android/`) — owner-gated, happens after this
  plan's Phase 5 report.

## Owner decisions (resolved 2026-08-05, storage revised same day)

1. **RN local storage engine:** `expo-sqlite` (revised from an initial AsyncStorage pick after
   weighing long-term fit, not migration cost). AsyncStorage is persistent but flat key-value, no
   query/index support; SQLite matches the query/indexing model the event-sourced wird/qada ledger
   (ADR-0010) needs, and keeps native's persistence mental model in parity with the SPA's
   Dexie/IndexedDB instead of requiring an in-memory JSON-rebuild pattern.
2. **iOS:** deferred. Phase 4 ships Android only; spike #4 closed as "not in scope for this
   migration."
3. **App id:** keep `com.nabd.app`.
4. **Codebase unification (React Native Web / Expo Router single codebase):** considered and
   rejected on long-term maintenance + SEO grounds, not migration cost. Storage still diverges
   either way (not a deciding factor). Deciding factors: unifying would discard the already-shipped
   Radix/shadcn web UI (incompatible with an RN/RNW component tree — Radix/shadcn are DOM-only),
   permanently trading that ecosystem's maintained accessibility/interaction work for hand-rolled
   RN-primitive equivalents on both platforms going forward; it adds a third framework
   (react-native-web) to keep compatible on every future Expo/RN upgrade; it tends to decay into
   per-platform `.web.tsx`/`Platform.select` branching for an interaction- and RTL-heavy app rather
   than staying genuinely single-codebase; and it's not a stronger SEO story for the one page that
   needs it (`/`, already planned as a standalone static artifact regardless of framework) than the
   SPA's own static-site tooling. Two-codebase split (`apps/spa` + `apps/native` +
   `packages/shared`) stands as planned.
