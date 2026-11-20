package expo.modules.nabddevice

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import androidx.core.app.NotificationManagerCompat

internal const val PRAYER_ACTION_DONE = "expo.modules.nabddevice.PRAYER_ACTION_DONE"
private const val LOG_TAG = "NabdDevice"

class PrayerActionReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent?) {
    if (intent?.action != PRAYER_ACTION_DONE) return
    val payload = PrayerActionReceiverPayload.create(
      itemId = readStringExtra(intent, ACTION_ITEM_ID_EXTRA),
      day = readStringExtra(intent, ACTION_DAY_EXTRA),
      versionId = readStringExtra(intent, ACTION_VERSION_ID_EXTRA),
      actionId = readStringExtra(intent, ACTION_ID_EXTRA),
      label = readStringExtra(intent, ACTION_LABEL_EXTRA),
      notificationTag = readStringExtra(intent, NOTIFICATION_TAG_EXTRA),
      notificationId = readIntExtra(intent, NOTIFICATION_ID_EXTRA),
    )
    if (payload == null) {
      val actionId = readStringExtra(intent, ACTION_ID_EXTRA) ?: "unavailable"
      Log.w(LOG_TAG, "Rejected prayer action because payload validation failed; actionId=$actionId")
      return
    }

    val action = payload.toPendingAction(System.currentTimeMillis())
    val queued = synchronized(OutsideAppActionLock) {
      if (!PendingPrayerActionStore.append(context, action)) {
        false
      } else {
        val snapshot = WidgetSnapshotStore.read(context)
        val updated = snapshot?.let { applyPrayerActionToSnapshot(it, action) }
        if (updated != null && !WidgetSnapshotStore.write(context, updated)) {
          Log.w(LOG_TAG, "Could not update widget snapshot after committed prayer action; actionId=${action.actionId}")
        }
        true
      }
    }
    if (!queued) return
    try {
      NabdWidgetRefresh.refresh(context)
    } catch (cause: Exception) {
      Log.w(LOG_TAG, "Could not refresh widgets after committed prayer action; actionId=${action.actionId}", cause)
    }

    try {
      NotificationManagerCompat.from(context).cancel(payload.notificationTag, payload.notificationId)
    } catch (cause: SecurityException) {
      Log.w(LOG_TAG, "Could not cancel the notification after queueing its prayer action", cause)
    }
    PrayerActionHooks.onQueued(context)
  }

  private fun readStringExtra(intent: Intent, key: String): String? = try {
    intent.getStringExtra(key)
  } catch (_: ClassCastException) {
    null
  }

  private fun readIntExtra(intent: Intent, key: String): Int? = try {
    if (intent.hasExtra(key)) intent.getIntExtra(key, 0) else null
  } catch (_: ClassCastException) {
    null
  }

  companion object {
    const val ACTION_ITEM_ID_EXTRA = "actionItemId"
    const val ACTION_DAY_EXTRA = "actionDay"
    const val ACTION_VERSION_ID_EXTRA = "actionVersionId"
    const val ACTION_ID_EXTRA = "actionId"
    const val ACTION_LABEL_EXTRA = "actionLabel"
    const val NOTIFICATION_TAG_EXTRA = "notificationTag"
    const val NOTIFICATION_ID_EXTRA = "notificationId"
  }
}
