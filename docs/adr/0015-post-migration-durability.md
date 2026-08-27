# ADR-0015 — Post-migration durability of devotional history

- **Status:** proposed
- **Date:** 2026-08-28

## Context

ADR-0014 removes Supabase sync from both replacement clients. Sync is today the only remote copy
of `wirdVersions` and `wirdEntries`, and qada events, settings, coordinates, adhkar resume state
and native scheduling state have never had one. Parity-ledger section F records this as an open
decision and forbids any implementation from claiming that local persistence alone protects a
user's history until it is settled.

The question is not academic. A wird ledger is append-only and accumulates for years, and the
people who benefit most from it are the ones who have kept it longest. Uninstalling the app,
clearing application data, losing a phone or replacing one currently destroys all of it with no
recovery path. The decision is needed now rather than at the end of the migration, because the SPA
already ships a partial export (`apps/spa/src/stats/useStatsExport.ts`) with no import path, and
building the wrong thing there means building it twice.

Section F lists four options: user-initiated export and import with a versioned backup format;
Android application backup; encrypted cloud backup; and a later authenticated sync service.

## Decision

Adopt option 1, a complete user-initiated export and import with a versioned backup format, as the
durability path for the migration. Complement it with option 2, Android application backup, as a
second and automatic layer on native.

Options 3 and 4 are rejected for this migration, not on their merits but because ADR-0014
deliberately removes the backend, and both require one. Encrypted cloud backup additionally owes a
documented key, recovery, deletion and failure model that no part of the migration is scoped to
provide. They remain open as later work, and option 1's versioned format is deliberately the thing
a future sync service would carry.

Option 1 is the only option that works identically on both targets, needs no account, no server and
no running cost, and leaves the user holding their own data. Option 2 is cheap to enable but covers
only native, is silent about whether a restore actually happened, and cannot be the sole answer for
a web client that ADR-0014 explicitly denies offline standing.

Scope of what the backup format must carry: wird versions, wird entries, qada events, settings,
and cached coordinates. It carries a format version from its first release. Import states plainly
what it is about to do before it does it, because a restore onto a device that already holds
history is a merge question, not a copy question, and the append-only contract means the safe
resolution is union by event identity rather than replacement.

## Consequences

The current stats export stays as it is. It is a date-ranged reporting artefact for the user to
read, not a backup, and it should not be quietly widened into one; the backup export is a separate
surface with a separate format and a separate entry point in settings.

Until the export and import ships, no screen, release note or store listing may describe the app as
keeping history safe. Section F's prohibition stands, and it applies to copy as much as to code.

Enabling `android:allowBackup` reverses a value that arrived as a Capacitor scaffold default rather
than as a security choice, but it still needs its own review of what lands in the backup set. That
review is part of the work, not a formality: the inclusion and exclusion rules are the whole of the
decision, and a restore has to be tested rather than assumed.

This decision unblocks deleting the legacy Next.js and Capacitor source once the export and import
ships and a restore is verified. Until then, the legacy application remains the only place a
long-standing user's history could be recovered from, which is a further reason not to delete it
early.

Revisit this if a backend is reintroduced for any other reason. At that point option 4 becomes
available at low marginal cost, and the versioned format defined here is what it should transport.
