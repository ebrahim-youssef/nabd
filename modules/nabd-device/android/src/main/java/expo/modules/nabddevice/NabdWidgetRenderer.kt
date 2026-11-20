package expo.modules.nabddevice

import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.view.View
import android.widget.RemoteViews
import java.util.TimeZone

internal object NabdWidgetRenderer {
  fun render(
    context: Context,
    appWidgetId: Int,
    snapshot: WidgetSnapshot?,
    nowMs: Long,
    isLarge: Boolean,
  ): RemoteViews {
    val layoutId = if (isLarge) R.layout.nabd_widget_large else R.layout.nabd_widget_small
    val views = RemoteViews(context.packageName, layoutId)
    val model = WidgetViewModel.create(snapshot, nowMs, TimeZone.getDefault())
    when (model) {
      WidgetViewModel.Placeholder -> showMessage(context, views, R.string.nabd_widget_open_app, false)
      WidgetViewModel.Stale -> showMessage(context, views, R.string.nabd_widget_stale, true)
      is WidgetViewModel.Content -> {
        showContent(context, views, appWidgetId, snapshot!!, model, isLarge)
        setRootClick(context, views, appWidgetId, model.clickUri)
      }
    }
    if (model !is WidgetViewModel.Content) {
      setRootClick(context, views, appWidgetId, "nabd://home")
    }
    return views
  }

  private fun showMessage(context: Context, views: RemoteViews, messageId: Int, isStale: Boolean) {
    views.setViewVisibility(R.id.nabd_widget_content, View.GONE)
    views.setViewVisibility(R.id.nabd_widget_message, View.VISIBLE)
    views.setTextViewText(R.id.nabd_widget_message, context.getString(messageId))
    views.setTextColor(
      R.id.nabd_widget_message,
      context.getColor(if (isStale) R.color.nabd_widget_mute else R.color.nabd_widget_ink),
    )
  }

  private fun showContent(
    context: Context,
    views: RemoteViews,
    appWidgetId: Int,
    snapshot: WidgetSnapshot,
    model: WidgetViewModel.Content,
    isLarge: Boolean,
  ) {
    views.setViewVisibility(R.id.nabd_widget_content, View.VISIBLE)
    views.setViewVisibility(R.id.nabd_widget_message, View.GONE)
    if (isLarge) showLargeContent(context, views, appWidgetId, snapshot, model) else {
      showSmallContent(context, views, appWidgetId, snapshot, model)
    }
  }

