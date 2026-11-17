# NBD-89a emulator results

## Re-run on the local release APK (2026-11-17)

Signed local release APK from `build:apk` (`0.1.0`, versionCode 10, upload key). Clean installs on
`nabd_api36` (every row), `nabd_api34` (rows 2.1 to 2.3) and `nabd_api31` (row 2.8), location
Cairo, same clock-jump method as the first run. On API 36 the onboarding rows used the real
permission dialogs; API 34 and 31 used `pm grant` and the battery allowlist.

Result: 41 pass, 1 partial (2.6), 0 fail. Every finding from the first run except the withdrawn F13
(F1 to F12, F14 to F17) is fixed. Rows 2.3 (silent adhan on Android 16, was F8) and 3.7 (blocked
countdown channel, not run before) now pass.

| #   | API    | Result      | Notes                                                                                    |
| --- | ------ | ----------- | ---------------------------------------------------------------------------------------- |
| 1.1 | 36     | pass        | Welcome screen with restore card                                                         |
| 1.2 | 36     | pass        | Permissions step, no early error, no bottom navigation                                   |
| 1.3 | 36     | pass        | Denied notifications explained, can continue                                             |
| 1.4 | 36     | pass        | Times on Home, 12-hour format                                                            |
| 1.5 | 36     | pass        | System dialog, then "حماية التنبيهات مفعّلة." on the step                                |
| 1.6 | 36     | pass        | Restarts onboarding                                                                      |
| 1.7 | 36     | pass        | Home opens directly with the chosen level                                                |
| 2.1 | 36, 34 | pass        | Before-alert on time with its own sound, screen off                                      |
| 2.2 | 36, 34 | pass        | Adhan on time; iqama played with the adhan still in the tray                             |
| 2.3 | 36, 34 | pass        | Silent (36) and vibrate (34) ringer: adhan played as `USAGE_ALARM`                       |
| 2.4 | 36     | pass        | Process killed, alert arrived                                                            |
| 2.5 | 36     | pass        | Reboot, app not opened: 47 alarms before and after, alert with sound                     |
| 2.6 | 36     | **partial** | Alarms and countdown follow the new zone; open screens keep old clock times (N1)         |
| 2.7 | 36     | pass        | Force-stop: 0 alarms, no alert; reopening restored 47                                    |
| 2.8 | 31     | pass        | Action opens the system screen; alarms back after re-allowing (N5)                       |
| 2.9 | 36     | pass        | One preview at a time, stop works, nothing plays on silent (N2)                          |
| 3.1 | 36     | pass        | Silent ongoing notification                                                              |
| 3.2 | 36     | pass        | Chronometer ticks, no sound or vibration                                                 |
| 3.3 | 36     | pass        | "أذّن المغرب" counting up, then the next prayer after 30 minutes                         |
| 3.4 | 36     | pass        | Arabic Hijri month and القاهرة                                                           |
| 3.5 | 36     | pass        | Airplane mode, killed and reopened: city label kept                                      |
| 3.6 | 36     | pass        | Back about 2 minutes after reboot without opening the app                                |
| 3.7 | 36     | pass        | Blocked channel: "العدّ التنازلي متوقف من إعدادات الإشعارات في الهاتف."                  |
| 3.8 | 36     | pass        | Removed and stays gone after a clock jump and a kill                                     |
| 4.1 | 36     | pass        | GPS off: message and action open the turn-on-location dialog                             |
| 4.2 | 36     | pass        | Revoked: retry asks again, then blocked message, action opens app settings               |
| 4.3 | 36     | pass        | Alexandria after relaunch: times and city updated (N3)                                   |
| 4.4 | 36     | pass        | Airplane mode: cached times still show                                                   |
| 5.1 | 36     | pass        | Exemption removed: "تفعيل الحماية"                                                       |
| 5.2 | 36     | pass        | After allowing: "حماية التنبيهات مفعّلة."                                                |
| 5.3 | 36     | pass (emu)  | Forced deep Doze: before-alert on time                                                   |
| 6.1 | 36     | pass        | Two days of checks in stats and history                                                  |
| 6.2 | 36     | pass        | Today kept 23 items, next day 13                                                         |
| 6.3 | 36     | pass        | Share sheet with `nabd-backup-2026-11-18.json`                                           |
| 6.4 | 36     | pass        | Preview counts in Arabic wording, data, alarms and countdown back after re-granting (N4) |
| 6.5 | 36     | pass        | "كل ما في هذا الملف موجود على جهازك بالفعل.", device theme kept                          |
| 6.6 | 36     | pass        | Non-backup file rejected with a clear message                                            |
| 7.1 | 36     | pass        | Light, dark and system all applied at once                                               |
| 7.2 | 36     | pass        | RTL correct, nothing clipped                                                             |
| 7.3 | 36     | pass        | Celebration and share sheet                                                              |

