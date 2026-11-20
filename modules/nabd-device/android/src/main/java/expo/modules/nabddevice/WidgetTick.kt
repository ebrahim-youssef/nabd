package expo.modules.nabddevice

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.util.Log
import android.widget.RemoteViews
import java.util.UUID

internal const val WIDGET_TICK_ACTION = "expo.modules.nabddevice.WIDGET_TICK"
private const val LOG_TAG = "NabdDevice"
private const val WIDGET_TICK_SCHEME = "nabd-widget"
private const val WIDGET_TICK_AUTHORITY = "tick"

internal data class WidgetTickTarget(
  val appWidgetId: Int,
  val day: String,
  val versionId: String,
  val itemId: String,
)

internal enum class WidgetTickValidation {
  Valid,
  MissingSnapshot,
  StaleSnapshot,
  WrongDay,
  WrongVersion,
  ItemNotInOpenBlock,
}

internal fun parseWidgetTickTarget(uri: Uri?): WidgetTickTarget? {
  if (uri == null || uri.scheme != WIDGET_TICK_SCHEME || uri.authority != WIDGET_TICK_AUTHORITY) return null
  if (uri.query != null || uri.fragment != null) return null
  val segments = uri.pathSegments
  if (segments.size != WIDGET_TICK_SEGMENT_COUNT) return null
  val appWidgetId = segments[0].toIntOrNull()?.takeIf { it >= 0 } ?: return null
  val day = segments[1].takeIf { it.matches(WIDGET_TICK_DAY_PATTERN) } ?: return null
  val versionId = segments[2].takeIf(String::isNotBlank) ?: return null
  val itemId = segments[3].takeIf(String::isNotBlank) ?: return null
  return WidgetTickTarget(appWidgetId, day, versionId, itemId)
}

internal fun validateWidgetTick(
  target: WidgetTickTarget,
  snapshot: WidgetSnapshot?,
  nowMs: Long,
): WidgetTickValidation {
  snapshot ?: return WidgetTickValidation.MissingSnapshot
  if (WidgetSnapshot.isStale(snapshot, nowMs)) return WidgetTickValidation.StaleSnapshot
  if (snapshot.day != target.day) return WidgetTickValidation.WrongDay
  if (snapshot.versionId != target.versionId) return WidgetTickValidation.WrongVersion
  val action = PendingPrayerAction(
    actionId = "widget-validation",
    itemId = target.itemId,
    day = target.day,
    versionId = target.versionId,
    at = nowMs,
    done = false,
  )
  if (!isValidWidgetPrayerAction(action, snapshot)) return WidgetTickValidation.ItemNotInOpenBlock
  val currentBlock = WidgetSnapshot.currentBlock(snapshot, nowMs)
    ?: return WidgetTickValidation.ItemNotInOpenBlock
  if (currentBlock.items.none { it.id == target.itemId }) return WidgetTickValidation.ItemNotInOpenBlock
  return WidgetTickValidation.Valid
}

class WidgetTickReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent?) {
    if (intent?.action != WIDGET_TICK_ACTION) return
    var actionId = "unavailable"
    try {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
        Log.w(LOG_TAG, "Rejected widget tick because API level is below 31; actionId=unavailable")
        return
      }
      val target = parseWidgetTickTarget(intent.data)
      val hasChecked = intent.hasExtra(RemoteViews.EXTRA_CHECKED)
      if (target == null || !hasChecked) {
        Log.w(LOG_TAG, "Rejected widget tick because URI or checked state is missing; actionId=unavailable")
        return
      }
      val checked = try {
        intent.getBooleanExtra(RemoteViews.EXTRA_CHECKED, false)
      } catch (_: ClassCastException) {
        Log.w(LOG_TAG, "Rejected widget tick because checked state is malformed; actionId=unavailable")
        return
      }
      actionId = "widget:${target.day}:${target.itemId}:${target.versionId}:${UUID.randomUUID()}"
      var queued = false
      synchronized(OutsideAppActionLock) {
        val nowMs = System.currentTimeMillis()
        val snapshot = WidgetSnapshotStore.read(context)
        val validation = validateWidgetTick(target, snapshot, nowMs)
        if (validation != WidgetTickValidation.Valid) {
          Log.w(LOG_TAG, "Rejected widget tick because validation=$validation; actionId=$actionId")
        } else {
          val action = PendingPrayerAction(
            actionId = actionId,
            itemId = target.itemId,
            day = target.day,
            versionId = target.versionId,
            at = nowMs,
            done = checked,
          )
          if (PendingPrayerActionStore.append(context, action)) {
            queued = true
            if (!WidgetSnapshotStore.write(context, applyWidgetTick(snapshot!!, target.itemId, checked))) {
              Log.w(LOG_TAG, "Could not update widget snapshot after committed tick; actionId=$actionId")
            }
          } else {
            Log.w(LOG_TAG, "Could not commit widget tick to pending action queue; actionId=$actionId")
          }
        }
      }
      if (queued) PrayerActionHooks.onQueued(context)
    } finally {
      try {
        NabdWidgetRefresh.refresh(context)
      } catch (cause: Exception) {
        Log.w(LOG_TAG, "Could not refresh widgets after tick; actionId=$actionId", cause)
      }
    }
  }
}

private const val WIDGET_TICK_SEGMENT_COUNT = 4
private val WIDGET_TICK_DAY_PATTERN = Regex("\\d{4}-\\d{2}-\\d{2}")
