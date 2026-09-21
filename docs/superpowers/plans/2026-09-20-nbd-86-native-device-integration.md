# NBD-86 Native Device Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the complete Android device-capability layer required for native parity and produce an EAS owner-test APK from the finished PR.

**Architecture:** TypeScript owns the product state machine, persistence, and Arabic UI. A small local Expo Kotlin module owns Android-only capability calls, while a config plugin makes the generated Android project reproducible. The module executes a persisted TypeScript schedule but never calculates prayer times.

**Tech Stack:** Expo SDK 57, React Native 0.86, Expo local modules/config plugins, Kotlin/AndroidX WorkManager, Expo SQLite, Jest/RNTL, Expo EAS Build.

**Spec:** `docs/migration/2026-09-20-nbd-86-device-integration-design.md`

## Global Constraints

- Android only; Expo Go cannot verify custom native capability behavior.
- Preserve the existing shared prayer calculation and `notificationMoments` as the sole schedule source.
- `logic.ts` remains pure; Android and SQLite I/O live behind explicit adapters.
- Arabic-only user copy; no `console.*`, physical-direction layout utilities, dead diagnostics, or silent degradation.
- Use `USE_EXACT_ALARM` for API 33+ and `SCHEDULE_EXACT_ALARM` capped at API 32, per ADR-0016.
- EAS test builds use an explicit profile flag; `__DEV__` does not gate diagnostic behavior.

---

### Task 1: Device capability contract and status model

**Files:**
- Create: `apps/native/src/device/logic.ts`, `apps/native/src/device/types.ts`, `apps/native/src/device/copy.ts`
- Create: `apps/native/src/device/__tests__/logic.test.ts`

**Interfaces:** Produces `DeviceStatus`, `DeviceAction`, `evaluateDeviceStatus(snapshot)`, and
`deviceCopy`; later tasks consume these types without importing Android APIs.

- [ ] Write failing tests for notification, exact-alarm, location/GPS, offline-cache, countdown, and battery branches.
- [ ] Implement only the pure discriminated-union model needed to satisfy each test.
- [ ] Run the focused Jest suite, then refactor duplicate Arabic-action selection.

### Task 2: Native module and reproducible Android configuration

**Files:**
- Create: `apps/native/modules/nabd-device-capabilities/**`
- Create: `apps/native/plugins/withNabdDeviceCapabilities.cjs`
- Modify: `apps/native/app.json`, `apps/native/package.json`
- Create: plugin/module contract and manifest tests under `apps/native/**/__tests__`

**Interfaces:** Consumes Task 1 types; produces `getCapabilitySnapshot`, location/GPS/settings
actions, `replacePrayerSchedule`, `setCountdown`, and `restoreAfterBoot`.

- [ ] Write contract/manifest assertions that fail without module registration, versioned channels,
  exact-alarm permissions, boot receiver, and WorkManager declaration.
- [ ] Implement the local Expo module and config plugin using `AndroidConfig.Permissions.ensurePermission`.
- [ ] Run focused tests, clean `expo prebuild`, manifest assertions, and Android release compilation.

### Task 3: Durable device repository and location integration

**Files:**
- Create: `apps/native/src/device/db.ts`, `apps/native/src/device/useDeviceCapabilities.ts`
- Modify: `apps/native/src/preferences/db.ts`, `apps/native/src/prayer-times/PrayerTimesRoute.tsx`
- Create: corresponding repository, hook, and route tests.

**Interfaces:** Consumes Task 1 and Task 2; persists coordinate/city/cache state and exposes
`requestLocation()` plus status/action handlers to routes.

- [ ] Write failing tests for success persistence, cache fallback, denied/forever-denied, and GPS-off actions.
- [ ] Implement SQLite-backed cache and route integration with a 15-second request boundary.
- [ ] Run focused tests and native typecheck.

### Task 4: Alarms, reminders, sound, reboot, and countdown integration

**Files:**
- Create: `apps/native/src/device/schedule.ts`, `apps/native/src/device/usePrayerSchedule.ts`
- Modify: `apps/native/src/settings/SettingsRoute.tsx`, `apps/native/app/_layout.tsx`
- Create: schedule/hook/settings tests.

**Interfaces:** Consumes cached coordinates, calculation method, and shared `notificationMoments`;
passes only normalized future schedule frames to the local native module.

- [ ] Write failing tests for stale cancellation, three-day scheduling, reminder inclusion, denied permission,
  exact-alarm settings action, countdown enable/disable, and app-relaunch restoration.
- [ ] Implement schedule preparation, channel status handling, boot restore, and actionable settings UI.
- [ ] Run focused tests and Android compile after each native boundary change.

### Task 5: Battery and native-shell lifecycle integration

**Files:**
- Modify: `apps/native/app/_layout.tsx`, `apps/native/src/app/ScreenContainer.tsx`, `apps/native/src/settings/SettingsRoute.tsx`
- Create: `apps/native/src/device/useNativeShell.ts` and tests.

**Interfaces:** Consumes Task 2 actions and Task 1 statuses; produces nonblocking battery flow,
theme/status-bar synchronization, haptic feedback, keyboard-safe layouts, hardware-back policy, and
splash readiness.

- [ ] Write failing route/hook tests for all status actions and lifecycle transitions.
- [ ] Implement the smallest integration that makes the tests pass, keeping shell concerns separate.
- [ ] Run focused tests, lint, and typecheck.

### Task 6: EAS build configuration, documentation, and final verification

**Files:**
- Create: `apps/native/eas.json` or repository-root `eas.json` as required by EAS project discovery
- Modify: `docs/run-locally.md`, `README.md`, `README.en.md`, and the NBD-86 backlog row if needed
- Modify: CI only where a missing native assertion is required.

**Interfaces:** Produces an internal-distribution Android APK profile with a visible EAS URL.

- [ ] Write checks for the explicit diagnostic profile and generated-manifest expectations.
- [ ] Configure the PR-head EAS APK profile without Play submission or secrets in source.
- [ ] Run the complete gate suite, Simplify pass, security review, PR review/fix loop, and EAS cloud build.

### Task 7: Owner verification handoff

**Files:**
- Modify: PR description only; no production code.

- [ ] Attach the EAS build URL and the exact five-part owner APK matrix from the spec.
- [ ] Wait for owner results before merging to `dev`; do not treat Expo Go or CI as device-matrix evidence.
