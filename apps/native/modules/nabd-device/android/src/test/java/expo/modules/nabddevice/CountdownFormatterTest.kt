package expo.modules.nabddevice

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class CountdownFormatterTest {
  private val now = 1_000_000L

  @Test
  fun keepsSinceTextAtTwentyNineMinutesAndFiftyNineSeconds() {
    val payload = payload(
      boundary("الفجر", now - 29 * MINUTE_MS - 59_000L),
      boundary("الظهر", now + 10 * MINUTE_MS),
    )

    val content = CountdownFormatter.format(payload, now, API_23)

    assertEquals("أذّن الفجر منذ ٢٩ دقيقة", content?.text)
    assertFalse(content?.usesChronometer ?: true)
  }

  @Test
  fun switchesToUntilTextAtExactlyThirtyMinutes() {
    val payload = payload(
      boundary("الفجر", now - 30 * MINUTE_MS),
      boundary("الظهر", now + 10 * MINUTE_MS),
    )

    val content = CountdownFormatter.format(payload, now, API_24)

    assertEquals("باقي ١٠ دقيقة على الظهر", content?.text)
    assertTrue(content?.usesChronometer ?: false)
    assertEquals(now + 10 * MINUTE_MS, content?.whenMillis)
  }

  @Test
  fun usesDistinctSunriseCopy() {
    val payload = payload(boundary("الشروق", now - 2 * MINUTE_MS, sunrise = true))

    assertEquals("الشروق منذ ٢ دقيقة", CountdownFormatter.format(payload, now, API_23)?.text)
  }

  @Test
  fun omitsHijriDateWhenTheApiIsUnavailable() {
    val payload = payload(boundary("الظهر", now + 10 * MINUTE_MS), city = "القاهرة")

    assertEquals("القاهرة", CountdownFormatter.format(payload, now, API_23)?.title)
  }

  @Test
  fun includesCityWithTheHijriDateWhenAvailable() {
    val payload = payload(boundary("الظهر", now + 10 * MINUTE_MS), city = "القاهرة")

    assertTrue(CountdownFormatter.format(payload, now, API_24)?.title?.contains("القاهرة") ?: false)
  }

  @Test
  fun returnsNullWhenTheLastBoundaryIsPast() {
    val payload = payload(boundary("العشاء", now - 1L))

    assertNull(CountdownFormatter.format(payload, now, API_23))
  }

  @Test
  fun returnsNullForMalformedJson() {
    assertNull(CountdownFormatter.format("{not-json", now, API_23))
  }

  @Test
  fun returnsNullForAnEmptyPayload() {
    assertNull(CountdownFormatter.format("", now, API_23))
  }

  private fun payload(vararg boundaries: String, city: String? = null): String {
    val cityJson = city?.let { ",\"city\":\"$it\"" } ?: ""
    return "{\"boundaries\":[${boundaries.joinToString(",")}]$cityJson}"
  }

  private fun boundary(label: String, at: Long, sunrise: Boolean = false): String {
    return "{\"id\":\"point\",\"label\":\"$label\",\"at\":$at,\"sunrise\":$sunrise}"
  }

  private companion object {
    const val API_23 = 23
    const val API_24 = 24
    const val MINUTE_MS = 60_000L
  }
}
