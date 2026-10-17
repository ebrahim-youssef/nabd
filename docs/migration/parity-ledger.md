# Native parity contract

This document records the native parity contract against the current root Next.js application.
The Expo app in `apps/native` is the only product and release target. The Vite SPA is cancelled.
The root application remains a read-only reference until NBD-108 deletes it. The native-only
direction is recorded in [ADR-0017](../adr/0017-native-only.md).

Full parity includes every current Next.js feature except Google sign-in and Supabase
cross-device sync. Those two capabilities were dropped by ADR-0014 and remain dropped. No other
exception is implied.

## A. Feature disposition

| Capability                                                                           | Native disposition    | Evidence or remaining work                                                       |
| ------------------------------------------------------------------------------------ | --------------------- | -------------------------------------------------------------------------------- |
| Onboarding welcome, questionnaire, recommendation, and level seed                    | preserve              | `apps/native/src/onboarding/OnboardingGate.tsx`; permission setup remains NBD-99 |
| Daily wird, checklist, required and voluntary items, celebration, and level changes  | preserve              | `apps/native/src/wird`; version self-healing remains NBD-104                     |
| Dhikr counter and linked wird completion                                             | preserve              | `apps/native/src/counter`, `apps/native/src/wird/WirdChecklist.tsx`              |
| Daily, guided, and repeatable adhkar                                                 | preserve              | Daily surface and remaining reference behavior are NBD-98                        |
| Intentions library                                                                   | preserve              | `apps/native/src/intentions`                                                     |
| Prayer calculation and current or next status                                        | preserve              | `apps/native/src/prayer-times` and `apps/native/src/device`                      |
| Location, method, notifications, silent mode, countdown, battery, and sound settings | preserve              | Native settings gaps are NBD-100 and NBD-102                                     |
| Exact-alarm behavior                                                                 | preserve              | Gating and degraded state are NBD-101                                            |
| Qada ledger                                                                          | preserve              | `apps/native/src/qada`                                                           |
| Statistics, history, charts, summaries, and export                                   | preserve              | Detail parity is NBD-103; complete backup is NBD-91                              |
| Google sign-in and authentication status                                             | intentionally dropped | No native auth flow. Dropped by ADR-0014 and ADR-0017.                           |
| Supabase sync and cross-device recovery                                              | intentionally dropped | No remote client, outbox, or sync metadata. Dropped by ADR-0014 and ADR-0017.    |

Web-only route, PWA, SPA, Cloudflare, Vercel, and browser-service-worker rows are cancelled. They
are not native parity work. Deletion and workspace cleanup are tracked by NBD-107, NBD-108, and
NBD-109.

## B. Native persistence contract

Native uses SQLite database `nabd-native.db` at schema version 4. Migrations and the database
contract live in [`apps/native/src/db/database.ts`](../../apps/native/src/db/database.ts).

| Table                  | Contract                                                                                       |
| ---------------------- | ---------------------------------------------------------------------------------------------- |
| `wird_versions`        | Immutable wird definitions with effective date and creation time.                              |
| `wird_entries`         | Append-only check and uncheck events with day, version, item, completion state, and timestamp. |
| `qada_events`          | Append-only debt and payment deltas per prayer.                                                |
| `adhkar_flow_progress` | Current-day progress for resumable guided flows.                                               |
| `onboarding_state`     | One onboarding record linked to the initial wird version.                                      |
| `app_preferences`      | Device-local preference values and update timestamps.                                          |
| `schema_version`       | Ordered migration version, currently 4.                                                        |

The `app_preferences` repository is in [`apps/native/src/preferences/db.ts`](../../apps/native/src/preferences/db.ts).
Current keys cover celebrated day, calculation method, cached latitude and longitude, location
recorded time, notification preferences, silent mode, and theme. Missing parity settings are
tracked as native work, not represented as legacy storage requirements.

There is no `outbox`, sync cursor, Supabase session, or remote persistence. Native starts with
fresh local state and does not migrate old browser or Capacitor records.

## C. Native device evidence

Device behavior is isolated under `apps/native/src/device`:

| Capability                                                                      | Native evidence                                                                                                                                         |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Location permission, GPS state, connectivity, cache, retry, and settings action | [`useLocationCapability.ts`](../../apps/native/src/device/useLocationCapability.ts), `location.ts`, `connectivity.ts`                                   |
| Local notifications and scheduling                                              | [`usePrayerAlarms.ts`](../../apps/native/src/device/usePrayerAlarms.ts), `notifications.ts`, `schedule.ts`                                              |
| Notification channels and bundled sounds                                        | [`notificationChannels.ts`](../../apps/native/src/device/notificationChannels.ts), `apps/native/app.json`                                               |
| Exact-alarm status                                                              | [`NabdDeviceModule.kt`](../../apps/native/modules/nabd-device/android/src/main/java/expo/modules/nabddevice/NabdDeviceModule.kt), `ExactAlarmStatus.kt` |
| Android manifest and permission injection                                       | [`withNabdAlarms.cjs`](../../apps/native/plugins/withNabdAlarms.cjs)                                                                                    |

