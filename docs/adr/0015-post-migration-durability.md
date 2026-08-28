# ADR-0015 — Post-migration durability of devotional history

- **Status:** accepted
- **Date:** 2026-08-28
- **Revised:** 2026-08-28

## Context

ADR-0014 removes Supabase sync from both replacement clients. Sync is today the only remote copy
of `wirdVersions` and `wirdEntries`, and qada events, settings, coordinates, adhkar resume state
and native scheduling state have never had one. Parity-ledger section F records this as an open
decision and forbids any implementation from claiming that local persistence alone protects a
user's history until it is settled.

The first version of this ADR treated the decision as urgent. That urgency rested on a premise that
has to be stated carefully, because a first attempt at stating it was wrong.

Nothing is on Google Play. ADR-0013 records that, and ADR-0014 and the execution plan both list
Play publication as deferred work. The only Android installs are development APKs the owner
sideloads onto his own device.

The legacy Next.js application is a different matter, and the first version of this ADR overlooked
it. That application is deployed and live and it shipped as v0.14.1. The second version then said it
"carries Google sign-in and Supabase sync", which is true of the source and false of the running
system. The sign-in path needs the Google OAuth provider enabled in the Supabase dashboard, which
`docs/backlog.md` already records as a manual step outside the repository, and the owner has
confirmed it was never done. `.env.example` carries `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_ANON_KEY` blank, and `features/sync/` contains no `signInWithOAuth` call.

So nobody has ever signed in, and the remote database holds nothing belonging to anyone. That is a
stronger fact than the second version's, which rested on the owner being the only account: there is
no account, and no remote history exists to be the last copy of. The live deployment is a test host
that happens to be reachable, not a service anyone depends on.

What remains true is that the SPA ships a partial export (`apps/spa/src/stats/useStatsExport.ts`)
with no import path, and that building the wrong thing there means building it twice. That is an
argument for deciding the shape of the eventual format, not for building it now.

Section F lists four options: user-initiated export and import with a versioned backup format;
Android application backup; encrypted cloud backup; and a later authenticated sync service.

## Decision

Defer durability work until the first build is prepared for publication. Do not build export and
import during the migration.

Options 1 and 2 remain the intended path and are not reopened by this revision. Options 3 and 4
stay rejected for the reasons the first version gave: ADR-0014 deliberately removes the backend
and both require one, and encrypted cloud backup additionally owes a documented key, recovery,
deletion and failure model that nothing in the migration is scoped to provide.

The trigger is the earlier of two things, and the owner has now fixed the first one concretely.

Export and import ship **before any submission to Google Play**, including an internal or closed
testing track. The looser reading — publish to a closed track first and build durability before the
open track — was offered and declined. The line is the store, not the audience, because a closed
track is still a real install on a device that is not the owner's, and because "we will do it before
the open track" is the kind of commitment that quietly does not survive a release date.

The second half is unchanged: either replacement client becoming reachable by someone other than the
owner. That still matters for the SPA, which gets a real deployment at NBD-88. A deployment the owner
alone uses does not fire it; the first other person who keeps history on it does.

The practical consequence is that durability is no longer deferred past the migration. It sits on the
native critical path, immediately before publication, as NBD-91. The execution plan's native-first
amendment sequences it there.

Until that trigger, every install is treated as a fresh start. No migration path is provided from
the legacy Capacitor application's stored history, and none is owed.

That clean start needs no code, for two independent reasons:

The two applications do not share a store. The legacy application keeps its data in the WebView's
IndexedDB through Dexie. `apps/native` keeps its data in `nabd-native.db` through `expo-sqlite`,
and holds no code that reads IndexedDB. Leftover legacy data is unreachable rather than dangerous,
and today `nabd-native.db` carries only `onboarding_state` and `wird_versions`, since the history
tables arrive with NBD-85 and have not landed.

Independently, the two are unlikely to install over each other at all. Both declare the
application id `com.nabd.app`, but the legacy release signing config reads a `keystore.properties`
that is not in the repository, while the Expo release APK is signed with the template's debug
keystore. Android refuses an install whose signature does not match the installed package, so the
owner uninstalls first, and uninstalling clears the entire application sandbox including the
WebView store. This second reason is inferred from the two signing configurations rather than
tested on a device; it does not need to hold, because the first reason is sufficient on its own.

## Consequences

Deleting the legacy Next.js and Capacitor source is unblocked by this ADR being accepted, but it is
not authorized _now_. The owner's instruction is that deletion happens when the migration is
finished, not partway through it, and the execution plan already sequences it that way. NBD-88 and
NBD-89 proceed with the legacy tree in place. What this ADR removes is the durability objection to
deleting it; what remains is ordering.

The live deployment is a second reason to leave it standing until then. It is the current release,
and retiring it is a separate step with its own checks rather than a side effect of finishing the
migration.

The owner's standing decision on existing data is recorded here so it is not re-asked. Everything
created before the migration goes live is disposable, wherever it lives: browser IndexedDB on the
legacy web deployment, anything on a sideloaded APK, and the empty Supabase project. All of it was
testing, by the owner or by anyone he handed a link to, and none of it is treated as canonical. No
migration path is owed from any of it, and nothing in the replacement clients reads it.

Section F's prohibition stands unchanged. No screen, release note or store listing may describe
the application as keeping history safe until export and import ship. It costs nothing to keep and
it is what stops the claim being made early.

The `android:allowBackup` item is withdrawn as written. It described reversing a value that
arrived as a Capacitor scaffold default, but that value lives in `android/app/src/main/AndroidManifest.xml`,
which belongs to the legacy tree being deleted. `apps/native` has no `android/` directory at all:
it is a managed Expo project whose manifest is generated by `expo prebuild`, so whatever it should
declare is a fresh choice expressed in `apps/native/app.json`. That choice belongs with the
publication work, alongside the review of what a backup set should contain.

The current stats export stays as it is, for the reason the first version gave. It is a
date-ranged reporting artefact for the user to read, not a backup, and widening it quietly into
one would produce a format nobody designed.

When the trigger fires, the scope is what the first version specified: wird versions, wird
entries, qada events, settings and cached coordinates, carrying a format version from its first
release, with an import that states plainly what it is about to do before it does it. A restore
onto a device that already holds history is a merge question rather than a copy question, and the
append-only contract means the safe resolution is union by event identity rather than replacement.

Revisit this if a backend is reintroduced for any other reason, or if any build reaches a device
that is not the owner's.
