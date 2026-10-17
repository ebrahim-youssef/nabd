# The Dev Loop, nabd

This is the eight-phase workflow for the native product. The owner-approved native-only
direction is recorded in [ADR-0017](adr/0017-native-only.md). The Expo app in `apps/native` is
the product and release target. `packages/shared` contains the platform-neutral domain package.

## Phase 0, bootstrap and orientation

Read `AGENTS.md`, this workflow, the relevant ADRs, and the source package files. The active
workspace is bootstrapped around `apps/native` and `packages/shared`, not the root web app.
Confirm the Expo Router entry under `apps/native/app`, the native feature folders under
`apps/native/src`, and the shared package before feature work begins.

The native baseline must have the following scripts available:

```text
lint, typecheck, test, build, check:no-sentry
```

## Phase 1, specification

Write one verifiable acceptance sentence for each behavior, identify the ticket, and list the
native and shared modules involved. Check the relevant ADRs before choosing a persistence or device
behavior. Product parity includes every current Next.js capability except Google sign-in and
Supabase cross-device sync, which were dropped by ADR-0014 and remain dropped under ADR-0017.

## Phase 2, branch and task plan

Plan in dependency order: shared content and types, pure logic, SQLite repositories, hooks,
components, and Expo Router routes. Add tests with each implementation slice. Use named constants,
the central logger, semantic theme tokens, and RTL-first layout rules.

### Native and device-feature state matrix

Any feature involving location, notifications, alarms, permissions, filesystem, or background work
must specify these states before implementation:

1. Permission: not asked, granted, denied, and denied forever with a settings deep link.
2. Device toggle: GPS, notifications, DND, or other OS switch separate from app permission.
3. Connectivity: online, offline, and unavailable provider behavior.
4. Accuracy and mode flags: foreground or background mode, timeout, maximum age, and accuracy.
5. OEM behavior: Xiaomi or HyperOS, Samsung One UI, OnePlus, Huawei, and battery restrictions.
6. Android API levels: exact alarms, notification runtime permission, foreground-service rules,
   and edge-to-edge changes.
7. Lifecycle: foreground, background, killed, force-stopped, and after reboot.
8. Failure path: every failure gives the user an actionable next step.
9. iOS portability: keep the shared contract platform-neutral and isolate Android-only code in
   `apps/native/src/device`, `apps/native/modules/nabd-device`, and `apps/native/plugins`.
10. Real-device evidence: CI is not enough for native runtime behavior; record the owner device
    result before merge.

## Phase 3, implementation

Keep platform-neutral pure logic in `packages/shared/src/logic` and native device logic in
`apps/native/src/device/logic.ts`. Put SQLite reads and writes in repositories. Put Expo
permissions, notifications, location, alarms, and background work behind device services.
Keep Android-only Kotlin and config-plugin code in their native boundaries. Do not add a second
web product, authentication, or sync path.

## Phase 4, tests

Tests ship with the code. The mandatory native behavior checks are:

1. SQLite restart persistence: write state, close the database or terminate the process, reopen,
   and verify the state and append-only history.
2. Device state matrix: cover permission, device-toggle, connectivity, API-level, OEM, lifecycle,
   and actionable-failure states for the capability being changed.
3. Backup and restore: export and import the versioned application backup, including the durable
   records and preferences covered by NBD-91.

Shared pure logic uses Vitest. Native logic, repositories, components, and integration seams use
Jest and React Native Testing Library. Release APK behavior requires the real-device checks that
unit tests cannot provide.

## Phase 5, quality gates

Run the real native and shared gates before any push:

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

Review the changed source for unsafe SQL construction, path traversal, unsafe deserialization,
secrets, injection, auth mistakes, and accidental network or telemetry behavior. Check RTL,
loading, empty, denied, offline, and error states on a real device where applicable.

## Phase 6, version and commit

Bump versions for releases according to `CONVENTIONS.md`, stage only the intended files, and use a
Conventional Commit. Do not stage environment files, generated artifacts, or unrelated changes.

## Phase 7, pull request

The pull request records the ticket, ADRs, acceptance criteria, test commands and their results,
device evidence, and the security review. CI must pass for shared and native checks. Merge with a
normal merge commit. Never rebase or squash.

## Phase 8, production release

Build the release APK through the approved EAS path in ADR-0016. The production smoke test is:

1. Install the release APK on the target Android device.
2. Complete native onboarding and select a level.
3. Close and reopen the app, then confirm the wird state persists in SQLite.
4. Exercise the relevant location, notification, alarm, and lifecycle behavior from the device
   state matrix.
5. Export and restore the backup, then confirm the durable records and preferences remain present.
6. Confirm no sign-in, remote sync, or Sentry behavior is required for the product flow.

The native release is not complete until the APK flow and the NBD-91 backup and restore check pass.

## Hard stops

- An unresolved product or platform question has no ADR.
- A device capability has no state matrix.
- SQLite or device I/O appears in pure logic.
- A feature repository change has no colocated test.
- A native test, typecheck, lint, no-Sentry check, build, or device gate fails.
- A release lacks the required version bump.
- A pull request lacks the focused security review.
- A merge uses rebase or squash instead of a normal merge commit.
