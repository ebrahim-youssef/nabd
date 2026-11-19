package expo.modules.nabddevice

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.json.JSONArray

class PendingPrayerActionsTest {
  @Test
  fun appendsAndDecodesAnEntry() {
    val encoded = PendingPrayerActions.append("[]", entry("one", at = 10L))

    assertEquals(listOf(entry("one", at = 10L)), PendingPrayerActions.decode(encoded))
  }

  @Test
  fun keepsTheExistingEntryWhenAnActionIdIsAppendedAgain() {
    val existing = entry("same", at = 10L)
    val encoded = PendingPrayerActions.append("[]", existing)
    val appended = PendingPrayerActions.append(encoded, entry("same", itemId = "isha", at = 20L))

    assertEquals(listOf(existing), PendingPrayerActions.decode(appended))
  }

  @Test
  fun dropsTheOldestEntryWhenTheQueueExceedsItsLimit() {
    var encoded = "[]"
    repeat(PendingPrayerActions.MAX_PENDING_ACTIONS) { index ->
      encoded = PendingPrayerActions.append(encoded, entry("action-$index", at = index.toLong()))
    }
    encoded = PendingPrayerActions.append(encoded, entry("newest", at = 100L))
    val actions = PendingPrayerActions.decode(encoded)

    assertEquals(PendingPrayerActions.MAX_PENDING_ACTIONS, actions.size)
    assertEquals("action-1", actions.first().actionId)
    assertEquals("newest", actions.last().actionId)
  }

  @Test
  fun acknowledgesOnlyRequestedActionIds() {
    val encoded = PendingPrayerActions.append(
      PendingPrayerActions.append("[]", entry("one")),
      entry("two"),
    )

    assertEquals(
      listOf(entry("two")),
      PendingPrayerActions.decode(PendingPrayerActions.acknowledge(encoded, listOf("one"))),
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
