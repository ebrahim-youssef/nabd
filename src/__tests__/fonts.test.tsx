import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import { render } from '@testing-library/react-native'

import appConfig from '../../app.json'
import { Text } from '../shell/Text'

const FONTS_DIR = join(__dirname, '../../assets/fonts')
const TTF_FILES = readdirSync(FONTS_DIR)
  .filter((file) => file.endsWith('.ttf'))
  .sort()

describe('native bundled fonts', () => {
  it('registers every bundled ttf with the expo-font plugin', () => {
    const plugin = appConfig.expo.plugins.find(
      (entry): entry is [string, { fonts: string[] }] =>
        Array.isArray(entry) && entry[0] === 'expo-font',
    )

    expect(plugin).toBeDefined()
    expect(plugin?.[1].fonts.sort()).toEqual(TTF_FILES.map((file) => './assets/fonts/' + file))
  })

  it('keeps every configured NativeWind font family backed by a bundled file', () => {
    const theme = require('../../theme/tailwind-theme.cjs') as {
      fontFamily: Record<string, string[]>
    }

    const configuredFiles = new Set(TTF_FILES.map((file) => file.slice(0, -4)))
    for (const family of Object.values(theme.fontFamily)) {
      expect(family).toHaveLength(1)
      expect(configuredFiles.has(family[0])).toBe(true)
    }
  })

  it('applies the body family to a plain app Text', () => {
    const { getByText } = render(<Text>نص</Text>)

    expect(getByText('نص').props.className).toBe('font-body')
  })

  it('does not add the body family to nested Text or explicit family classes', () => {
    const { getByTestId } = render(
      <Text className="font-display" testID="outer">
        <Text testID="nested">١</Text>
      </Text>,
    )

    expect(getByTestId('outer').props.className).toBe('font-display')
    expect(getByTestId('nested').props.className).toBeUndefined()
  })

  it('does not add the body family when a family utility is explicit', () => {
    const { getByTestId } = render(
      <Text className="font-scripture text-scripture" testID="scripture">
        نص
      </Text>,
    )

    expect(getByTestId('scripture').props.className).toBe('font-scripture text-scripture')
  })
})
