package expo.modules.nabddevice

import android.app.AlarmManager
import android.content.ActivityNotFoundException
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
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

    Function("isIgnoringBatteryOptimizations") {
      val powerManager = context.getSystemService(Context.POWER_SERVICE) as PowerManager
      powerManager.isIgnoringBatteryOptimizations(context.packageName)
    }

    Function("requestIgnoreBatteryOptimizations") {
      val packageUri = Uri.parse("package:${context.packageName}")
      when {
        startBatteryOptimizationIntent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, packageUri) ->
          "exemptionDialog"
        startBatteryOptimizationIntent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS) ->
          "settingsList"
        else -> "none"
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

  private fun startBatteryOptimizationIntent(action: String, data: Uri? = null): Boolean {
    return try {
      val intent = Intent(action).apply {
        if (data != null) this.data = data
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      }
      context.startActivity(intent)
      true
    } catch (_: ActivityNotFoundException) {
      false
    } catch (_: SecurityException) {
      false
    }
  }
}
