import { describe, expect, it } from 'vitest'

import { toArabicIndic } from '../pure/format'

describe('toArabicIndic', () => {
  it('maps every western digit', () => {
    expect(toArabicIndic(1234567890)).toBe('١٢٣٤٥٦٧٨٩٠')
  })

  it('keeps non-digit characters (separators, signs)', () => {
    expect(toArabicIndic(-4.5)).toBe('-٤.٥')
  })

  it('handles zero', () => {
    expect(toArabicIndic(0)).toBe('٠')
  })
})
