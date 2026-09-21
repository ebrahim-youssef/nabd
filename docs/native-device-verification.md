# Native device verification — NBD-86

This is the owner check for the Expo Android device integration. It must be run on a standalone
release APK built from the pull-request head. Expo Go and a Metro development session are not
evidence for location, alarms, countdown, battery settings, boot restore, or other Android-only
behavior.

## Build and install the owner APK

Use the repository's configured EAS internal-distribution Android profile and keep the Expo build
URL together with the tested commit SHA, phone model, and Android API level:

```bash
cd apps/native
eas build --platform android --profile <configured-internal-apk-profile> --non-interactive
```

Open the resulting Expo build URL, download the APK, and install it on the owner device. Do not
use `expo start` or Expo Go for this check. The repository currently has no committed `eas.json` or
EAS project ID, so the release owner must configure/link that profile before running the command;
do not substitute an unreviewed profile. The GitHub `native-release-apk` workflow is a separate
standalone release-APK fallback and does not replace the requested EAS cloud build.

## Automated checks before handing over the APK

From the repository root, run the native gates:

```bash
pnpm --filter apps-native lint
pnpm --filter apps-native typecheck
pnpm --filter apps-native test
```

Record the PR, commit SHA, EAS build URL, and the exact device/API level used for the manual check.

## Owner matrix

Install the APK on a clean state where the step says “fresh install.” Record each result as
`PASS`, `FAIL`, or `BLOCKED`, including the Arabic message/action shown and the Android setting
that was opened.

### 1. Location and offline cache

1. Fresh install while online. Grant location, request it from Prayer Times, and confirm the
   coordinates, prayer times, and reverse-geocoded city update immediately.
2. Reset app permissions, deny location once, and confirm an Arabic retry/actionable status.
3. Deny location permanently and confirm the app offers Android app settings; return to the app and
   retry after granting permission.
4. Turn device GPS off and confirm the GPS-disabled status and settings action.
5. With a successful city already cached, enable airplane mode, relaunch, and confirm cached
   coordinates/city and prayer times remain available without a network request.
6. On a fresh install in airplane mode with no cache, confirm the app stays actionable and does not
   claim that location is ready. Relaunch once more to verify the cache survives process death.

### 2. Notifications and prayer alarms

1. Grant notification permission, enable prayer notifications in Settings, and confirm the status
   changes to ready and the schedule is accepted.
2. Change the calculation method and request a new location; confirm the existing schedule is
   replaced for the new inputs rather than left stale.
3. Toggle each prayer/reminder moment and silent-mode option. Confirm the setting either applies or
   rolls back with an Arabic error when Android rejects it.
4. Disable notifications and confirm future prayer alarms and countdown notifications are cancelled.
5. On Android 12+, deny exact-alarm access when the system offers it and confirm the app routes to
   the exact-alarm settings with an honest status. Confirm it never claims DND bypass.
6. Reboot with notifications enabled and confirm future alarms are recreated; reboot again with
   notifications disabled and confirm they remain cancelled.

### 3. Countdown

1. Enable the countdown with a location available and confirm the ongoing notification appears and
   updates while the app is backgrounded.
2. Swipe the app away, wait for an update, and reboot. Confirm the countdown remains correct after
   process death and boot.
3. Disable the countdown and confirm its notification disappears. If Android rejects enable/disable,
   confirm the Arabic error is visible and the switch does not falsely report success.

### 4. Battery optimization

1. Request the battery-optimization exemption and accept it if the system prompt is available.
2. Repeat and decline it. Confirm the app remains usable and explains the advisory limitation.
3. When the direct prompt is unavailable, open the battery-settings fallback and return to confirm
   the status refreshes without blocking prayer features.

### 5. Native shell and persistence

1. Switch light/dark theme and relaunch; confirm the theme and status-bar contrast persist.
2. Open a route with a text field, focus the keyboard, and confirm the focused field remains visible.
3. Navigate into a child route and press Android Back; confirm it navigates back. On a root tab,
   confirm the exit affordance appears instead of an abrupt exit.
4. Cold-start after force-stop and confirm the branded splash transitions without a white flash,
   safe areas are respected, and device/schedule state is restored.

The owner confirmation is the NBD-86 merge gate. Keep failures with a short reproduction sequence,
the visible Arabic status, and the device/API level; do not merge or promote until the affected
matrix row is resolved and re-tested.
