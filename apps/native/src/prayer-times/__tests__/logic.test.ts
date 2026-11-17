import { dateForCalendarDayInTimeZone } from '../logic'

describe('prayer-time timezone logic', () => {
  it('uses the civil date at the supplied instant in the current timezone', () => {
    const date = dateForCalendarDayInTimeZone(Date.parse('2026-11-17T20:30:00Z'), 'Asia/Dubai')

    expect(date.getFullYear()).toBe(2026)
    expect(date.getMonth()).toBe(10)
    expect(date.getDate()).toBe(18)
    expect(date.getHours()).toBe(12)

    const tomorrow = dateForCalendarDayInTimeZone(
      Date.parse('2026-11-17T20:30:00Z'),
      'Asia/Dubai',
      1,
    )
    expect(tomorrow.getDate()).toBe(19)
  })
})
