import type { ConnectivityState } from './types'

export type ReverseGeocodeFetcher = (
  url: string,
) => Promise<{ ok: boolean; json: () => Promise<unknown> }>

export type ReverseGeocoder = (coords: {
  latitude: number
  longitude: number
}) => Promise<string | null>

const ENDPOINT = 'https://api.bigdatacloud.net/data/reverse-geocode-client'

export function createReverseGeocodeAdapter(
  fetcher: ReverseGeocodeFetcher = (url) => fetch(url),
): ReverseGeocoder {
  return async ({ latitude, longitude }) => {
    const roundedLatitude = latitude.toFixed(2)
    const roundedLongitude = longitude.toFixed(2)
    const url = `${ENDPOINT}?latitude=${roundedLatitude}&longitude=${roundedLongitude}&localityLanguage=ar`
    try {
      const response = await fetcher(url)
      if (!response.ok) return null
      const data: unknown = await response.json()
      if (typeof data !== 'object' || data === null) return null
      const record = data as Record<string, unknown>
      const city = [record.city, record.locality, record.principalSubdivision].find(
        (value): value is string => typeof value === 'string' && value.trim() !== '',
      )
      return city?.trim() ?? null
    } catch {
      return null
    }
  }
}

export async function resolveCachedCity(
  coords: { latitude: number; longitude: number },
  connectivity: ConnectivityState,
  cachedCity: string | null,
  geocoder: ReverseGeocoder,
): Promise<string | null> {
  if (connectivity !== 'online') return cachedCity
  return (await geocoder(coords)) ?? cachedCity
}
