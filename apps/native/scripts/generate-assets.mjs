import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

import { themeTokens, webThemeValues } from '../../../packages/shared/src/tokens/tokens.ts'

const nativeRoot = fileURLToPath(new URL('..', import.meta.url))
const outputPath = fileURLToPath(new URL('../generated/nativewind-theme.cjs', import.meta.url))
const appJsonPath = fileURLToPath(new URL('../app.json', import.meta.url))

const light = {
  ...webThemeValues.themes.light,
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
const resolveVariable = (value) => {
  const match = /^var\((--[^)]+)\)$/.exec(value)
  return match ? resolveVariable(light[match[1]]) : value
}
const pixels = (value) => Number.parseFloat(value)
const camelToKebab = (value) =>
  value.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`).replace(/([a-z])(\d)/g, '$1-$2')

const colors = Object.fromEntries(
  Object.entries(themeTokens.colors).map(([name, variable]) => [
    camelToKebab(name),
    resolveVariable(variable),
  ]),
)
const fontSize = Object.fromEntries(
  Object.entries(themeTokens.typography).map(([name, value]) => [
    name,
    [
      pixels(value.size),
      { lineHeight: Number((pixels(value.size) * Number(value.lineHeight)).toFixed(3)) },
    ],
  ]),
)
const baseRadius = pixels(webThemeValues.modes.classic['--radius'])
const radiusValues = {
  sm: baseRadius * 0.6,
  md: baseRadius * 0.8,
  lg: baseRadius,
  xl: baseRadius * 1.4,
  '2xl': baseRadius * 1.8,
  icon: 9999,
  button: pixels(webThemeValues.modes.classic['--r-btn']),
  chip: pixels(webThemeValues.modes.classic['--r-chip']),
  card: pixels(webThemeValues.modes.classic['--r-card']),
  ring: 9999,
}
const spacing = Object.fromEntries(
  Object.entries(webThemeValues.global)
    .filter(([name]) => name.startsWith('--sp-'))
    .map(([name, value]) => [name.slice(5), pixels(value)]),
)
const theme = { colors, fontSize, borderRadius: radiusValues, spacing }

await mkdir(new URL('../generated/', import.meta.url), { recursive: true })
await writeFile(
  outputPath,
  `// Generated from @nabd/shared. Do not edit.\nmodule.exports = ${JSON.stringify(theme, null, 2)}\n`,
)

const appConfig = JSON.parse(await readFile(appJsonPath, 'utf8'))
const background = resolveVariable(themeTokens.colors.background)
appConfig.expo.splash.backgroundColor = background
appConfig.expo.android.adaptiveIcon.backgroundColor = background
await writeFile(appJsonPath, `${JSON.stringify(appConfig, null, 2)}\n`)
