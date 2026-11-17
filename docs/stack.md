# Stack, nabd

> Native-only stack for the Expo application in the repository root. The legacy web application was
> deleted in NBD-108.

## Runtime

| Area               | Choice                                                   | Evidence                                    |
| ------------------ | -------------------------------------------------------- | ------------------------------------------- |
| Application        | Expo SDK `~57.0.24` and React Native `0.86.3`            | `package.json`                              |
| Routing            | Expo Router `~57.0.22`                                   | `package.json`, `app`                       |
| Persistence        | `expo-sqlite ~57.0.3`, database schema version 4         | `package.json`, `src/db/database.ts`        |
| Styling            | NativeWind `^4.2.6` with Tailwind `^3.4.19`              | `package.json`, `tailwind.config.cjs`       |
| Notifications      | `expo-notifications ~57.0.21`                            | `package.json`                              |
| Location           | `expo-location ~57.0.20`                                 | `package.json`                              |
| Prayer calculation | `adhan ^4.4.4`                                           | `package.json`, `src/prayer-times/logic.ts` |
| Release            | Local Expo prebuild and Gradle `build:apk` / `build:aab` | `package.json`, ADR-0018                    |

Android is the current target. Platform-neutral contracts stay in native feature modules, while
Android permissions, channels, exact-alarm status, and manifest changes stay behind the native
device boundary.

## Workspace scripts

`package.json` defines the application scripts:

```text
start          expo start
build          expo export --platform android
lint           vp lint
format         vp fmt
format:check   vp fmt --check
typecheck      tsc --noEmit
test           jest --runInBand
check:no-sentry  node scripts/check-no-sentry.mjs
```

## Feature structure

Pure domain logic lives in feature `logic.ts` files and `src/lib`, and is lint-enforced
by the Vite+ Oxlint configuration. Native feature folders are flat, with SQLite repositories,
component files, and hook files side by side where present, and tests in `__tests__/`. The
repository is the only feature boundary that performs SQL. Device services in
`src/device` own Expo permissions and scheduling. `modules/nabd-device`
contains the Kotlin module for capabilities not provided by Expo. `plugins` contains
build-time configuration plugins.

Pure native code cannot import Expo, React Native, SQLite, device APIs, network clients, filesystem
APIs, or clock globals. It receives data and time as parameters.

## Native theme and fonts

The native visual tokens are defined by `theme/palette.ts` and
`theme/tailwind-theme.cjs`, where light and dark semantic palettes are exposed to
components.
Bundled Expo fonts are Tajawal for body text, Aref Ruqaa for display text, and Amiri for scripture
text. Font registration is configured in `app.json`.

Theme preference is stored in SQLite `app_preferences` under the native preference repository.
The native setting supports light, dark, and system behavior. Components use semantic theme tokens,
not raw colors or dimensions.

## Tests and gates

Native unit and component tests use Jest, `jest-expo ~57.0.5`, and React Native Testing Library
`^13.3.3`. Tests are colocated with the feature or helper module they cover.

The native checks are:

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm check:no-sentry
pnpm build
```

The required behavior checks are SQLite close and reopen persistence, the device state matrix,
and backup and restore coverage for NBD-91. A release APK must also pass the production smoke
flow defined in `docs/workflow.md` and ADR-0016.

## Observability

Native uses `src/observability/logger.ts`. The native package has no Sentry dependency;
`check:no-sentry` scans the native tree for Sentry references. User-facing errors stay actionable,
while the logger receives the diagnostic context needed for investigation.
