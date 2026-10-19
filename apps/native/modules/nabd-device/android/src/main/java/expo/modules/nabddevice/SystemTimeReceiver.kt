package expo.modules.nabddevice

import android.app.AlarmManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build

class SystemTimeReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent?) {
    val action = intent?.action ?: return
    if (action == AlarmManager.ACTION_SCHEDULE_EXACT_ALARM_PERMISSION_STATE_CHANGED &&
      Build.VERSION.SDK_INT < Build.VERSION_CODES.S
    ) return
    if (action !in SUPPORTED_ACTIONS) return

    PrayerAlarmScheduler.rearm(context)
    CountdownNotificationService.refresh(context)
  }

  companion object {
    private val SUPPORTED_ACTIONS = setOf(
      Intent.ACTION_BOOT_COMPLETED,
      Intent.ACTION_TIME_CHANGED,
      Intent.ACTION_TIMEZONE_CHANGED,
      Intent.ACTION_MY_PACKAGE_REPLACED,
      AlarmManager.ACTION_SCHEDULE_EXACT_ALARM_PERMISSION_STATE_CHANGED,
    )
  }
}
