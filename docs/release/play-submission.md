# Play submission checklist

Complete these steps in Play Console after the owner builds the signed bundle with
`pnpm build:aab`. The AAB is `android/app/build/outputs/bundle/release/app-release.aab`. The local
build reads the custodied signing properties from `~/.keys/nabd/signing.properties` unless
`NABD_SIGNING_PROPERTIES` points to another file. The owner uploads and submits the release.

## App content

1. Add the privacy policy URL. The owner must provide a public URL and confirm the policy matches
   the submitted answers.
2. Complete Data safety from the app's behavior. The app has no account or app-owned backend:
   product state is stored in `files/SQLite/nabd-native.db`
   (`src/db/database.ts:4,126`; Expo SQLite sets its default directory in
   `node_modules/expo-sqlite/android/src/main/java/expo/modules/sqlite/SQLiteModule.kt:35-36`;
   preferences are rows in that database in `src/preferences/db.ts`), and there is
   no sign-in or backend client in the root app dependencies (`package.json`). The app has no
   analytics SDK or Sentry integration (`pnpm check:no-sentry`). Location is used on-device for
   prayer times (`src/device/useLocationCapability.ts`, `src/prayer-times/logic.ts`). There is one
   exception to an on-device-only claim: when the user enables the countdown notification, the
   app sends coordinates rounded to two decimal places to BigDataCloud to resolve a city label
   (`src/device/reverseGeocode.ts`, scoped by ADR-0009 Amendment 1). Declare this transfer
   accurately in Data safety and the privacy policy. Do not answer that location never leaves the
   device.
3. Complete the content rating questionnaire based on the app's devotional content and features.
4. Set the target audience to the age groups the owner intends to support. Confirm whether the app
   is directed to children before selecting any child age group.
5. Complete the remaining app-content declarations shown by Play Console and review the privacy
   policy and Data safety answers together before submission.

## Permission declarations

Review every permission in the generated
`android/app/build/intermediates/merged_manifests/release/processReleaseManifest/AndroidManifest.xml`
and explain it in Play Console when requested. The expected declarations from the configured Expo
plugins and Android module are:

- `android.permission.ACCESS_COARSE_LOCATION`: obtain approximate location for local prayer-time
  calculations.
- `android.permission.ACCESS_FINE_LOCATION`: obtain precise location for local prayer-time
  calculations.
- `android.permission.INTERNET`: request the countdown city label from the reverse-geocoding
  service when the user enables countdown notifications.
- `android.permission.MODIFY_AUDIO_SETTINGS`: select notification audio behavior for prayer alerts.
- `android.permission.RECEIVE_BOOT_COMPLETED`: rebuild device scheduling state after reboot.
- `android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`: let the user open the system flow for
  battery restrictions that can delay scheduled alerts.
- `android.permission.SCHEDULE_EXACT_ALARM`: schedule exact alerts on Android 12 and lower, where
  the permission is capped at API 32.
- `android.permission.USE_EXACT_ALARM`: schedule user-requested prayer-time alarms on Android 13
  and later. The owner must submit Play's exact-alarm declaration and explain that exact timing is
  central to the user-selected prayer alerts.
- `android.permission.VIBRATE`: provide vibration for prayer alert notifications.
- `android.permission.READ_EXTERNAL_STORAGE` and `android.permission.WRITE_EXTERNAL_STORAGE`
  (both capped at API 32): support file access used by Expo's document and file-system modules.

`android.permission.SYSTEM_ALERT_WINDOW` is removed through `android.blockedPermissions` in
`app.json`. Expo adds it for the development overlay and no release feature needs it.

This list is not a substitute for the generated release manifest. If prebuild or manifest merging
adds or removes a permission, update this checklist and the Play declarations before submission.

## Testing and release

For personal Play Console accounts created after November 13, 2023, run a closed test with at least
12 testers continuously opted in for 14 days, then apply for production access. Other account types
should follow the requirements shown in their Play Console. See [Google Play's current testing
requirements](https://support.google.com/googleplay/android-developer/answer/14151465).

Upload `app-release.aab` to the intended test track. Review the generated release details and
permission declarations, submit the track for review, and complete any production-access steps
shown by Play Console. The owner performs the Play Console submission.
