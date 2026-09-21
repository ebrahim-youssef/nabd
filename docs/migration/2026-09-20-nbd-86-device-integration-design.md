# NBD-86 Native Device Integration Design

## Goal

Deliver the Android-only device capabilities required for the Expo replacement: prayer-alarm
reliability, a persistent countdown, location acquisition, and battery reliability, with a clear
Arabic action for every unsupported or denied state.

## Scope and acceptance

NBD-86 implements the four section-D parity matrices:

1. Location permission, enabled GPS, reverse-geocoded city, and offline coordinate/city cache.
2. Notification permission, Android-12 exact-alarm access, exact prayer alarms, sound-channel
   routing, silent-mode behavior without a DND-bypass claim, reminders, cancellation, and reboot
   re-arming.
3. Permanent countdown notification that survives background and process death using WorkManager.
4. Optional battery-optimization exemption with direct request, settings fallback, and a nonblocking
   explanation when declined or unavailable.

It also connects haptics, status-bar appearance, safe areas, hardware back behavior, keyboard
avoidance, and splash-screen readiness to the native shell. Every failure status is displayed in
Arabic with a concrete retry or system-settings action.

## Architecture

`apps/native/src/device` is the JavaScript boundary. It exposes typed capability interfaces, turns
native outcomes into pure status models, and owns no Android API calls. Its `logic.ts` functions are
pure and receive capability snapshots, time, and persisted preferences. `db.ts` stores coordinates,
city cache, device preferences, and schedule material in SQLite.

`apps/native/modules/nabd-device-capabilities` is a local Expo module written in Kotlin. It owns
Android API calls that cannot be truthfully implemented by Expo Go or scheduled notifications:
exact `AlarmManager` alarms, notification-channel inspection/routing, boot re-arm, GPS resolution,
battery settings, and the WorkManager countdown. `apps/native/plugins/withNabdDeviceCapabilities.cjs`
adds only required permissions, receivers, services, and manifest metadata during prebuild.

The native module consumes a JSON schedule precomputed by TypeScript. Kotlin does not calculate
prayer times or duplicate product rules. On boot it reads the persisted schedule and recreates the
future alarm window; on a stale/empty schedule it posts an actionable status rather than inventing
times. Notification channel IDs are versioned whenever their immutable audio policy changes.

## State rules

- Location uses high accuracy, a 15-second timeout, and a ten-minute coordinate cache. Permission
  denial, permanent denial, GPS disabled, timeout, offline cache, and no-cache outcomes remain
  distinct.
- Android 12 checks `canScheduleExactAlarms()` and directs a denied user to system settings. Android
  13+ declares `USE_EXACT_ALARM`; no app-side false-positive "exact" status is shown.
- Notification denial never arms alarms or the countdown. Permanent denial opens application
  settings. Sound routing never claims to override DND; a failed channel capability is reported.
- Alarm re-arming schedules the current three-day window and cancels stale request IDs first.
  Morning/evening adhkar reminders use the existing shared `notificationMoments` output.
- Countdown is immediately visible when enabled, updates via unique WorkManager work, and is removed
  together with its work and channels when disabled. It can keep using cached coordinates offline.
- Battery optimization is advisory: declining or lacking a system activity does not block product
  use, but clearly explains potential delay and offers settings when available.

## Product integration

Prayer Times requests location, persists successful coordinates/city, and updates the display.
Settings exposes notification, sound, countdown, and battery rows plus their live Arabic states.
Application bootstrap restores schedules and device UI state after a normal relaunch. The diagnostic
surface is compiled only in an explicit EAS test profile, never inferred from `__DEV__`.

## Verification and release path

Automated coverage includes pure-state unit tests, repository tests, route tests, local-module
contract tests, config-plugin manifest assertions, and a clean `expo prebuild` followed by Android
release compilation. The normal monorepo gates and native gates must pass before the PR.

Before merge, run the requested Simplify pass, security review, PR review, and repair loop. Build an
internal-distribution APK on EAS from the PR head and give the owner its Expo build URL. Expo Go is
not valid evidence for this ticket. The owner runs the matrix below on that APK; confirmation is the
merge gate for `dev`. Promotion to `master` follows the same green release-PR checks after `dev` is
merged.

## Owner APK matrix

1. **Location:** fresh install; grant location; deny once; deny permanently; turn GPS off; test once
   online and once with airplane mode after a successful lookup. Confirm coordinates/city survive a
   relaunch and every failed state offers the stated Arabic action.
2. **Alarms:** enable notifications and prayer alarms; verify upcoming prayer/reminder alarms, sound
   choice, cancellation when disabled, Android-12 exact-alarm settings route if applicable, silent/
   vibrate behavior without DND claims, then reboot and confirm future alarms are re-created.
3. **Countdown:** enable it; background and swipe the app away; confirm the ongoing countdown remains
   and updates; disable it and confirm the notification disappears; repeat after reboot.
4. **Battery:** request the exemption, decline it, then open settings fallback. Confirm the app keeps
   working in every branch and warns rather than blocking.
5. **Shell:** change theme, use a keyboard field, navigate with the Android back button, rotate no
   screens (portrait lock), and cold-start/relaunch to check splash, safe areas, and status bar.
