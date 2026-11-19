package expo.modules.nabddevice

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.json.JSONArray

class PendingPrayerActionsTest {
  @Test
  fun appendsAndDecodesAnEntry() {
    val encoded = appendEntry("[]", entry("one", at = 10L))

    assertEquals(listOf(entry("one", at = 10L)), PendingPrayerActions.decode(encoded))
  }

  @Test
  fun keepsTheExistingEntryWhenAnActionIdIsAppendedAgain() {
    val existing = entry("same", at = 10L)
    val encoded = appendEntry("[]", existing)
    val appended = appendEntry(encoded, entry("same", itemId = "isha", at = 20L))

    assertEquals(listOf(existing), PendingPrayerActions.decode(appended))
  }

  @Test
  fun preservesInsertionOrderWhenActionTimesAreOutOfOrder() {
    val encoded = appendEntry(
      appendEntry("[]", entry("later-time", at = 20L)),
      entry("earlier-time", at = 10L),
    )

    assertEquals(
      listOf("later-time", "earlier-time"),
      PendingPrayerActions.decode(encoded).map { it.actionId },
    )
  }

  @Test
  fun refusesANewEntryWhenFullWithoutDroppingExistingEntries() {
    var encoded = "[]"
    repeat(PendingPrayerActions.MAX_PENDING_ACTIONS) { index ->
      encoded = appendEntry(encoded, entry("action-$index", at = index.toLong()))
    }
    val appended = PendingPrayerActions.append(encoded, entry("overflow", at = 100L))
    val actions = PendingPrayerActions.decode(encoded)

    assertEquals(PendingPrayerActions.MAX_PENDING_ACTIONS, actions.size)
    assertEquals(null, appended)
    assertEquals(
      (0 until PendingPrayerActions.MAX_PENDING_ACTIONS).map { "action-$it" },
      actions.map { it.actionId },
    )
  }

  @Test
  fun acknowledgesOnlyRequestedActionIds() {
    val encoded = appendEntry(
      appendEntry(
        appendEntry("[]", entry("one", at = 20L)),
        entry("two", at = 10L),
      ),
      entry("three", at = 5L),
    )

    assertEquals(
      listOf(entry("one", at = 20L), entry("three", at = 5L)),
      PendingPrayerActions.decode(PendingPrayerActions.acknowledge(encoded, listOf("two"))),
    )
  }

  @Test
  fun skipsMalformedEntriesWhileDecodingValidOnes() {
    val encoded = JSONArray()
      .put(JSONArrayEntry.valid("good"))
      .put(JSONArrayEntry.malformedItemId())
      .put(JSONArrayEntry.missingActionId())
      .put(JSONArrayEntry.missingTimestamp())
      .put(JSONArrayEntry.stringTimestamp())
      .toString()

    assertEquals(listOf(entry("good")), PendingPrayerActions.decode(encoded))
  }

  @Test
  fun returnsAnEmptyQueueForBlankOrCorruptJson() {
    assertTrue(PendingPrayerActions.decode("").isEmpty())
    assertTrue(PendingPrayerActions.decode("not json").isEmpty())
    assertTrue(PendingPrayerActions.decode("{}").isEmpty())
  }

  private fun entry(
    actionId: String,
    itemId: String = "fajr",
    at: Long = 42L,
  ) = PendingPrayerAction(actionId, itemId, "2026-11-19", "v1", at)

  private fun appendEntry(json: String?, action: PendingPrayerAction): String =
    requireNotNull(PendingPrayerActions.append(json, action))

  private object JSONArrayEntry {
    fun valid(actionId: String) = json(actionId, "fajr", "2026-11-19", "v1", 42L)
    fun malformedItemId() = json("bad-item", "sunrise", "2026-11-19", "v1", 42L)
    fun missingActionId() = json(null, "fajr", "2026-11-19", "v1", 42L)
    fun missingTimestamp() = json("bad-time", "fajr", "2026-11-19", "v1", null)
    fun stringTimestamp() = json("string-time", "fajr", "2026-11-19", "v1", "42")

    private fun json(
      actionId: String?,
      itemId: String,
      day: String,
      versionId: String,
      at: Any?,
    ) = org.json.JSONObject().apply {
      actionId?.let { put("actionId", it) }
      put("itemId", itemId)
      put("day", day)
      put("versionId", versionId)
      at?.let { put("at", it) }
    }
  }
}
