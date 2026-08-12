# Migration parity ledger

This ledger is the minimum behavioral contract for replacing the old Next.js and Capacitor
application. Migration pull requests close bounded rows and gates in this document. The ledger is
not an exhaustive product specification.

The old application baseline is commit `1b479334a3f420530b3b1df5a4014a07273b561d`
(`feat(native): brand launcher icon, splash & Play-store pack (NBD-59) (#159)`), the last
application change before ADR-0014. Any change to the old application after this baseline must be
ported to each affected target immediately or recorded as a migration delta in this document.

Decision vocabulary:

- `preserve`: keep the user-visible capability, with a platform-appropriate implementation.
- `replace`: ship the same user outcome through a deliberately different product surface.
- `intentionally drop`: remove the capability as an accepted migration decision.
- `defer`: do not ship it in the migration, but keep it as named follow-up work.

## A. Feature disposition

| Capability                                                                                                                                 | Feature        | Decision             | Baseline evidence and required disposition                                                                                                                                                                                                                                                                                                                                                                             |
| ------------------------------------------------------------------------------------------------------------------------------------------ | -------------- | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Daily adhkar library, guided morning/evening flows, repeatable lists, daily counters, and linked wird completion                           | `adhkar`       | `preserve`           | Preserve the flows and their different persistence rules. Morning/evening resume for the current day; after-prayer/sleep counts reset each visit; completing a linked flow appends a wird entry. [feature](../../features/adhkar/) · [e2e](../../e2e/adhkar.spec.ts)                                                                                                                                                   |
| Google OAuth, session state, native deep-link callback, sign-out, and authentication status                                                | `auth`         | `intentionally drop` | ADR-0014 ships both targets without sign-in. Remove the OAuth routes, Supabase session, native callback, and auth status rather than silently leaving nonfunctional controls. [repository](../../features/auth/db.ts) · [ADR-0014](../adr/0014-spa-native-split.md)                                                                                                                                                    |
| Dhikr tap counter and automatic completion of its linked wird item                                                                         | `counter`      | `preserve`           | Reaching the target appends a `done: true` event and the checklist and statistics must observe it as an ordinary completion. [repository](../../features/counter/db.ts) · [daily adhkar e2e](../../e2e/adhkar.spec.ts)                                                                                                                                                                                                 |
| Intentions library with deeds, bullet intentions, and cited evidence                                                                       | `intentions`   | `preserve`           | Preserve browse and expand behavior and access through the libraries hub. [feature](../../features/intentions/) · [e2e](../../e2e/intentions.spec.ts)                                                                                                                                                                                                                                                                  |
| Welcome, three-question recommendation, level selection, permission setup, and one-time onboarding gate                                    | `onboarding`   | `preserve`           | Preserve the questionnaire mapping and seed exactly one initial wird version. Onboarding remains complete while any wird version exists. [logic](../../features/onboarding/logic.ts) · [repository](../../features/onboarding/db.ts) · [e2e](../../e2e/onboarding.spec.ts)                                                                                                                                             |
| Prayer calculations, dedicated page, current/next-prayer status, method choice, reminders, exact alarms, and native sounds                 | `prayer-times` | `preserve`           | Preserve offline calculation from stored coordinates, the Egyptian/Shafi defaults, selected-method persistence, and the native behavior defined in section D. [feature](../../features/prayer-times/) · [e2e](../../e2e/prayer-times.spec.ts)                                                                                                                                                                          |
| Append-only missed-prayer debt and payment ledger                                                                                          | `qada`         | `preserve`           | Preserve one positive event per prayer when debt is added and one `-1` event for each payment. Preserve reload durability and derived balances. [repository](../../features/qada/db.ts) · [e2e](../../e2e/qada.spec.ts)                                                                                                                                                                                                |
| Wird level, appearance, location, prayer method, notification moments, silent-mode alarm, countdown, battery exemption, and sound previews | `settings`     | `preserve`           | Preserve the behavior-changing defaults in section C and actionable device outcomes in section D. [feature](../../features/settings/) · [e2e](../../e2e/settings.spec.ts)                                                                                                                                                                                                                                              |
| Completion summaries, streaks, charts, per-item history, qada link, and date-ranged JSON export                                            | `stats`        | `preserve`           | Preserve calculations against the version in force on each historical day. The current JSON export remains a baseline capability; its durability limitation is recorded in section F. [logic](../../features/stats/logic.ts) · [repository](../../features/stats/db.ts) · [e2e](../../e2e/stats.spec.ts)                                                                                                               |
| Supabase push/pull, OAuth-scoped remote rows, outbox delivery, and pull cursors                                                            | `sync`         | `intentionally drop` | ADR-0014 removes Supabase and cross-device sync. Today this is the only remote copy of `wirdVersions` and `wirdEntries`; `qadaEvents`, settings, coordinates, and adhkar flow state are not synced. Removing sync therefore also removes the only existing remote recovery path for wird history. [repository](../../features/sync/db.ts) · [schema](../../lib/db/db.ts) · [ADR-0014](../adr/0014-spa-native-split.md) |
| Versioned daily wird, checklist, required/voluntary distinction, level changes, completion celebration, and offline local state            | `wird`         | `preserve`           | Preserve immutable definitions, append-only check/uncheck events, historical version resolution, next-day manual level changes, self-healing content upgrades, and once-per-day celebration. [repository](../../features/wird/db.ts) · [offline e2e](../../e2e/wird-offline.spec.ts) · [celebration e2e](../../e2e/celebration.spec.ts)                                                                                |
| Public landing page and product-route namespace                                                                                            | route-level    | `replace`            | Replace the current `/` app route with a production landing page. Product screens move below `/app/*`; only `/` is indexed. [current route](../../app/page.tsx) · [ADR-0014](../adr/0014-spa-native-split.md)                                                                                                                                                                                                          |

