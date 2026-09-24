import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { themeTokens, webThemeValues } from '@nabd/shared'
import { cssToReactNativeRuntime } from 'react-native-css-interop/dist/css-to-rn'

import { DARK, LIGHT } from '../../theme/palette'

const postcss = require('postcss')
const tailwindcss = require('tailwindcss')
const tailwindTheme = require('../../theme/tailwind-theme.cjs') as {
  fontSize: Record<string, [string, { lineHeight: string }]>
  spacing: Record<string, number>
  borderRadius: Record<string, number>
  boxShadow: Record<string, string>
}
const tailwindConfig = require('../../tailwind.config.cjs') as {
  [key: string]: unknown
  theme: {
    boxShadowColor?: Record<string, unknown>
    extend: { colors: Record<string, string> }
  }
}

const GLOBAL_CSS = readFileSync(join(__dirname, '../../global.css'), 'utf8')

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

function resolve(value: string, source: Record<string, string>): string {
  const match = /^var\((--[^)]+)\)$/.exec(value)
  return match ? resolve(source[match[1]], source) : value
}

function channels(value: string): string {
  const hex = value.match(/^#([\da-f]{6})$/i)
  if (hex) {
    return [0, 2, 4]
      .map((offset) => Number.parseInt(hex[1].slice(offset, offset + 2), 16))
      .join(' ')
  }
  const rgba = value.match(/^rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)$/)
  if (rgba) return rgba.slice(1, 4).join(' ')
  throw new Error(`Unsupported color value: ${value}`)
}

function alpha(value: string): number | null {
  const rgba = value.match(/^rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*([\d.]+)\s*\)$/)
  return rgba ? Number(rgba[1]) : null
}

function sharedColors(theme: 'light' | 'dark') {
  const source: Record<string, string> = {
    ...webThemeValues.themes[theme],
    '--chart-1': 'var(--primary)',
    '--chart-2': 'var(--accent)',
    '--chart-3': 'var(--gold)',
    '--chart-4': 'var(--primary-deep)',
    '--chart-5': 'var(--faint)',
    '--sidebar': 'var(--surface)',
    '--sidebar-foreground': 'var(--foreground)',
    '--sidebar-primary': 'var(--primary)',
    '--sidebar-primary-foreground': 'var(--on-primary)',
    '--sidebar-accent': 'var(--surface-2)',
    '--sidebar-accent-foreground': 'var(--foreground)',
    '--sidebar-border': 'var(--line)',
    '--sidebar-ring': 'var(--accent)',
  }
  return Object.fromEntries(
    Object.entries({
      background: '--background',
      foreground: '--foreground',
      card: '--card',
      'card-foreground': '--card-foreground',
      popover: '--popover',
      'popover-foreground': '--popover-foreground',
      primary: '--primary',
      'primary-foreground': '--primary-foreground',
      secondary: '--secondary',
      'secondary-foreground': '--secondary-foreground',
      muted: '--muted',
      'muted-foreground': '--muted-foreground',
      accent: '--accent',
      'accent-foreground': '--accent-foreground',
      destructive: '--destructive',
      border: '--border',
      input: '--input',
      ring: '--ring',
      'primary-deep': '--primary-deep',
      gold: '--gold',
      'gold-soft': '--gold-soft',
      faint: '--faint',
      surface: '--surface',
      'surface-2': '--surface-2',
      line: '--line',
      'on-primary': '--on-primary',
      'ring-track': '--ring-track',
      'chart-1': '--chart-1',
      'chart-2': '--chart-2',
      'chart-3': '--chart-3',
      'chart-4': '--chart-4',
      'chart-5': '--chart-5',
      sidebar: '--sidebar',
      'sidebar-foreground': '--sidebar-foreground',
      'sidebar-primary': '--sidebar-primary',
      'sidebar-primary-foreground': '--sidebar-primary-foreground',
      'sidebar-accent': '--sidebar-accent',
      'sidebar-accent-foreground': '--sidebar-accent-foreground',
      'sidebar-border': '--sidebar-border',
      'sidebar-ring': '--sidebar-ring',
    }).map(([key, variable]) => [key, resolve(source[variable], source)]),
  ) as Record<string, string>
}

const ALPHA_COLOR_KEYS = ['border', 'input', 'line', 'ring-track', 'sidebar-border'] as const

async function compileTailwindUtilities(rawContent: string): Promise<string> {
  const result = await postcss([
    tailwindcss({
      ...tailwindConfig,
      content: [{ raw: rawContent, extension: 'tsx' }],
    }),
  ]).process('@tailwind utilities;', { from: undefined })
  return result.css
}

