# Architecture, nabd

> The go-forward product is one app: the Expo React Native application in `apps/native`.
> Android is first. Boundaries must remain suitable for a later iOS implementation, but no iOS
> release is planned yet. The 2026-10-16 owner direction is recorded in
> [ADR-0017](adr/0017-native-only.md).

## Product boundary

`apps/native` owns the product shell, routes, UI, SQLite repositories, permissions, notifications,
location, alarms, and other platform behavior. `packages/shared` owns platform-neutral domain code:

- `src/types`: domain and result types.
- `src/content` and `src/copy`: Arabic content and reusable copy.
- `src/logic`: pure calculations and state transitions.
- `src/contracts`: repository contracts.
- `src/testing`: shared fixtures and test helpers.
- `src/constants`: current constants, including `SITE_URL`, which remains until NBD-108.
- `src/tokens`: legacy web theme values; native theme-token ownership and removal remain pending
  until NBD-111.

The Vite SPA was deleted in NBD-107. The root Next.js application is a read-only reference until
NBD-108 deletes it. It is not an active product target, and no native code imports from it.

## The boundary rule

Pure logic never touches I/O. Platform-neutral calculations live in `packages/shared/src/logic`,
with data, dates, and time passed as parameters. The only native pure-logic module is
`apps/native/src/device/logic.ts`. SQLite, filesystem, device APIs, notifications, and logging
stay at the edges. Feature repositories live in `db.ts`; device behavior lives in
`apps/native/src/device`.
The central logger is in `apps/native/src/observability/logger.ts`.

The versioned wird model remains the domain rule from ADR-0006. Definitions are immutable, entries
are append-only, and the version in force is derived from effective date and creation time.

## Folder map

```
apps/native/
  app/                         Expo Router route files and route layouts
  src/
    __tests__/                 native cross-cutting tests
    adhkar/, counter/, home/,
    intentions/, onboarding/,
    prayer-times/, qada/, settings/,
    stats/, wird/               flat feature folders; files, hooks, and db.ts sit side by side
                               where present, with tests in each feature's __tests__/
    db/                        SQLite opening, migrations, and database contracts
    device/                    device services and hooks, plus the only native logic.ts;
                               tests are in __tests__/
    observability/             central logger
    preferences/               app_preferences repository, theme preference, and tests
    shell/                     native providers, shell components, and tests
  modules/nabd-device/         Android Expo module, including exact-alarm status
  plugins/                     Expo config plugins for native configuration
  theme/                       palette.ts and tailwind-theme.cjs

packages/shared/
  src/constants/               current constants; SITE_URL remains until NBD-108
  src/content/                 Arabic product content
  src/copy/                    reusable copy for the native product
  src/logic/                   platform-neutral pure logic
  src/contracts/               platform-neutral repository contracts
  src/testing/                 shared fixtures
  src/types/                   domain types
  src/tokens/                  legacy web theme values; native ownership and removal remain pending until NBD-111
```

Expo Router route files may render feature components, but they do not contain SQLite queries or
device implementation details. The route layer asks feature hooks or repositories for data and
keeps navigation concerns local to `apps/native/app`.

## Import boundaries

| Module | May import | Must not import |
| --- | --- | --- |
| `packages/shared/src/logic` | shared types and other pure shared modules | SQLite, Expo, React Native, device APIs, network, filesystem, clock globals |
| `apps/native/src/device/logic.ts` | device types, copy, and pure device helpers | Expo APIs, SQLite, React, `Date.now()` |
| `apps/native/src/<feature>/db.ts` | the native database contract, shared types, logger | React components, another feature's internals |
| `apps/native/src/<feature>/*` component and hook files | shared content, native theme tokens, and feature repositories | direct SQL in components, unrelated feature internals |
| `apps/native/src/device` | Expo APIs, the Android module, logger, shared contracts | feature UI and route code |
| `apps/native/app` | route layouts and feature entry components | direct SQL and platform implementation |

`packages/shared/eslint.config.mjs` enforces the shared purity restrictions. The native ESLint
configuration does not enforce a logic-to-database boundary. The important data direction is
`hook or use case -> repository -> SQLite`; shared logic and `apps/native/src/device/logic.ts`
remain pure and never reach back into a repository.

## Persistence

SQLite is the native source of truth. The database is `nabd-native.db`, opened and migrated by
`apps/native/src/db/database.ts`, currently at schema version 4. Feature repositories use
parameterized queries and preserve append-only history where the domain requires it. Persistent
preferences use the `app_preferences` table. No Supabase client, remote sync, or authentication
belongs in this architecture.

## Device boundary

Android-only behavior is isolated in three places:

- `apps/native/src/device` for Expo-facing device services and platform-neutral scheduling seams.
- `apps/native/modules/nabd-device` for Kotlin capabilities that Expo does not provide, including
  exact-alarm status.
- `apps/native/plugins` for manifest and build-time configuration.

Location, notification permission, exact-alarm access, battery restrictions, connectivity, OEM
background limits, app lifecycle, and Android API-level differences are separate states. A device
feature is not complete until its state matrix has an actionable result for each relevant state.
