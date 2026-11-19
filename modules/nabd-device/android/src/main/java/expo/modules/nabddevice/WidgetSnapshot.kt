package expo.modules.nabddevice

import org.json.JSONArray
import org.json.JSONObject

private const val WIDGET_SNAPSHOT_SCHEMA_VERSION = 1
private val WIDGET_DAY_PATTERN = Regex("\\d{4}-\\d{2}-\\d{2}")
private val WIDGET_PRAYER_IDS = listOf("fajr", "dhuhr", "asr", "maghrib", "isha")
private const val MAX_WIDGET_ITEMS_PER_BLOCK = 3

data class WidgetSnapshot(
  val generatedAt: Long,
  val day: String,
  val versionId: String,
  val blocks: List<WidgetPrayerBlock>,
  val nextPrayers: List<WidgetNextPrayer>,
  val unrecordedCount: Int,
  val writeFailed: Boolean,
) {
  fun toJson(): String {
    val encodedBlocks = JSONArray()
    blocks.forEach { block ->
      val items = JSONArray()
      block.items.forEach { item ->
        items.put(
          JSONObject()
            .put("id", item.id)
            .put("label", item.label)
            .put("done", item.done)
            .put("countsAsUnrecorded", item.countsAsUnrecorded),
        )
      }
      encodedBlocks.put(
        JSONObject()
          .put("id", block.id)
          .put("label", block.label)
          .put("startsAt", block.startsAt)
          .put("endsAt", block.endsAt)
          .put("items", items),
      )
    }
    val encodedNextPrayers = JSONArray()
    nextPrayers.forEach { prayer ->
      encodedNextPrayers.put(
        JSONObject().put("id", prayer.id).put("label", prayer.label).put("at", prayer.at),
      )
    }
    return JSONObject()
      .put("schemaVersion", WIDGET_SNAPSHOT_SCHEMA_VERSION)
      .put("generatedAt", generatedAt)
      .put("day", day)
      .put("versionId", versionId)
      .put("blocks", encodedBlocks)
      .put("nextPrayers", encodedNextPrayers)
      .put("unrecordedCount", unrecordedCount)
      .put("writeFailed", writeFailed)
      .toString()
  }

  companion object {
    fun parse(json: String?): WidgetSnapshot? {
      if (json.isNullOrBlank()) return null
      return try {
        val root = JSONObject(json)
        if (root.integer("schemaVersion") != WIDGET_SNAPSHOT_SCHEMA_VERSION) return null
        val generatedAt = root.long("generatedAt")?.takeIf { it >= 0 } ?: return null
        val day = root.string("day")?.takeIf { WIDGET_DAY_PATTERN.matches(it) } ?: return null
        val versionId = root.string("versionId")?.takeIf(String::isNotBlank) ?: return null
        val blocks = root.array("blocks")?.mapObjects(::parseBlock) ?: return null
        val nextPrayers = root.array("nextPrayers")?.mapObjects(::parseNextPrayer) ?: return null
        val unrecordedCount = root.integer("unrecordedCount")?.takeIf { it >= 0 } ?: return null
        val writeFailed = root.boolean("writeFailed") ?: return null
        val itemIds = blocks.flatMap { block -> block.items.map { it.id } }
        if (blocks.map { it.id } != WIDGET_PRAYER_IDS) return null
        if (blocks.any { it.startsAt < 0 || it.endsAt <= it.startsAt }) return null
        if (blocks.zipWithNext().any { (first, second) -> first.endsAt > second.startsAt }) return null
        if (blocks.any { it.items.size > MAX_WIDGET_ITEMS_PER_BLOCK }) return null
        if (blocks.map { it.id }.toSet().size != blocks.size) return null
        if (itemIds.toSet().size != itemIds.size) return null
        if (nextPrayers.any { it.id !in WIDGET_PRAYER_IDS }) return null
        if (nextPrayers.any { it.at < 0 }) return null
        if (nextPrayers.zipWithNext().any { (first, second) -> first.at > second.at }) return null
        if (nextPrayers.map { it.id }.toSet().size != nextPrayers.size) return null
        WidgetSnapshot(
          generatedAt,
          day,
          versionId,
          blocks,
          nextPrayers,
          unrecordedCount,
          writeFailed,
        )
      } catch (_: Exception) {
        null
      }
    }

    fun currentBlock(snapshot: WidgetSnapshot, nowMs: Long): WidgetPrayerBlock? =
      snapshot.blocks.firstOrNull { it.startsAt <= nowMs && nowMs < it.endsAt }

    fun displayBlock(snapshot: WidgetSnapshot, nowMs: Long): WidgetPrayerBlock? =
      currentBlock(snapshot, nowMs) ?: snapshot.blocks.firstOrNull { it.startsAt > nowMs }

    fun isStale(snapshot: WidgetSnapshot, nowMs: Long): Boolean {
      val firstBlock = snapshot.blocks.firstOrNull() ?: return true
      val lastBlock = snapshot.blocks.last()
      return nowMs < firstBlock.startsAt || nowMs >= lastBlock.endsAt
    }

    fun nextPrayer(snapshot: WidgetSnapshot, nowMs: Long): WidgetNextPrayer? =
      snapshot.nextPrayers.firstOrNull { it.at > nowMs }

    fun nextBoundaryAt(snapshot: WidgetSnapshot, nowMs: Long): Long? =
      snapshot.blocks
        .flatMap { listOf(it.startsAt, it.endsAt) }
        .filter { it > nowMs }
        .minOrNull()

    fun withItemDone(snapshot: WidgetSnapshot, itemId: String, done: Boolean): WidgetSnapshot {
      var found = false
      val blocks = snapshot.blocks.map { block ->
        val items = block.items.map { item ->
          if (item.id != itemId) item else {
            found = true
            item.copy(done = done)
          }
        }
        if (items == block.items) block else block.copy(items = items)
      }
      return if (found) snapshot.copy(blocks = blocks) else snapshot
    }

    private fun parseBlock(value: JSONObject): WidgetPrayerBlock? {
      val id = value.string("id")?.takeIf(String::isNotBlank) ?: return null
      val label = value.string("label")?.takeIf(String::isNotBlank) ?: return null
      val startsAt = value.long("startsAt") ?: return null
      val endsAt = value.long("endsAt")?.takeIf { it > startsAt } ?: return null
      val items = value.array("items")?.mapObjects(::parseItem) ?: return null
      return WidgetPrayerBlock(id, label, startsAt, endsAt, items)
    }

    private fun parseItem(value: JSONObject): WidgetPrayerItem? {
      val id = value.string("id")?.takeIf(String::isNotBlank) ?: return null
      val label = value.string("label")?.takeIf(String::isNotBlank) ?: return null
      val done = value.boolean("done") ?: return null
      val countsAsUnrecorded = if (value.has("countsAsUnrecorded")) {
        value.boolean("countsAsUnrecorded") ?: return null
      } else {
        false
      }
      return WidgetPrayerItem(id, label, done, countsAsUnrecorded)
    }

    private fun parseNextPrayer(value: JSONObject): WidgetNextPrayer? {
      val id = value.string("id")?.takeIf(String::isNotBlank) ?: return null
      val label = value.string("label")?.takeIf(String::isNotBlank) ?: return null
      val at = value.long("at") ?: return null
      return WidgetNextPrayer(id, label, at)
    }
  }
}

