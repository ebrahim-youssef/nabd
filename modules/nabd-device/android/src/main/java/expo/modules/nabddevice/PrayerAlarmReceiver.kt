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

private const val PRAYER_ACTION_REQUEST_CODE_SALT = 0x40000000
private const val PRAYER_ACTION_URI_SCHEME = "nabd-prayer-action"
private const val PRAYER_ACTION_URI_AUTHORITY = "done"

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

    alarm.prayerAction?.let { action ->
      val actionIntent = Intent(context, PrayerActionReceiver::class.java).apply {
        this.action = PRAYER_ACTION_DONE
        data = Uri.Builder()
          .scheme(PRAYER_ACTION_URI_SCHEME)
          .authority(PRAYER_ACTION_URI_AUTHORITY)
          .appendPath(action.actionId)
          .build()
        putExtra(PrayerActionReceiver.ACTION_ITEM_ID_EXTRA, action.itemId)
        putExtra(PrayerActionReceiver.ACTION_DAY_EXTRA, action.day)
        putExtra(PrayerActionReceiver.ACTION_VERSION_ID_EXTRA, action.versionId)
        putExtra(PrayerActionReceiver.ACTION_ID_EXTRA, action.actionId)
        putExtra(PrayerActionReceiver.ACTION_LABEL_EXTRA, action.label)
        putExtra(PrayerActionReceiver.NOTIFICATION_TAG_EXTRA, PRAYER_NOTIFICATION_TAG)
        putExtra(PrayerActionReceiver.NOTIFICATION_ID_EXTRA, alarm.id.hashCode())
      }
      val actionPendingIntent = PendingIntent.getBroadcast(
        context,
        action.actionId.hashCode() xor PRAYER_ACTION_REQUEST_CODE_SALT,
        actionIntent,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
      )
      builder.addAction(
        NotificationCompat.Action.Builder(
          context.applicationInfo.icon,
          action.label,
          actionPendingIntent,
        ).build(),
      )
    }

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
      NotificationManagerCompat.from(context)
        .notify(PRAYER_NOTIFICATION_TAG, alarm.id.hashCode(), notification)
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
        .filter { it.tag == PRAYER_NOTIFICATION_TAG }
        .forEach { notification ->
          notificationManager.cancel(PRAYER_NOTIFICATION_TAG, notification.id)
        }
    } catch (cause: SecurityException) {
      Log.w(LOG_TAG, "Prayer alarm notifications could not be cleared", cause)
    }
  }

  companion object {
    const val ALARM_ID_EXTRA = "alarmId"
    const val ALARM_AT_EXTRA = "alarmAt"
    private const val LOG_TAG = "NabdDevice"
  }
}
