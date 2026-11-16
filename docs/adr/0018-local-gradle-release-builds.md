# ADR-0018 - Local Gradle release builds

- **Status:** accepted
- **Date:** 2026-11-16

## Context

The CI APK was debug-signed, so it could not serve as the release APK for sideloading and device
verification. EAS is a hosted service and assigns remote version codes. The owner's machine already
has a JDK, Android SDK, and Gradle, and the sibling app fastabiqu already uses local Gradle release
builds.

## Decision

Local `expo prebuild --clean` followed by Gradle is the only release path. `build:apk` produces the
APK for sideloading and device tests; `build:aab` produces the Play upload bundle.

Release signing reads the owner's keys folder at `~/.keys/nabd/signing.properties`, with
`NABD_SIGNING_PROPERTIES` as an environment-variable override. Release builds fail when the signing
file or any required key is missing. There is no debug-signing fallback. The four required
properties are `storeFile`, `storePassword`, `keyAlias`, and `keyPassword`.

The Android version code is committed in app config and is bumped by hand alongside the version
name. The CI APK release workflow and EAS configuration are removed. A compile-only CI job runs
debug compilation and Kotlin module tests on native pull requests; it creates no artefact and is
not a required check because its paths filter does not report on every pull request. The pre-push
hook runs Kotlin module tests when changes touch `apps/native/modules/`, `apps/native/plugins/`, or
`apps/native/app.json`. Gradle runs from a normal terminal, not an agent sandbox.

This supersedes ADR-0016's "Branch to artefact" section and its EAS parts of "Build profiles".
ADR-0016's exact-alarm section stays in force.

## Consequences

There is no CI release artefact, so a release build requires the owner's machine. The wider
pre-push trigger covers changes to the Kotlin module, config plugins, and app config. Kotlin module
tests run in the compile-only CI job and locally when the pre-push hook applies. Play publishing is
tracked by NBD-92.
