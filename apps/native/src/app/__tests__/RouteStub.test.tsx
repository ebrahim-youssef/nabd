import { render, screen } from '@testing-library/react-native'

import { shellCopy } from '@nabd/shared'

import { RouteStub } from '../RouteStub'

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn() }),
}))

jest.mock('lucide-react-native', () => ({
  ArrowRight: () => null,
}))

jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual('react-native-safe-area-context')
  return {
    ...actual,
    useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
  }
})

describe('RouteStub', () => {
  it('renders its title and the not-built hint', () => {
    render(<RouteStub title="عنوان الاختبار" />)

    expect(screen.getByTestId('route-stub')).toBeTruthy()
    expect(screen.getByText('عنوان الاختبار')).toBeTruthy()
    expect(screen.getByText(shellCopy.appNotFoundHint)).toBeTruthy()
  })
})
