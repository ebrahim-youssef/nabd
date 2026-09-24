import { logger } from '../observability/logger'
import type { ConnectivityState } from './types'

export type ReverseGeocodeResponse = {
  ok: boolean
  status?: number
  json: () => Promise<unknown>
}

export type ReverseGeocodeFetcher = (url: string) => Promise<ReverseGeocodeResponse>

export type ReverseGeocoder = (coords: {
  latitude: number
  longitude: number
}) => Promise<string | null>

export const REVERSE_GEOCODE_ENDPOINT = 'https://api.bigdatacloud.net/data/reverse-geocode-client'
const COORDINATE_PRECISION = 2

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function cityFromResponse(value: unknown): string | null {
  if (!isRecord(value)) return null
  const city = [value.city, value.locality, value.principalSubdivision].find(
    (candidate): candidate is string => typeof candidate === 'string' && candidate.trim() !== '',
  )
  return city?.trim() ?? null
}

export function createReverseGeocodeAdapter(
  fetcher: ReverseGeocodeFetcher = (url) => fetch(url),
): ReverseGeocoder {
  return async ({ latitude, longitude }) => {
    try {
      const roundedLatitude = latitude.toFixed(COORDINATE_PRECISION)
      const roundedLongitude = longitude.toFixed(COORDINATE_PRECISION)
      const url = `${REVERSE_GEOCODE_ENDPOINT}?latitude=${roundedLatitude}&longitude=${roundedLongitude}&localityLanguage=ar`
      const response = await fetcher(url)
      if (!response.ok) {
        logger.warn('Native reverse geocode returned an unsuccessful response', {
          status: response.status,
        })
        return null
      }
      return cityFromResponse(await response.json())
    } catch (cause: unknown) {
      logger.warn('Native reverse geocode failed', { error: cause })
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

  try {
    const city = await geocoder(coords)
    return city?.trim() || cachedCity
  } catch (cause: unknown) {
    logger.warn('Native cached-city resolution failed', { error: cause })
    return cachedCity
  }
}
