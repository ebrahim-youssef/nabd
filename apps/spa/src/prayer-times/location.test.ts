import { beforeEach, describe, expect, it, vi } from 'vitest'

import { COORDS_EVENT, readCachedCoords, requestCoords } from './location'

const coords = { latitude: 30.0444, longitude: 31.2357 }

describe('location', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('round-trips a cached coordinate pair and rejects corrupt or partial values', () => {
    localStorage.setItem('nabd:coords', JSON.stringify(coords))
    expect(readCachedCoords()).toEqual(coords)

    localStorage.setItem('nabd:coords', '{')
    expect(readCachedCoords()).toBeNull()

    localStorage.setItem('nabd:coords', JSON.stringify({ latitude: coords.latitude }))
    expect(readCachedCoords()).toBeNull()
  })

  it.each([
    [1, 'denied'],
    [2, 'unavailable'],
    [3, 'unavailable'],
  ] as const)('maps browser geolocation error %i to %s', async (code, reason) => {
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition: (_success: unknown, failure: (error: { code: number }) => void) =>
          failure({ code }),
      },
    })

    await expect(requestCoords()).resolves.toEqual({ ok: false, reason })
  })

  it('returns unavailable without the browser API', async () => {
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: undefined })

    await expect(requestCoords()).resolves.toEqual({ ok: false, reason: 'unavailable' })
  })

  it('caches and announces a successful fix', async () => {
    const listener = vi.fn()
    window.addEventListener(COORDS_EVENT, listener)
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition: (success: (position: { coords: typeof coords }) => void) =>
          success({ coords }),
      },
    })

    await expect(requestCoords()).resolves.toEqual({ ok: true, coords })
    expect(readCachedCoords()).toEqual(coords)
    expect(listener).toHaveBeenCalledOnce()
    window.removeEventListener(COORDS_EVENT, listener)
  })
})
