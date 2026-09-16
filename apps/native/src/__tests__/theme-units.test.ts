import { themeTokens } from '@nabd/shared'

type NativeTheme = {
  fontSize: Record<string, unknown>
}

const NATIVE_THEME = require('../../generated/nativewind-theme.cjs') as NativeTheme

describe('NativeWind theme units', () => {
  it('emits explicit pixel units for every typography line height', () => {
    Object.entries(NATIVE_THEME.fontSize).forEach(([name, entry]) => {
      expect(Array.isArray(entry)).toBe(true)
      if (!Array.isArray(entry)) return

      expect(entry).toHaveLength(2)
      const [size, options] = entry
      expect(typeof size).toBe('number')
      expect(Number.isFinite(size)).toBe(true)
      expect(options).toEqual(expect.any(Object))
      if (!options || typeof options !== 'object') return

      const lineHeight = (options as { lineHeight?: unknown }).lineHeight
      expect(typeof lineHeight).toBe('string')
      expect(lineHeight).toMatch(/^\d+(\.\d+)?px$/)
      if (typeof lineHeight !== 'string') return

      const token = themeTokens.typography[name as keyof typeof themeTokens.typography]
      expect(token).toBeDefined()
      if (!token) return

      expect(
        Math.abs(Number.parseFloat(lineHeight) - size * Number(token.lineHeight)),
      ).toBeLessThanOrEqual(0.001)
    })
  })
})
