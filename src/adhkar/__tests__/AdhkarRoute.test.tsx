import { render, screen } from '@testing-library/react-native'

import AdhkarSetRoute from '../../../app/(tabs)/adhkar/[set]'

let mockSet: string | string[] | undefined = 'morning'
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ set: mockSet }),
  Redirect: ({ href }: { href: string }) => {
    const { Text } = require('react-native')
    return <Text>{href}</Text>
  },
}))
jest.mock('../AdhkarReader', () => ({
  AdhkarReader: ({ category }: { category: { title: string } }) => {
    const { Text } = require('react-native')
    return <Text>{category.title}</Text>
  },
}))

describe('adhkar set route', () => {
  it('shows the morning reader', async () => {
    mockSet = 'morning'
    await render(<AdhkarSetRoute />)
    expect(screen.getByText('أذكار الصباح')).toBeTruthy()
  })

  it('opens the category passed by its route parameter', async () => {
    mockSet = 'evening'
    await render(<AdhkarSetRoute />)
    expect(screen.getByText('أذكار المساء')).toBeTruthy()
  })

  it('returns to the library when its route parameter is unknown', async () => {
    mockSet = 'unknown'
    await render(<AdhkarSetRoute />)
    expect(screen.getByText('/adhkar')).toBeTruthy()
  })

  it('opens the first value of an array route parameter', async () => {
    mockSet = ['morning', 'evening']
    await render(<AdhkarSetRoute />)
    expect(screen.getByText('أذكار الصباح')).toBeTruthy()
  })

  it('opens the after-prayer reader', async () => {
    mockSet = 'after-prayer'
    await render(<AdhkarSetRoute />)
    expect(screen.getByText('أذكار بعد الصلاة')).toBeTruthy()
  })

  it('opens the sleep reader', async () => {
    mockSet = 'sleep'
    await render(<AdhkarSetRoute />)
    expect(screen.getByText('أذكار النوم')).toBeTruthy()
  })

  it('opens the daily reader', async () => {
    mockSet = 'daily'
    await render(<AdhkarSetRoute />)
    expect(screen.getByText('الأذكار اليومية')).toBeTruthy()
  })
})
