package expo.modules.nabddevice

import android.app.AlarmManager
import android.content.Context
import android.os.Build
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class NabdDeviceModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("NabdDevice")

    Function("getExactAlarmStatus") {
      val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
        exactAlarmStatus(Build.VERSION.SDK_INT) { false }
      } else {
        exactAlarmStatus(Build.VERSION.SDK_INT) { alarmManager.canScheduleExactAlarms() }
      }
    }
  }
}
