package expo.modules.nabddevice

import org.json.JSONArray
import org.json.JSONObject

private const val SNAPSHOT_VERSION = 1

data class PrayerAlarm(
  val id: String,
  val at: Long,
  val title: String,
  val body: String,
  val sound: String,
  val channelId: String,
  val isAlarmChannel: Boolean,
  val prayerAction: PrayerAction? = null,
)

object PrayerAlarmSnapshot {
  fun parse(json: String): List<PrayerAlarm>? {
    if (json.isBlank()) return null
    return try {
      val root = JSONObject(json)
      if (root.getInt("version") != SNAPSHOT_VERSION) return null
      val entries = root.getJSONArray("alarms")
      val alarms = buildList {
        for (index in 0 until entries.length()) {
          val entry = entries.getJSONObject(index)
          val id = entry.getString("id").trim()
          val sound = entry.getString("sound").trim()
          val channelId = entry.getString("channelId").trim()
          if (id.isEmpty() || sound.isEmpty() || channelId.isEmpty()) return null
          add(
            PrayerAlarm(
              id = id,
              at = entry.getLong("at"),
              title = entry.getString("title"),
              body = entry.getString("body"),
              sound = sound,
              channelId = channelId,
              isAlarmChannel = entry.getBoolean("isAlarmChannel"),
              prayerAction = parseAction(entry),
            ),
          )
        }
      }
      if (alarms.map { it.id }.toSet().size != alarms.size) return null
      alarms
    } catch (_: Exception) {
      null
    }
  }

  fun serialize(alarms: List<PrayerAlarm>): String {
    val entries = JSONArray()
    alarms.forEach { alarm ->
      val entry = JSONObject()
        .put("id", alarm.id)
        .put("at", alarm.at)
        .put("title", alarm.title)
        .put("body", alarm.body)
        .put("sound", alarm.sound)
        .put("channelId", alarm.channelId)
        .put("isAlarmChannel", alarm.isAlarmChannel)
      alarm.prayerAction?.let { action ->
        entry
          .put("actionItemId", action.itemId)
          .put("actionDay", action.day)
          .put("actionVersionId", action.versionId)
          .put("actionId", action.actionId)
          .put("actionLabel", action.label)
      }
      entries.put(entry)
    }
    return JSONObject()
      .put("version", SNAPSHOT_VERSION)
      .put("alarms", entries)
      .toString()
  }

  fun future(alarms: List<PrayerAlarm>, now: Long): List<PrayerAlarm> = alarms
    .filter { it.at > now }
    .sortedBy { it.at }

  fun findMatching(alarms: List<PrayerAlarm>, id: String, at: Long): PrayerAlarm? = alarms
    .firstOrNull { it.id == id && it.at == at }

  private fun parseAction(entry: JSONObject): PrayerAction? {
    val action = PrayerAction(
      itemId = entry.opt("actionItemId") as? String ?: return null,
      day = entry.opt("actionDay") as? String ?: return null,
      versionId = entry.opt("actionVersionId") as? String ?: return null,
      actionId = entry.opt("actionId") as? String ?: return null,
      label = entry.opt("actionLabel") as? String ?: return null,
    )
    return action.takeIf(::isValidPrayerAction)
  }
}
