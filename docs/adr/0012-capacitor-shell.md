# ADR-0012 — Capacitor Android shell (exact prayer alarms)

- **Status:** accepted (owner decision 2026-07-16); §1 superseded by ADR-0013 (bundled static export) — §2–§4 stand
- **Date:** 2026-07-16

## Context

Closed-app prayer notifications need either a push server (ADR-0011, on hold — privacy
trade-off) or on-device scheduled alarms, which the web platform cannot do. The owner chose
a native shell over React Native / Flutter rewrites: it keeps the single Next.js codebase
(months of shipped work), gets AlarmManager in days, and is the cheapest to maintain solo.
A rewrite remains possible later; nothing here forecloses it.

## Decision

### 1. Remote-URL shell, not a static bundle

`capacitor.config.ts` points the Android webview at the production site. Rationale: a
static export (`output: 'export'`) would break the middleware and the Supabase auth
callback and fork the build; the remote shell ships every web deploy to the app instantly,
and the Serwist service worker keeps the app offline-capable after first launch. The
Capacitor bridge is injected into the remote page; the deployed web code branches on
`Capacitor.isNativePlatform()` (lib/impure/native.ts).

Consequence to respect: **native features only activate once the web code that calls them
is deployed to production.**

### 2. Alarms: LocalNotifications on four sound channels

`@capacitor/local-notifications@6` schedules the next **٣ days** of moments (same pure
`notificationMoments` math as the web scheduler, picked calculation method included) with
`allowWhileIdle` exact AlarmManager delivery. Four Android notification channels carry the
sounds from `android/app/src/main/res/raw/` — اقتربت الصلاة / الأذان / أذان الفجر /
الإقامة — so the full adhan plays with the app completely closed. Every launch (and every
method/pref replan) cancels and re-arms the window, which also restores alarms Android
drops on reboot; a boot-receiver is a later enhancement if launch-cadence proves too thin.

### 3. Permissions

POST_NOTIFICATIONS (runtime, via the plugin — the webview has no Notification API),
SCHEDULE_EXACT_ALARM (declared; on some Android 14+ installs the user must grant "Alarms &
reminders" in settings — surfacing that toggle in-app is a follow-up; `USE_EXACT_ALARM` is
an option for Play review as an alarm-core app, owner's call at submission), and location
via `@capacitor/geolocation` (native branch in lib/impure/location.ts).

**Update (NBD-58/59, 2026-07-20):** `USE_EXACT_ALARM` is now declared (auto-granted, fixes the
Android-14 default-deny; `SCHEDULE_EXACT_ALARM` kept as the pre-13 fallback) — the alarm-core
use case is declared in the Play listing. `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` is also
declared and requested from a user gesture in the onboarding "power" step
(`lib/impure/battery.ts`), because OEM battery savers throttle background AlarmManager even with
an exact alarm scheduled — the real cause of late/missed alarms in the field.

### 4. Scope

Android first. iOS shell later if wanted — note the platform cap there: notification
sounds ≤ ٣٠ث system-wide (native apps included), so fajr would use an intro clip. The
`appId com.nabd.app` is **permanent once uploaded to Google Play** — confirm before the
first upload. Signing/upload happen on the owner's machine or CI, outside this repo.

## Alternatives considered

- **TWA**: no plugin bridge → no AlarmManager — rejected.
- **Static-export bundle**: breaks auth/middleware, forks the build — rejected for now.
- **React Native / Flutter rewrite**: months rebuilding shipped UI before the first alarm,
  then permanent dual maintenance — rejected (owner concurs); revisit only if deep-native
  needs (widgets, watch) become real.