## B. Persistence contract

### IndexedDB records

The baseline database is Dexie database `nabd`. The SPA keeps Dexie. The native persistence
engine remains subject to the final architecture decision, but it must preserve the following
record semantics.

| Store          | Primary key and indexes                                                                             | Write contract                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Durability class                                                                 |
| -------------- | --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `wirdVersions` | Primary key `id`; indexes `effectiveFrom`, `createdAt`                                              | Immutable snapshots. Onboarding creates the first version only when none exists. Later changes append a version; a manual level change is effective the next day. A content upgrade may be effective today only when today has no entries, otherwise tomorrow.                                                                                                                                                                                                                                                               | Durable history. Currently local plus Supabase remote copy.                      |
| `wirdEntries`  | Primary key `id`; indexes `day`, `versionId`, compound `[day+itemId]`, and schema field `checkedAt` | Append-only check/uncheck events. Each event references the version in force for its day. Completion from checklist, counter, or adhkar uses the same event shape. Existing rows are never edited or deleted. **Resolved in NBD-84 slice 1:** the baseline indexed `checkedAt` while the row only ever carried `at`, so that index matched nothing. The replacement clients index `at`, the field `WirdEntry` declares in `packages/shared`. Replacement clients start with fresh local state, so no migration was required. | Durable history. Currently local plus Supabase remote copy.                      |
| `outbox`       | Auto-increment primary key `seq`; index `createdAt`                                                 | A write to a synced version or entry and its outbox row occur in one transaction. Rows are removed after a successful remote upsert.                                                                                                                                                                                                                                                                                                                                                                                         | Delivery bookkeeping. Intentionally dropped with sync.                           |
| `syncMeta`     | Primary key `key`                                                                                   | Holds per-table pull cursors `pull_cursor:wird_versions` and `pull_cursor:wird_entries`; missing cursors begin at `1970-01-01T00:00:00Z`.                                                                                                                                                                                                                                                                                                                                                                                    | Delivery bookkeeping. Intentionally dropped with sync.                           |
| `adhkarFlow`   | Primary key `categoryId`                                                                            | One row per once-daily category with `day`, active index, count, and finished state. A different day invalidates the prior position. Morning/evening use it; repeatable categories deliberately do not.                                                                                                                                                                                                                                                                                                                      | Resumable convenience state. Local only; loss costs recounting the active dhikr. |
| `qadaEvents`   | Primary key `id`; index `prayerId`                                                                  | Append-only ledger. Adding `N` missed days appends `+N` once for each of the five prayers. Paying one prayer appends `-1` for that prayer. Events are not edited or deleted.                                                                                                                                                                                                                                                                                                                                                 | Durable history. Local only.                                                     |

