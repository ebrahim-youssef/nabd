import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { cssToReactNativeRuntime } from 'react-native-css-interop/dist/css-to-rn'

import {
  DARK,
  HERO_HEIGHT,
  ICON_SIZE,
  LIGHT,
  PATTERN_SIZE,
  RADII,
  ROW_HEIGHT,
  SHADOWS,
  STAR_SIZE,
  TABBAR_HEIGHT,
  TYPE_SCALE,
} from '../../theme/tokens'

const postcss = require('postcss')
const tailwindcss = require('tailwindcss')
const tailwindTheme = require('../../theme/tailwind-theme.cjs') as {
  fontSize: Record<string, [string, { lineHeight: string; letterSpacing?: string }]>
  borderRadius: Record<string, number>
  boxShadow: Record<string, string>
  elevation: Record<string, number>
}
const tailwindConfig = require('../../tailwind.config.cjs') as {
  theme: { boxShadowColor?: Record<string, unknown>; extend: { colors: Record<string, string> } }
}
const GLOBAL_CSS = readFileSync(join(__dirname, '../../global.css'), 'utf8')

function normalizeWhitespace(value: string): string {
  return value.replace(/\s/g, '')
}

function readRootBlock(selector: string): string {
  const start = GLOBAL_CSS.indexOf(`${selector} {`)
  if (start < 0) return ''
  const end = GLOBAL_CSS.indexOf('\n}', start)
  return GLOBAL_CSS.slice(start, end < 0 ? GLOBAL_CSS.length : end)
}

function readVariables(selector: string): Record<string, string> {
  return Object.fromEntries(
    [...readRootBlock(selector).matchAll(/(--[\w-]+):\s*([^;]+);/g)].map(([, key, value]) => [
      key,
      value.trim(),
    ]),
  )
}

function colorParts(value: string): { channels: string; alpha: string | null } {
  const hex = value.match(/^#([\da-f]{6})$/i)
  if (hex) {
    return {
      channels: [0, 2, 4]
        .map((offset) => Number.parseInt(hex[1].slice(offset, offset + 2), 16))
        .join(' '),
      alpha: null,
    }
  }
  const rgba = value.match(/^rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)$/)
  if (rgba) return { channels: rgba.slice(1, 4).join(' '), alpha: rgba[4] }
  throw new Error(`Unsupported color value: ${value}`)
}

async function compileTailwindUtilities(rawContent: string): Promise<string> {
  const result = await postcss([
    tailwindcss({ ...tailwindConfig, content: [{ raw: rawContent, extension: 'tsx' }] }),
  ]).process('@tailwind utilities;', { from: undefined })
  return result.css
}

