package expo.modules.nabddevice

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.ExistingWorkPolicy
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import java.util.concurrent.TimeUnit

internal const val COUNTDOWN_CHANNEL_ID = "nabd-countdown"
internal const val COUNTDOWN_NOTIFICATION_ID = 424242
internal const val COUNTDOWN_WORK_NAME = "nabd-countdown"
internal const val COUNTDOWN_BOUNDARY_WORK_NAME = "nabd-countdown-boundary"
internal const val COUNTDOWN_PREFS_NAME = "nabd.countdown"
internal const val COUNTDOWN_PAYLOAD_KEY = "payload"
private const val COUNTDOWN_CHANNEL_NAME = "العدّ التنازلي"
private const val REFRESH_INTERVAL_MINUTES = 15L
private const val RESULT_POSTED = "posted"
private const val RESULT_PERMISSION_DENIED = "permission-denied"
private const val RESULT_CHANNEL_BLOCKED = "channel-blocked"
private const val RESULT_INVALID = "invalid"

// One lock for set, clear, status and the worker refresh, so a refresh that already read the
// payload cannot post after clear() has run.
object CountdownNotificationService {
  @Synchronized
  fun set(context: Context, payloadJson: String): String {
    val now = System.currentTimeMillis()
    if (CountdownFormatter.format(payloadJson, now, Build.VERSION.SDK_INT) == null) {
      clear(context)
      return RESULT_INVALID
    }

    context.getSharedPreferences(COUNTDOWN_PREFS_NAME, Context.MODE_PRIVATE)
      .edit()
      .putString(COUNTDOWN_PAYLOAD_KEY, payloadJson)
      .apply()
    enqueueRefresh(context)
    return postStored(context, now)
  }

  @Synchronized
  fun clear(context: Context) {
    WorkManager.getInstance(context).cancelUniqueWork(COUNTDOWN_WORK_NAME)
    WorkManager.getInstance(context).cancelUniqueWork(COUNTDOWN_BOUNDARY_WORK_NAME)
    NotificationManagerCompat.from(context).cancel(COUNTDOWN_NOTIFICATION_ID)
    context.getSharedPreferences(COUNTDOWN_PREFS_NAME, Context.MODE_PRIVATE)
      .edit()
      .clear()
      .apply()
  }

  @Synchronized
  fun status(context: Context): String {
    val payload = storedPayload(context) ?: run {
      clear(context)
      return RESULT_INVALID
    }
    if (CountdownFormatter.format(payload, System.currentTimeMillis(), Build.VERSION.SDK_INT) == null) {
      clear(context)
      return RESULT_INVALID
    }
    ensureChannel(context)
    return notificationAccess(context)
  }

  @Synchronized
  fun refresh(context: Context) {
    val result = postStored(context, System.currentTimeMillis())
    if (result == RESULT_INVALID) clear(context)
  }

  private fun postStored(context: Context, now: Long): String {
    val payload = storedPayload(context) ?: return RESULT_INVALID
    val content = CountdownFormatter.format(payload, now, Build.VERSION.SDK_INT)
      ?: return RESULT_INVALID

    ensureChannel(context)
    val access = notificationAccess(context)
    if (access != RESULT_POSTED) return access

    val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)
      ?: return RESULT_INVALID
    val pendingIntent = PendingIntent.getActivity(
      context,
      0,
      launchIntent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
    val builder = NotificationCompat.Builder(context, COUNTDOWN_CHANNEL_ID)
      .setSmallIcon(context.applicationInfo.icon)
      .setOngoing(true)
      // Channels set importance from Android 8; before that the builder priority applies.
      .setPriority(NotificationCompat.PRIORITY_LOW)
      .setOnlyAlertOnce(true)
      .setSilent(true)
      .setShowWhen(content.whenMillis != null)
      .setContentIntent(pendingIntent)

    if (content.title != null) {
      builder
        .setContentTitle(content.title)
        .setContentText(content.text)
        .setStyle(NotificationCompat.BigTextStyle().bigText(content.text))
    } else {
      builder.setContentTitle(content.text)
    }

    if (content.whenMillis != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
      builder
        .setWhen(content.whenMillis)
        .setUsesChronometer(true)
        .setChronometerCountDown(content.chronometerCountsDown)
    }

    return try {
      NotificationManagerCompat.from(context).notify(COUNTDOWN_NOTIFICATION_ID, builder.build())
      content.nextChangeAt?.let { nextChangeAt ->
        enqueueBoundaryRefresh(context, nextChangeAt, now)
      }
      RESULT_POSTED
    } catch (_: SecurityException) {
      RESULT_PERMISSION_DENIED
    }
  }

  private fun storedPayload(context: Context): String? = context
    .getSharedPreferences(COUNTDOWN_PREFS_NAME, Context.MODE_PRIVATE)
    .getString(COUNTDOWN_PAYLOAD_KEY, null)

  private fun enqueueRefresh(context: Context) {
    val request = PeriodicWorkRequestBuilder<CountdownWorker>(
      REFRESH_INTERVAL_MINUTES,
      TimeUnit.MINUTES,
    ).build()
    WorkManager.getInstance(context).enqueueUniquePeriodicWork(
      COUNTDOWN_WORK_NAME,
      // UPDATE replaces the request for new payload data without creating duplicate work.
      ExistingPeriodicWorkPolicy.UPDATE,
      request,
    )
  }

  private fun enqueueBoundaryRefresh(context: Context, nextChangeAt: Long, now: Long) {
    val delayMs = (nextChangeAt - now).coerceAtLeast(0L)
    val request = OneTimeWorkRequestBuilder<CountdownWorker>()
      .setInitialDelay(delayMs, TimeUnit.MILLISECONDS)
      .build()
    WorkManager.getInstance(context).enqueueUniqueWork(
      COUNTDOWN_BOUNDARY_WORK_NAME,
      ExistingWorkPolicy.REPLACE,
      request,
    )
  }

  private fun ensureChannel(context: Context) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val channel = NotificationChannel(
      COUNTDOWN_CHANNEL_ID,
      COUNTDOWN_CHANNEL_NAME,
      NotificationManager.IMPORTANCE_LOW,
    ).apply {
      setSound(null, null)
      enableVibration(false)
      setShowBadge(false)
    }
    context.getSystemService(NotificationManager::class.java)?.createNotificationChannel(channel)
  }

  private fun notificationAccess(context: Context): String {
    if (
      Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
      ContextCompat.checkSelfPermission(
        context,
        Manifest.permission.POST_NOTIFICATIONS,
      ) != PackageManager.PERMISSION_GRANTED
    ) {
      return RESULT_PERMISSION_DENIED
    }
    if (!NotificationManagerCompat.from(context).areNotificationsEnabled()) {
      return RESULT_CHANNEL_BLOCKED
    }
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val channel = context.getSystemService(NotificationManager::class.java)
        ?.getNotificationChannel(COUNTDOWN_CHANNEL_ID)
      if (channel?.importance == NotificationManager.IMPORTANCE_NONE) {
        return RESULT_CHANNEL_BLOCKED
      }
    }
    return RESULT_POSTED
  }
}
