package expo.modules.nabddevice

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class WidgetSnapshotTest {
  private companion object {
    const val HOUR_MS = 60 * 60 * 1000L
    const val FAJR = 4 * HOUR_MS
    const val SUNRISE = 5 * HOUR_MS + 30 * 60 * 1000L
    const val DHUHR = 12 * HOUR_MS
    const val ASR = 15 * HOUR_MS + 30 * 60 * 1000L
    const val MAGHRIB = 18 * HOUR_MS + 30 * 60 * 1000L
    const val ISHA = 20 * HOUR_MS
    const val NEXT_FAJR = 28 * HOUR_MS
    const val EIGHT_AM = 8 * HOUR_MS
    const val TWO_PM = 14 * HOUR_MS
    const val ELEVEN_PM = 23 * HOUR_MS
  }
  @Test
  fun serializesAndParsesACompleteSnapshot() {
    val snapshot = snapshot()

    assertEquals(snapshot, WidgetSnapshot.parse(snapshot.toJson()))
  }

  @Test
  fun rejectsUnsupportedVersionAndMalformedNestedValuesAsAWhole() {
    assertNull(WidgetSnapshot.parse("""{"schemaVersion":2}"""))
    assertNull(WidgetSnapshot.parse(snapshot().toJson().replace("\"done\":false", "\"done\":\"false\"")))
    assertNull(WidgetSnapshot.parse(snapshot().toJson().replace("\"isha\"", "\"sunrise\"")))
  }

  @Test
  fun selectsTheBlockUsingHalfOpenTimeWindows() {
    val value = snapshot()

    assertNull(WidgetSnapshot.currentBlock(value, EIGHT_AM))
    assertEquals("dhuhr", WidgetSnapshot.displayBlock(value, EIGHT_AM)?.id)
    assertFalse(WidgetSnapshot.isStale(value, EIGHT_AM))
    assertEquals("isha", WidgetSnapshot.currentBlock(value, ELEVEN_PM)?.id)
    assertEquals("isha", WidgetSnapshot.displayBlock(value, ELEVEN_PM)?.id)
    assertTrue(WidgetSnapshot.isStale(value, NEXT_FAJR))
    assertTrue(WidgetSnapshot.isStale(value, FAJR - 1L))
  }

  @Test
  fun selectsTheNextPrayerAndNearestFutureBoundary() {
    val value = snapshot()

    assertEquals("asr", WidgetSnapshot.nextPrayer(value, TWO_PM)?.id)
    assertEquals(DHUHR, WidgetSnapshot.nextBoundaryAt(value, EIGHT_AM))
    assertNull(WidgetSnapshot.nextBoundaryAt(value, NEXT_FAJR))
  }

  @Test
  fun flipsOnlyTheRequestedItemToTheDesiredState() {
    val value = snapshot()

    assertTrue(WidgetSnapshot.withItemDone(value, "dhuhr", true).blocks[1].items[0].done)
    assertEquals(value, WidgetSnapshot.withItemDone(value, "missing", true))
  }

  @Test
  fun validatesWidgetActionsAgainstSnapshotItems() {
    val action = PendingPrayerAction("widget:one", "custom-item", "2026-11-19", "v1", 1L, false)
    val allowedSnapshot = snapshot().copy(
      blocks = snapshot().blocks.mapIndexed { index, block ->
        if (index == 0) block.copy(items = block.items + WidgetPrayerItem("custom-item", "مخصص", false))
        else block
      },
    )

    assertTrue(isValidWidgetPrayerAction(action, allowedSnapshot))
    assertFalse(isValidWidgetPrayerAction(action, snapshot()))
  }

  private fun snapshot() = WidgetSnapshot(
    generatedAt = 100L,
    day = "2026-11-19",
    versionId = "v1",
    blocks = listOf(
      WidgetPrayerBlock("fajr", "الفجر", FAJR, SUNRISE, listOf(WidgetPrayerItem("fajr", "الفجر", false))),
      WidgetPrayerBlock("dhuhr", "الظهر", DHUHR, ASR, listOf(WidgetPrayerItem("dhuhr", "الظهر", false))),
      WidgetPrayerBlock("asr", "العصر", ASR, MAGHRIB, listOf(WidgetPrayerItem("asr", "العصر", false))),
      WidgetPrayerBlock("maghrib", "المغرب", MAGHRIB, ISHA, listOf(WidgetPrayerItem("maghrib", "المغرب", false))),
      WidgetPrayerBlock("isha", "العشاء", ISHA, NEXT_FAJR, listOf(WidgetPrayerItem("isha", "العشاء", false))),
    ),
    nextPrayers = listOf(WidgetNextPrayer("asr", "العصر", ASR)),
    unrecordedCount = 2,
    writeFailed = false,
  )
}
