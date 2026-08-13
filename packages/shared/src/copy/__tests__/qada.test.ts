import { describe, expect, it } from 'vitest'

import { QADA_COPY } from '../qada'

describe('QADA_COPY.remaining', () => {
  it('uses Arabic number agreement for every range', () => {
    expect(QADA_COPY.remaining(1)).toBe('فائتة واحدة')
    expect(QADA_COPY.remaining(2)).toBe('فائتتان')
    expect(QADA_COPY.remaining(3)).toBe('٣ فوائت')
    expect(QADA_COPY.remaining(10)).toBe('١٠ فوائت')
    expect(QADA_COPY.remaining(11)).toBe('١١ فائتة')
  })
})
