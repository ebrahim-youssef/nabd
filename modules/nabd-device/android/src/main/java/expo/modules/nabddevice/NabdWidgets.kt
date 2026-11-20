package expo.modules.nabddevice

import android.app.AlarmManager
import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.BroadcastReceiver
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import java.util.TimeZone

private const val WIDGET_BOUNDARY_ACTION = "expo.modules.nabddevice.WIDGET_BOUNDARY"
private const val WIDGET_BOUNDARY_URI = "nabd-widget://boundary"
private const val WIDGET_BOUNDARY_REQUEST_CODE = 0
private const val WIDGET_BOUNDARY_WINDOW_MS = 60_000L

abstract class NabdWidgetProvider : AppWidgetProvider() {
  override fun onUpdate(context: Context, manager: AppWidgetManager, appWidgetIds: IntArray) {
    NabdWidgetRefresh.refresh(context)
  }

  override fun onAppWidgetOptionsChanged(
    context: Context,
    manager: AppWidgetManager,
    appWidgetId: Int,
    newOptions: Bundle,
  ) {
    NabdWidgetRefresh.refresh(context)
  }

  override fun onEnabled(context: Context) {
    NabdWidgetRefresh.refresh(context)
  }

  override fun onDisabled(context: Context) {
    if (NabdWidgetRefresh.widgetIds(context).isEmpty()) WidgetBoundaryAlarm.cancel(context)
  }
}

class NabdLargeWidgetProvider : NabdWidgetProvider()

class NabdSmallWidgetProvider : NabdWidgetProvider()

internal object NabdWidgetRefresh {
  fun refresh(context: Context) {
    val manager = AppWidgetManager.getInstance(context)
    val widgetIds = widgetIds(context)
    if (widgetIds.isEmpty()) {
      WidgetBoundaryAlarm.cancel(context)
      return
    }
    val snapshot = WidgetSnapshotStore.read(context)
    val nowMs = System.currentTimeMillis()
    widgetProviders(context).forEach { (component, isLarge) ->
      manager.getAppWidgetIds(component).forEach { appWidgetId ->
        val views = NabdWidgetRenderer.render(context, appWidgetId, snapshot, nowMs, isLarge)
        manager.updateAppWidget(appWidgetId, views)
      }
    }
    WidgetBoundaryAlarm.schedule(context, snapshot, nowMs)
  }

  fun widgetIds(context: Context): IntArray = widgetProviders(context)
    .flatMap { (component, _) -> AppWidgetManager.getInstance(context).getAppWidgetIds(component).toList() }
    .toIntArray()

  private fun widgetProviders(context: Context) = listOf(
    ComponentName(context, NabdLargeWidgetProvider::class.java) to true,
    ComponentName(context, NabdSmallWidgetProvider::class.java) to false,
  )
}

internal object WidgetBoundaryAlarm {
  fun schedule(context: Context, snapshot: WidgetSnapshot?, nowMs: Long) {
    val model = WidgetViewModel.create(snapshot, nowMs, TimeZone.getDefault())
    if (model !is WidgetViewModel.Content || snapshot == null) {
      cancel(context)
      return
    }

    val triggerAt = nextWidgetRefreshAt(snapshot, nowMs)
    if (triggerAt == null) {
      cancel(context)
      return
    }

    val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    alarmManager.setWindow(
      AlarmManager.RTC,
      triggerAt,
      WIDGET_BOUNDARY_WINDOW_MS,
      pendingIntent(context),
    )
  }

  fun cancel(context: Context) {
    val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    val intent = pendingIntent(context)
    alarmManager.cancel(intent)
    intent.cancel()
  }

  private fun pendingIntent(context: Context): PendingIntent {
    val intent = Intent(context, WidgetBoundaryReceiver::class.java).apply {
      action = WIDGET_BOUNDARY_ACTION
      data = Uri.parse(WIDGET_BOUNDARY_URI)
    }
    return PendingIntent.getBroadcast(
      context,
      WIDGET_BOUNDARY_REQUEST_CODE,
      intent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
  }
}

class WidgetBoundaryReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent?) {
    if (intent?.action != WIDGET_BOUNDARY_ACTION) return
    NabdWidgetRefresh.refresh(context)
  }
}
