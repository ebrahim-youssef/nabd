package expo.modules.nabddevice

import android.app.AlarmManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

private const val TIME_CHANGE_EVENT = "onTimeChange"

class NabdDeviceModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()
  private var timeChangeReceiver: BroadcastReceiver? = null

  override fun definition() = ModuleDefinition {
    Name("NabdDevice")
    Events(TIME_CHANGE_EVENT)

    Function("getExactAlarmStatus") {
      val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
        exactAlarmStatus(Build.VERSION.SDK_INT) { false }
      } else {
        exactAlarmStatus(Build.VERSION.SDK_INT) { alarmManager.canScheduleExactAlarms() }
      }
    }

    OnCreate {
      registerTimeChangeReceiver()
    }

    OnDestroy {
      unregisterTimeChangeReceiver()
    }
  }

  private fun registerTimeChangeReceiver() {
    if (timeChangeReceiver != null) return

    val receiver = object : BroadcastReceiver() {
      override fun onReceive(_context: Context?, _intent: Intent?) {
        sendEvent(TIME_CHANGE_EVENT)
      }
    }
    val filter = IntentFilter().apply {
      addAction(Intent.ACTION_TIME_CHANGED)
      addAction(Intent.ACTION_TIMEZONE_CHANGED)
      addAction(Intent.ACTION_DATE_CHANGED)
    }

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      context.registerReceiver(receiver, filter, Context.RECEIVER_NOT_EXPORTED)
    } else {
      context.registerReceiver(receiver, filter)
    }
    timeChangeReceiver = receiver
  }

  private fun unregisterTimeChangeReceiver() {
    val receiver = timeChangeReceiver ?: return
    timeChangeReceiver = null
    val reactContext = appContext.reactContext ?: return
    reactContext.unregisterReceiver(receiver)
  }
}
