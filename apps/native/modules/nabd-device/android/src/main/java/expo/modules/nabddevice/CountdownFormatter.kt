package expo.modules.nabddevice

import android.icu.text.SimpleDateFormat
import android.icu.util.IslamicCalendar
import android.os.Build
import org.json.JSONObject
import java.util.Date
import java.util.Locale

private const val AFTER_WINDOW_MS = 30 * 60 * 1000L
private const val MINUTE_MS = 60 * 1000L
private const val API_LEVEL_WITH_ISLAMIC_CALENDAR = 24
private const val SINCE_ONE_MINUTE = "منذ دقيقة"
private const val SINCE_PREFIX = "منذ "
private const val MINUTE_SUFFIX = " دقيقة"
private const val ADHAN_PREFIX = "أذّن "
private const val SUNRISE_LABEL = "الشروق"
private const val REMAINING_PREFIX = "باقي "
private const val ON_PREFIX = "على "
private const val HOUR_ONE = "ساعة"
private const val HOUR_TWO = "ساعتين"
private const val HOUR_SUFFIX = " ساعات"
private const val HOURS_AND_MINUTES_SEPARATOR = " و"
private val ARABIC_DIGITS = charArrayOf('٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩')

data class CountdownNotificationContent(
  val title: String?,
  val text: String,
  val usesChronometer: Boolean,
  val whenMillis: Long?,
)

private data class CountdownBoundary(
  val label: String,
  val at: Long,
  val sunrise: Boolean,
)

private data class CountdownPayload(
  val boundaries: List<CountdownBoundary>,
  val city: String?,
)

object CountdownFormatter {
  fun format(payloadJson: String, now: Long, apiLevel: Int): CountdownNotificationContent? {
    val payload = parsePayload(payloadJson) ?: return null
    val sorted = payload.boundaries.sortedBy { it.at }
    val lastBoundary = sorted.lastOrNull() ?: return null
    if (lastBoundary.at <= now) return null

    for (point in sorted.asReversed()) {
      if (point.at <= now && now - point.at < AFTER_WINDOW_MS) {
        val minutes = ((now - point.at) / MINUTE_MS).toInt()
        val since = if (minutes <= 1) SINCE_ONE_MINUTE else "$SINCE_PREFIX${arabic(minutes)}$MINUTE_SUFFIX"
        val text = if (point.sunrise) {
          "$SUNRISE_LABEL $since"
        } else {
          "$ADHAN_PREFIX${point.label} $since"
        }
        return CountdownNotificationContent(
          title = buildTitle(payload.city, now, apiLevel),
          text = text,
          usesChronometer = false,
          whenMillis = null,
        )
      }
    }

    val point = sorted.firstOrNull { it.at > now } ?: return null
    val target = if (point.sunrise) SUNRISE_LABEL else point.label
    val text = "$REMAINING_PREFIX${duration(point.at - now)} $ON_PREFIX$target"
    return CountdownNotificationContent(
      title = buildTitle(payload.city, now, apiLevel),
      text = text,
      usesChronometer = apiLevel >= API_LEVEL_WITH_ISLAMIC_CALENDAR,
      whenMillis = if (apiLevel >= API_LEVEL_WITH_ISLAMIC_CALENDAR) point.at else null,
    )
  }

  private fun parsePayload(payloadJson: String): CountdownPayload? {
    if (payloadJson.isBlank()) return null
    return try {
      val root = JSONObject(payloadJson)
      val jsonBoundaries = root.getJSONArray("boundaries")
      if (jsonBoundaries.length() == 0) return null

      val boundaries = mutableListOf<CountdownBoundary>()
      for (index in 0 until jsonBoundaries.length()) {
        val point = jsonBoundaries.getJSONObject(index)
        val label = point.getString("label").trim()
        if (label.isEmpty()) return null
        boundaries += CountdownBoundary(
          label = label,
          at = point.getLong("at"),
          sunrise = point.getBoolean("sunrise"),
        )
      }
      if (boundaries.isEmpty()) return null

      val city = if (root.has("city") && !root.isNull("city")) {
        root.getString("city").trim().takeIf { it.isNotEmpty() }
      } else {
        null
      }
      CountdownPayload(boundaries, city)
    } catch (_: Exception) {
      null
    }
  }

  private fun buildTitle(city: String?, now: Long, apiLevel: Int): String? {
    val hijri = hijriToday(now, apiLevel)
    return when {
      hijri != null && city != null -> "$hijri | $city"
      hijri != null -> hijri
      city != null -> city
      else -> null
    }
  }

  private fun hijriToday(now: Long, apiLevel: Int): String? {
    if (apiLevel < API_LEVEL_WITH_ISLAMIC_CALENDAR) return null
    return try {
      formatHijriDate(now)
    } catch (_: Exception) {
      null
    }
  }

  @Suppress("NewApi")
  private fun formatHijriDate(now: Long): String {
    val calendar = IslamicCalendar(Locale("ar"))
    calendar.timeInMillis = now
    val formatter = SimpleDateFormat("d MMMM yyyy", Locale("ar"))
    formatter.calendar = calendar
    return normalizeDigits(formatter.format(Date(now)))
  }

  private fun duration(milliseconds: Long): String {
    val totalMinutes = maxOf(1L, (milliseconds + MINUTE_MS - 1) / MINUTE_MS)
    val hours = totalMinutes / 60
    val minutes = totalMinutes % 60
    if (hours == 0L) return "${arabic(minutes.toInt())}$MINUTE_SUFFIX"

    val hourPart = when (hours) {
      1L -> HOUR_ONE
      2L -> HOUR_TWO
      else -> "${arabic(hours.toInt())}$HOUR_SUFFIX"
    }
    return if (minutes == 0L) hourPart else "$hourPart$HOURS_AND_MINUTES_SEPARATOR${arabic(minutes.toInt())}$MINUTE_SUFFIX"
  }

  private fun arabic(number: Int): String = number.toString().map { digit ->
    if (digit in '0'..'9') ARABIC_DIGITS[digit - '0'] else digit
  }.joinToString("")

  private fun normalizeDigits(value: String): String = value.map { digit ->
    if (digit in '0'..'9') ARABIC_DIGITS[digit - '0'] else digit
  }.joinToString("")
}
