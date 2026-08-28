# ADR-0016 — Native release path, build profiles, and exact-alarm distribution

- **Status:** accepted
- **Date:** 2026-08-28

## Context

ADR-0003 describes `feature → dev → master` for a Vercel web deployment and predates the split in
ADR-0014. It says nothing about how the native application is built or who gets a build.
ADR-0014 establishes that the native migration deliverable is a release APK the owner installs and
tests, and defers a Play-uploadable AAB and the store listing, but it does not say which branch
produces which artefact.

The `native-release-apk` workflow currently triggers on a push to any branch under a `paths` filter,
so it fires for feature branches as well. It is deliberately excluded from the required status
checks added in NBD-87: a `push`-triggered workflow with a `paths` filter never reports on pull
requests that miss the filter, so requiring it would deadlock those pull requests.

Two related questions were open. NBD-86's device work can only be verified by installing on a real
phone, which needs a diagnostic surface that must not reach production. And exact prayer alarms on
Android depend on a permission choice that carries a Google Play distribution constraint.

## Decision

### Branch to artefact

`dev` produces test APKs. Every merge into `dev` builds a release-signed APK and uploads it as a
workflow artefact for the owner to sideload. This is the loop NBD-86 depends on: half of parity
ledger section D can only be closed by installing a build on a real device, and holding that behind
a promotion to `master` would mean promoting untested work in order to test it.

`master` produces both an AAB and an APK through EAS. The AAB is the Play upload artefact. The APK
is the same release built sideloadable, so the exact build that goes to the store can be installed
and checked on a real device without waiting on a Play review or a test track. That path does not
exist yet; it arrives with NBD-88 alongside the store listing, and this ADR only fixes where it
belongs.

That path is not NBD-88. The execution plan scopes NBD-88 to the Cloudflare build, the deployment
runbook and Vercel removal, and NBD-89 produces the sideloadable release APK while listing Play
Store submission as explicitly deferred. The `master` AAB and EAS path therefore needs its own
ticket after the migration closes, and this ADR fixes where it belongs rather than when it happens.

`dev` produces an APK only. There is nothing to upload from `dev`, so an AAB there would be a build
nobody consumes.

Feature branches produce nothing. The workflow's push trigger is restricted to `dev`, with
`workflow_dispatch` retained so a build can be taken from any ref on demand.

`native-release-apk` builds on pull requests that touch native code, which is the "release APK
build on relevant pull requests" gate NBD-87 requires, and publishes the artefact on a push to
`dev`. It stays out of the *required* status checks for the reason above: a paths-filtered workflow
never reports on pull requests that miss the filter, so requiring it would deadlock them. It runs
and must pass where it applies, without being a context every pull request has to satisfy. The gates that protect native correctness are the `native lint`, `native
test` and `native typecheck` checks, and NBD-86 adds a clean-prebuild and compile gate that does
report on pull requests.

### Build profiles

The APK the owner sideloads is built with `assembleRelease`, because a debug React Native APK
carries no JS bundle and expects a Metro server on the same network. `__DEV__` is therefore `false`
in the build that most needs development affordances, and must not be used to gate them.

Development-only surfaces are gated on an explicit flag in `app.config`, set by the build profile
rather than inferred from the build type. The diagnostic screen is the first such surface: it is
reachable from a visible row in settings in test builds, and compiled out of production builds.

### Exact-alarm permissions

Declare `USE_EXACT_ALARM` for Android 13 and above, and `SCHEDULE_EXACT_ALARM` with
`android:maxSdkVersion="32"` for Android 12. On Android 12, where the permission is granted at
install but the user may revoke it, check `canScheduleExactAlarms()` and, when it returns false,
prompt with an actionable route to the system settings screen rather than degrading silently. On
Android 13 and above no prompt is possible or needed, because `USE_EXACT_ALARM` is granted at
install and cannot be revoked.

This is Google's documented pattern for applications that qualify, and it commits us to declaring
at publication that scheduled prayer alarms are core functionality. That declaration is made when
the store listing is prepared, not now: the current builds are sideloaded and Play policy does not
reach them.

Rejected: `SCHEDULE_EXACT_ALARM` alone, which is off by default on Android 14 and above for
applications that do not qualify, so the adhan would drift during the whole of NBD-86 device
testing unless the permission were enabled by hand on each device. Rejected: `USE_EXACT_ALARM`
alone, which does not exist before API 33 and would leave Android 12 with no exact alarms at all.

## Consequences

The owner can test a device feature as soon as it reaches `dev`, which is what makes the section D
matrices closable. CI spends a build on each `dev` merge that touches `apps/native` or
`packages/shared`, whether or not anyone downloads it. That is the cost of the loop.

If Google declines the exact-alarm declaration at publication, the fallback is the rejected option:
drop `USE_EXACT_ALARM`, keep `SCHEDULE_EXACT_ALARM` uncapped, and extend the Android 12 prompt to
every version. That is a manifest change and a widened prompt, not a redesign, and the alarm
scheduling code is unaffected either way because it must already handle a false
`canScheduleExactAlarms()` for Android 12.

Parity-ledger section D's exact-alarm row is no longer undetermined. It records the decided
behaviour and NBD-86 implements against it.

Revisit the branch mapping if the app gains testers other than the owner, since a shared test track
is a different problem from an artefact on a workflow run, and ADR-0015's durability trigger fires
at the same moment.
