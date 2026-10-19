# Stack, nabd

> Native-only stack for the Expo application in `apps/native` and the platform-neutral package
> in `packages/shared`. The legacy web application was deleted in NBD-108.

## Runtime

| Area          | Choice                                                                  | Evidence                                                      |
| ------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------- |
| Application   | Expo SDK `~57.0.24` and React Native `0.86.3`                           | `apps/native/package.json`                                    |
| Routing       | Expo Router `~57.0.22`                                                  | `apps/native/package.json`, `apps/native/app`                 |
| Persistence   | `expo-sqlite ~57.0.3`, database schema version 4                        | `apps/native/package.json`, `apps/native/src/db/database.ts`  |
| Styling       | NativeWind `^4.2.6` with Tailwind `^3.4.19`                             | `apps/native/package.json`, `apps/native/tailwind.config.cjs` |
| Notifications | `expo-notifications ~57.0.21`                                           | `apps/native/package.json`                                    |
| Location      | `expo-location ~57.0.20`                                                | `apps/native/package.json`                                    |
| Shared domain | `@nabd/shared`, including `adhan ^4.4.4`                                | `packages/shared/package.json`                                |
| Release       | EAS CLI `>=24.7.0`, profiles `development`, `preview`, and `production` | `apps/native/eas.json`                                        |

Android is the current target. Platform-neutral contracts stay in shared code, while Android
permissions, channels, exact-alarm status, and manifest changes stay behind the native device
boundary.

## Workspace scripts

`apps/native/package.json` defines the application scripts:

```text
start          expo start
build          expo export --platform android
lint           eslint .
typecheck      tsc --noEmit
test           jest --runInBand
check:no-sentry  node apps/native/scripts/check-no-sentry.mjs
```

`packages/shared/package.json` defines `lint`, `typecheck`, and `test` using ESLint, TypeScript,
and Vitest.

## Feature structure

Pure domain logic lives in `packages/shared/src/logic` and is lint-enforced by
`packages/shared/eslint.config.mjs`. The only native pure-logic module is
`apps/native/src/device/logic.ts`. Native feature folders are flat, with SQLite repositories,
component files, and hook files side by side where present, and tests in `__tests__/`. The
repository is the only feature boundary that performs SQL. Device services in
`apps/native/src/device` own Expo permissions and scheduling. `apps/native/modules/nabd-device`
contains the Kotlin module for capabilities not provided by Expo. `apps/native/plugins` contains
build-time configuration plugins.

Shared code cannot import Expo, React Native, SQLite, device APIs, network clients, filesystem
APIs, or clock globals. It receives data and time as parameters.

## Native theme and fonts

The native visual tokens are defined by `apps/native/theme/palette.ts` and
`apps/native/theme/tailwind-theme.cjs`, where light and dark semantic palettes are exposed to
components.
Bundled Expo fonts are Tajawal for body text, Aref Ruqaa for display text, and Amiri for scripture
text. Font registration is configured in `apps/native/app.json`.

Theme preference is stored in SQLite `app_preferences` under the native preference repository.
The native setting supports light, dark, and system behavior. Components use semantic theme tokens,
not raw colors or dimensions.

## Tests and gates

Native unit and component tests use Jest, `jest-expo ~57.0.5`, and React Native Testing Library
`^13.3.3`. Shared pure logic uses Vitest `^4.1.10`. Tests are colocated with the feature or
shared module they cover.

The native checks are:

```bash
pnpm --filter @nabd/shared lint
pnpm --filter @nabd/shared typecheck
pnpm --filter @nabd/shared test
pnpm --filter apps-native lint
pnpm --filter apps-native typecheck
pnpm --filter apps-native test
pnpm --filter apps-native check:no-sentry
pnpm --filter apps-native build
```

The required behavior checks are SQLite close and reopen persistence, the device state matrix,
and backup and restore coverage for NBD-91. A release APK must also pass the production smoke
flow defined in `docs/workflow.md` and ADR-0016.

## Observability

Native uses `apps/native/src/observability/logger.ts`. The native package has no Sentry dependency;
`check:no-sentry` scans the native tree for Sentry references. User-facing errors stay actionable,
while the logger receives the diagnostic context needed for investigation.