Sources: [Dexie schema](../../lib/db/db.ts), [onboarding repository](../../features/onboarding/db.ts),
[wird repository](../../features/wird/db.ts), [adhkar repository](../../features/adhkar/db.ts),
[counter repository](../../features/counter/db.ts), [qada repository](../../features/qada/db.ts),
and [sync repository](../../features/sync/db.ts).

### Device-local keys and native state

| Storage                     | Key                                                 | Value and behavior                                                                                                              | Durability class                                              |
| --------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `localStorage`              | `nabd:notification-prefs`                           | Full notification preference object. Defaults are in section C. Never synced.                                                   | Durable device preference.                                    |
| `localStorage`              | `nabd:coords`                                       | Last latitude and longitude. Used to calculate prayer times and as the offline fallback after a failed fresh fix. Never synced. | Durable device preference needed for offline prayer times.    |
| `localStorage`              | `nabd:city`                                         | Last reverse-geocoded Arabic city label. Used when the network lookup fails. Never synced.                                      | Replaceable cache.                                            |
| `localStorage`              | `nabd:calc-method`                                  | Selected prayer calculation method. Invalid or missing values fall back to `egyptian`. Never synced.                            | Durable device preference.                                    |
| `localStorage`              | `nabd:theme`                                        | `light` or `dark`; only `dark` is applied from storage before paint. Never synced.                                              | Durable device preference.                                    |
| `localStorage`              | `nabd:mode`                                         | `classic` or `modern`; invalid or missing values fall back to `classic`. Never synced.                                          | Durable device preference.                                    |
| `localStorage`              | `nabd:celebrated-day`                               | Last day on which the completion celebration was shown.                                                                         | Resumable presentation state; loss may repeat a celebration.  |
| Android `SharedPreferences` | file `nabd.countdown`, keys `boundaries` and `city` | Serialized prayer boundaries and optional city for the persistent countdown worker. Disabling the feature removes both keys.    | Native worker input; regenerated when the feature is enabled. |
| Supabase client storage     | not determined from code                            | The browser client persists the auth session in browser storage, but the exact generated key is library-controlled.             | Intentionally dropped with auth.                              |

Sources: [notifications](../../lib/impure/notifications.ts), [location](../../lib/impure/location.ts),
[reverse geocode](../../lib/impure/reverse-geocode.ts), [prayer calculation](../../lib/impure/prayer.ts),
[appearance](../../lib/impure/appearance.ts), [celebration](../../features/wird/components/CompletionCelebration.tsx),
and [countdown plugin](../../android/app/src/main/java/com/nabd/app/CountdownNotificationPlugin.java).

### Migration behavior

ADR-0014 authorizes fresh local state in both new applications and explicitly provides no data
migration from the old Capacitor/Dexie application. This is an accepted decision, not an
implementation gap. The first launch of each new target therefore begins onboarding with no old
versions, entries, qada events, settings, coordinates, or native countdown state.

This fresh-state decision does not settle the durability of data created after migration. That
open decision is recorded in section F.

### Required characterization fixture

Add one fixture during the first persistence implementation PR. It must be representable in both
target persistence engines and contain:

1. Two immutable wird versions with different definitions and consecutive `effectiveFrom` dates.
2. Check and uncheck entries on days governed by both versions, including more than one event for
   the same day and item so latest-event resolution is exercised.
3. A qada debt addition and a later `-1` payment for one prayer.
4. Onboarding completion, represented by the existence of the first wird version rather than a
   separate completion flag.
5. Non-default settings: dark theme, modern mode, a non-Egyptian calculation method, cached
   coordinates and city, notifications enabled with at least one moment disabled,
   `alarmOnSilent: true`, and `permanentCountdown: true`.

The fixture gate must prove that each version governs the correct days, latest events determine
current item state, historical statistics do not change after the version change, the qada balance
reflects both events, onboarding does not return, and all non-default settings round-trip.

## C. Critical settings defaults

Only settings that change application behavior are included.

