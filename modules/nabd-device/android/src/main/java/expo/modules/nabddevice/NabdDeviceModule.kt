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
import android.util.Log
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

private const val TIME_CHANGE_EVENT = "onTimeChange"
private const val PRAYER_ACTION_QUEUED_EVENT = "onPrayerActionQueued"
private const val LOG_TAG = "NabdDevice"

class NabdDeviceModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()
  private var timeChangeReceiver: BroadcastReceiver? = null
  private var prayerActionEventListener: ((Context) -> Unit)? = null

  override fun definition() = ModuleDefinition {
    Name("NabdDevice")
    Events(TIME_CHANGE_EVENT, PRAYER_ACTION_QUEUED_EVENT)

    Function("getExactAlarmStatus") {
      val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
        exactAlarmStatus(Build.VERSION.SDK_INT) { false }
      } else {
        exactAlarmStatus(Build.VERSION.SDK_INT) { alarmManager.canScheduleExactAlarms() }
      }
    }

    Function("setCountdown") { payloadJson: String ->
      CountdownNotificationService.set(context, payloadJson)
    }

    Function("clearCountdown") {
      CountdownNotificationService.clear(context)
    }

    Function("getCountdownStatus") {
      CountdownNotificationService.status(context)
    }

    Function("replacePrayerAlarms") { snapshotJson: String ->
      PrayerAlarmScheduler.replace(context, snapshotJson)
    }

    Function("cancelPrayerAlarms") {
      PrayerAlarmScheduler.cancelAll(context)
    }

    Function("readPendingPrayerActions") {
      PendingPrayerActionStore.read(context)
    }

    Function("acknowledgePendingPrayerActions") { actionIds: List<String> ->
      PendingPrayerActionStore.acknowledge(context, actionIds)
    }

    Function("writeWidgetSnapshot") { json: String ->
      val parsed = WidgetSnapshot.parse(json)
      if (parsed == null) {
        Log.w(LOG_TAG, "Rejected widget snapshot because JSON failed schema validation")
        false
      } else {
        val committed = synchronized(OutsideAppActionLock) {
          val pendingActions = PendingPrayerActions.decode(
            PendingPrayerActionStore.readEncoded(context),
          )
          val merged = mergePendingWidgetActions(parsed, pendingActions)
          WidgetSnapshotStore.write(context, merged)
        }
        NabdWidgetRefresh.refresh(context)
        committed
      }
    }

    Function("clearWidgetSnapshot") {
      val committed = synchronized(OutsideAppActionLock) {
        WidgetSnapshotStore.clear(context)
      }
      if (!committed) Log.w(LOG_TAG, "Could not remove the stored widget snapshot")
      NabdWidgetRefresh.refresh(context)
      committed
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
      registerPrayerActionHook()
      registerTimeChangeReceiver()
    }

    OnDestroy {
      unregisterTimeChangeReceiver()
      unregisterPrayerActionHook()
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

  private fun registerPrayerActionHook() {
    val listener: (Context) -> Unit = { sendEvent(PRAYER_ACTION_QUEUED_EVENT) }
    prayerActionEventListener = listener
    PrayerActionHooks.register(listener)
  }

  private fun unregisterPrayerActionHook() {
    val listener = prayerActionEventListener ?: return
    prayerActionEventListener = null
    PrayerActionHooks.unregister(listener)
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
