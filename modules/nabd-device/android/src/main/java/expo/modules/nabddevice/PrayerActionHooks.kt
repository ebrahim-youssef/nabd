package expo.modules.nabddevice

import android.content.Context
import android.util.Log

private const val LOG_TAG = "NabdDevice"

internal object PrayerActionHooks {
  @Volatile private var eventListener: ((Context) -> Unit)? = null

  @Synchronized
  fun register(listener: (Context) -> Unit) {
    eventListener = listener
  }

  @Synchronized
  fun unregister(listener: (Context) -> Unit) {
    if (eventListener === listener) eventListener = null
  }

  fun onQueued(context: Context) {
    try {
      eventListener?.invoke(context)
    } catch (cause: Exception) {
      Log.w(LOG_TAG, "Could not emit the pending prayer action event", cause)
    }
  }
}