| Setting                              | Current default                                                                                                                                                                                  | Evidence and consequence                                                                                                                                                 |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Wird level                           | No fixed default. It is recommended from the three questionnaire scores: lower third `level-1`, middle third `level-2`, upper third `level-3`; the user may choose another level before seeding. | [onboarding logic](../../features/onboarding/logic.ts) · [levels](../../content/levels.ts)                                                                               |
| Manual wird level change             | Current stored level; changes take effect tomorrow and do not rewrite today or history.                                                                                                          | [wird repository](../../features/wird/db.ts) · [e2e](../../e2e/adhkar.spec.ts)                                                                                           |
| Prayer calculation method            | `egyptian`, with Shafi madhab.                                                                                                                                                                   | [prayer calculation](../../lib/impure/prayer.ts)                                                                                                                         |
| Coordinates                          | None. Prayer times remain unavailable until a location is granted or cached.                                                                                                                     | [location](../../lib/impure/location.ts)                                                                                                                                 |
| Notifications master switch          | Off.                                                                                                                                                                                             | [notifications](../../lib/impure/notifications.ts)                                                                                                                       |
| Before-adhan reminder                | On when notifications are enabled; 15 minutes before adhan.                                                                                                                                      | [notifications](../../lib/impure/notifications.ts) · [prayer constants](../../features/prayer-times/constants.ts)                                                        |
| At-adhan reminder                    | On when notifications are enabled.                                                                                                                                                               | [notifications](../../lib/impure/notifications.ts)                                                                                                                       |
| Iqamah reminder                      | On when notifications are enabled. Offsets are 15 minutes after fajr, dhuhr, asr, and isha, and 10 minutes after maghrib.                                                                        | [notifications](../../lib/impure/notifications.ts) · [prayer constants](../../features/prayer-times/constants.ts)                                                        |
| Morning and evening adhkar reminders | Both on when notifications are enabled. Morning is 30 minutes after Fajr iqamah; evening is 30 minutes after Asr iqamah.                                                                         | [notifications](../../lib/impure/notifications.ts) · [prayer logic](../../features/prayer-times/logic.ts) · [prayer constants](../../features/prayer-times/constants.ts) |
| Play alarm through silent/vibrate    | Off. When enabled on Android, use parallel `USAGE_ALARM` channels; Do Not Disturb override is not requested.                                                                                     | [notifications](../../lib/impure/notifications.ts) · [alarm plugin](../../android/app/src/main/java/com/nabd/app/AlarmAudioPlugin.java)                                  |
| Permanent countdown notification     | Off.                                                                                                                                                                                             | [notifications](../../lib/impure/notifications.ts)                                                                                                                       |
| Theme                                | `light`.                                                                                                                                                                                         | [appearance](../../lib/impure/appearance.ts)                                                                                                                             |
| Display mode                         | `classic`.                                                                                                                                                                                       | [appearance](../../lib/impure/appearance.ts)                                                                                                                             |
| Battery optimization exemption       | No application preference is stored. Current OS status is queried; requesting exemption is optional and never blocks onboarding.                                                                 | [battery adapter](../../lib/impure/battery.ts)                                                                                                                           |

## D. Device state matrices

These are parity requirements derived from current code, real-device fixes in
[the backlog](../backlog.md), and the planning dimensions in [the workflow](../workflow.md).
“Not determined from code” is a required real-device characterization, not permission to ignore
the state.

### Exact prayer alarms and custom sound

