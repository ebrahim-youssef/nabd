package expo.modules.nabddevice

import android.content.Context
import android.content.SharedPreferences
import android.util.Log

private const val WIDGET_SNAPSHOT_PREFERENCES = "nabd_widget_snapshot"
private const val WIDGET_SNAPSHOT_KEY = "snapshot"
private const val LOG_TAG = "NabdDevice"

internal object OutsideAppActionLock

internal object WidgetSnapshotStore {
  fun read(context: Context): WidgetSnapshot? = synchronized(OutsideAppActionLock) {
    WidgetSnapshot.parse(preferences(context).getString(WIDGET_SNAPSHOT_KEY, null))
  }

  fun write(context: Context, snapshot: WidgetSnapshot): Boolean = synchronized(OutsideAppActionLock) {
    val preferences = preferences(context)
    val committed = preferences.edit().putString(WIDGET_SNAPSHOT_KEY, snapshot.toJson()).commit()
    if (!committed) Log.w(LOG_TAG, "Could not commit widget snapshot for ${snapshot.day}")
    committed
  }

  fun clear(context: Context): Boolean = synchronized(OutsideAppActionLock) {
    preferences(context).edit().remove(WIDGET_SNAPSHOT_KEY).commit()
  }

  private fun preferences(context: Context): SharedPreferences =
    context.getSharedPreferences(WIDGET_SNAPSHOT_PREFERENCES, Context.MODE_PRIVATE)
}
