import {
  compareDayId,
  daysInRange,
  isDayId,
  lastNDays,
  monthOf,
  nextDay,
  previousDay,
  toDayId,
  weekdayOf,
} from '../day'

describe('weekdayOf', () => {
  it('maps known dates to 0=Sunday … 6=Saturday', () => {
    expect(weekdayOf('2026-07-12')).toBe(0) // Sunday
    expect(weekdayOf('2026-07-13')).toBe(1) // Monday
    expect(weekdayOf('2026-07-16')).toBe(4) // Thursday
    expect(weekdayOf('2026-07-18')).toBe(6) // Saturday
  })
})

describe('monthOf', () => {
  it('returns the YYYY-MM window', () => {
    expect(monthOf('2026-07-14')).toBe('2026-07')
  })
})

describe('toDayId', () => {
  it('formats a Date to local YYYY-MM-DD with zero-padding', () => {
    expect(toDayId(new Date(2026, 0, 5))).toBe('2026-01-05')
    expect(toDayId(new Date(2026, 11, 31))).toBe('2026-12-31')
  })
})

describe('isDayId', () => {
  it('accepts well-formed day ids and rejects others', () => {
    expect(isDayId('2026-07-14')).toBe(true)
    expect(isDayId('2026-7-14')).toBe(false)
    expect(isDayId('not-a-day')).toBe(false)
  })

  it('rejects dates outside the calendar, including non-leap February 29', () => {
    expect(isDayId('2026-00-10')).toBe(false)
    expect(isDayId('2026-13-10')).toBe(false)
    expect(isDayId('2026-04-31')).toBe(false)
    expect(isDayId('2026-02-29')).toBe(false)
    expect(isDayId('2024-02-29')).toBe(true)
    expect(isDayId('2000-02-29')).toBe(true)
    expect(isDayId('1900-02-29')).toBe(false)
  })
})

describe('compareDayId', () => {
  it('orders chronologically', () => {
    expect(compareDayId('2026-01-01', '2026-02-01')).toBeLessThan(0)
    expect(compareDayId('2026-02-01', '2026-01-01')).toBeGreaterThan(0)
    expect(compareDayId('2026-01-01', '2026-01-01')).toBe(0)
  })
})

describe('lastNDays', () => {
  it('returns n days ending at today, oldest first', () => {
    expect(lastNDays('2026-07-14', 7)).toEqual([
      '2026-07-08',
      '2026-07-09',
      '2026-07-10',
      '2026-07-11',
      '2026-07-12',
      '2026-07-13',
      '2026-07-14',
    ])
  })

  it('steps across month boundaries', () => {
    expect(lastNDays('2026-03-02', 3)).toEqual(['2026-02-28', '2026-03-01', '2026-03-02'])
  })
})

describe('daysInRange', () => {
  it('lists every day inclusive, oldest first, across a month boundary', () => {
    expect(daysInRange('2026-02-27', '2026-03-02')).toEqual([
      '2026-02-27',
      '2026-02-28',
      '2026-03-01',
      '2026-03-02',
    ])
  })

  it('returns a single day when from === to, and [] for a reversed range', () => {
    expect(daysInRange('2026-07-14', '2026-07-14')).toEqual(['2026-07-14'])
    expect(daysInRange('2026-07-15', '2026-07-14')).toEqual([])
  })
})

describe('calendar day stepping', () => {
  it('steps backward and forward across month, year, and leap-day boundaries', () => {
    expect(previousDay('2024-03-01')).toBe('2024-02-29')
    expect(nextDay(previousDay('2027-01-01'))).toBe('2027-01-01')
    expect(previousDay('2027-01-01')).toBe('2026-12-31')
  })
})