describe('native classic theme parity', () => {
  it('defines a literal light root and NativeWind-recognized dark root', () => {
    const light = readRootBlock(':root')
    const dark = readRootBlock('.dark:root')

    expect(light).toContain('--color-background:')
    expect(dark).toContain('--color-background:')
    expect(dark).toContain('--shadow:')
    expect(webThemeValues.themes.dark['--shadow']).toBe('0 10px 30px rgba(0, 0, 0, 0.35)')
  })

  it('keeps CSS color channels and palette values in parity with shared classic themes', () => {
    const lightVariables = readVariables(':root')
    const darkVariables = readVariables('.dark:root')
    const lightShared = sharedColors('light')
    const darkShared = sharedColors('dark')

    expect(Object.keys(lightVariables).sort()).toEqual(Object.keys(darkVariables).sort())
    for (const [key, value] of Object.entries(lightShared)) {
      expect(lightVariables[`--color-${key}`]).toBe(channels(value))
      expect(LIGHT[key as keyof typeof LIGHT]).toBe(
        value.startsWith('rgba(') ? value.replaceAll(' ', '') : value.toLowerCase(),
      )
    }
    for (const [key, value] of Object.entries(darkShared)) {
      expect(darkVariables[`--color-${key}`]).toBe(channels(value))
      expect(DARK[key as keyof typeof DARK]).toBe(
        value.startsWith('rgba(') ? value.replaceAll(' ', '') : value.toLowerCase(),
      )
    }
    for (const key of ALPHA_COLOR_KEYS) {
      expect(Number(lightVariables[`--alpha-${key}`])).toBe(alpha(lightShared[key]))
      expect(Number(darkVariables[`--alpha-${key}`])).toBe(alpha(darkShared[key]))
    }
    expect(lightVariables['--shadow']).toBe(webThemeValues.themes.light['--shadow'])
    expect(lightVariables['--shadow-sm']).toBe(webThemeValues.themes.light['--shadow-sm'])
    expect(darkVariables['--shadow']).toBe(webThemeValues.themes.dark['--shadow'])
    expect(darkVariables['--shadow-sm']).toBe(webThemeValues.themes.dark['--shadow-sm'])
  })

  it('keeps classic typography, radii, spacing, shadows, and collision guard hand-written', () => {
    for (const [name, token] of Object.entries(themeTokens.typography)) {
      const [size, options] = tailwindTheme.fontSize[name]
      expect(size).toBe(`${Number.parseFloat(token.size)}px`)
      expect(options.lineHeight).toBe(
        `${Number((Number.parseFloat(token.size) * Number(token.lineHeight)).toFixed(3))}px`,
      )
    }
    expect(tailwindTheme.fontSize).toMatchObject({
      body: ['16px', { lineHeight: '27.2px' }],
      scripture: ['16px', { lineHeight: '32px' }],
    })
    for (const [key, value] of Object.entries(webThemeValues.global)) {
      if (key.startsWith('--sp-')) {
        expect(tailwindTheme.spacing[key.slice(5)]).toBe(Number.parseFloat(value))
      }
    }
    const classic = webThemeValues.modes.classic
    const baseRadius = Number.parseFloat(classic['--radius'])
    const radius = (factor: number) => Number((baseRadius * factor).toFixed(3))
    expect(tailwindTheme.borderRadius).toEqual({
      sm: radius(0.6),
      md: radius(0.8),
      lg: baseRadius,
      xl: radius(1.4),
      '2xl': radius(1.8),
      icon: 9999,
      button: Number.parseFloat(classic['--r-btn']),
      chip: Number.parseFloat(classic['--r-chip']),
      card: Number.parseFloat(classic['--r-card']),
      ring: 9999,
    })
    expect(tailwindTheme.boxShadow).toMatchObject({
      card: 'var(--shadow)',
      'card-sm': 'var(--shadow-sm)',
    })
    expect(tailwindConfig.theme.boxShadowColor).toEqual({})
    expect(tailwindConfig.theme.extend.colors.border).toBe(
      'rgb(var(--color-border) / var(--alpha-border))',
    )
    expect(tailwindConfig.theme.extend.colors['ring-track']).toBe(
      'rgb(var(--color-ring-track) / var(--alpha-ring-track))',
    )
  })

  it('compiles real Tailwind utilities with theme-aware alpha values', async () => {
    const lightShared = sharedColors('light')
    const darkShared = sharedColors('dark')
    const tailwindCss = await compileTailwindUtilities(
      '<View className="bg-ring-track border-border bg-primary/50" />',
    )
    expect(tailwindCss).toContain('var(--alpha-ring-track)')
    expect(tailwindCss).toContain('var(--alpha-border)')
    expect(tailwindCss).toContain('rgb(var(--color-primary) / 0.5)')

    const compiled = cssToReactNativeRuntime(
      `${GLOBAL_CSS}\n${tailwindCss}\n.bg-background { background-color: rgb(var(--color-background) / 1); }\n.shadow-card { box-shadow: var(--shadow); }`,
      { darkMode: { type: 'class', value: 'dark' } } as never,
    )
    const rootVariables = compiled.rootVariables as Record<
      string,
      { light?: unknown; dark?: unknown }
    >
    expect(rootVariables['--color-background']).toEqual({
      light: [234, 242, 240],
      dark: [8, 32, 31],
    })
    const ringTrackAlpha = rootVariables['--alpha-ring-track'] as {
      light: number
      dark: number
    }
    expect(ringTrackAlpha.light).toBeCloseTo(alpha(lightShared['ring-track']) ?? 0)
    expect(ringTrackAlpha.dark).toBeCloseTo(alpha(darkShared['ring-track']) ?? 0)
    const borderAlpha = rootVariables['--alpha-border'] as {
      light: number
      dark: number
    }
    expect(borderAlpha.light).toBeCloseTo(alpha(lightShared.border) ?? 0)
    expect(borderAlpha.dark).toBeCloseTo(alpha(darkShared.border) ?? 0)
    expect(rootVariables['--shadow']).toEqual({
      light: [0, 8, 24, '#0e5a5a1a'],
      dark: [0, 10, 30, '#00000059'],
    })
    expect(compiled.rules?.['shadow-card']).toBeDefined()
    expect(JSON.stringify(compiled.rules?.['shadow-card'])).toContain('boxShadow')
    expect(compiled.rules?.['bg-ring-track']).toBeDefined()
    expect(compiled.rules?.['border-border']).toBeDefined()
  })
})
