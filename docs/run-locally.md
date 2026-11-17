# Run locally, nabd

The active local targets are the Expo application in `apps/native` and the shared package in
`packages/shared`. Use pnpm and an Android emulator or device for native runtime work. Native does
not use Supabase, sign-in, or a web environment file.

## Start the native app

```bash
pnpm --filter apps-native start
```

The command starts Expo Metro. Use a development build or a connected Android target that supports
the native modules and config plugins. Expo Go is not a release target for this project.

## Shared and native checks

Use the scripts defined by the two package manifests:

```bash
pnpm --filter @nabd/shared lint
pnpm --filter @nabd/shared typecheck
pnpm --filter @nabd/shared test
pnpm --filter apps-native lint
pnpm --filter apps-native typecheck
pnpm --filter apps-native test
pnpm --filter apps-native check:no-sentry
pnpm --filter apps-native build
```

`apps-native build` creates the Android Expo export. Build signed release artefacts locally:

```bash
pnpm --filter apps-native build:apk
pnpm --filter apps-native build:aab
```

The release signing properties default to `~/.keys/nabd/signing.properties`. Set
`NABD_SIGNING_PROPERTIES` to use a different file. The file must define `storeFile`,
`storePassword`, `keyAlias`, and `keyPassword`. Release builds fail without the file or any of its
keys; debug builds do not need it. A relative `storeFile` path is resolved next to the signing
properties file. The APK is written to
`apps/native/android/app/build/outputs/apk/release/app-release.apk`, and the AAB to
`apps/native/android/app/build/outputs/bundle/release/app-release.aab`.

Kotlin module tests run with `pnpm --filter apps-native test:native-module`. The pre-push hook runs
them when a push includes changes under `apps/native/modules/`, `apps/native/plugins/`, or
`apps/native/app.json`. Gradle must run from a normal terminal, not an agent sandbox.

## Local behavior checks

Before a release, verify SQLite persistence across close and reopen, the device state matrix for
the capability under change, and NBD-91 backup and restore behavior. Release APK verification is
the production smoke test described in Phase 8 of `docs/workflow.md`. ADR-0018 records the build
path.

The root Next.js app can still be run for reference until NBD-108 deletes it. It is not an active
product target and is intentionally absent from the commands above.
