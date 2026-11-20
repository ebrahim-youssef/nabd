import { QADA_COPY } from '../copy'

describe('QADA_COPY.remaining', () => {
  it('uses Arabic number agreement for every range', () => {
    expect(QADA_COPY.remaining(1)).toBe('فائتة واحدة')
    expect(QADA_COPY.remaining(2)).toBe('فائتتان')
    expect(QADA_COPY.remaining(3)).toBe('٣ فوائت')
    expect(QADA_COPY.remaining(10)).toBe('١٠ فوائت')
    expect(QADA_COPY.remaining(11)).toBe('١١ فائتة')
  })
  it('describes the number of days for each prayer', () => {
    expect(QADA_COPY.total(395)).toBe('لكل صلاة = ٣٩٥ يومًا')
  })
})
