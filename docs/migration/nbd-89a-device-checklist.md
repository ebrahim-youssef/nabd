# NBD-89a owner device checklist

Install the release APK from the latest `dev` run of `native-release-apk` (Actions, the run for the
merge you are testing, artefact `nabd-apk-<run>-<sha>`). Uninstall any older nabd build first unless a
row says otherwise. Mark each row pass or fail and note the Android version and phone model once at
the top.

Phone model: ______ Android version: ______ APK run: ______

## 1. Fresh install and onboarding

| #   | Do this                                                                | Expect                                                                | Result |
| --- | ---------------------------------------------------------------------- | --------------------------------------------------------------------- | ------ |
| 1.1 | Open the app for the first time                                        | Welcome screen with the restore card under the start button           |        |
| 1.2 | Answer the questions and pick a level                                  | Permissions step asks for notifications and location                  |        |
| 1.3 | Deny notifications                                                     | A line explains that prayer alerts stay off; you can continue         |        |
| 1.4 | Allow location                                                         | Prayer times appear on Home after onboarding                          |        |
| 1.5 | If Android is optimizing the app, the power step shows; tap the action | System dialog to stop optimizing; after allowing, onboarding finishes |        |
| 1.6 | Kill the app during onboarding and reopen                              | Onboarding starts again from the beginning                            |        |
| 1.7 | Finish onboarding, kill the app, reopen                                | Home opens directly with the chosen level                             |        |

## 2. Prayer alarms and sound

| #   | Do this                                                                       | Expect                                                        | Result |
| --- | ----------------------------------------------------------------------------- | ------------------------------------------------------------- | ------ |
| 2.1 | Enable notifications in settings, wait for the next "before adhan" alert      | Alert arrives on time with its own sound                      |        |
| 2.2 | Wait for the adhan alert with the screen off                                  | Adhan plays on time                                           |        |
| 2.3 | Turn on silent mode in nabd settings, put the phone on silent, wait for adhan | Adhan still plays through the alarm stream                    |        |
| 2.4 | Swipe the app away from recents, wait for the next alert                      | Alert still arrives                                           |        |
| 2.5 | Reboot the phone, do not open the app, wait for the next alert                | Alert still arrives                                           |        |
| 2.6 | Change the phone time zone, open the app                                      | Prayer times and alerts follow the new zone                   |        |
| 2.7 | Force-stop the app from system settings, wait                                 | No alerts (Android limit); opening the app reschedules them   |        |
| 2.8 | Android 12 only: revoke "Alarms and reminders" for nabd                       | Settings shows an action that opens the system screen         |        |
| 2.9 | Settings, sound previews: play each sound, then stop, then play another       | Only one plays at a time; stop works; nothing plays on silent |        |

## 3. Countdown notification

| #   | Do this                                                     | Expect                                                                 | Result |
| --- | ----------------------------------------------------------- | ---------------------------------------------------------------------- | ------ |
| 3.1 | Settings, turn on the countdown                             | A silent ongoing notification shows the time left to the next prayer   |        |
| 3.2 | Watch it for a minute                                       | The countdown ticks without sound or vibration                         |        |
| 3.3 | Wait until a prayer time passes                             | It switches to "since" text, then to the next prayer within 30 minutes |        |
| 3.4 | With internet on, check the city label                      | City name shows in Arabic                                              |        |
| 3.5 | Turn on airplane mode, kill and reopen the app              | Last city label stays, or the Hijri date shows alone                   |        |
| 3.6 | Reboot, do not open the app, wait 20 minutes                | The countdown notification is back                                     |        |
| 3.7 | Block the countdown channel in system notification settings | Settings shows that the countdown is off in phone settings             |        |
| 3.8 | Turn the countdown off in nabd                              | The notification disappears and does not return                        |        |

## 4. Location

| #   | Do this                                                   | Expect                                                | Result |
| --- | --------------------------------------------------------- | ----------------------------------------------------- | ------ |
| 4.1 | Turn off the phone's location (GPS) and open prayer times | A message with an action that opens location settings |        |
| 4.2 | Revoke location permission for nabd, open the app         | A message with an action that opens app settings      |        |
| 4.3 | Re-grant, travel or move to another city if possible      | Times update after refreshing location in settings    |        |
| 4.4 | Airplane mode with a cached location                      | Times still show from the cached location             |        |

## 5. Battery

| #   | Do this                                                     | Expect                                          | Result |
| --- | ----------------------------------------------------------- | ----------------------------------------------- | ------ |
| 5.1 | Put nabd back under battery optimization in system settings | Settings battery section shows the action again |        |
| 5.2 | Tap the action and allow                                    | The section shows that nabd is protected        |        |
| 5.3 | Leave the phone idle overnight                              | Fajr alert arrives on time                      |        |

## 6. Data and backup

| #   | Do this                                                                   | Expect                                                       | Result |
| --- | ------------------------------------------------------------------------- | ------------------------------------------------------------ | ------ |
| 6.1 | Use the app for two days: check items, counters, adhkar, qada, intentions | Stats and history show both days                             |        |
| 6.2 | Change the wird level today                                               | Today keeps the old wird; tomorrow shows the new one         |        |
| 6.3 | Settings, export a backup and save it (Drive or Files)                    | A file named `nabd-backup-<date>.json` is shared             |        |
| 6.4 | Uninstall, reinstall, choose restore on the welcome screen with that file | Preview shows the counts; after confirming, all data is back |        |
| 6.5 | Restore the same file again on a device that already has data             | Nothing is duplicated; the device's settings win             |        |
| 6.6 | Pick a non-backup file to restore                                         | A clear message; nothing changes                             |        |

## 7. Appearance and general

| #   | Do this                               | Expect                                             | Result |
| --- | ------------------------------------- | -------------------------------------------------- | ------ |
| 7.1 | Switch light, dark, and system themes | The whole app follows at once                      |        |
| 7.2 | Check every screen for Arabic layout  | Right to left, nothing clipped or mirrored wrongly |        |
| 7.3 | Complete the full day's wird          | Celebration shows; share works                     |        |

When every row passes, reply with the filled table (or just the failing rows). Any failing row goes
back to a fix before NBD-108 starts.
