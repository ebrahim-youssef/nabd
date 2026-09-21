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
    expect(fetcher).toHaveBeenCalledWith(
      expect.stringContaining('latitude=30.04&longitude=31.24'),
    )
  })

  it('preserves the previous city when an online lookup fails', async () => {
    const fetcher = jest.fn().mockRejectedValue(new Error('network down'))
    const geocode = createReverseGeocodeAdapter(fetcher)

    await expect(
      resolveCachedCity({ latitude: 30, longitude: 31 }, 'online', 'القاهرة', geocode),
    ).resolves.toBe('القاهرة')
  })

  it('never calls the network while offline and uses the cached city', async () => {
    const fetcher = jest.fn()
    const geocode = createReverseGeocodeAdapter(fetcher)

    await expect(
      resolveCachedCity({ latitude: 30, longitude: 31 }, 'offline', 'القاهرة', geocode),
    ).resolves.toBe('القاهرة')
    expect(fetcher).not.toHaveBeenCalled()
  })
})
