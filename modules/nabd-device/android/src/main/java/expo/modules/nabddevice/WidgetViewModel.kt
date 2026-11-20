package expo.modules.nabddevice

import java.util.Calendar
import java.util.TimeZone

internal const val WIDGET_MAX_VISIBLE_ITEMS = 3
private const val HOURS_PER_CLOCK_CYCLE = 12
private const val NOON_HOUR = 12
private const val MINUTE_PADDING_LENGTH = 2
private const val ARABIC_ZERO = '٠'
private const val ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩"

internal sealed interface WidgetViewModel {
  data object Placeholder : WidgetViewModel
  data object Stale : WidgetViewModel

  data class Content(
    val title: String,
    val window: BlockWindow,
    val items: List<WidgetPrayerItem>,
    val unrecorded: Unrecorded,
    val nextPrayer: FormattedPrayer?,
    val smallItem: WidgetPrayerItem?,
    val clickUri: String,
  ) : WidgetViewModel

  sealed interface BlockWindow {
    data class Open(val start: String, val end: String) : BlockWindow
    data class StartsAt(val start: String) : BlockWindow
  }

  data class FormattedPrayer(val label: String, val time: String)

  sealed interface Unrecorded {
    data object Hidden : Unrecorded
    data object WriteFailed : Unrecorded
    data class Count(val value: Int) : Unrecorded
  }

  companion object {
    fun create(snapshot: WidgetSnapshot?, nowMs: Long, timeZone: TimeZone): WidgetViewModel {
      if (snapshot == null) return Placeholder
      if (WidgetSnapshot.isStale(snapshot, nowMs)) return Stale

      val block = WidgetSnapshot.displayBlock(snapshot, nowMs) ?: return Stale
      val current = WidgetSnapshot.currentBlock(snapshot, nowMs) != null
      val start = formatWidgetPrayerTime(block.startsAt, timeZone)
      val window = if (current) {
        BlockWindow.Open(start, formatWidgetPrayerTime(block.endsAt, timeZone))
      } else {
        BlockWindow.StartsAt(start)
      }
      val nextPrayer = WidgetSnapshot.nextPrayer(snapshot, nowMs)?.let { prayer ->
        FormattedPrayer(prayer.label, formatWidgetPrayerTime(prayer.at, timeZone))
      }
      val unrecorded = when {
        snapshot.writeFailed -> Unrecorded.WriteFailed
        snapshot.unrecordedCount > 0 -> Unrecorded.Count(snapshot.unrecordedCount)
        else -> Unrecorded.Hidden
      }

      return Content(
        title = block.label,
        window = window,
        items = block.items.take(WIDGET_MAX_VISIBLE_ITEMS),
        unrecorded = unrecorded,
        nextPrayer = nextPrayer,
        smallItem = block.items.firstOrNull { it.id == block.id } ?: block.items.firstOrNull(),
        clickUri = "nabd://today/${snapshot.day}",
      )
    }
  }
}

internal fun formatWidgetPrayerTime(at: Long, timeZone: TimeZone): String {
  val time = Calendar.getInstance(timeZone).apply { timeInMillis = at }
  val hourOfDay = time.get(Calendar.HOUR_OF_DAY)
  val clockHour = hourOfDay % HOURS_PER_CLOCK_CYCLE
  val hour = if (clockHour == 0) HOURS_PER_CLOCK_CYCLE else clockHour
  val suffix = if (hourOfDay < NOON_HOUR) "ص" else "م"
  val minute = toArabicDigits(time.get(Calendar.MINUTE).toString()).padStart(MINUTE_PADDING_LENGTH, ARABIC_ZERO)
  return "${toArabicDigits(hour.toString())}:$minute $suffix"
}

internal fun formatWidgetArabicNumber(value: Int): String = value.toString().map { digit ->
  if (digit in '0'..'9') ARABIC_DIGITS[digit - '0'] else digit
}.joinToString("")

internal fun nextWidgetRefreshAt(snapshot: WidgetSnapshot, nowMs: Long): Long? {
  if (WidgetSnapshot.isStale(snapshot, nowMs)) return null
  return listOfNotNull(
    WidgetSnapshot.nextBoundaryAt(snapshot, nowMs),
    WidgetSnapshot.nextPrayer(snapshot, nowMs)?.at,
  ).minOrNull()
}

private fun toArabicDigits(value: String): String = value.map { character ->
  if (character in '0'..'9') ARABIC_DIGITS[character - '0'] else character
}.joinToString("")
