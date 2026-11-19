package expo.modules.nabddevice

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class PrayerActionReceiverPayloadTest {
  @Test
  fun acceptsNonPrayerItemsInAValidPendingAction() {
    val widgetAction = PendingPrayerAction("widget:one", "custom-item", "2026-11-19", "v1", 1L, false)

    assertTrue(isValidPendingPrayerAction(widgetAction))
  }

  @Test
  fun createsAValidatedPendingActionFromReceiverExtras() {
    val payload = validPayload()

    assertEquals(
      PendingPrayerAction("adhan:2026-11-19:fajr:v1", "fajr", "2026-11-19", "v1", 900L),
      payload?.toPendingAction(900L),
    )
    assertEquals("nabd-prayer", payload?.notificationTag)
    assertEquals(-1, payload?.notificationId ?: 0)
    assertTrue(payload?.toPendingAction(900L)?.done == true)
  }

  @Test
  fun rejectsInvalidActionFieldsAndNotificationIdentity() {
    assertNull(validPayload(itemId = null))
    assertNull(validPayload(day = null))
    assertNull(validPayload(versionId = null))
    assertNull(validPayload(actionId = null))
    assertNull(validPayload(label = null))
    assertNull(validPayload(notificationTag = null))
    assertNull(validPayload(notificationId = null))
    assertNull(validPayload(itemId = "sunrise"))
    assertNull(validPayload(day = "2026-2-19"))
    assertNull(validPayload(versionId = " "))
    assertNull(validPayload(actionId = ""))
    assertNull(validPayload(label = " "))
    assertNull(validPayload(notificationTag = "other"))
    assertNull(validPayload(notificationId = null))
  }

  private fun validPayload(
    itemId: String? = "fajr",
    day: String? = "2026-11-19",
    versionId: String? = "v1",
    actionId: String? = "adhan:2026-11-19:fajr:v1",
    label: String? = "صلّيت الفجر",
    notificationTag: String? = "nabd-prayer",
    notificationId: Int? = -1,
  ) = PrayerActionReceiverPayload.create(
    itemId,
    day,
    versionId,
    actionId,
    label,
    notificationTag,
    notificationId,
  )
}
