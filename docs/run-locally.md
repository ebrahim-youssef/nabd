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

`apps-native build` creates the Android Expo export. EAS release builds use the profiles in
`apps/native/eas.json`:

```bash
eas build --profile preview --platform android
eas build --profile production --platform android
```

## Local behavior checks

Before a release, verify SQLite persistence across close and reopen, the device state matrix for
the capability under change, and NBD-91 backup and restore behavior. Release APK verification is
the production smoke test described in `docs/workflow.md` and ADR-0016.