describe('design token parity', () => {
  it('keeps every semantic color and alpha in parity across JS, light CSS, dark CSS, and Tailwind', () => {
    const themes = [
      { colors: LIGHT, variables: readVariables(':root') },
      { colors: DARK, variables: readVariables('.dark:root') },
    ] as const

    expect(Object.keys(LIGHT).sort()).toEqual(Object.keys(DARK).sort())
    expect(Object.keys(tailwindConfig.theme.extend.colors).sort()).toEqual(
      Object.keys(LIGHT).sort(),
    )
    for (const { colors, variables } of themes) {
      for (const [key, value] of Object.entries(colors)) {
        const { channels, alpha } = colorParts(value)
        expect(variables[`--color-${key}`]).toBe(channels)
        expect(tailwindConfig.theme.extend.colors[key]).toBe(
          alpha === null
            ? `rgb(var(--color-${key}) / <alpha-value>)`
            : `rgb(var(--color-${key}) / var(--alpha-${key}))`,
        )
        if (alpha !== null) expect(variables[`--alpha-${key}`]).toBe(alpha)
      }
    }
    expect(Object.keys(readVariables(':root')).sort()).toEqual(
      Object.keys(readVariables('.dark:root')).sort(),
    )
    expect(
      Object.keys(readVariables(':root'))
        .filter((key) => key.startsWith('--alpha-'))
        .map((key) => key.slice('--alpha-'.length))
        .sort(),
    ).toEqual(
      Object.entries(LIGHT)
        .filter(([, value]) => value.startsWith('rgba('))
        .map(([key]) => key)
        .sort(),
    )
    expect(tailwindConfig.theme.boxShadowColor).toEqual({})
  })

  it('keeps every radius and type entry in parity with Tailwind', () => {
    expect(tailwindTheme.borderRadius).toEqual(RADII)
    expect(Object.keys(tailwindTheme.fontSize).sort()).toEqual(Object.keys(TYPE_SCALE).sort())
    for (const [key, token] of Object.entries(TYPE_SCALE)) {
      const [size, options] = tailwindTheme.fontSize[key]
      expect(size).toBe(token.size)
      const letterSpacing = 'letterSpacing' in token ? token.letterSpacing : undefined
      expect(options).toEqual({
        lineHeight: token.lineHeight,
        ...(letterSpacing ? { letterSpacing } : {}),
      })
      expect(options.lineHeight).toMatch(/^\d+(?:\.\d+)?px$/)
    }
  })

  it('exports the fixed JavaScript size tokens', () => {
    expect({ ROW_HEIGHT, STAR_SIZE, ICON_SIZE, PATTERN_SIZE, TABBAR_HEIGHT, HERO_HEIGHT }).toEqual({
      ROW_HEIGHT: 46,
      STAR_SIZE: 28,
      ICON_SIZE: 24,
      PATTERN_SIZE: 56,
      TABBAR_HEIGHT: 86,
      HERO_HEIGHT: 262,
    })
  })

  it('keeps card and sheet shadows in parity, with no visible dark card shadow', () => {
    const light = readVariables(':root')
    const dark = readVariables('.dark:root')

    expect(tailwindTheme.boxShadow).toEqual({
      card: 'var(--shadow-card)',
      sheet: 'var(--shadow-sheet)',
    })
    expect(tailwindTheme.elevation).toEqual({ card: 2, sheet: 16 })
    expect(normalizeWhitespace(light['--shadow-card'])).toBe(
      normalizeWhitespace(SHADOWS.light.card),
    )
    expect(normalizeWhitespace(dark['--shadow-card'])).toBe(normalizeWhitespace(SHADOWS.dark.card))
    expect(normalizeWhitespace(light['--shadow-sheet'])).toBe(
      normalizeWhitespace(SHADOWS.light.sheet),
    )
    expect(normalizeWhitespace(dark['--shadow-sheet'])).toBe(
      normalizeWhitespace(SHADOWS.dark.sheet),
    )
    expect(colorParts(DARK.scrim).alpha).toBe('0.6')
  })

  it('compiles alpha colors and the transparent dark card shadow through NativeWind', async () => {
    const tailwindCss = await compileTailwindUtilities(
      '<View className="bg-scrim bg-path-rest bg-mark-rest border-line shadow-card shadow-sheet" />',
    )
    expect(tailwindCss).toContain('var(--alpha-scrim)')
    expect(tailwindCss).toContain('var(--alpha-path-rest)')
    expect(tailwindCss).toContain('var(--alpha-mark-rest)')
    const compiled = cssToReactNativeRuntime(
      `${GLOBAL_CSS}\n${tailwindCss}\n.shadow-card { box-shadow: var(--shadow-card); }`,
      { darkMode: { type: 'class', value: 'dark' } } as never,
    )
    const rootVariables = compiled.rootVariables as Record<
      string,
      { light?: unknown; dark?: unknown }
    >
    expect(rootVariables['--alpha-scrim']?.light as number).toBeCloseTo(0.45, 5)
    expect(rootVariables['--alpha-scrim']?.dark as number).toBeCloseTo(0.6, 5)
    expect(rootVariables['--alpha-path-rest']?.light as number).toBeCloseTo(0.22, 5)
    expect(rootVariables['--alpha-path-rest']?.dark as number).toBeCloseTo(0.22, 5)
    expect(rootVariables['--alpha-mark-rest']?.light as number).toBeCloseTo(0.4, 5)
    expect(rootVariables['--alpha-mark-rest']?.dark as number).toBeCloseTo(0.4, 5)
    expect(JSON.stringify(rootVariables['--shadow-card']?.dark)).toMatch(/#(?:[\da-f]{6})00/i)
    expect(compiled.rules?.['shadow-card']).toBeDefined()
    expect(compiled.rules?.['shadow-sheet']).toBeDefined()
  })
})
