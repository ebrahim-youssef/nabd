import { themeTokens } from '@nabd/shared'

type NativeTheme = {
  colors: Record<string, unknown>
  fontSize: Record<string, unknown>
  boxShadow: Record<string, unknown>
  elevation: Record<string, unknown>
}

const NATIVE_THEME = require('../../generated/nativewind-theme.cjs') as NativeTheme
const NATIVE_TAILWIND_CONFIG = require('../../tailwind.config.cjs') as {
  theme?: {
    boxShadowColor?: Record<string, unknown>
    extend?: Record<string, unknown>
  }
}

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

  it('emits resolved pixel shadow dimensions and matching numeric elevation', () => {
    Object.values(NATIVE_THEME.boxShadow).forEach((value) => {
      expect(typeof value).toBe('string')
      if (typeof value !== 'string') return

      expect(value).not.toMatch(/^var\(/)
      expect(value).toMatch(/^0 -?\d+(\.\d+)?px -?\d+(\.\d+)?px /)
    })

    expect(Object.keys(NATIVE_THEME.elevation).sort()).toEqual(
      Object.keys(NATIVE_THEME.boxShadow).sort(),
    )
    Object.values(NATIVE_THEME.elevation).forEach((value) => {
      expect(typeof value).toBe('number')
      if (typeof value !== 'number') return

      expect(Number.isFinite(value)).toBe(true)
    })
  })

  it('isolates native shadow utilities from the colliding color namespace', () => {
    expect(NATIVE_TAILWIND_CONFIG.theme?.boxShadowColor).toEqual({})
    expect(NATIVE_TAILWIND_CONFIG.theme?.extend).not.toHaveProperty('boxShadowColor')

    expect(NATIVE_THEME.colors).toHaveProperty('card')
    expect(NATIVE_THEME.boxShadow).toHaveProperty('card')
  })
})