| State                                      | Expected parity outcome                                                                                                                                                                                | Failure action or gap                                                                                                                                                       |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Notification permission granted            | With the master switch on and coordinates present, cancel stale pending notifications and schedule the next three days with `allowWhileIdle`. Use the per-moment channels and the Fajr-specific adhan. | Log scheduling failures and retry on the next arm. Verify the 72-hour window on a real device.                                                                              |
| Notification permission denied             | Do not arm alarms and keep the preference disabled.                                                                                                                                                    | Explain that notification permission is required and provide a retry from settings.                                                                                         |
| Notification permission permanently denied | Current code collapses this into `denied`; permanent denial is not distinguished.                                                                                                                      | Migration must provide an application-settings deep link. Exact current behavior is not determined from code.                                                               |
| Exact-alarm access unavailable             | The manifest requests both `USE_EXACT_ALARM` and `SCHEDULE_EXACT_ALARM`, but runtime special-access detection is not present.                                                                          | Required fallback or settings action is not determined from code. Verify supported Android API levels and distribution policy before parity sign-off.                       |
| Alarm-on-silent off                        | Use normal high-importance channels. Device ringer behavior applies.                                                                                                                                   | No DND override.                                                                                                                                                            |
| Alarm-on-silent on                         | Route through parallel `USAGE_ALARM` channels so sound is audible on silent/vibrate.                                                                                                                   | If custom channel creation fails, current code silently falls back to normal channels and logs a warning. Surface an actionable degraded-state message in the migrated app. |
| Offline                                    | Calculate locally from cached coordinates and the selected method; scheduling does not require a network request.                                                                                      | Without cached coordinates, alarms cannot be calculated. Direct the user to obtain a location fix.                                                                          |
| Background or process killed               | Scheduled Android alarms are intended to fire with the UI process absent.                                                                                                                              | Automated browser tests do not prove this. Real-device verification is required.                                                                                            |
| Force-stopped                              | Backlog acceptance says alarms fire after battery exemption, but this outcome is not established by the code or automated tests alone.                                                                 | Test on the owner’s target devices and record the exact OS/OEM result.                                                                                                      |
| Reboot                                     | Android may drop scheduled alarms. Current code re-arms only on the next application launch.                                                                                                           | No boot-time re-arm path is present. Either preserve the next-launch limitation explicitly or add and test reboot restoration.                                              |

Sources: [native scheduler](../../features/prayer-times/native-alarms.ts),
[notification preferences](../../lib/impure/notifications.ts),
[alarm plugin](../../android/app/src/main/java/com/nabd/app/AlarmAudioPlugin.java), and
[manifest](../../android/app/src/main/AndroidManifest.xml). Relevant fixes: NBD-46, NBD-58,
NBD-59, and NBD-64 in [the backlog](../backlog.md).

### Permanent countdown notification

| State                                                | Expected parity outcome                                                                                                                                                                  | Failure action or gap                                                                                                                            |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Feature off                                          | Cancel unique work and the ongoing notification; remove stored boundaries and city.                                                                                                      | None. This is the default.                                                                                                                       |
| Feature on with notification permission granted      | Post an ongoing countdown immediately, then refresh unique periodic work every 15 minutes from three days of boundaries. Show the Hijri date and cached or resolved city when available. | Log native synchronization failure without blocking the rest of the app.                                                                         |
| Notification permission denied or permanently denied | Current countdown bridge does not check permission itself; the UI only exposes the toggle when master notifications are enabled.                                                         | Exact OS result is not determined from code. Migration must keep the toggle off and provide retry or application-settings action as appropriate. |
| Offline with cached coordinates/city                 | Compute boundaries locally and use the cached city.                                                                                                                                      | Continue without a city when no cached label exists.                                                                                             |
| Offline without cached coordinates                   | Boundaries cannot be produced by the caller.                                                                                                                                             | Direct the user to obtain a location fix; exact current UI is not determined from code.                                                          |
| Background or process killed                         | WorkManager is intended to refresh the ongoing notification without the UI process.                                                                                                      | Verify timing and continued display on a real device. Periodic work is not exact.                                                                |
| Force-stopped                                        | Backlog NBD-65 says the countdown survives force-stop, but this is not demonstrated by code or automated tests alone.                                                                    | Real-device characterization is required.                                                                                                        |
| Reboot                                               | WorkManager and stored input may restore work, but reboot behavior is not determined from this application code.                                                                         | Test a reboot with the feature enabled and record whether work and notification resume without launching the app.                                |

Sources: [countdown adapter](../../lib/impure/countdown-notification.ts),
[plugin](../../android/app/src/main/java/com/nabd/app/CountdownNotificationPlugin.java),
[worker](../../android/app/src/main/java/com/nabd/app/CountdownWorker.java), and NBD-65/NBD-70 in
[the backlog](../backlog.md).

### Location and device GPS switch

