package expo.modules.nabddevice

data class PrayerAction(
  val itemId: String,
  val day: String,
  val versionId: String,
  val actionId: String,
  val label: String,
)

data class PendingPrayerAction(
  val actionId: String,
  val itemId: String,
  val day: String,
  val versionId: String,
  val at: Long,
  val done: Boolean = true,
)

internal fun isValidPrayerAction(action: PrayerAction): Boolean =
  action.itemId in PRAYER_ACTION_ITEM_IDS &&
    action.day.matches(PRAYER_ACTION_DAY_PATTERN) &&
    action.versionId.isNotBlank() &&
    action.actionId.isNotBlank() &&
    action.label.isNotBlank()

internal fun isValidPendingPrayerAction(action: PendingPrayerAction): Boolean =
  isValidPendingPrayerActionFields(action) && action.at >= 0

private fun isValidPendingPrayerActionFields(action: PendingPrayerAction): Boolean =
  action.actionId.isNotBlank() &&
    action.itemId.isNotBlank() &&
    action.day.matches(PRAYER_ACTION_DAY_PATTERN) &&
    action.versionId.isNotBlank()

internal const val PRAYER_NOTIFICATION_TAG = "nabd-prayer"

internal val PRAYER_ACTION_ITEM_IDS = setOf("fajr", "dhuhr", "asr", "maghrib", "isha")
private val PRAYER_ACTION_DAY_PATTERN = Regex("\\d{4}-\\d{2}-\\d{2}")

internal data class PrayerActionReceiverPayload(
  val action: PrayerAction,
  val notificationTag: String,
  val notificationId: Int,
) {
  fun toPendingAction(at: Long): PendingPrayerAction = PendingPrayerAction(
    actionId = action.actionId,
    itemId = action.itemId,
    day = action.day,
    versionId = action.versionId,
    at = at,
    done = true,
  )

  companion object {
    fun create(
      itemId: String?,
      day: String?,
      versionId: String?,
      actionId: String?,
      label: String?,
      notificationTag: String?,
      notificationId: Int?,
    ): PrayerActionReceiverPayload? {
      val action = PrayerAction(
        itemId = itemId ?: return null,
        day = day ?: return null,
        versionId = versionId ?: return null,
        actionId = actionId ?: return null,
        label = label ?: return null,
      )
      val tag = notificationTag?.takeIf { it == PRAYER_NOTIFICATION_TAG } ?: return null
      val id = notificationId ?: return null
      if (!isValidPrayerAction(action)) return null
      return PrayerActionReceiverPayload(action, tag, id)
    }
  }
}
