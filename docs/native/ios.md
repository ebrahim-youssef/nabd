# iOS notification and device notes

The native device contract is ready for an eventual iOS product, but the iOS implementation is
an honest stub today. The current release target is Android, and these behaviors need a separate
product and release decision before they are enabled on iOS.

## Notifications

iOS supports up to 64 pending local notifications. The current three-day scheduling window can
fit within that limit, at about 5 alerts x 3 moments x 3 days = 45 pending alerts. The iOS
implementation will still need to enforce the window and handle scheduling failures.

iOS has no Android notification channels. Each notification must carry its own sound choice.
Custom sounds must be bundled with the app and must be under 30 seconds in .caf, .aiff, or .wav
format. The current mp3 assets need conversion before an iOS release.

The app does not use the time-sensitive interruption level. Using it requires a product decision.
Critical alerts are not planned because they require the critical-alerts entitlement and a separate
product justification.

The device silent switch can silence notification previews and alerts. The iOS sound behavior must
be tested on a real device after the bundled sounds are converted.

## Device capabilities

iOS has no exact-alarm permission equivalent and no Android battery-optimization exemption flow.
The Android countdown notification has no persistent iOS equivalent. Live Activities would be a
separate ticket.

The location action opens the app settings page only. It cannot open a dedicated system location
settings page, so the iOS platform stub uses `Linking.openSettings()`.

## Sources

- [Expo notifications](https://docs.expo.dev/versions/v57.0.0/sdk/notifications/)
- [Apple UNNotificationSound](https://developer.apple.com/documentation/usernotifications/unnotificationsound)
- [Apple critical alerts entitlement](https://developer.apple.com/documentation/bundleresources/entitlements/com.apple.developer.usernotifications.critical-alerts)
- [Apple managing notifications](https://developer.apple.com/design/human-interface-guidelines/managing-notifications)
- [Expo audio](https://docs.expo.dev/versions/v57.0.0/sdk/audio/)
- [Expo location](https://docs.expo.dev/versions/v57.0.0/sdk/location/)