  private fun showLargeContent(
    context: Context,
    views: RemoteViews,
    appWidgetId: Int,
    snapshot: WidgetSnapshot,
    model: WidgetViewModel.Content,
  ) {
    views.setTextViewText(R.id.nabd_widget_block_title, model.title)
    when (val window = model.window) {
      is WidgetViewModel.BlockWindow.Open -> views.setTextViewText(
        R.id.nabd_widget_block_window,
        context.getString(R.string.nabd_widget_window, window.start, window.end),
      )
      is WidgetViewModel.BlockWindow.StartsAt -> views.setTextViewText(
        R.id.nabd_widget_block_window,
        context.getString(R.string.nabd_widget_starts_at, window.start),
      )
    }

    repeat(WIDGET_MAX_VISIBLE_ITEMS) { index ->
      val rowId = largeRowId(index)
      val item = model.items.getOrNull(index)
      views.setViewVisibility(rowId, if (item == null) View.GONE else View.VISIBLE)
      if (item != null) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
          val toggleId = largeToggleId(index)
          views.setTextViewText(toggleId, item.label)
          views.setCompoundButtonChecked(toggleId, item.done)
          val isOpen = model.window is WidgetViewModel.BlockWindow.Open
          views.setBoolean(toggleId, "setEnabled", isOpen)
          if (isOpen) {
            setToggleResponse(context, views, toggleId, appWidgetId, snapshot, item.id)
          }
          views.setContentDescription(
            rowId,
            context.getString(if (item.done) R.string.nabd_widget_item_done else R.string.nabd_widget_item_open, item.label),
          )
        } else {
          val checkId = largeCheckId(index)
          val labelId = largeLabelId(index)
          views.setImageViewResource(
            checkId,
            if (item.done) R.drawable.nabd_widget_star_on else R.drawable.nabd_widget_star_off,
          )
          views.setTextViewText(labelId, item.label)
          views.setTextColor(
            labelId,
            context.getColor(if (item.done) R.color.nabd_widget_mute else R.color.nabd_widget_ink),
          )
          views.setContentDescription(
            rowId,
            context.getString(if (item.done) R.string.nabd_widget_item_done else R.string.nabd_widget_item_open, item.label),
          )
        }
      }
    }

    when (val unrecorded = model.unrecorded) {
      WidgetViewModel.Unrecorded.Hidden -> views.setViewVisibility(R.id.nabd_widget_unrecorded, View.GONE)
      WidgetViewModel.Unrecorded.WriteFailed -> {
        views.setViewVisibility(R.id.nabd_widget_unrecorded, View.VISIBLE)
        views.setTextViewText(R.id.nabd_widget_unrecorded, context.getString(R.string.nabd_widget_write_failed))
      }
      is WidgetViewModel.Unrecorded.Count -> {
        views.setViewVisibility(R.id.nabd_widget_unrecorded, View.VISIBLE)
        views.setTextViewText(
          R.id.nabd_widget_unrecorded,
          context.getString(R.string.nabd_widget_unrecorded, formatWidgetArabicNumber(unrecorded.value)),
        )
      }
    }
    setNextPrayer(context, views, model.nextPrayer)
  }

  private fun showSmallContent(
    context: Context,
    views: RemoteViews,
    appWidgetId: Int,
    snapshot: WidgetSnapshot,
    model: WidgetViewModel.Content,
  ) {
    views.setTextViewText(R.id.nabd_widget_small_next, nextPrayerText(context, model.nextPrayer))
    views.setViewVisibility(
      R.id.nabd_widget_small_next,
      if (model.nextPrayer == null) View.GONE else View.VISIBLE,
    )
    val item = model.smallItem
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      views.setTextViewText(R.id.nabd_widget_small_toggle, model.title)
      views.setCompoundButtonChecked(R.id.nabd_widget_small_toggle, item?.done == true)
      val isOpen = item != null && model.window is WidgetViewModel.BlockWindow.Open
      views.setBoolean(R.id.nabd_widget_small_toggle, "setEnabled", isOpen)
      if (isOpen && item != null) {
        setToggleResponse(context, views, R.id.nabd_widget_small_toggle, appWidgetId, snapshot, item.id)
      }
    } else {
      views.setTextViewText(R.id.nabd_widget_small_title, model.title)
      views.setViewVisibility(
        R.id.nabd_widget_small_check,
        if (item == null) View.GONE else View.VISIBLE,
      )
      views.setImageViewResource(
        R.id.nabd_widget_small_check,
        if (item?.done == true) R.drawable.nabd_widget_star_on else R.drawable.nabd_widget_star_off,
      )
      views.setTextColor(
        R.id.nabd_widget_small_title,
        context.getColor(if (item?.done == true) R.color.nabd_widget_mute else R.color.nabd_widget_ink),
      )
    }
  }

  private fun setNextPrayer(context: Context, views: RemoteViews, prayer: WidgetViewModel.FormattedPrayer?) {
    views.setViewVisibility(R.id.nabd_widget_next_prayer, if (prayer == null) View.GONE else View.VISIBLE)
    if (prayer != null) {
      views.setTextViewText(R.id.nabd_widget_next_prayer, nextPrayerText(context, prayer))
    }
  }

  private fun nextPrayerText(context: Context, prayer: WidgetViewModel.FormattedPrayer?): String =
    prayer?.let { context.getString(R.string.nabd_widget_next_prayer, it.label, it.time) }.orEmpty()

  private fun setRootClick(context: Context, views: RemoteViews, appWidgetId: Int, uri: String) {
    val intent = Intent(Intent.ACTION_VIEW, Uri.parse(uri)).setPackage(context.packageName)
    val pendingIntent = PendingIntent.getActivity(
      context,
      appWidgetId,
      intent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
    views.setOnClickPendingIntent(R.id.nabd_widget_root, pendingIntent)
  }

  private fun setToggleResponse(
    context: Context,
    views: RemoteViews,
    toggleId: Int,
    appWidgetId: Int,
    snapshot: WidgetSnapshot,
    itemId: String,
  ) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return
    val data = Uri.Builder()
      .scheme("nabd-widget")
      .authority("tick")
      .appendPath(appWidgetId.toString())
      .appendPath(snapshot.day)
      .appendPath(snapshot.versionId)
      .appendPath(itemId)
      .build()
    val intent = Intent(context, WidgetTickReceiver::class.java).apply {
      action = WIDGET_TICK_ACTION
      this.data = data
    }
    val pendingIntent = PendingIntent.getBroadcast(
      context,
      appWidgetId,
      intent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE,
    )
    views.setOnCheckedChangeResponse(
      toggleId,
      RemoteViews.RemoteResponse.fromPendingIntent(pendingIntent),
    )
  }

  private fun largeRowId(index: Int): Int = when (index) {
    0 -> R.id.nabd_widget_item_row_1
    1 -> R.id.nabd_widget_item_row_2
    else -> R.id.nabd_widget_item_row_3
  }

  private fun largeCheckId(index: Int): Int = when (index) {
    0 -> R.id.nabd_widget_item_check_1
    1 -> R.id.nabd_widget_item_check_2
    else -> R.id.nabd_widget_item_check_3
  }

  private fun largeLabelId(index: Int): Int = when (index) {
    0 -> R.id.nabd_widget_item_label_1
    1 -> R.id.nabd_widget_item_label_2
    else -> R.id.nabd_widget_item_label_3
  }

  private fun largeToggleId(index: Int): Int = when (index) {
    0 -> R.id.nabd_widget_item_toggle_1
    1 -> R.id.nabd_widget_item_toggle_2
    else -> R.id.nabd_widget_item_toggle_3
  }

}
