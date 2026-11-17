# Run locally, nabd

The active local target is the Expo application in the repository root. Use pnpm and an Android emulator
or device for native runtime work. Native does not use Supabase, sign-in, or a web environment file.

## Start the native app

```bash
pnpm start
```

The command starts Expo Metro. Use a development build or a connected Android target that supports
the native modules and config plugins. Expo Go is not a release target for this project.

## Checks

Use the scripts defined by the native package manifest:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm check:no-sentry
pnpm build
```

`pnpm build` creates the Android Expo export. Build signed release artefacts locally:

```bash
pnpm build:apk
pnpm build:aab
```

The release signing properties default to `~/.keys/nabd/signing.properties`. Set
`NABD_SIGNING_PROPERTIES` to use a different file. The file must define `storeFile`,
`storePassword`, `keyAlias`, and `keyPassword`. Release builds fail without the file or any of its
keys; debug builds do not need it. A relative `storeFile` path is resolved next to the signing
properties file. The APK is written to
`android/app/build/outputs/apk/release/app-release.apk`, and the AAB to
`android/app/build/outputs/bundle/release/app-release.aab`.

Kotlin module tests run with `pnpm test:native-module`. The pre-push hook runs
them when a push includes changes under `modules/`, `plugins/`, or
`app.json`. Gradle must run from a normal terminal, not an agent sandbox.

## Local behavior checks

Before a release, verify SQLite persistence across close and reopen, the device state matrix for
the capability under change, and NBD-91 backup and restore behavior. Release APK verification is
the production smoke test described in Phase 8 of `docs/workflow.md`. ADR-0018 records the build
path.
