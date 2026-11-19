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
  fun encodesTheAbsoluteDesiredStateAndReadsLegacyEntriesAsDone() {
    val undone = entry("undo", done = false)
    val encoded = appendEntry("[]", undone)

    assertEquals(listOf(undone), PendingPrayerActions.decode(encoded))
    assertEquals(
      listOf(entry("legacy")),
      PendingPrayerActions.decode("""[{"actionId":"legacy","itemId":"fajr","day":"2026-11-19","versionId":"v1","at":42}]"""),
    )
  }

  @Test
  fun preservesWidgetEntryWhenReadAndUnrelatedActionIsAcknowledged() {
    val widgetEntry = entry("widget", itemId = "custom-item")
    val encoded = appendEntry("[]", widgetEntry)
    val read = PendingPrayerActions.acknowledge(encoded, emptyList())
    val acknowledged = PendingPrayerActions.acknowledge(read, listOf("another-action"))

    assertEquals(listOf(widgetEntry), PendingPrayerActions.decode(read))
    assertEquals(listOf(widgetEntry), PendingPrayerActions.decode(acknowledged))
  }

  @Test
  fun deduplicatesNonPrayerActionsWithoutDroppingTheExistingEntry() {
    val existing = entry("widget:same", itemId = "custom-item")
    val encoded = appendEntry("[]", existing)
    val appended = PendingPrayerActions.append(encoded, entry("widget:same", itemId = "other-item"))

    assertEquals(listOf(existing), PendingPrayerActions.decode(appended))
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
      .put(JSONArrayEntry.blankItemId())
      .put(JSONArrayEntry.missingActionId())
      .put(JSONArrayEntry.missingTimestamp())
      .put(JSONArrayEntry.stringTimestamp())
      .put(JSONArrayEntry.negativeTimestamp())
      .put(JSONArrayEntry.invalidDesiredState())
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
    done: Boolean = true,
  ) = PendingPrayerAction(actionId, itemId, "2026-11-19", "v1", at, done)

  private fun appendEntry(json: String?, action: PendingPrayerAction): String =
    requireNotNull(PendingPrayerActions.append(json, action))

  private object JSONArrayEntry {
    fun valid(actionId: String) = json(actionId, "fajr", "2026-11-19", "v1", 42L)
    fun blankItemId() = json("bad-item", " ", "2026-11-19", "v1", 42L)
    fun missingActionId() = json(null, "fajr", "2026-11-19", "v1", 42L)
    fun missingTimestamp() = json("bad-time", "fajr", "2026-11-19", "v1", null)
    fun stringTimestamp() = json("string-time", "fajr", "2026-11-19", "v1", "42")
    fun negativeTimestamp() = json("negative-time", "fajr", "2026-11-19", "v1", -1L)
    fun invalidDesiredState() = org.json.JSONObject()
      .put("actionId", "bad-done")
      .put("itemId", "fajr")
      .put("day", "2026-11-19")
      .put("versionId", "v1")
      .put("at", 42L)
      .put("done", "true")

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
