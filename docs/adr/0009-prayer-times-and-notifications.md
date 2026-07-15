# ADR-0009 — Prayer times (adhan.js) & prayer notifications

- **Status:** accepted (2026-07-15)

## Context

R2 adds live prayer times to the checklist and optional prayer notifications. The app is an
offline-first PWA with no backend of its own beyond Supabase.

## Decision

### Prayer-time calculation — fully client-side

- Library: **`adhan`** (adhan.js) — pure calculation, works offline, no API.
- Location: browser Geolocation API, asked during onboarding (and on demand from the prayers
  header). Coordinates cached locally (Dexie `syncMeta`-style local record; not synced). No
  reverse geocoding, no location leaves the device.
- Calculation method default: **Egyptian General Authority**, madhab **Shafi**. Stored as a
  local setting; a method picker is a later ticket.
- **Denied/unavailable location ⇒ no times.** The prayers header shows a quiet prompt to
  enable location; nothing else degrades.

### Display

- Each prayer checklist item shows its time (Arabic-Indic, 12-hour).
- A **non-collapsing sub-header** lives under the الصلوات area header (visible even when the
  accordion is closed). State machine over the day's ordered time points — فجر، شروق، ظهر،
  عصر، مغرب، عشاء:
  - For ≤ 30 min after a time point T: "أذّن {name} منذ {n} دقيقة" (شروق: "الشروق منذ…").
  - Otherwise: "باقي {h:mm} على {next}".
  - Ticks every minute (client interval; no timers in logic.ts — time injected).

### Iqamah offsets (fixed constants for now)

| صلاة   | إقامة بعد الأذان |
| ------ | ---------------- |
| الفجر  | ١٥ دقيقة         |
| الظهر  | ١٥ دقيقة         |
| العصر  | ١٥ دقيقة         |
| المغرب | ١٠ دقائق         |
| العشاء | ١٥ دقيقة         |

### Notifications — three moments, honest platform limits

Preferences (set in onboarding, editable later): master enable + per-moment toggles —
**قبل الأذان بربع ساعة**, **عند الأذان**, **عند الإقامة**.

- Permission: Notification API, requested in onboarding only after the user opts in
  (never unprompted). Denied ⇒ toggles disabled with an explanatory line.
- Scheduling: client-side scheduler computes the day's remaining moments and arms them
  (in-page timer + SW `showNotification` when registration is available). **Web reality:**
  without a push server, notifications fire reliably only while the app/SW is alive; this is
  accepted for R2 and documented in the UI copy ("قد لا تصل التنبيهات والتطبيق مغلق"). A
  Supabase-powered Web Push backend is the designated future upgrade path.
- **Sounds:** each moment gets a distinct app sound **only in the foreground** (WebAudio
  tones bundled locally). Background/system notifications use the platform default sound —
  the Web Notification API does not support custom sounds cross-platform. User-custom sounds
  are deferred until the push backend exists.

## Consequences

- Zero server cost; everything works offline after the first location grant.
- Notification reliability is best-effort until a push backend lands (future ADR).
- `logic.ts` stays pure: time-point math takes `now` + computed times as parameters;
  adhan.js calls live in `lib/impure/` behind a provider.
