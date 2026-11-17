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
      entries.put(
        JSONObject()
          .put("id", alarm.id)
          .put("at", alarm.at)
          .put("title", alarm.title)
          .put("body", alarm.body)
          .put("sound", alarm.sound)
          .put("channelId", alarm.channelId)
          .put("isAlarmChannel", alarm.isAlarmChannel),
      )
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
}
