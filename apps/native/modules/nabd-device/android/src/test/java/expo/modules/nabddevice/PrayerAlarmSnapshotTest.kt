package expo.modules.nabddevice

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class PrayerAlarmSnapshotTest {
  private val alarms = listOf(
    PrayerAlarm("fajr", 2_000L, "الفجر", "حان وقت الفجر", "adhan_fajr", "nabd-prayer-fajr-v1", false),
    PrayerAlarm("adhan", 3_000L, "الأذان", "حان وقت الأذان", "adhan", "nabd-prayer-adhan-alarm-v1", true),
  )

  @Test
  fun roundTripsTheVersionedSnapshot() {
    assertEquals(alarms, PrayerAlarmSnapshot.parse(PrayerAlarmSnapshot.serialize(alarms)))
  }

  @Test
  fun rejectsMalformedEntries() {
    assertNull(PrayerAlarmSnapshot.parse("{}"))
    assertNull(PrayerAlarmSnapshot.parse("{\"version\":1,\"alarms\":[{\"id\":\"\"}]}"))
    assertNull(PrayerAlarmSnapshot.parse("{\"version\":1,\"alarms\":[{\"id\":\"one\",\"at\":1,\"title\":\"t\",\"body\":\"b\",\"channelId\":\"\",\"isAlarmChannel\":false}]}"))
    assertNull(PrayerAlarmSnapshot.parse("{\"version\":1,\"alarms\":[{\"id\":\"one\",\"at\":1,\"title\":\"t\",\"body\":\"b\",\"sound\":\" \",\"channelId\":\"channel\",\"isAlarmChannel\":false}]}"))
  }

  @Test
  fun rejectsDuplicateIds() {
    assertNull(PrayerAlarmSnapshot.parse(PrayerAlarmSnapshot.serialize(alarms + alarms.first())))
  }

  @Test
  fun futureDropsPastAlarmsAndSortsByTime() {
    val unsorted = listOf(
      alarms[1],
      PrayerAlarm("past", 999L, "ماضٍ", "ماضٍ", "sound", "channel", false),
      alarms[0],
    )

    assertEquals(listOf(alarms[0], alarms[1]), PrayerAlarmSnapshot.future(unsorted, 1_000L))
  }

  @Test
  fun findsOnlyTheAlarmWithTheExpectedIdAndTime() {
    assertEquals(alarms[0], PrayerAlarmSnapshot.findMatching(alarms, "fajr", 2_000L))
    assertNull(PrayerAlarmSnapshot.findMatching(alarms, "fajr", 3_000L))
    assertNull(PrayerAlarmSnapshot.findMatching(alarms, "missing", 2_000L))
  }
}
