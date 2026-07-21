# Android release (bundled APK — ADR-0013)

The APK bundles a static export of the app (`out/`). There is no OTA: every native release
is a rebuilt APK. Web deploys on Vercel do not reach installed apps.

## Build

```bash
pnpm cap:sync                      # build:native (static export, SW off) + capacitor sync android
cd android && ./gradlew assembleDebug    # or assembleRelease (needs signing config)
```

The debug APK lands in `android/app/build/outputs/apk/debug/app-debug.apk`. Signing and
release upload happen on the owner's machine, outside this repo (ADR-0012 §4).

**JDK 17 or 21 required.** The Gradle wrapper is 8.2.1 (bundled with Capacitor 6) and rejects
newer JDKs with `Unsupported class file major version …`. If your default `java` is newer
(e.g. 26), point the build at a supported JDK for that command only:

```bash
JAVA_HOME=/usr/lib/jvm/java-17-openjdk ./gradlew assembleDebug
```

## Per-release checklist

1. Bump `versionCode` (+1) and `versionName` (match `package.json` version) in
   `android/app/build.gradle`.
2. `pnpm cap:sync` exits 0 — a failing static export means something server-only crept into
   a page or a new route handler was added (see ADR-0013 consequences).
3. Verify `out/` contains the app routes and **no** `sw.js`.
4. Install on device, then in airplane mode force-stop and cold-start: the app must boot and
   render data from Dexie with zero network.
5. Prayer alarms re-arm on launch (ADR-0012 §2) and the adhan fires from a scheduled moment.
   On a battery-saver OEM (Xiaomi/Samsung/OnePlus), grant the exemption from the onboarding
   power step (NBD-58) and confirm the adhan still fires with the app force-stopped.
6. Sign-in roundtrip: system browser opens, `nabd://auth/callback` deep link returns to the
   app signed in (needs the redirect URL registered in the Supabase dashboard).

## Google Play submission (owner, outside this repo)

The debug APK above is for sideloading/testing only. To publish on Play:

1. **targetSdk 35** (Android 15) is mandatory for new/updated apps since 31 Aug 2025 (NBD-59).
2. **Developer account** ($25 one-time) + **government-ID verification** (now required before a
   first publish).
3. **Signing**: create an upload keystore, enable **Play App Signing**, and build a signed
   **AAB** — `JAVA_HOME=… ./gradlew bundleRelease` — not the debug APK.
4. **Privacy policy URL** (required: the app uses location + notifications) and the Play
   **Data safety** form. Reuse the onboarding wording: location is computed on-device and never
   leaves it.
5. **Permissions declaration**: `USE_EXACT_ALARM` (NBD-59) requires declaring the app's
   alarm/reminder (azan) core use case in the Play Console. `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`
   (NBD-58) is likewise justified by that use case.
6. `com.nabd.app` is permanent once uploaded — confirm before the first publish.
