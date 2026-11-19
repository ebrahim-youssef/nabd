import { render } from '@testing-library/react-native'

import appConfig from '../../app.json'
import { Text } from '../shell/Text'

const fontPaths = require('../../theme/fonts.cjs') as string[]
const tailwindTheme = require('../../theme/tailwind-theme.cjs') as {
  fontFamily: Record<string, string[]>
}

describe('native Thmanyah fonts', () => {
  it('registers exactly the font paths listed by the shared font manifest', () => {
    const plugin = appConfig.expo.plugins.find(
      (entry): entry is [string, { fonts: string[] }] =>
        Array.isArray(entry) && entry[0] === 'expo-font',
    )

    expect(plugin?.[1].fonts).toEqual(fontPaths)
  })

  it('maps every NativeWind family to exactly one listed font file', () => {
    const configuredNames = new Set(
      fontPaths.map((path) =>
        path
          .split('/')
          .pop()
          ?.replace(/\.otf$/, ''),
      ),
    )

    for (const family of Object.values(tailwindTheme.fontFamily)) {
      expect(family).toHaveLength(1)
      expect(configuredNames.has(family[0])).toBe(true)
    }
  })

  it('applies sans to a plain app Text', () => {
    const { getByText } = render(<Text>نص</Text>)

    expect(getByText('نص').props.className).toBe('font-sans')
  })

  it('preserves nested and explicit families', () => {
    const { getByTestId } = render(
      <Text className="font-display" testID="outer">
        <Text testID="nested">١</Text>
      </Text>,
    )

    expect(getByTestId('outer').props.className).toBe('font-display')
    expect(getByTestId('nested').props.className).toBeUndefined()
  })

  it('preserves explicit text family classes', () => {
    const { getByTestId } = render(
      <Text className="font-text text-daily-line" testID="scripture">
        نص
      </Text>,
    )

    expect(getByTestId('scripture').props.className).toBe('font-text text-daily-line')
  })
})
