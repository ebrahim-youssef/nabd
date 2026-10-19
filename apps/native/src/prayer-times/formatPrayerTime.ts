import { toArabicIndic } from '@nabd/shared'

const MIDDAY_HOUR = 12
const HOURS_IN_CLOCK_CYCLE = 12
const MINUTE_PADDING_LENGTH = 2
const ARABIC_ZERO = '٠'

export function formatPrayerTime(at: number): string {
  const date = new Date(at)
  const hour = date.getHours()
  const clockHour = hour % HOURS_IN_CLOCK_CYCLE || HOURS_IN_CLOCK_CYCLE
  const suffix = hour < MIDDAY_HOUR ? 'ص' : 'م'

  return `${toArabicIndic(clockHour)}:${toArabicIndic(date.getMinutes()).padStart(MINUTE_PADDING_LENGTH, ARABIC_ZERO)} ${suffix}`
}
