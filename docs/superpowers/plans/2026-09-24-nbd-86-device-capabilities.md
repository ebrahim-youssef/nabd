# NBD-86 native device capabilities: plan

Date: 2026-09-24. Issue: [#173](https://github.com/ebrahim-youssef/nabd/issues/173).
Supersedes the draft on PR #219 (commit `a95edf0`), which is TypeScript and config over a Kotlin
module that was never written, and predates NBD-94/95/96 on `dev`.

## Decisions

1. **Official Expo libraries first, one small Kotlin module for the rest.** `expo-location`,
   `expo-notifications`, `expo-intent-launcher`, `expo-battery` and
   `@react-native-community/netinfo` cover location, permissions, channels with custom sounds,
   scheduling, reboot re-arming (expo-notifications' receiver handles `BOOT_COMPLETED`, `REBOOT`,
   `MY_PACKAGE_REPLACED`), settings intents and battery status. The legacy `AlarmAudioPlugin`,
   `LocationEnablerPlugin` and battery plugin are not ported.
2. **Kotlin is limited to** `getExactAlarmStatus()` (86b) and the countdown notification with
   native WorkManager (86c). Everything else stays in TypeScript.
3. **Exact alarms** follow ADR-0016: `USE_EXACT_ALARM` on API 33+, `SCHEDULE_EXACT_ALARM` with
   `maxSdkVersion="32"`. expo-notifications silently falls back to an inexact alarm when
   `canScheduleExactAlarms()` is false (`ExpoSchedulingDelegate.kt:106`), which only happens on
   Android 12 after the user revokes it. We read the status through the Kotlin bridge, show an
   actionable state, and open `ACTION_REQUEST_SCHEDULE_EXACT_ALARM`. Never claim exact delivery we
   do not have.
4. **Timezone change needs no receiver.** Alarms are absolute instants computed from coordinates;
   crossing time zones without moving does not change them, and moving needs a new location,
   which needs the app. On foreground (AppState `active`) we recompute and reschedule if the
   offset, date, location or method changed.
5. **Reverse geocoding keeps legacy parity:** BigDataCloud with coordinates rounded to two decimals
   (`lib/impure/reverse-geocode.ts`), only when online, best effort, previous city kept on failure.
   Prayer calculation never depends on it.
6. **Location timeout** is a `Promise.race` of 15 s in TypeScript around
   `getCurrentPositionAsync({ accuracy: High })`, falling back to cached coordinates.
7. **Channel ids are versioned** (sound and usage are immutable after creation). Silent-mode
   routing uses parallel `USAGE_ALARM` channels, as the parity ledger requires. We do not claim
   Do Not Disturb bypass.
8. **Port, don't rebase.** Reuse the draft's pure pieces (`src/device/types.ts`, `logic.ts`,
   `copy.ts`, `schedule.ts`, `db.ts`, `connectivity.ts`, `reverseGeocode.ts` and their tests)
   read from `a95edf0` with `git show`, adapted to dev. Never bring back Sentry, `src/app`,
   `themeBootstrap`, the generated theme, the `mode` preference, raw react-native `Text`, or the
   branch lockfile. Versions come from `pnpm exec expo install`.
9. **Three tickets, three PRs**, each ending with an EAS APK and an owner check on the Xiaomi.
   PR #219 is closed as superseded once 86a merges.

## State matrix (every row needs handling and a test, or an explicit owner-device check)

| Axis                    | States                                                                                                                             |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Location permission     | not asked, denied (ask again), denied forever (`canAskAgain` false: open app settings), granted                                    |
| Location service        | on, off (Play Services dialog via `enableNetworkProviderAsync`, fall back to location settings)                                    |
| Location fix            | ok, timeout (cached coords if any, retry), error                                                                                   |
| Connectivity            | online, offline, unknown; offline with and without cached coordinates; city lookup failing                                         |
| Notification permission | not asked, denied, denied forever (app notification settings), granted; app master switch vs OS switch off                         |
| Exact alarms            | API < 31 not needed; API 31-32 granted or revoked (settings route); API 33+ granted                                                |
| Silent mode             | off (normal channels), on (`USAGE_ALARM` channels)                                                                                 |
| Lifecycle               | foreground, background, killed, reboot, package update, return from system settings (recheck on `active`), timezone or date change |
| Battery / OEM           | optimisation on (non-blocking prompt), off; Xiaomi/HyperOS autostart is a manual path with written steps, no fake deep link        |

## NBD-86a: location and Prayer Times

Branch `ibrahim/173-native-device-capabilities`.

1. `pnpm exec expo install expo-location @react-native-community/netinfo expo-intent-launcher`
   (Claude runs installs; the delegate does not). Config plugin entry for expo-location with
   Arabic permission text, foreground only.
2. Port pure modules from `a95edf0` into `src/device/`: `types.ts`, `logic.ts` (location part),
   `copy.ts`, `connectivity.ts`, `reverseGeocode.ts`, `db.ts` (location keys only) with their
   tests. Fix the draft's gaps: `timeout` result mapped to an actionable state; `city-required`
   actually produced; unknown connectivity treated explicitly.
3. `src/device/location.ts`: adapter over expo-location (permission read and request with
   `canAskAgain`, `hasServicesEnabledAsync`, `enableNetworkProviderAsync`, position with the
   15 s race), plus `openAppSettings` / `openLocationSettings` through expo-intent-launcher.
4. `useLocationCapability` hook: state machine over the matrix rows above, persistence of
   coordinates, city and time, AppState `active` recheck after returning from settings.
5. Prayer Times route on dev's current file: location card with the state's Arabic message and one
   action, immediate render from cached coordinates, city label. Uses `src/shell/Text`, the
   logger and theme classes.
6. Tests: every location row, the AppState recheck, offline with and without cache, timeout.
7. Gates, simplify, security review (third-party request carries only rounded coordinates), PR,
   EAS APK, owner check: permission paths, GPS off dialog, airplane mode, city label.

## NBD-86b: prayer alarms and notification settings

1. `pnpm exec expo install expo-notifications`. Plugin config: the four MP3s
   (`adhan_fajr`, `adhan`, `before`, `iqama`) moved under `apps/native/assets/sounds/`, not read
   from the legacy root `android/`.
2. Config plugin `plugins/withNabdAlarms.cjs`: `USE_EXACT_ALARM`, `SCHEDULE_EXACT_ALARM`
   `maxSdkVersion=32`, `RECEIVE_BOOT_COMPLETED`; tested against a generated manifest.
3. Local Expo module `modules/nabd-device` (Kotlin), one function `getExactAlarmStatus()`
   returning `not-required | granted | denied`, plus JVM unit test. Autolinking checked with
   `expo-modules-autolinking resolve`.
4. `src/device/notifications.ts`: channel creation (versioned ids, normal and alarm-usage sets),
   permission read and request, schedule replace: cancel ours, schedule the next three days of
   frames from `schedule.ts` as date triggers, only future frames, only when permission, master
   switch and coordinates are present. Rollback on failure as the draft's `usePrayerSchedule`.
5. Reschedule triggers: location or method change, settings toggles, AppState `active` (date or
   offset changed), app start.
6. Settings route on dev's current file: master switch, per-moment switches, silent-mode switch,
   exact-alarm status row with its action, notification permission row. Keep system theme and no
   `mode`.
7. Tests for each notification and exact-alarm row, scheduling and rollback. Owner check:
   Android 13 permission prompt, alarm fires with the app killed, after reboot, silent mode on and
   off, each sound.

## NBD-86c: countdown, battery, shell

1. Extend `modules/nabd-device`: `setCountdown({ boundaries, city })`, `clearCountdown()`,
   `getCountdownStatus()`; port `CountdownWorker`, `CountdownFormatter` and the plugin logic from
   `android/app/src/main/java/com/nabd/app/` to Kotlin, unique periodic work `nabd-countdown`
   every 15 minutes with no network constraint, fixed notification id, cancel on disable.
   `androidx.work:work-runtime-ktx` in the module's Gradle file. JVM tests for the formatter.
2. `expo-battery` status and a non-blocking battery exemption prompt through expo-intent-launcher;
   Xiaomi/HyperOS written steps in Arabic in Settings.
3. Shell items the draft claimed but did not do, only where missing on dev: hardware back, keyboard
   avoidance on screens with inputs.
4. Owner check: countdown updates with the app killed, survives reboot, battery exemption flow,
   Xiaomi steps.

## Per-PR workflow

Explore and research are done (opencode reports in the session scratchpad). For each ticket:
opencode builds one numbered step per run with `-c` for follow-ups, Claude reviews every diff and
sends defects back, opencode simplify pass, gates (`pnpm lint`, `typecheck`, `test`,
`check:no-sentry`, and for 86b/86c a clean `expo prebuild` plus Android compile), security review,
commit, PR into `dev`, opencode PR review, EAS APK, owner device check, merge. The owner's device
check is the merge gate; CI cannot prove alarm delivery, reboot or OEM behaviour.
