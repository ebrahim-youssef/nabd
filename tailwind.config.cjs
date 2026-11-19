const nativeTheme = require('./theme/tailwind-theme.cjs')

const COLOR_NAMES = [
  'bg',
  'surface',
  'now',
  'line',
  'track',
  'ink',
  'mute',
  'hero',
  'hero-ink',
  'hero-mute',
  'gold',
  'gold-ink',
  'progress',
  'accent',
  'on-accent',
  'box',
  'tick',
  'toast-action',
  'scrim',
  'sun',
  'moon',
  'path-rest',
  'mark-rest',
]
const ALPHA_COLOR_NAMES = new Set(['scrim', 'path-rest', 'mark-rest'])
const colors = Object.fromEntries(
  COLOR_NAMES.map((name) => [
    name,
    ALPHA_COLOR_NAMES.has(name)
      ? `rgb(var(--color-${name}) / var(--alpha-${name}))`
      : `rgb(var(--color-${name}) / <alpha-value>)`,
  ]),
)

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    // Keep shadow colors from colliding with semantic color keys in NativeWind.
    boxShadowColor: {},
    extend: {
      ...nativeTheme,
      colors,
    },
  },
}
