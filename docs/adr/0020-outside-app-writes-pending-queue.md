# ADR-0020 - Outside-app writes go through a pending-actions queue

- **Status:** accepted
- **Date:** 2026-11-18

## Context

In 1.1.0 two places outside the app record wird items: the "صلّيت" action on adhan and iqamah
notifications and the checkboxes on the home-screen widget (NBD-115, issue #284). Both run in
Kotlin, often while the JS runtime is not alive. The wird data lives in SQLite owned by the JS app,
with its own schema and migrations. A second writer on that database would have to track every
migration, and a tap that is lost or applied twice breaks the record.

## Decision

Kotlin never writes the app database. A notification action or widget tick appends an action to a
native pending-actions queue (a JSON list in SharedPreferences, saved with a synchronous commit).
Each action carries an action id, the item, the wird day and the wird version.

- JS drains the queue on app start and on resume, and at once through a module event when the
  runtime is alive. Each action goes through the same set-state write the app uses for its own
  ticks, and is removed from the queue only after its transaction commits. Drains run one at a
  time.
- The adhan and matching iqamah notification for a prayer share one action id, so tapping either
  notification records the action at most once.
- Dedupe lives in a new table `wird_actions` (action id, item, day, version, outcome, time). A known
  action id is ignored. `wird_entries` keeps its six columns. Backup exports and imports the new
  table.
- An action whose day or version is no longer the item's current occurrence is not written. It is
  kept as "needs review" and Home shows one line linking to that day in Today. Android 12 and later
  forbid opening an activity from a receiver, so the app cannot ask at tap time.
- The widget shows a snapshot that JS writes after every write, at prayer boundaries and on app
  open. A widget tick updates the snapshot at once and queues the action, so the widget is right
  even with the app closed.

Rejected: Kotlin writing SQLite directly (a second writer and a second copy of the schema);
headless JS on every tap (slow and can be killed before it commits); opening the app from the
action (trampoline restriction, and it defeats the point of the action).

## Consequences

Nothing writes from outside the app before the set-state write and `wird_actions` are merged. A
tap made while the app is closed shows in the app only after the next open, but the widget shows it
at once. A force-stopped app on Android 15 gets no actions and a disabled widget until it is
opened; that is documented, not worked around. Invariants: one action id applies at most once
(primary key inside the transaction); a write lands only on its own occurrence (day and version
check in the same transaction); the queue never loses an action (removed only after commit).

Accepted limit (2026-11-19): an action's write is stamped one past the newest entry for its day
and item when the device clock moved back after the tap, so a queued tap is never hidden by older
state. The cost is that a tap drained after a later in-app undo of the same item marks it done
again. The drain runs on the native signal right after the tap, so that window is very short, and
fixing both cases needs a monotonic clock that survives reboots, which the app does not have. A full
queue (100 actions) refuses the new tap and leaves the notification in place, so nothing queued is
ever dropped.
