import { describe, expect, it } from 'vitest'

import { classifyNativeGeoError, LOCATION_FAILURE_COPY } from '@/lib/impure/location'

describe('classifyNativeGeoError (NBD-48 follow-up)', () => {
  it('maps the Capacitor GPS-off error to services-disabled', () => {
    // The exact message the owner's device logged (Capacitor Geolocation, Android).
    expect(classifyNativeGeoError(new Error('Location services are not enabled'))).toBe(
      'services-disabled',
    )
  })

  it('maps permission wording to denied', () => {
    expect(classifyNativeGeoError(new Error('User denied location permission'))).toBe('denied')
    expect(classifyNativeGeoError(new Error('Permission was not granted'))).toBe('denied')
  })

  it('falls back to unavailable for anything else, including non-Errors', () => {
    expect(classifyNativeGeoError(new Error('timeout expired'))).toBe('unavailable')
    expect(classifyNativeGeoError('weird string')).toBe('unavailable')
    expect(classifyNativeGeoError(undefined)).toBe('unavailable')
  })

  it('every failure reason carries user-facing copy', () => {
    for (const reason of ['services-disabled', 'denied', 'unavailable'] as const) {
      expect(LOCATION_FAILURE_COPY[reason]).toBeTruthy()
    }
  })
})
