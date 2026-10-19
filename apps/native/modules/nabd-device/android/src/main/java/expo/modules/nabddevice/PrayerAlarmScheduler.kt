package expo.modules.nabddevice

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build

internal const val PRAYER_ALARM_ACTION = "expo.modules.nabddevice.PRAYER_ALARM"
internal const val PRAYER_ALARM_PREFS_NAME = "nabd.prayer-alarms"
internal const val PRAYER_ALARM_SNAPSHOT_KEY = "snapshot"
private const val PRAYER_ALARM_URI_PREFIX = "nabd-prayer://alarm/"
private const val RESULT_SCHEDULED = "scheduled"
private const val RESULT_EXACT_DENIED = "exact-denied"
private const val RESULT_INVALID = "invalid"

object PrayerAlarmScheduler {
  @Synchronized
  fun replace(context: Context, json: String): String {
    val alarms = PrayerAlarmSnapshot.parse(json) ?: return RESULT_INVALID
    if (!exactAlarmsAllowed(context)) return RESULT_EXACT_DENIED

    val oldAlarms = storedSnapshot(context)
    cancelAlarms(context, oldAlarms)
    val armed = mutableListOf<PrayerAlarm>()
    try {
      PrayerAlarmSnapshot.future(alarms, System.currentTimeMillis()).forEach { alarm ->
        arm(context, alarm)
        armed += alarm
      }
      storeSnapshot(context, alarms)
      return RESULT_SCHEDULED
    } catch (cause: Throwable) {
      cancelAlarms(context, armed)
      try {
        PrayerAlarmSnapshot.future(oldAlarms, System.currentTimeMillis()).forEach { alarm ->
          arm(context, alarm)
        }
      } catch (_: Throwable) {
        // Preserve the scheduling failure that caused the rollback.
      }
      throw cause
    }
  }

  @Synchronized
  fun cancelAll(context: Context) {
    cancelAlarms(context, storedSnapshot(context))
    context.getSharedPreferences(PRAYER_ALARM_PREFS_NAME, Context.MODE_PRIVATE)
      .edit()
      .clear()
      .commit()
  }

  @Synchronized
  fun rearm(context: Context) {
    if (!exactAlarmsAllowed(context)) return
    PrayerAlarmSnapshot.future(storedSnapshot(context), System.currentTimeMillis())
      .forEach { alarm -> arm(context, alarm) }
  }

  private fun exactAlarmsAllowed(context: Context): Boolean {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return true
    val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    return alarmManager.canScheduleExactAlarms()
  }

  private fun storedSnapshot(context: Context): List<PrayerAlarm> {
    val json = context.getSharedPreferences(PRAYER_ALARM_PREFS_NAME, Context.MODE_PRIVATE)
      .getString(PRAYER_ALARM_SNAPSHOT_KEY, null)
      ?: return emptyList()
    return PrayerAlarmSnapshot.parse(json) ?: emptyList()
  }

  private fun storeSnapshot(context: Context, alarms: List<PrayerAlarm>) {
    context.getSharedPreferences(PRAYER_ALARM_PREFS_NAME, Context.MODE_PRIVATE)
      .edit()
      .putString(PRAYER_ALARM_SNAPSHOT_KEY, PrayerAlarmSnapshot.serialize(alarms))
      .commit()
  }

  private fun cancelAlarms(context: Context, alarms: List<PrayerAlarm>) {
    alarms.forEach { alarm ->
      pendingIntent(context, alarm).cancel()
    }
  }

  @Suppress("MissingPermission")
  private fun arm(context: Context, alarm: PrayerAlarm) {
    val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    alarmManager.setExactAndAllowWhileIdle(
      AlarmManager.RTC_WAKEUP,
      alarm.at,
      pendingIntent(context, alarm),
    )
  }

  private fun pendingIntent(context: Context, alarm: PrayerAlarm): PendingIntent {
    val intent = Intent(context, PrayerAlarmReceiver::class.java).apply {
      action = PRAYER_ALARM_ACTION
      data = Uri.parse(PRAYER_ALARM_URI_PREFIX + alarm.id)
      putExtra(PrayerAlarmReceiver.ALARM_ID_EXTRA, alarm.id)
    }
    return PendingIntent.getBroadcast(
      context,
      alarm.id.hashCode(),
      intent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
  }
}