Each device feature must cover permission, OS toggle, connectivity, accuracy or mode, Android API
level, OEM battery behavior, foreground and background lifecycle, killed and force-stopped state,
reboot behavior, and an actionable failure result. Android-only code stays behind the device and
plugin boundaries. iOS portability is tracked by NBD-105.

## D. Status on 2026-10-16

| Feature                                | Status                    | Native file or boundary                                             | Ticket           |
| -------------------------------------- | ------------------------- | ------------------------------------------------------------------- | ---------------- |
| Onboarding core flow and SQLite seed   | partial                   | `apps/native/src/onboarding/OnboardingGate.tsx`, `onboarding/db.ts` | NBD-85, NBD-99   |
| Onboarding permissions                 | missing                   | `apps/native/src/onboarding` and `src/device`                       | NBD-99           |
| Home, checklist, and summary           | done for core flow        | `apps/native/src/home`, `src/wird`                                  | NBD-85           |
| Wird versioning and next-day changes   | partial                   | `apps/native/src/wird`                                              | NBD-104          |
| Required and voluntary scheduling      | done                      | `apps/native/src/wird`, `packages/shared/src/logic`                 | NBD-85           |
| Completion celebration and share       | done                      | `apps/native/src/wird/CompletionCelebration.tsx`                    | NBD-85           |
| Wird dhikr counter                     | done                      | `apps/native/src/counter`, `src/wird/WirdChecklist.tsx`             | NBD-85           |
| Guided morning and evening adhkar      | partial to done           | `apps/native/src/adhkar/useAdhkarFlow.ts`                           | NBD-98           |
| Daily adhkar category                  | missing                   | `apps/native/src/adhkar`                                            | NBD-98           |
| Repeatable adhkar lists and references | partial                   | `apps/native/src/adhkar`                                            | NBD-98           |
| Intentions                             | done                      | `apps/native/src/intentions/IntentionsRoute.tsx`                    | NBD-85           |
| Prayer calculation page                | done for core calculation | `apps/native/src/prayer-times/PrayerTimesRoute.tsx`                 | NBD-85           |
| Location capability                    | partial                   | `apps/native/src/device/useLocationCapability.ts`                   | NBD-100          |
| Prayer notifications                   | partial to done           | `apps/native/src/device/usePrayerAlarms.ts`, `notifications.ts`     | NBD-100, NBD-102 |
| Exact-alarm gating                     | partial                   | `apps/native/src/device/usePrayerAlarms.ts`, Kotlin module          | NBD-101          |
| Qada                                   | done                      | `apps/native/src/qada/QadaLedger.tsx`                               | NBD-85           |
| Statistics and charts                  | partial                   | `apps/native/src/stats/StatsRoute.tsx`                              | NBD-103          |
| Complete export and import             | missing                   | `apps/native/src/stats`, SQLite repositories                        | NBD-91           |
| Appearance                             | partial                   | `apps/native/src/settings/SettingsRoute.tsx`, `src/preferences`     | NBD-100          |
| Settings parity                        | partial                   | `apps/native/src/settings`, `src/device`                            | NBD-100          |
| iOS-ready native boundaries            | planned                   | `apps/native/src/device`, Kotlin module, plugins                    | NBD-105          |
| Native boundary and CI split           | planned                   | workspace scripts and CI configuration                              | NBD-106          |
| Android release verification           | planned                   | EAS release APK flow                                                | NBD-89a, NBD-92  |

## E. Stale-point reconciliation

The eight stale points identified by the parity survey are resolved here as follows:

1. Native persistence is decided: SQLite is the engine and schema version 4 is current.
2. `apps/native` has a checked-in generated Android project and manifest. Android backup inclusion,
   exclusion, and restore behavior remain release work under NBD-92.
3. The preference inventory is the SQLite `app_preferences` table and the keys listed in section B.
4. Daily adhkar preservation is open work under NBD-98, including the five-card surface, counters,
   and linked completion.
5. Settings preservation is open work under NBD-100 and NBD-102 for location, display behavior,
   battery handling, countdown, and sound previews.
6. Statistics preservation is open work under NBD-103 for expandable item detail and under NBD-91
   for complete backup export and import.
7. Device evidence now points to the Expo device services, Kotlin module, and config plugin in
   section C. Exact-alarm gating remains a known gap under NBD-101.
8. Backup sequencing remains valid: NBD-91 implements export and import, and NBD-92 verifies
   Android application backup before Play release.

## F. Required acceptance checks

The native parity gate covers:

1. Onboarding creates one initial version and survives SQLite close and reopen.
2. Checklist, counter, adhkar, qada, and statistics preserve their append-only or derived
   behavior across restart.
3. Location, notifications, alarms, countdown, battery, permission, lifecycle, and reboot states
   are checked on a release APK where the capability requires a device.
4. Backup export and import preserve versions, entries, qada, settings, and coordinates covered by
   NBD-91, including restore onto a non-empty device.
5. The EAS release APK passes the production smoke flow in ADR-0016.

Until NBD-91 backup and restore and the release verification gates pass, local SQLite persistence
must not be described as protection against device loss or replacement.
