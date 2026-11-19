package expo.modules.nabddevice

import android.content.Context
import android.content.SharedPreferences
import android.util.Log

private const val PENDING_ACTIONS_PREFS = "nabd_pending_actions"
private const val PENDING_ACTIONS_KEY = "queue"
private const val LOG_TAG = "NabdDevice"

internal object PendingPrayerActionStore {
  fun readEncoded(context: Context): String? = synchronized(OutsideAppActionLock) {
    preferences(context).getString(PENDING_ACTIONS_KEY, null)
  }

  fun read(context: Context): String = synchronized(OutsideAppActionLock) {
    val encoded = preferences(context).getString(PENDING_ACTIONS_KEY, null)
    PendingPrayerActions.acknowledge(encoded, emptyList())
  }

  fun append(context: Context, action: PendingPrayerAction): Boolean = synchronized(OutsideAppActionLock) {
    val preferences = preferences(context)
    val encoded = PendingPrayerActions.append(preferences.getString(PENDING_ACTIONS_KEY, null), action)
      ?: return@synchronized false
    commit(preferences, encoded, "Could not commit pending prayer action ${action.actionId}")
  }

  fun acknowledge(context: Context, actionIds: List<String>): Boolean = synchronized(OutsideAppActionLock) {
    val preferences = preferences(context)
    val encoded = PendingPrayerActions.acknowledge(
      preferences.getString(PENDING_ACTIONS_KEY, null),
      actionIds,
    )
    commit(preferences, encoded, "Could not commit acknowledged prayer actions $actionIds")
  }

  private fun preferences(context: Context): SharedPreferences =
    context.getSharedPreferences(PENDING_ACTIONS_PREFS, Context.MODE_PRIVATE)

  private fun commit(preferences: SharedPreferences, encoded: String, reason: String): Boolean {
    if (preferences.edit().putString(PENDING_ACTIONS_KEY, encoded).commit()) return true
    Log.w(LOG_TAG, reason)
    return false
  }
}
