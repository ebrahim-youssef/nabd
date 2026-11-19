import { formatQadaCount, formatStreak } from '../copy'

describe('More count phrases', () => {
  it.each([
    [0, undefined],
    [1, 'يوم واحد متتالٍ'],
    [2, 'يومان متتاليان'],
    [3, '٣ أيام متتالية'],
    [10, '١٠ أيام متتالية'],
    [11, '١١ يومًا متتاليًا'],
  ])('formats a streak of %i', (count, expected) => {
    expect(formatStreak(count)).toBe(expected)
  })
  it.each([
    [0, 'لا فوائت'],
    [1, 'فائتة واحدة'],
    [2, 'فائتتان'],
    [3, '٣ فوائت'],
    [10, '١٠ فوائت'],
    [11, '١١ فائتة'],
  ])('formats %i missed prayers', (count, expected) => {
    expect(formatQadaCount(count)).toBe(expected)
  })
})
