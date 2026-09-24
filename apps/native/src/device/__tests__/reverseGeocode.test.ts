import { createReverseGeocodeAdapter, resolveCachedCity } from '../reverseGeocode'

describe('reverse geocode adapter', () => {
  it('rounds coordinates before an online request and returns the Arabic city', async () => {
    const fetcher = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ city: 'القاهرة' }),
    })
    const geocode = createReverseGeocodeAdapter(fetcher)

    await expect(
      resolveCachedCity(
        { latitude: 30.04449, longitude: 31.23574 },
        'online',
        'الإسكندرية',
        geocode,
      ),
    ).resolves.toBe('القاهرة')
    expect(fetcher).toHaveBeenCalledWith(expect.stringContaining('latitude=30.04&longitude=31.24'))
  })

  it('uses locality and subdivision when city is absent', async () => {
    const fetcher = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ locality: 'الإسكندرية' }),
    })
    const geocode = createReverseGeocodeAdapter(fetcher)

    await expect(
      resolveCachedCity({ latitude: 30, longitude: 31 }, 'online', null, geocode),
    ).resolves.toBe('الإسكندرية')
  })

  it('preserves the previous city when an online lookup fails', async () => {
    const fetcher = jest.fn().mockRejectedValue(new Error('network down'))
    const geocode = createReverseGeocodeAdapter(fetcher)

    await expect(
      resolveCachedCity({ latitude: 30, longitude: 31 }, 'online', 'القاهرة', geocode),
    ).resolves.toBe('القاهرة')
  })

  it('preserves the previous city for an unsuccessful response or malformed payload', async () => {
    const failedResponse = createReverseGeocodeAdapter(
      jest.fn().mockResolvedValue({ ok: false, status: 503, json: async () => ({}) }),
    )
    await expect(
      resolveCachedCity({ latitude: 30, longitude: 31 }, 'online', 'القاهرة', failedResponse),
    ).resolves.toBe('القاهرة')

    const malformedResponse = createReverseGeocodeAdapter(
      jest.fn().mockResolvedValue({ ok: true, json: async () => ({ city: 42 }) }),
    )
    await expect(
      resolveCachedCity({ latitude: 30, longitude: 31 }, 'online', 'القاهرة', malformedResponse),
    ).resolves.toBe('القاهرة')
  })

  it('never calls the network while offline or connectivity is unknown', async () => {
    const fetcher = jest.fn()
    const geocode = createReverseGeocodeAdapter(fetcher)

    await expect(
      resolveCachedCity({ latitude: 30, longitude: 31 }, 'offline', 'القاهرة', geocode),
    ).resolves.toBe('القاهرة')
    await expect(
      resolveCachedCity({ latitude: 30, longitude: 31 }, 'unknown', 'القاهرة', geocode),
    ).resolves.toBe('القاهرة')
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('preserves the previous city when an injected geocoder throws', async () => {
    await expect(
      resolveCachedCity(
        { latitude: 30, longitude: 31 },
        'online',
        'القاهرة',
        jest.fn().mockRejectedValue(new Error('lookup failed')),
      ),
    ).resolves.toBe('القاهرة')
  })
})