data class WidgetPrayerBlock(
  val id: String,
  val label: String,
  val startsAt: Long,
  val endsAt: Long,
  val items: List<WidgetPrayerItem>,
)

data class WidgetPrayerItem(
  val id: String,
  val label: String,
  val done: Boolean,
  val countsAsUnrecorded: Boolean = false,
)

data class WidgetNextPrayer(val id: String, val label: String, val at: Long)

internal fun isValidWidgetPrayerAction(action: PendingPrayerAction, snapshot: WidgetSnapshot): Boolean =
  isValidPendingPrayerAction(action) &&
    snapshot.blocks.any { block -> block.items.any { item -> item.id == action.itemId } }

internal fun applyWidgetTick(snapshot: WidgetSnapshot, itemId: String, done: Boolean): WidgetSnapshot {
  val current = snapshot.blocks.asSequence().flatMap { it.items.asSequence() }.firstOrNull { it.id == itemId }
    ?: return snapshot
  if (current.done == done) return snapshot
  val updated = WidgetSnapshot.withItemDone(snapshot, itemId, done)
  if (!current.countsAsUnrecorded) return updated
  val unrecordedCount = if (done) {
    (updated.unrecordedCount - 1).coerceAtLeast(0)
  } else if (updated.unrecordedCount < Int.MAX_VALUE) {
    updated.unrecordedCount + 1
  } else {
    Int.MAX_VALUE
  }
  return updated.copy(unrecordedCount = unrecordedCount)
}

internal fun applyPrayerActionToSnapshot(
  snapshot: WidgetSnapshot,
  action: PendingPrayerAction,
): WidgetSnapshot? {
  if (snapshot.day != action.day || snapshot.versionId != action.versionId) return null
  if (snapshot.blocks.none { block -> block.items.any { item -> item.id == action.itemId } }) return null
  return applyWidgetTick(snapshot, action.itemId, true)
}

internal fun mergePendingWidgetActions(
  snapshot: WidgetSnapshot,
  actions: List<PendingPrayerAction>,
): WidgetSnapshot = actions.fold(snapshot) { current, action ->
  if (current.day != action.day || current.versionId != action.versionId) current
  else applyWidgetTick(current, action.itemId, action.done)
}

private fun JSONObject.string(key: String): String? = opt(key) as? String

private fun JSONObject.boolean(key: String): Boolean? = opt(key) as? Boolean

private fun JSONObject.long(key: String): Long? = when (val value = opt(key)) {
  is Byte, is Short, is Int, is Long -> (value as Number).toLong()
  is Double -> value.takeIf {
    it.isFinite() && it % 1.0 == 0.0 && it >= Long.MIN_VALUE.toDouble() && it < Long.MAX_VALUE.toDouble()
  }?.toLong()
  else -> null
}

private fun JSONObject.integer(key: String): Int? = long(key)?.takeIf {
  it in Int.MIN_VALUE..Int.MAX_VALUE
}?.toInt()

private fun JSONObject.array(key: String): JSONArray? = opt(key) as? JSONArray

private fun <T : Any> JSONArray.mapObjects(parse: (JSONObject) -> T?): List<T>? {
  val values = mutableListOf<T>()
  for (index in 0 until length()) {
    val value = opt(index) as? JSONObject ?: return null
    values.add(parse(value) ?: return null)
  }
  return values
}
