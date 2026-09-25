package expo.modules.nabddevice

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Test

class ExactAlarmStatusTest {
  @Test
  fun returnsNotRequiredBeforeApi31WithoutCallingTheLambda() {
    var lambdaCalled = false

    val status = exactAlarmStatus(30) {
      lambdaCalled = true
      true
    }

    assertEquals("not-required", status)
    assertFalse(lambdaCalled)
  }

  @Test
  fun returnsGrantedWhenExactAlarmsAreAllowedOnApi31() {
    assertEquals("granted", exactAlarmStatus(31) { true })
  }

  @Test
  fun returnsDeniedWhenExactAlarmsAreNotAllowedOnApi32() {
    assertEquals("denied", exactAlarmStatus(32) { false })
  }

  @Test
  fun returnsGrantedWhenExactAlarmsAreAllowedOnApi33() {
    assertEquals("granted", exactAlarmStatus(33) { true })
  }
}
