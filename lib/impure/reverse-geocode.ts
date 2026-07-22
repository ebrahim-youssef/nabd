import { logger } from '@/lib/logger'

export async function resolveCityLabel(coords: {
  latitude: number
  longitude: number
}): Promise<string | null> {
  let cached: string | null = null
  try {
    cached = window.localStorage.getItem('nabd:city')
  } catch {
    // localStorage unavailable
  }

  try {
    // Send only city-level precision (~1km) to the third-party geocoder instead of the exact
    // fix — enough to resolve a city name, without disclosing the user's precise location
    // (audit F6, data minimization).
    const latitude = coords.latitude.toFixed(2)
    const longitude = coords.longitude.toFixed(2)
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=ar`,
    )
    if (!res.ok) return cached
    const data = await res.json()
    const place = (data.city ?? data.locality ?? data.principalSubdivision ?? '').trim()
    if (place) {
      try {
        window.localStorage.setItem('nabd:city', place)
      } catch {
        // Cache write failure is non-fatal
      }
      return place
    }
    return cached
  } catch {
    logger.warn('reverse-geocode: fetch failed', {})
    return cached
  }
}
