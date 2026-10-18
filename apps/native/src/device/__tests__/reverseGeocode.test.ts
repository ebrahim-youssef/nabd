import { logger } from '../../observability/logger'
import { PREFERENCE_KEYS } from '../../preferences/db'
import {
  resolveCityLabel,
  REVERSE_GEOCODE_TIMEOUT_MS,
  type CityPreferenceStore,
} from '../reverseGeocode'

const COORDINATES = { latitude: 30.0444, longitude: 31.2357 }

function createStore(
  city: string | null = null,
  coordinatesKey: string | null = null,
): jest.Mocked<CityPreferenceStore> {
  return {
    read: jest.fn(async (key) => (key === PREFERENCE_KEYS.city ? city : coordinatesKey)),
    write: jest.fn().mockResolvedValue(undefined),
  }
}

describe('reverse geocode city lookup', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(logger, 'warn').mockImplementation(() => undefined)
    jest.spyOn(logger, 'error').mockImplementation(() => undefined)
  })

  afterEach(() => {
    jest.useRealTimers()
    jest.restoreAllMocks()
  })

  it('rounds coordinates to two decimals and caches a successful city', async () => {
    const store = createStore()
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ city: 'القاهرة' }),
    } as Response)

    await expect(resolveCityLabel(COORDINATES, true, store, 1234)).resolves.toBe('القاهرة')

    expect(fetch).toHaveBeenCalledWith(
      'https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=30.04&longitude=31.24&localityLanguage=ar',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    )
    expect(store.write).toHaveBeenCalledWith(PREFERENCE_KEYS.city, 'القاهرة', 1234)
    expect(store.write).toHaveBeenCalledWith(PREFERENCE_KEYS.cityCoordinates, '30.04,31.24', 1234)
  })

  it('returns the cached city without a request when the rounded location is unchanged', async () => {
    const store = createStore('القاهرة', '30.04,31.24')
    jest.spyOn(global, 'fetch')

    await expect(resolveCityLabel(COORDINATES, true, store, 1234)).resolves.toBe('القاهرة')

    expect(fetch).not.toHaveBeenCalled()
    expect(store.write).not.toHaveBeenCalled()
  })

  it('looks the city up again after the location moves', async () => {
    const store = createStore('الإسكندرية', '31.20,29.92')
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ city: 'القاهرة' }),
    } as Response)

    await expect(resolveCityLabel(COORDINATES, true, store, 1234)).resolves.toBe('القاهرة')
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('returns the cached city and logs when the request times out', async () => {
    jest.useFakeTimers()
    const store = createStore('الإسكندرية')
    jest.spyOn(global, 'fetch').mockImplementation(
      (_input, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(new DOMException('Aborted', 'AbortError')),
          )
        }),
    )

    const result = resolveCityLabel(COORDINATES, true, store, 1234)
    await jest.advanceTimersByTimeAsync(REVERSE_GEOCODE_TIMEOUT_MS)

    await expect(result).resolves.toBe('الإسكندرية')
    expect(logger.warn).toHaveBeenCalled()
  })

  it.each([
    ['offline', () => Promise.reject(new Error('offline'))],
    ['non-2xx', () => Promise.resolve({ ok: false } as Response)],
    [
      'malformed JSON',
      () => Promise.resolve({ ok: true, json: async () => ({ city: 42 }) } as Response),
    ],
  ])('returns the cached city and logs for %s', async (_reason, response) => {
    const store = createStore('الجيزة')
    jest.spyOn(global, 'fetch').mockImplementation(response as typeof fetch)

    await expect(resolveCityLabel(COORDINATES, true, store, 1234)).resolves.toBe('الجيزة')
    expect(logger.warn).toHaveBeenCalled()
  })

  it('does not read the cache or call the network when countdown is disabled', async () => {
    const store = createStore('القاهرة')
    const fetchSpy = jest.spyOn(global, 'fetch')

    await expect(resolveCityLabel(COORDINATES, false, store, 1234)).resolves.toBeNull()

    expect(store.read).not.toHaveBeenCalled()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('never includes coordinates in diagnostic logs', async () => {
    const store = createStore()
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('offline'))

    await resolveCityLabel(COORDINATES, true, store, 1234)

    const logText = JSON.stringify((logger.warn as jest.Mock).mock.calls)
    expect(logText).not.toContain(String(COORDINATES.latitude))
    expect(logText).not.toContain(String(COORDINATES.longitude))
  })
})
