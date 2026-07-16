# ADR-0011 — Push notification backend (app closed)

- **Status:** proposed — awaiting owner acceptance
- **Date:** 2026-07-16

## Context

R4 intake §5 wants prayer notifications **with the app closed**. Web push requires a server
to send messages; nothing in the current stack sends any. The blocker is not code volume —
it is a privacy decision: **ADR-0009 promises that coordinates never leave the device**, and
a server cannot know when to push without knowing the user's prayer times. Some schedule
data must start leaving the device; that trade-off needs an explicit owner decision, which
is why this ADR ships as _proposed_ alongside the NBD-42 groundwork (SW `push` +
`notificationclick` handlers, real sounds) rather than silently implemented.

## Proposed design

1. **What leaves the device: times, never coordinates.** Each day the client computes its
   next ~24h of notification moments locally (adhan.js, the picked method, the user's
   prefs — exactly what `NotificationScheduler` already builds) and upserts them to
   Supabase: `push_schedule (user_id, at timestamptz, kind, prayer_label)`. Prayer times
   reveal a rough longitude band — far less than coordinates, but not nothing; the opt-in
   copy must say so.
2. **Subscription**: `PushManager.subscribe` with a VAPID public key (client env);
   subscriptions stored in `push_subscriptions (user_id, endpoint, keys, created_at)` with
   RLS `user_id = auth.uid()` on both tables.
3. **Sender**: a Supabase Edge Function on a 1-minute `pg_cron` schedule sends due rows via
   web-push (VAPID private key as a function secret), deletes them after delivery, and
   prunes dead subscriptions (410 Gone).
4. **Sound honesty**: closed-app notifications play the OS default sound — the Web
   Notification API has no reliable cross-platform custom sound. The in-app sounds (NBD-42)
   remain the rich experience; UI copy states the limit.
5. **Requires login** (subscriptions and schedules are per `auth.uid()`), which requires the
   Google OAuth provider to be enabled in the Supabase dashboard — still pending.

## Alternatives considered

- **Notification Triggers API** (client-side scheduled notifications, no server): dead
  Chrome origin trial, never shipped — rejected.
- **Periodic Background Sync**: fires at the browser's discretion (hours off), unusable for
  prayer-minute precision — rejected.
- **Uploading coordinates** and computing times server-side: maximally flexible, directly
  violates ADR-0009 — rejected.

## Consequences (if accepted)

- New backlog ticket NBD-43 builds it: two tables + RLS, edge function + cron, client
  subscribe/upload plumbing, opt-in copy rewrite.
- ADR-0009's "nothing leaves the device" weakens to "coordinates never leave the device;
  computed prayer times may, with opt-in" — this ADR amends it once accepted.