### New findings (minor)

- **N1** After a time zone change while the app is open or in the background, Times and Home keep
  the old zone's clock times until the process restarts. Alarms and the countdown are correct.
- **N2** Sound preview with the ringer silent: the button flips to "إيقاف", nothing plays, no
  message explains why.
- **N3** The settings location card has no refresh control once located; location refreshes only on
  app open. Checklist row 4.3 says "after refreshing location in settings".
- **N4** After reinstall and restore, notification and location permissions must be granted again
  before alerts and the countdown return. Settings prompts for them.
- **N5** API 31/32: with the battery exemption on, Android keeps exact alarms working even when
  "Alarms and reminders" is revoked. Row 2.8 only reproduces without the exemption.

Still for the owner's phone: OEM battery killers and real overnight Doze (5.3), speaker loudness,
vibration and Do Not Disturb (2.1 to 2.3), reboot under OEM boot limits (2.5), Google Drive save
and restore (6.3, 6.4), and a real second city (4.3).

## First run (2026-10-18)

Release APK from EAS build 9 (`0.1.0`, versionCode 9, targetSdk 36), installed on a clean
`nabd_api36` Google APIs emulator (Android 16, API 36), location Cairo. Run on 2026-10-18 with the
emulator clock moved by hand to reach each alert. Evidence comes from `dumpsys alarm`,
`dumpsys notification --noredact`, `dumpsys audio` and UI dumps.

Clock jumps fire every skipped alert at once, so the tray was cleared before each alert unless a row
says otherwise.

### Results

| #   | Result        | Notes                                                                                             |
| --- | ------------- | ------------------------------------------------------------------------------------------------- |
| 1.1 | pass          | Welcome screen with restore card                                                                  |
| 1.2 | pass          | Permissions step reached; see F2, F3                                                              |
| 1.3 | pass          | Denied notifications explained, can continue                                                      |
| 1.4 | pass          | Times on Home after onboarding                                                                    |
| 1.5 | pass with F4  | Exemption granted (deviceidle whitelist), no confirmation shown in onboarding                     |
| 1.6 | pass          | Restarts onboarding                                                                               |
| 1.7 | pass          | Home opens directly                                                                               |
| 2.1 | pass          | Exact RTC_WAKEUP alarms; before-alert on time with sound, screen off                              |
| 2.2 | pass (F6)     | Adhan on time with sound when the tray is clear; silent when an earlier nabd alert is still there |
| 2.3 | **fail (F8)** | API 36: Android 16 downgrades the alarm channel, no sound. API 34: passes (USAGE_ALARM, played)   |
| 2.4 | pass          | Process dead, Dhuhr adhan arrived with sound                                                      |
| 2.5 | pass          | After reboot, app not opened: alarms restored (68 before, 68 after), iqama arrived with sound     |
| 2.6 | pass          | Dubai zone: times shift by one hour, alarms keep the same moment                                  |
| 2.7 | pass          | Force-stop: 0 alarms, no alert; reopening restored them                                           |
| 2.8 | pass          | API 31: action opens the system screen; alarms paused with a notice; back after re-allowing       |
| 2.9 | pass          | One preview at a time, stop works, nothing plays with the ringer silent                           |
| 3.1 | pass (F10)    | Silent ongoing notification (importance low, ONLY_ALERT_ONCE)                                     |
| 3.2 | pass (F11)    | Header chronometer ticks; body text only updates every 15 minutes                                 |
| 3.3 | pass          | "أذّن العصر منذ دقيقة", then the next prayer after 30 minutes                                     |
| 3.4 | pass          | القاهرة                                                                                           |
| 3.5 | pass          | Airplane mode, killed and reopened: city label kept                                               |
| 3.6 | pass (F12)    | Back 13 minutes after reboot without opening the app                                              |
| 3.7 | not run       | Needs the system channel switch; covered by unit tests of the blocked state                       |
| 3.8 | pass          | Turning it off removed the notification and cancelled the job                                     |
| 4.1 | pass          | GPS off: message and action; action opens the turn-on-location dialog                             |
| 4.2 | pass          | Revoked: retry asks again; after "Don't allow" twice: "محظورة" and the action opens app info      |
| 4.3 | pass          | Moved to Alexandria: times and countdown city updated                                             |
| 4.4 | pass          | Airplane mode and GPS off: cached times still show                                                |
| 5.1 | pass          | Exemption removed: Settings shows "تفعيل الحماية"                                                 |
| 5.2 | pass          | After allowing: "حماية التنبيهات مفعّلة"                                                          |
| 5.3 | pass (emu)    | Forced deep Doze, unplugged, screen off: Fajr before-alert on time with sound                     |
| 6.1 | pass          | Two days of checks: week chart and month total (٥/٨٢)                                             |
| 6.2 | pass (F14)    | Level changed: today kept 23 items, next day 13                                                   |
| 6.3 | pass          | Share sheet with `nabd-backup-2026-10-21.json`                                                    |
| 6.4 | pass (F15)    | Reinstall, restore from welcome: preview counts, then history, alarms and countdown back          |
| 6.5 | pass (F16)    | Same file again: 0 new rows, still 5 entries, device theme kept                                   |
| 6.6 | pass          | Non-backup file: "هذا الملف ليس نسخة احتياطية من نبض، اختر ملفًا آخر."                            |
| 7.1 | pass          | Light, dark and system all applied at once                                                        |
| 7.2 | pass with F7  | RTL correct on every screen checked; counter badges clipped                                       |
| 7.3 | pass (F17)    | Celebration after the last counter; share opens the share sheet                                   |

