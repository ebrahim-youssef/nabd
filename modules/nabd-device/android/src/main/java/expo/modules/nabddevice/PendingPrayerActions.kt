package expo.modules.nabddevice

import org.json.JSONArray
import org.json.JSONObject

internal object PendingPrayerActions {
  const val MAX_PENDING_ACTIONS = 100

  fun decode(json: String?): List<PendingPrayerAction> {
    if (json.isNullOrBlank()) return emptyList()
    return try {
      val encodedActions = JSONArray(json)
      buildList {
        for (index in 0 until encodedActions.length()) {
          val encodedAction = encodedActions.optJSONObject(index) ?: continue
          val action = parse(encodedAction) ?: continue
          if (isValidPendingPrayerAction(action)) add(action)
        }
      }
    } catch (_: Exception) {
      emptyList()
    }
  }

  fun append(json: String?, action: PendingPrayerAction): String? {
    val actions = decode(json)
    if (!isValidPendingPrayerAction(action) || actions.any { it.actionId == action.actionId }) {
      return encode(actions)
    }
    if (actions.size >= MAX_PENDING_ACTIONS) return null
    return encode(actions + action)
  }

  fun acknowledge(json: String?, actionIds: List<String>): String {
    val acknowledged = actionIds.toSet()
    return encode(decode(json).filterNot { it.actionId in acknowledged })
  }

  private fun parse(json: JSONObject): PendingPrayerAction? {
    val actionId = json.opt("actionId") as? String ?: return null
    val itemId = json.opt("itemId") as? String ?: return null
    val day = json.opt("day") as? String ?: return null
    val versionId = json.opt("versionId") as? String ?: return null
    val at = (json.opt("at") as? Number)?.toString()?.toLongOrNull() ?: return null
    val done = when (val value = json.opt("done")) {
      null -> true
      is Boolean -> value
      else -> return null
    }
    return PendingPrayerAction(actionId, itemId, day, versionId, at, done)
  }

  private fun encode(actions: List<PendingPrayerAction>): String {
    val encodedActions = JSONArray()
    actions.forEach { action ->
      encodedActions.put(
        JSONObject()
          .put("actionId", action.actionId)
          .put("itemId", action.itemId)
          .put("day", action.day)
          .put("versionId", action.versionId)
          .put("at", action.at)
          .put("done", action.done),
      )
    }
    return encodedActions.toString()
  }
}
