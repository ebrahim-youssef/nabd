package expo.modules.nabddevice

import org.json.JSONArray
import org.json.JSONObject
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
  fun parsesAValidPrayerActionAndRoundTripsIt() {
    val actionAlarm = alarmWithAction()

    assertEquals(
      PrayerAction("fajr", "2026-11-19", "v1", "adhan:2026-11-19:fajr:v1", "صلّيت الفجر"),
      actionAlarm.prayerAction,
    )
    assertEquals(
      actionAlarm,
      PrayerAlarmSnapshot.parse(PrayerAlarmSnapshot.serialize(listOf(actionAlarm)))?.single(),
    )
  }

  @Test
  fun ignoresAnActionWhenAnyFieldIsMissingOrBlankButKeepsTheAlarm() {
    val fields = listOf(
      "actionItemId",
      "actionDay",
      "actionVersionId",
      "actionId",
      "actionLabel",
    )
    val valid = alarmJsonWithAction()

    fields.forEach { field ->
      val missing = JSONObject(valid.toString()).apply { remove(field) }
      val blank = JSONObject(valid.toString()).put(field, " ")

      assertNull(PrayerAlarmSnapshot.parse(snapshot(missing))?.single()?.prayerAction)
      assertNull(PrayerAlarmSnapshot.parse(snapshot(blank))?.single()?.prayerAction)
      assertEquals(1, PrayerAlarmSnapshot.parse(snapshot(missing))?.size ?: 0)
    }
  }

  @Test
  fun ignoresAnActionWithAnUnsupportedItemOrMalformedDay() {
    val valid = alarmJsonWithAction()
    val invalidItem = JSONObject(valid.toString()).put("actionItemId", "sunrise")
    val invalidDay = JSONObject(valid.toString()).put("actionDay", "2026-2-19")

    assertNull(PrayerAlarmSnapshot.parse(snapshot(invalidItem))?.single()?.prayerAction)
    assertNull(PrayerAlarmSnapshot.parse(snapshot(invalidDay))?.single()?.prayerAction)
    assertEquals(1, PrayerAlarmSnapshot.parse(snapshot(invalidItem))?.size ?: 0)
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

  private fun alarmWithAction(): PrayerAlarm = PrayerAlarm(
    "fajr",
    2_000L,
    "الفجر",
    "حان وقت الفجر",
    "adhan_fajr",
    "nabd-prayer-fajr-v1",
    false,
    PrayerAction("fajr", "2026-11-19", "v1", "adhan:2026-11-19:fajr:v1", "صلّيت الفجر"),
  )

  private fun alarmJsonWithAction(): JSONObject = JSONObject()
    .put("id", "fajr")
    .put("at", 2_000L)
    .put("title", "الفجر")
    .put("body", "حان وقت الفجر")
    .put("sound", "adhan_fajr")
    .put("channelId", "nabd-prayer-fajr-v1")
    .put("isAlarmChannel", false)
    .put("actionItemId", "fajr")
    .put("actionDay", "2026-11-19")
    .put("actionVersionId", "v1")
    .put("actionId", "adhan:2026-11-19:fajr:v1")
    .put("actionLabel", "صلّيت الفجر")

  private fun snapshot(alarm: JSONObject): String = JSONObject()
    .put("version", 1)
    .put("alarms", JSONArray().put(alarm))
    .toString()
}