| State                         | Expected parity outcome                                                                                                                              | Failure action or gap                                                                      |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Permission granted, GPS on    | Request a high-accuracy fix with a 15-second timeout and maximum cached age of 10 minutes; cache and announce the coordinates.                       | On environmental failure, use cached coordinates when present; otherwise offer retry.      |
| Permission denied             | Return the distinct `denied` result and do not claim GPS is off.                                                                                     | Explain that app permission is required and offer another user-initiated attempt.          |
| Permission permanently denied | Current code does not distinguish permanent denial from denial.                                                                                      | Migration must provide an application-settings deep link.                                  |
| GPS off                       | Show the Google Play Services in-app enable-location dialog before requesting permission. If declined or not resolvable, return `services-disabled`. | Tell the user GPS is off and allow retry; do not present it as an app-permission failure.  |
| Offline, GPS on               | Use high-accuracy GPS, which does not require the network provider. If the fresh fix times out, use cached coordinates.                              | If neither fresh nor cached coordinates are available, return unavailable and offer retry. |
| Reverse geocode offline       | Return the cached city label when present; prayer calculation still works without the label.                                                         | Continue without a city label when no cache exists.                                        |
| Background, killed, or reboot | The current app requests location only from a foreground user action and then uses cached coordinates. No background location behavior is required.  | Preserve the cached-coordinate behavior. Background refresh is not a parity requirement.   |

Sources: [location adapter](../../lib/impure/location.ts),
[location-enabler bridge](../../lib/impure/location-enabler.ts),
[Android plugin](../../android/app/src/main/java/com/nabd/app/LocationEnablerPlugin.java), and
NBD-48/NBD-63/NBD-68 in [the backlog](../backlog.md).

### Battery-optimization exemption

| State                                       | Expected parity outcome                                                                                   | Failure action or gap                                                                                               |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| App is battery optimized                    | From a user gesture, request the direct OS exemption. The step is optional and must not block onboarding. | If the direct intent fails, open the battery-optimization settings list. Show the existing OEM manual instructions. |
| App is already exempt                       | Do not require another prompt.                                                                            | Exact success-state UI is not determined from code; current settings row remains available.                         |
| User declines                               | Continue onboarding and leave alarms subject to OEM throttling.                                           | Keep the settings entry available and explain the reliability consequence.                                          |
| Request permission unavailable or stale APK | Treat an unimplemented plugin as a warning rather than an application error.                              | Open the settings fallback when possible. NBD-69 requires retest on a rebuilt APK.                                  |
| Offline                                     | The OS exemption flow does not require application network access.                                        | No network-specific failure action.                                                                                 |
| Background or process killed                | Exemption exists to reduce OEM throttling of alarms while the application is not running.                 | Outcome remains OEM-dependent and needs real-device verification.                                                   |
| Force-stopped                               | Backlog acceptance expects the adhan to fire after exemption, but code cannot establish that outcome.     | Test on each supported OEM/API combination and record limitations.                                                  |
| Reboot                                      | The OS exemption may remain, but alarm re-arming remains a separate concern.                              | Verify exemption state and alarm behavior after reboot independently.                                               |

Sources: [battery adapter](../../lib/impure/battery.ts), [manifest](../../android/app/src/main/AndroidManifest.xml),
and NBD-58/NBD-69 in [the backlog](../backlog.md).

## E. Golden journeys

Each migration implementation must assign these gates to the target or targets that own the
capability. Platform-inapplicable steps may be adapted, but the preserved user outcome must stay
observable.

