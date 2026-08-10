package com.nabd.capabilities

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.work.Worker
import androidx.work.WorkerParameters
import org.json.JSONArray
import org.json.JSONObject
import java.time.chrono.HijrahChronology
import java.time.chrono.HijrahDate
import java.time.format.DateTimeFormatter
import java.util.Locale

internal object CountdownSupport {
  private const val CHANNEL_ID = "prayer-countdown"
  private const val NOTIFICATION_ID = 424242
  private const val AFTER_WINDOW_MS = 30 * 60 * 1000L
  private val arabicDigits = arrayOf("٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩")

  fun post(context: Context) {
    val prefs = context.getSharedPreferences(CapabilityConstants.COUNTDOWN_PREFS, 0)
    val raw = prefs.getString(CapabilityConstants.COUNTDOWN_BOUNDARIES, null) ?: return cancel(context)
    val body = try { text(JSONArray(raw), System.currentTimeMillis()) } catch (_: Exception) { null } ?: return cancel(context)
    ensureChannel(context)
    val launch = context.packageManager.getLaunchIntentForPackage(context.packageName)
    val content = launch?.let { PendingIntent.getActivity(context, 0, it, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE) }
    val titleParts = listOfNotNull(hijriToday(), prefs.getString(CapabilityConstants.COUNTDOWN_CITY, null))
    val builder = NotificationCompat.Builder(context, CHANNEL_ID).setSmallIcon(context.applicationInfo.icon)
      .setOngoing(true).setOnlyAlertOnce(true).setShowWhen(false).setContentIntent(content)
      .setPriority(NotificationCompat.PRIORITY_LOW)
    if (titleParts.isEmpty()) builder.setContentTitle(body) else builder.setContentTitle(titleParts.joinToString(" | ")).setContentText(body).setStyle(NotificationCompat.BigTextStyle().bigText(body))
    try { NotificationManagerCompat.from(context).notify(NOTIFICATION_ID, builder.build()) } catch (_: SecurityException) { /* surfaced by status */ }
  }

  fun cancel(context: Context) = NotificationManagerCompat.from(context).cancel(NOTIFICATION_ID)

  private fun ensureChannel(context: Context) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val channel = NotificationChannel(CHANNEL_ID, "العدّ التنازلي", NotificationManager.IMPORTANCE_LOW)
    channel.setSound(null, null)
    context.getSystemService(NotificationManager::class.java)?.createNotificationChannel(channel)
  }

  private fun hijriToday(): String? {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return null
    return try {
      val formatter = DateTimeFormatter.ofPattern("d MMMM yyyy", Locale("ar")).withChronology(HijrahChronology.INSTANCE)
      normalize(HijrahDate.now().format(formatter))
    } catch (_: Exception) { null }
  }

  internal fun text(boundaries: JSONArray, now: Long): String? {
    val sorted = (0 until boundaries.length()).map { boundaries.getJSONObject(it) }.sortedBy { it.optLong("at") }
    sorted.asReversed().firstOrNull { it.optLong("at") <= now && now - it.optLong("at") <= AFTER_WINDOW_MS }?.let { point ->
      val minutes = ((now - point.optLong("at")) / 60_000).toInt()
      val since = if (minutes <= 1) "منذ دقيقة" else "منذ ${arabic(minutes)} دقيقة"
      return if (point.optBoolean("sunrise")) "الشروق $since" else "أذّن ${point.optString("label")} $since"
    }
    sorted.firstOrNull { it.optLong("at") > now }?.let { point ->
      val target = if (point.optBoolean("sunrise")) "الشروق" else point.optString("label")
      return "باقي ${duration(point.optLong("at") - now)} على $target"
    }
    return null
  }

  private fun duration(ms: Long): String {
    val total = maxOf(1, (ms + 59_999) / 60_000)
    val hours = total / 60
    val minutes = total % 60
    if (hours == 0L) return "${arabic(minutes.toInt())} دقيقة"
    val hourPart = when (hours) { 1L -> "ساعة"; 2L -> "ساعتين"; else -> "${arabic(hours.toInt())} ساعات" }
    return if (minutes == 0L) hourPart else "$hourPart و${arabic(minutes.toInt())} دقيقة"
  }

  private fun arabic(value: Int) = normalize(value.toString())
  private fun normalize(value: String) = buildString { value.forEach { append(if (it in '0'..'9') arabicDigits[it - '0'] else it) } }
}

class CountdownWorker(context: Context, parameters: WorkerParameters) : Worker(context, parameters) {
  override fun doWork(): Result { CountdownSupport.post(applicationContext); return Result.success() }
}
