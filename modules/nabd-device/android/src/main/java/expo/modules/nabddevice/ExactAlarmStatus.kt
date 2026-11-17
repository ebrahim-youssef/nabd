package expo.modules.nabddevice

private const val EXACT_ALARM_API_LEVEL = 31
private const val NOT_REQUIRED = "not-required"
private const val GRANTED = "granted"
private const val DENIED = "denied"

fun exactAlarmStatus(sdkInt: Int, canScheduleExactAlarms: () -> Boolean): String {
  if (sdkInt < EXACT_ALARM_API_LEVEL) {
    return NOT_REQUIRED
  }
  return if (canScheduleExactAlarms()) GRANTED else DENIED
}
