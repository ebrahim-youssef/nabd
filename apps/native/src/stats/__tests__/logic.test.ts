import { completionPercent, earliestDay, formatArabicWeekday, formatCompletion } from '../logic'

describe('stats logic', () => {
  it('calculates a rounded completion percentage with a zero denominator guard', () => {
    expect(completionPercent(2, 3)).toBe(67)
    expect(completionPercent(0, 0)).toBe(0)
  })

  it('formats done and total counts with Arabic-Indic numerals', () => {
    expect(formatCompletion(2, 3)).toBe('٢/٣')
  })

  it('formats a day with its Arabic weekday label', () => {
    expect(formatArabicWeekday('2026-09-14')).toBe('الاثنين')
  })

  it('finds the earliest stored day without allowing a future day', () => {
    expect(
      earliestDay([{ effectiveFrom: '2026-09-10' }], [{ day: '2026-09-12' }], '2026-09-15'),
    ).toBe('2026-09-10')
    expect(earliestDay([{ effectiveFrom: '2026-09-20' }], [], '2026-09-15')).toBe('2026-09-15')
  })
})
