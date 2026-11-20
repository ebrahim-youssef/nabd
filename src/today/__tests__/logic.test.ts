import { resolveTodayDay } from '../logic'

describe('resolveTodayDay', () => {
  it.each([
    ['2026-11-19', '2026-11-19'],
    ['2026-02-30', null],
    ['invalid', null],
    [undefined, null],
  ])('validates %s', (day, expected) => {
    expect(resolveTodayDay(day)).toBe(expected)
  })
})