| Gate                                                  | Parity outcome                                                                                                                                                                                            | Baseline evidence                                                                                       |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| 1. Onboard once into the correct level                | Beginner, middle, and established answers select levels 1, 2, and 3 respectively; the questionnaire does not return after reload.                                                                         | [onboarding e2e](../../e2e/onboarding.spec.ts)                                                          |
| 2. Persist a daily check                              | Checking one wird item survives reload and leaves unchecked items unchanged. Native must also prove restart persistence; the SPA does not claim an offline shell reload.                                  | [wird offline e2e](../../e2e/wird-offline.spec.ts)                                                      |
| 3. Complete dhikr into the wird                       | Counting the daily istighfar card to its target marks the linked home item complete and the state survives reload.                                                                                        | [adhkar e2e](../../e2e/adhkar.spec.ts)                                                                  |
| 4. Preserve once-daily versus repeatable adhkar state | Morning/evening resume their current-day position across reload and tab changes; after-prayer/sleep counters reset on revisit.                                                                            | [adhkar e2e](../../e2e/adhkar.spec.ts)                                                                  |
| 5. Change level without rewriting today               | Selecting a new level keeps today’s checked state and checklist definition; the new version begins tomorrow.                                                                                              | [adhkar e2e](../../e2e/adhkar.spec.ts)                                                                  |
| 6. Celebrate required completion once                 | Completing every required item shows the celebration once for that day; voluntary items do not gate it and reload does not repeat it.                                                                     | [celebration e2e](../../e2e/celebration.spec.ts)                                                        |
| 7. Keep qada as an append-only balance                | Adding three missed days adds three to each prayer; paying one fajr decreases only fajr; balances survive reload.                                                                                         | [qada e2e](../../e2e/qada.spec.ts)                                                                      |
| 8. Recompute prayer times from durable settings       | Enabling location shows all prayer times; cached coordinates survive reload; changing to Umm al-Qura changes Fajr and persists.                                                                           | [prayer-times e2e](../../e2e/prayer-times.spec.ts)                                                      |
| 9. Persist notification choices                       | Opting in persists enabled moments and a disabled iqamah choice; skipping permission setup leaves the master switch off.                                                                                  | [notifications e2e](../../e2e/notifications.spec.ts)                                                    |
| 10. Derive statistics from the ledger                 | A newly checked item appears in streak, chart, and completion surfaces, and a week export produces a date-named JSON file. Add the section B two-version fixture to prove historical version correctness. | [stats e2e](../../e2e/stats.spec.ts) · [stats unit tests](../../features/stats/__tests__/logic.test.ts) |
| 11. Persist appearance and expose behavioral settings | Theme and display mode survive reload; location enablement and sound previews remain reachable from settings.                                                                                             | [settings e2e](../../e2e/settings.spec.ts)                                                              |
| 12. Browse both libraries without onboarding          | Adhkar categories and the intentions library remain readable without creating a wird; deep links and the libraries hub reach the requested content.                                                       | [adhkar e2e](../../e2e/adhkar.spec.ts) · [intentions e2e](../../e2e/intentions.spec.ts)                 |

Device-only alarm, countdown, GPS-off, battery, killed-process, force-stop, and reboot gates are
defined in section D. Browser e2e coverage cannot close them; the owner’s real-device result is
the merge evidence.

## F. Durability decision, open

The migration deliberately removes the current remote sync and begins with fresh state, but it
does not yet decide how data created after migration survives long-term loss or replacement of a
device. The owner must choose a durability path before the old application is deleted.

Current facts:

- Android declares `android:allowBackup="false"` in
  [the manifest](../../android/app/src/main/AndroidManifest.xml). This arrived with the original
  Capacitor scaffold in NBD-46 (`0fbfb0a`) as a template default, not from the security hardening
  pass in #149. Enabling backup is therefore a fresh decision, not the reversal of a deliberate
  security choice, though it still needs its own review of what the backup set may contain.
- The application never calls `navigator.storage.persist()`.
- [The JSON export](../../features/stats/hooks/useStatsExport.ts) exports a selected week or month
  range of entries and derived statistics. There is no import path, and it is not a complete
  application backup.
- [Supabase sync](../../features/sync/db.ts) is the only remote copy of `wirdVersions` and
  `wirdEntries`. ADR-0014 intentionally drops it. Qada, settings, coordinates, adhkar resume state,
  and native scheduling state have no remote copy today.
- Local database choice alone does not provide recovery after uninstall, cleared application
  data, device loss, or device replacement.

The decision must select and test one or more of these options:

1. Complete user-initiated export and import covering versions, entries, qada events, settings,
   coordinates as appropriate, and a versioned backup format.
2. Android application backup enabled and tested for restore, including database and preference
   inclusion/exclusion rules.
3. Encrypted cloud backup with a documented key, recovery, deletion, and failure model.
4. A later authenticated sync service that restores at least the durable history and has a stated
   conflict model.

Until this decision is recorded, migration implementations must not claim that local persistence
alone protects multi-year devotional history.
