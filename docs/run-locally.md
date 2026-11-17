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
pnpm format
pnpm format:check
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

### Android application backup

Expo SQLite stores `nabd-native.db` in `context.filesDir/SQLite` by default
(`node_modules/expo-sqlite/android/src/main/java/expo/modules/sqlite/SQLiteModule.kt:35-36`);
`src/db/database.ts:126` opens the database without overriding that directory. Android Auto Backup
and device transfer include only the app `file` domain's `SQLite/` directory. This includes the
database and its WAL/SHM companions. User preferences are rows in this database, so they are
included too. SharedPreferences and device-protected data are explicitly excluded. Because an
include rule is present, all other paths and domains are omitted. Android also always excludes
cache directories. Backup export files are written to the cache directory and are excluded.

Alarm snapshots (`nabd.prayer-alarms`) and countdown notification state (`nabd.countdown`) are
device scheduling state, so they are excluded. On launch, the app's prayer alarm bootstrap reads
the restored notification preferences and location from SQLite, recalculates the current schedule,
and replaces the native alarms. The countdown bootstrap similarly rebuilds its state from SQLite.
Restoring does not copy an old alarm snapshot onto a new device.

To check a restore on a test device, enable Android backup and select a transport, install a release
build, populate the app, and run `adb shell bmgr backupnow com.nabd.app`. Check the result with
`adb logcat` and confirm the backup transport recorded the package. Install the same package and
signing identity on a clean test device, then run `adb shell bmgr list transports` and
`adb shell bmgr restore <TOKEN> com.nabd.app` using the token shown by `adb shell bmgr list sets`.
Launch the app and confirm SQLite history and preferences are present and prayer alarms are freshly
scheduled. `bmgr` exercises the device's configured backup transport; it does not verify every
Google account or OEM restore path. See [Android's bmgr reference](https://developer.android.com/tools/bmgr)
for the available commands and [Auto Backup documentation](https://developer.android.com/identity/data/autobackup)
for rule behavior.