### Findings

- **F1** Bottom navigation is visible and usable during onboarding.
- **F2** Permissions step shows notifications as denied (switch disabled) and the location error
  before anything was asked.
- **F3** Stale web copy on the permissions step: "قد لا تصل التنبيهات والتطبيق مغلق".
- **F4** Power step gives no "protected" feedback after the exemption (Settings does show it).
- **F5** Parity gap: the legacy checklist showed each prayer's time (`PrayerTimeBadge` in
  `features/wird/components/WirdChecklist.tsx`); native prayer items show none. Also no status line
  under الصلوات (ADR-0009 Display).
- **F6 (serious)** When any earlier nabd notification is still in the tray, Android autogroups them
  (`g:Aggregate_AlertingSection`) and the new alert posts with `SILENT`. Seen for the adhan, the
  before-alert and the iqama. A lingering before-alert or adhkar reminder silences the adhan.
- **F7** Long dhikr rows clip or hide the counter badge (الحبيبتان, الباقيات الصالحات).
- **F8 (serious)** Android 16 flag `android.app.restrict_audio_attributes_alarm` is on. The record's
  effective channel shows `USAGE_NOTIFICATION` although the channel is `USAGE_ALARM`, so the
  "alert even when silent" option does nothing on Android 16.
- **F9** Prayer times show in 24-hour format (`PrayerTimesRoute.formatPrayerTime`). The legacy used
  `Intl.DateTimeFormat('ar-EG', { hour: 'numeric', minute: '2-digit' })`, 12-hour with ص/م.
- **F10** Countdown title shows the Hijri month as "مايو". `CountdownFormatter.formatHijriDate`
  formats with `SimpleDateFormat(..., Locale("ar"))`, which keeps Gregorian month names after
  `formatter.calendar = IslamicCalendar`, and ICU's default Islamic calendar is not Umm al-Qura, so
  the day can be off by one. The legacy `CountdownFormatter.java` used `HijrahDate.now()` with
  `HijrahChronology` (Umm al-Qura) and Arabic month names; the port regressed.
- **F11** Countdown body text lags the header chronometer by up to 15 minutes ("باقي ١٠ دقيقة" while
  the chronometer shows 8:36). Arabic plural is also wrong for 3 to 10 ("١٠ دقيقة" should be
  "١٠ دقائق").

- **F12** The countdown depends only on its 15 minute WorkManager job. After the clock moves back
  (seen after a backward clock change), the job waited 19 hours. No boot or time-change receiver
  refreshes it directly.
- **F13** (withdrawn: the switch works; my tap helper missed it.)
- **F14** Home header keeps the onboarding level name after a level change
  (`HomeScreen` reads `persisted.selectedLevelId`).
- **F15** Backup preview counts use Western digits ("2 سجلات") and "0 سجلات" instead of
  Arabic-Indic digits and proper wording.
- **F16** Re-importing a file with nothing new shows six "0 سجلات" rows and a confirm button; say the
  data is already there instead.
- **F17** Dark mode: the celebration "واصِل" button text is almost invisible.

Emulator note: the API 31 image has old timezone data (Cairo without DST), so its clock and times run
an hour behind. Not an app bug.

### Not provable on an emulator (owner, later)

- OEM battery killers (Xiaomi, Samsung, Oppo) and real overnight Doze on a physical phone (5.3).
- Real speaker loudness in silent mode, and Do Not Disturb behaviour.
- Restore from Google Drive through the real share sheet (6.3, 6.4 use Files on the emulator).
