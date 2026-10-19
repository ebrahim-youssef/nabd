package expo.modules.nabddevice

import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.media.AudioManager
import android.net.Uri
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat

class PrayerAlarmReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent?) {
    if (intent?.action != PRAYER_ALARM_ACTION) return
    val alarmId = intent.getStringExtra(ALARM_ID_EXTRA) ?: return
    if (!intent.hasExtra(ALARM_AT_EXTRA)) return
    val alarmAt = intent.getLongExtra(ALARM_AT_EXTRA, Long.MIN_VALUE)
    val snapshot = context.getSharedPreferences(PRAYER_ALARM_PREFS_NAME, Context.MODE_PRIVATE)
      .getString(PRAYER_ALARM_SNAPSHOT_KEY, null)
      ?.let(PrayerAlarmSnapshot::parse)
    val alarm = snapshot?.let { PrayerAlarmSnapshot.findMatching(it, alarmId, alarmAt) } ?: return

    cancelActivePrayerNotifications(context)
    val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName) ?: return
    val contentIntent = PendingIntent.getActivity(
      context,
      alarm.id.hashCode(),
      launchIntent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
    val category = if (alarm.isAlarmChannel) {
      NotificationCompat.CATEGORY_ALARM
    } else {
      NotificationCompat.CATEGORY_REMINDER
    }
    val builder = NotificationCompat.Builder(context, alarm.channelId)
      .setSmallIcon(context.applicationInfo.icon)
      .setContentTitle(alarm.title)
      .setContentText(alarm.body)
      .setAutoCancel(true)
      .setContentIntent(contentIntent)
      .setGroup("nabd-prayer:${alarm.id}")
      .setCategory(category)

    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
      // API 25 and below have no notification channels, so configure sound and priority here.
      builder
        .setPriority(NotificationCompat.PRIORITY_HIGH)
        .setSound(
          Uri.parse("android.resource://${context.packageName}/raw/${alarm.sound}"),
          if (alarm.isAlarmChannel) AudioManager.STREAM_ALARM else AudioManager.STREAM_NOTIFICATION,
        )
        .setDefaults(NotificationCompat.DEFAULT_VIBRATE)
    }

    val notification = builder.build()

    try {
      NotificationManagerCompat.from(context).notify(NOTIFICATION_TAG, alarm.id.hashCode(), notification)
    } catch (cause: SecurityException) {
      Log.w(LOG_TAG, "Prayer alarm notification permission is unavailable", cause)
    } finally {
      CountdownNotificationService.refresh(context)
    }
  }

  private fun cancelActivePrayerNotifications(context: Context) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return
    val notificationManager = context.getSystemService(NotificationManager::class.java) ?: return
    try {
      notificationManager.activeNotifications
        .filter { it.tag == NOTIFICATION_TAG }
        .forEach { notification ->
          notificationManager.cancel(NOTIFICATION_TAG, notification.id)
        }
    } catch (cause: SecurityException) {
      Log.w(LOG_TAG, "Prayer alarm notifications could not be cleared", cause)
    }
  }

  companion object {
    const val ALARM_ID_EXTRA = "alarmId"
    const val ALARM_AT_EXTRA = "alarmAt"
    private const val NOTIFICATION_TAG = "nabd-prayer"
    private const val LOG_TAG = "NabdDevice"
  }
}
