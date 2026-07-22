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
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${coords.latitude}&longitude=${coords.longitude}&localityLanguage=ar`,
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
