# Architecture, nabd

> The go-forward product is one app: the Expo React Native application in `apps/native`.
> Android is first. Boundaries must remain suitable for a later iOS implementation, but no iOS
> release is planned yet. The 2026-10-16 owner direction is recorded in
> [ADR-0017](adr/0017-native-only.md).

## Product boundary

`apps/native` owns the complete product: shell, routes, UI, SQLite repositories, permissions,
notifications, location, alarms, Arabic content, copy, pure logic, contracts, fixtures, and
theme tokens. Feature folders own their modules, while `src/lib` holds cross-feature pure helpers.

The legacy web application was deleted in NBD-107 and NBD-108. It is not an active product target,
and no native code imports from it.

## The boundary rule

Pure logic never touches I/O. Calculations in feature `logic.ts` files and `src/lib` receive data,
dates, and time as parameters. SQLite, filesystem, device APIs, notifications, and logging
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
    device/                    device services, hooks, types, copy, and pure logic;
                               tests are in __tests__/
    lib/                        cross-feature pure helpers and result types
    observability/             central logger
    testing/                    characterization fixtures and test helpers
    preferences/               app_preferences repository, theme preference, and tests
    shell/                     native providers, shell components, and tests
  modules/nabd-device/         Android Expo module, including exact-alarm status
  plugins/                     Expo config plugins for native configuration
  theme/                       palette.ts, tokens.ts, and tailwind-theme.cjs
```

Expo Router route files may render feature components, but they do not contain SQLite queries or
device implementation details. The route layer asks feature hooks or repositories for data and
keeps navigation concerns local to `apps/native/app`.

## Import boundaries

| Module | May import | Must not import |
| --- | --- | --- |
| `apps/native/src/**/logic.ts` and `apps/native/src/lib` | feature types, content, copy, and other pure modules | SQLite, Expo, React Native, device APIs, network, filesystem, clock globals |
| `apps/native/src/<feature>/db.ts` | the native database contract, feature types, logger | React components, another feature's internals |
| `apps/native/src/<feature>/*` component and hook files | feature content, native theme tokens, and repositories | direct SQL in components, unrelated feature internals |
| `apps/native/src/device` | Expo APIs, the Android module, logger, shared contracts | feature UI and route code |
| `apps/native/app` | route layouts and feature entry components | direct SQL and platform implementation |

The native ESLint configuration enforces the pure-logic restrictions. The important data direction
is `hook or use case -> repository -> SQLite`; logic files remain pure and never reach back into a
repository.

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
