package expo.modules.nabddevice

import java.time.Instant
import java.util.TimeZone
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class WidgetViewModelTest {
  private val zone = TimeZone.getTimeZone("UTC")

  @Test
  fun missingSnapshotShowsHomePlaceholder() {
    assertEquals(WidgetViewModel.Placeholder, WidgetViewModel.create(null, NOW, zone))
  }

  @Test
  fun staleSnapshotShowsRefreshMessage() {
    assertEquals(WidgetViewModel.Stale, WidgetViewModel.create(snapshot(), NEXT_DAY, zone))
  }

  @Test
  fun contentUsesCurrentBlockAndFormatsTimesAndUnrecordedCount() {
    val model = WidgetViewModel.create(snapshot(), DHUHR + 1, zone) as WidgetViewModel.Content

    assertEquals("الظهر", model.title)
    val window = model.window as WidgetViewModel.BlockWindow.Open
    assertEquals("١٢:٠٠ م", window.start)
    assertEquals("٣:٣٠ م", window.end)
    assertEquals(2, model.items.size)
    assertTrue(model.items[0].done)
    assertEquals(WidgetViewModel.Unrecorded.Count(1), model.unrecorded)
    assertEquals(WidgetViewModel.FormattedPrayer("العصر", "٣:٣٠ م"), model.nextPrayer)
    assertEquals("nabd://today/2026-11-19", model.clickUri)
  }

  @Test
  fun upcomingBlockUsesStartsAtAndWriteFailureOverridesUnrecordedCount() {
    val model = WidgetViewModel.create(
      snapshot().copy(writeFailed = true),
      8 * HOUR_MS,
      zone,
    ) as WidgetViewModel.Content

    assertTrue(model.window is WidgetViewModel.BlockWindow.StartsAt)
    assertEquals("١٢:٠٠ م", (model.window as WidgetViewModel.BlockWindow.StartsAt).start)
    assertEquals(WidgetViewModel.Unrecorded.WriteFailed, model.unrecorded)
  }

  @Test
  fun smallWidgetSelectsFardThenFirstItemAndAllowsNoItem() {
    val value = snapshot().copy(
      blocks = snapshot().blocks.map { block ->
        if (block.id == "dhuhr") block.copy(
          items = listOf(
            WidgetPrayerItem("sunnah", "سنة", false),
            WidgetPrayerItem("dhuhr", "الظهر", true),
          ),
        ) else block
      },
    )
    val current = WidgetViewModel.create(value, DHUHR + 1, zone) as WidgetViewModel.Content
    assertEquals(WidgetPrayerItem("dhuhr", "الظهر", true), current.smallItem)

    val empty = value.copy(blocks = value.blocks.map { block ->
      if (block.id == "dhuhr") block.copy(items = emptyList()) else block
    })
    assertEquals(null, (WidgetViewModel.create(empty, DHUHR + 1, zone) as WidgetViewModel.Content).smallItem)
  }

  @Test
  fun formatPrayerTimeMatchesPrayerTimesCases() {
    val cases = listOf(
      "2026-09-20T00:00:00Z" to "١٢:٠٠ ص",
      "2026-09-20T00:05:00Z" to "١٢:٠٥ ص",
      "2026-09-20T11:59:00Z" to "١١:٥٩ ص",
      "2026-09-20T12:00:00Z" to "١٢:٠٠ م",
      "2026-09-20T13:05:00Z" to "١:٠٥ م",
      "2026-09-20T23:59:00Z" to "١١:٥٩ م",
    )

    cases.forEach { (instant, expected) ->
      assertEquals(expected, formatWidgetPrayerTime(Instant.parse(instant).toEpochMilli(), zone))
    }
    val dubai = TimeZone.getTimeZone("Asia/Dubai")
    assertEquals("١:٣٠ ص", formatWidgetPrayerTime(Instant.parse("2026-11-17T21:30:00Z").toEpochMilli(), dubai))
    assertEquals("١٢:٠٥ ص", formatWidgetPrayerTime(Instant.parse("2026-11-17T20:05:00Z").toEpochMilli(), dubai))
  }

  @Test
  fun hidesEmptyUnrecordedAndNextPrayerValues() {
    val value = snapshot().copy(unrecordedCount = 0, nextPrayers = emptyList())
    val model = WidgetViewModel.create(value, DHUHR + 1, zone) as WidgetViewModel.Content

    assertEquals(WidgetViewModel.Unrecorded.Hidden, model.unrecorded)
    assertEquals(null, model.nextPrayer)
  }

  @Test
  fun schedulesTheEarlierOfPrayerAndBlockBoundariesOnlyForFreshContent() {
    val value = snapshot().copy(
      nextPrayers = listOf(WidgetNextPrayer("asr", "العصر", 14 * HOUR_MS)),
    )

    assertEquals(14 * HOUR_MS, nextWidgetRefreshAt(value, DHUHR + 1))
    assertEquals(null, nextWidgetRefreshAt(snapshot(), NEXT_DAY))
  }

  @Test
  fun formatsUnrecordedCountsWithArabicIndicDigits() {
    assertEquals("١٢", formatWidgetArabicNumber(12))
  }

  private fun snapshot() = WidgetSnapshot(
    generatedAt = NOW,
    day = "2026-11-19",
    versionId = "v1",
    blocks = listOf(
      WidgetPrayerBlock("fajr", "الفجر", FAJR, SUNRISE, listOf(WidgetPrayerItem("fajr", "الفجر", false))),
      WidgetPrayerBlock("dhuhr", "الظهر", DHUHR, ASR, listOf(
        WidgetPrayerItem("dhuhr", "صلاة الظهر", true),
        WidgetPrayerItem("sunnah", "السنة الراتبة", false),
      )),
      WidgetPrayerBlock("asr", "العصر", ASR, MAGHRIB, listOf(WidgetPrayerItem("asr", "العصر", false))),
      WidgetPrayerBlock("maghrib", "المغرب", MAGHRIB, ISHA, listOf(WidgetPrayerItem("maghrib", "المغرب", false))),
      WidgetPrayerBlock("isha", "العشاء", ISHA, NEXT_DAY, listOf(WidgetPrayerItem("isha", "العشاء", false))),
    ),
    nextPrayers = listOf(WidgetNextPrayer("asr", "العصر", ASR)),
    unrecordedCount = 1,
    writeFailed = false,
  )

  private companion object {
    const val HOUR_MS = 60 * 60 * 1000L
    const val NOW = 1L
    const val FAJR = 4 * HOUR_MS
    const val SUNRISE = 5 * HOUR_MS + 30 * 60 * 1000L
    const val DHUHR = 12 * HOUR_MS
    const val ASR = 15 * HOUR_MS + 30 * 60 * 1000L
    const val MAGHRIB = 18 * HOUR_MS + 30 * 60 * 1000L
    const val ISHA = 20 * HOUR_MS
    const val NEXT_DAY = 28 * HOUR_MS
  }
}
