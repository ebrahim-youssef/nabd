import { formatPrayerTime } from '../formatPrayerTime'

describe('formatPrayerTime', () => {
  it.each([
    ['midnight', '2026-09-20T00:00:00', '١٢:٠٠ ص'],
    ['early morning', '2026-09-20T00:05:00', '١٢:٠٥ ص'],
    ['before noon', '2026-09-20T11:59:00', '١١:٥٩ ص'],
    ['noon', '2026-09-20T12:00:00', '١٢:٠٠ م'],
    ['afternoon', '2026-09-20T13:05:00', '١:٠٥ م'],
    ['late evening', '2026-09-20T23:59:00', '١١:٥٩ م'],
  ])('formats %s as a 12-hour Arabic time', (_label, value, expected) => {
    expect(formatPrayerTime(new Date(value).getTime())).toBe(expected)
  })
})
