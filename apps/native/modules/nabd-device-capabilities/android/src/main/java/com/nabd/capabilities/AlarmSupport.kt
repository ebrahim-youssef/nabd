package com.nabd.capabilities

import android.app.AlarmManager
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.net.Uri
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import org.json.JSONArray
import org.json.JSONObject

internal object AlarmSupport {
  private data class ChannelSpec(val key: String, val id: String, val name: String, val sound: String)
  private val channels = listOf(
    ChannelSpec("before", "prayer-before", "اقتربت الصلاة", "before"),
    ChannelSpec("adhan", "prayer-adhan", "الأذان", "adhan"),
    ChannelSpec("adhanFajr", "prayer-adhan-fajr", "أذان الفجر", "adhan_fajr"),
    ChannelSpec("iqamah", "prayer-iqamah", "الإقامة", "iqama"),
    ChannelSpec("adhkarReminder", "adhkar-reminder", "تذكير الأذكار", "before")
  )

  fun ensureChannels(context: Context, alarmOnSilent: Boolean): Boolean {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return false
    val manager = context.getSystemService(NotificationManager::class.java) ?: return alarmOnSilent
    var degraded = false
    channels.forEach { spec ->
      createChannel(context, manager, spec, false)
      if (alarmOnSilent) {
        try { createChannel(context, manager, spec, true) } catch (_: Exception) { degraded = true }
      }
    }
    // Normal-channel creation says nothing about whether the parallel USAGE_ALARM channels
    // exist. Keep the silent-audio diagnostic honest until that path has actually been tried.
    if (alarmOnSilent) {
      context.getSharedPreferences(CapabilityConstants.ALARM_PREFS, 0).edit()
        .putString(CapabilityConstants.CHANNEL_STATE, if (degraded) "degraded" else "ready").apply()
    }
    return degraded
  }

  private fun createChannel(context: Context, manager: NotificationManager, spec: ChannelSpec, alarm: Boolean) {
    val suffix = if (alarm) "-alarm" else ""
    val usage = if (alarm) AudioAttributes.USAGE_ALARM else AudioAttributes.USAGE_NOTIFICATION
    val attributes = AudioAttributes.Builder().setUsage(usage)
      .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build()
    val sound = Uri.parse("android.resource://${context.packageName}/raw/${spec.sound}")
    val channel = NotificationChannel(spec.id + suffix, spec.name + if (alarm) " (منبّه)" else "", NotificationManager.IMPORTANCE_HIGH)
    channel.setSound(sound, attributes)
    channel.enableVibration(true)
    channel.lockscreenVisibility = Notification.VISIBILITY_PUBLIC
    manager.createNotificationChannel(channel)
  }

  fun replace(context: Context, payloads: JSONArray, alarmOnSilent: Boolean) {
    cancel(context)
    context.getSharedPreferences(CapabilityConstants.ALARM_PREFS, 0).edit()
      .putString(CapabilityConstants.ALARM_PAYLOADS, payloads.toString())
      .putBoolean(CapabilityConstants.ALARM_ON_SILENT, alarmOnSilent).apply()
    schedule(context, payloads, alarmOnSilent)
  }

  fun rearm(context: Context) {
    val prefs = context.getSharedPreferences(CapabilityConstants.ALARM_PREFS, 0)
    val saved = prefs.getString(CapabilityConstants.ALARM_PAYLOADS, null) ?: return
    ensureChannels(context, prefs.getBoolean(CapabilityConstants.ALARM_ON_SILENT, false))
    schedule(context, JSONArray(saved), prefs.getBoolean(CapabilityConstants.ALARM_ON_SILENT, false))
  }

  private fun schedule(context: Context, payloads: JSONArray, alarmOnSilent: Boolean) {
    val manager = context.getSystemService(AlarmManager::class.java) ?: return
    for (index in 0 until payloads.length()) {
      val payload = payloads.getJSONObject(index)
      val at = payload.getLong("at")
      if (at <= System.currentTimeMillis()) continue
      val pending = pendingIntent(context, payload, alarmOnSilent)
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !manager.canScheduleExactAlarms()) {
        manager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pending)
      } else {
        manager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pending)
      }
    }
  }

  fun cancel(context: Context) {
    val prefs = context.getSharedPreferences(CapabilityConstants.ALARM_PREFS, 0)
    prefs.getString(CapabilityConstants.ALARM_PAYLOADS, null)?.let { saved ->
      val manager = context.getSystemService(AlarmManager::class.java)
      val payloads = JSONArray(saved)
      for (index in 0 until payloads.length()) {
        val payload = payloads.getJSONObject(index)
        manager?.cancel(pendingIntent(context, payload, prefs.getBoolean(CapabilityConstants.ALARM_ON_SILENT, false)))
      }
    }
    prefs.edit().remove(CapabilityConstants.ALARM_PAYLOADS).remove(CapabilityConstants.ALARM_ON_SILENT).apply()
  }

  private fun pendingIntent(context: Context, payload: JSONObject, alarmOnSilent: Boolean): PendingIntent {
    val intent = Intent(context, PrayerAlarmReceiver::class.java)
      .putExtra("id", payload.getInt("id"))
      .putExtra("title", payload.getString("title"))
      .putExtra("body", payload.getString("body"))
      .putExtra("channelKey", payload.getString("channelKey"))
      .putExtra("alarmOnSilent", alarmOnSilent)
    return PendingIntent.getBroadcast(context, payload.getInt("id"), intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
  }

  fun channelId(key: String, alarmOnSilent: Boolean): String {
    val base = channels.firstOrNull { it.key == key }?.id ?: channels.first().id
    return base + if (alarmOnSilent) "-alarm" else ""
  }
}

class PrayerAlarmReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val id = intent.getIntExtra("id", 0)
    val launch = context.packageManager.getLaunchIntentForPackage(context.packageName)
    val contentIntent = launch?.let { PendingIntent.getActivity(context, 0, it, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE) }
    val notification = NotificationCompat.Builder(context, AlarmSupport.channelId(intent.getStringExtra("channelKey") ?: "before", intent.getBooleanExtra("alarmOnSilent", false)))
      .setSmallIcon(context.applicationInfo.icon).setContentTitle(intent.getStringExtra("title"))
      .setContentText(intent.getStringExtra("body")).setAutoCancel(true).setPriority(NotificationCompat.PRIORITY_HIGH)
      .setContentIntent(contentIntent).build()
    try { NotificationManagerCompat.from(context).notify(id, notification) } catch (_: SecurityException) { /* surfaced by status */ }
  }
}

class AlarmBootReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action == Intent.ACTION_BOOT_COMPLETED) AlarmSupport.rearm(context)
  }
}
