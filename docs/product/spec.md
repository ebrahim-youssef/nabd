# Product Spec, nabd

nabd is a daily wird companion for Muslims. It helps a person commit to a daily devotional
routine, track it, hold themselves accountable, and reflect on what they committed to and did.

## Product boundary

- Product: the Expo React Native app in `apps/native`.
- Delivery: Android first, with platform-neutral boundaries for later iOS work.
- Storage: device-local SQLite in `nabd-native.db`, schema version 4.
- Network: not required for the core product flow.
- Identity: no sign-in or account.
- Sync: no Supabase or cross-device sync. Google sign-in and Supabase sync were dropped by
  ADR-0014 and remain dropped under [ADR-0017](../adr/0017-native-only.md).
- Locale: Arabic, RTL, and Arabic-only at launch.

## Users and core job

Muslims who want to keep a consistent daily wird. The core job is to make the user stick to what
they committed to and give them useful self-accountability and reflection over time.

## Product capabilities

1. **Onboarding**: welcome, questionnaire, recommendation, level selection, and native permission
   setup before the initial wird is seeded.
2. **Daily wird**: versioned checklist for prayers, sunan, Quran, adhkar, fasting, and other
   commitments, with required and voluntary items.
3. **Dhikr counter**: count recitations and append the linked wird completion when the target is
   reached.
4. **Adhkar library**: daily, morning, evening, after-prayer, and sleep content with references,
   counters, resume behavior, and linked completion.
5. **Intentions library**: expandable intentions with evidence and attribution.
6. **Prayer times**: offline calculation from stored coordinates, calculation-method choice, and
   current and next prayer status.
7. **Notifications and alarms**: local prayer notifications, sound choices, countdown behavior,
   and actionable permission or device-setting states.
8. **Qada ledger**: append-only missed-prayer debt and repayment events.
9. **Statistics**: streaks, completion charts, summaries, per-item history, qada access, and
   date-ranged export.
10. **Backup and restore**: versioned export and import for durable records and preferences before
    Play publication, tracked by NBD-91.

## Malleable wird

The wird definition changes over time. Definitions are stored as immutable versions, entries refer
to the version in force on their day, and statistics resolve historical entries against that
version. A level change must not rewrite history.

## Full parity contract

Full parity means every feature the current Next.js application has today, except Google sign-in
and Supabase cross-device sync. Those two capabilities are intentionally not part of the native
product. No other parity exception is implied by this specification.

## Production success

The native release smoke test succeeds when a user can complete onboarding, select and use a daily
wird, close and reopen the app with state preserved in SQLite, exercise the required device
behavior on a release APK, and export and restore their data through the NBD-91 backup flow.
