# ADR-0017 - Native-only product

- **Status:** accepted
- **Date:** 2026-10-16

## Context

The repository contains the original Next.js application, a Vite SPA, and an Expo application.
The migration documents treated the SPA and Expo application as two replacement clients. The
owner has decided that the end product is one application, the Expo application in `apps/native`.

Android is the first release target. The code and shared domain model should keep a future iOS
target possible, but this decision does not set an iOS release date or promise feature parity on
iOS before it is planned.

## Decision

`apps/native` is the sole product and release target.

The root Next.js application remains a reference source until native reaches full parity. Full
parity means every feature the Next.js application has today, except Google sign-in and Supabase
cross-device sync, which [ADR-0014](./0014-spa-native-split.md) dropped and which remain dropped.
After parity, the root Next.js application is deleted.

The Vite SPA in `apps/spa` is cancelled and is deleted as part of the removal order. It is not a
product target or a reference source.

`packages/shared` remains the platform-neutral home for domain types, pure logic, Arabic content,
copy, contracts, and testing fixtures. SQLite, Expo Router, device permissions, notifications,
alarms, location, filesystem access, and other platform behavior belong to `apps/native`.

There is no backend or sign-in in the native product. No new web product, PWA, SPA deployment,
Google sign-in, or Supabase sync work is part of this decision.

Android is the first native platform. Native code should avoid decisions that prevent a later iOS
implementation, while platform-specific behavior may remain Android-specific until iOS work begins.

## Consequences

Native feature and release gates become the main completion criteria. They include product parity,
SQLite restart persistence, device state matrices, release APK verification, and the durability
requirements recorded by ADR-0015.

The root application remains available only as a reference for comparison and porting until parity
is complete. The SPA is cancelled and removed. Deleting the root application and the SPA becomes
part of completing the native migration.

Future iOS work may reuse the shared domain and content layers, but it requires its own platform
plan, state matrix, and release decision.

## Removal order

The deletion work follows the removal survey and keeps native and shared gates in place:

1. **NBD-106, native boundary and CI split:** move native checks into `apps/native`, split the
   SPA workflow into native and shared CI, and keep the native APK workflow and shared ownership
   boundaries intact.
2. **NBD-107, SPA retirement:** delete `apps/spa`, Wrangler and Cloudflare configuration, SPA
   dependencies and jobs, and SPA-only shared exports and documentation references.
3. **NBD-108, legacy retirement:** after NBD-89a passes, delete the root Next.js application,
   Capacitor shell, root `android/`, Capacitor assets and configuration, Supabase client code,
   Vercel configuration, and root CI jobs. Retiring the live Supabase project is a separate manual
   step.
4. **NBD-109, workspace cleanup:** reduce the root package to workspace tooling, update the lockfile,
   `.gitignore`, lint-staged routing, READMEs, and migration or deployment documentation while
   keeping `packages/shared` and `apps/native` gates green.

## Amendment 2026-10-17

The owner narrowed the end state further: the repository keeps one application folder, `native/`,
with all product code in it.

- `packages/shared` is folded into the native app. Each module moves to the feature that owns it,
  and the purity rule moves from the package boundary to a lint rule on `logic.ts` files. This
  replaces the "`packages/shared` remains" paragraph above.
- The root Next.js app is deleted before parity instead of after it. The last commit that contains
  it is tagged `legacy-reference`, and parity work reads the old behavior from that tag.
- `apps/native` moves to `native/` at the repository root once the deletions and the fold-in are
  done.
- The developer toolchain moves to Vite+ (Oxfmt, Oxlint, `vp staged`). Metro, Jest with
  `jest-expo`, `tsc --noEmit`, and commitlint stay.

The order and the per-phase steps are in
[`docs/migration/2026-10-17-consolidation-plan.md`](../migration/2026-10-17-consolidation-plan.md).
