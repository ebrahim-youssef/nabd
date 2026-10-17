# CONVENTIONS.md, nabd

Code conventions for `apps/native` and `packages/shared`.

## Exports and style

- Use named exports in shared and feature modules.
- Expo Router route files under `apps/native/app` use the default export required by the router.
- Keep functions small and focused. Do not add a class when a function or module is enough.
- Comments explain a non-obvious constraint or reason. They do not narrate the next line.

## Naming

| Kind | Convention | Example |
| --- | --- | --- |
| Logic and helper files | `camelCase.ts`, verb plus noun for actions | `checkOffWird.ts` |
| Components | `PascalCase.tsx` | `WirdChecklist.tsx` |
| Static content | `snake_case.ts` | `adhkar_morning.ts` |
| Repository interfaces | `{Thing}Repository` | `WirdRepository` |
| Hooks | `use{Thing}.ts` | `useDhikrCounter.ts` |
| Route files | Expo Router route names | `app/(tabs)/stats.tsx` |

Use full words. Booleans read as yes or no. Put units in names such as `timeoutMs` and
`priceCents`.

## Logic, repositories, and device code

- Platform-neutral pure logic lives in `packages/shared/src/logic`; its purity boundary is
  enforced by `packages/shared/eslint.config.mjs`. The only native pure-logic module is
  `apps/native/src/device/logic.ts`.
- Native feature folders are flat, with `db.ts`, component files, and hook files side by side
  where present, and tests in `__tests__/`.
- `apps/native/eslint.config.mjs` enforces React Hooks rules, `no-console`, and restricted direct
  imports of React Native `Text` and `TextInput`; it does not enforce a logic-to-database boundary.
- SQLite access belongs in feature repositories or the database layer, never in a component.
- Expo APIs, permissions, notifications, alarms, location, filesystem, and background work belong
  in `apps/native/src/device` or a platform adapter.
- Android-only Kotlin stays in `apps/native/modules/nabd-device`; build-time native setup stays in
  `apps/native/plugins`.
- `packages/shared` owns domain types, Arabic content, copy, pure logic, contracts, and fixtures.
  It must not import Expo, React Native, SQLite, device APIs, network clients, or filesystem APIs.

## Logging and errors

Use the central logger in `apps/native/src/observability/logger.ts`. Do not commit direct
`console.*` calls. Developer logs include the failed condition and non-secret context. User-facing
errors explain the next action without exposing internal or account state.

Repository functions return typed result objects where a failure is expected. Catch and log the
diagnostic cause at the I/O boundary instead of leaking a raw exception into the UI.

## Constants and tokens

No magic numbers or strings. Extract repeated or meaningful values into named constants. Visual
values come from the native theme tokens in `apps/native/theme/palette.ts` and
`apps/native/theme/tailwind-theme.cjs`. Components do not add raw colors, sizes, radii, or
shadows.

## RTL and accessibility

Arabic is the default and the application is RTL. Use logical spacing and alignment utilities and
avoid left or right assumptions. Interactive controls need accessible names, visible state, and a
usable result for loading, empty, denied, offline, and error states.

## Tests

Tests ship with the code and are colocated:

| Layer | Runner | Required focus |
| --- | --- | --- |
| Shared pure logic | Vitest | table-driven behavior with no mocks for pure calculations |
| Native logic and repositories | Jest | SQLite schemas, empty state, duplicates, concurrency, and restart persistence |
| Native components | React Native Testing Library | interaction and accessibility state |
| Device capabilities | Jest seams plus real-device checks | permission, toggle, connectivity, API level, OEM, lifecycle, and failure actions |
| Backup and restore | Jest and Android verification | NBD-91 versioned export/import and non-empty-device union behavior |

Mandatory native behavior checks are SQLite restart persistence, the device state matrix, and
backup and restore. A passing unit suite does not replace release APK verification.

## Commits, releases, and merges

Use Conventional Commits. Bump the version for every release: minor for a new or visibly changed
feature, patch for a fix, dependency, or content change, and major only for a breaking change or
an owner decision. Keep all version fields in agreement and tag the release commit `v<version>`.

Stage specific files only. Never stage `.env` files, generated artifacts, or unrelated changes.
Pull requests merge with normal merge commits. Never rebase or squash.
