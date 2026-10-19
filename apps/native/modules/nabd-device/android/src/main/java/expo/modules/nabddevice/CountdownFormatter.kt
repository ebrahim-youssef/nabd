package expo.modules.nabddevice

import android.icu.text.SimpleDateFormat
import android.icu.util.Calendar
import android.icu.util.ULocale
import org.json.JSONObject
import java.util.Date

private const val AFTER_WINDOW_MS = 30 * 60 * 1000L
private const val API_LEVEL_WITH_ISLAMIC_CALENDAR = 24
private const val HIJRI_LOCALE = "ar@calendar=islamic-umalqura"
private const val ADHAN_PREFIX = "أذّن "
private const val SUNRISE_LABEL = "الشروق"
private const val REMAINING_PREFIX = "باقي "
private const val ON_PREFIX = "على "
private val ARABIC_DIGITS = charArrayOf('٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩')

data class CountdownNotificationContent(
  val title: String?,
  val text: String,
  val usesChronometer: Boolean,
  val chronometerCountsDown: Boolean,
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
    if (sorted.isEmpty()) return null

    for (point in sorted.asReversed()) {
      if (point.at <= now && now - point.at < AFTER_WINDOW_MS) {
        val text = if (point.sunrise) {
          SUNRISE_LABEL
        } else {
          "$ADHAN_PREFIX${point.label}"
        }
        return CountdownNotificationContent(
          title = buildTitle(payload.city, now, apiLevel),
          text = text,
          usesChronometer = apiLevel >= API_LEVEL_WITH_ISLAMIC_CALENDAR,
          chronometerCountsDown = false,
          whenMillis = if (apiLevel >= API_LEVEL_WITH_ISLAMIC_CALENDAR) point.at else null,
        )
      }
    }

    val point = sorted.firstOrNull { it.at > now } ?: return null
    val target = if (point.sunrise) SUNRISE_LABEL else point.label
    val text = "$REMAINING_PREFIX$ON_PREFIX$target"
    return CountdownNotificationContent(
      title = buildTitle(payload.city, now, apiLevel),
      text = text,
      usesChronometer = apiLevel >= API_LEVEL_WITH_ISLAMIC_CALENDAR,
      chronometerCountsDown = true,
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
    val locale = ULocale(HIJRI_LOCALE)
    val calendar = Calendar.getInstance(locale)
    calendar.timeInMillis = now
    val formatter = SimpleDateFormat("d MMMM y", locale)
    formatter.calendar = calendar
    return normalizeDigits(formatter.format(Date(now)))
  }

  private fun normalizeDigits(value: String): String = value.map { digit ->
    if (digit in '0'..'9') ARABIC_DIGITS[digit - '0'] else digit
  }.joinToString("")
}
