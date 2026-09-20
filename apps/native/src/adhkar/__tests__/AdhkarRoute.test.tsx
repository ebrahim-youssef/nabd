import { fireEvent, render, screen } from '@testing-library/react-native'

import { ADHKAR_COPY } from '@nabd/shared'

import { AdhkarRoute } from '../AdhkarRoute'

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), canGoBack: () => false, replace: jest.fn() }),
}))

jest.mock('lucide-react-native', () => ({ ArrowRight: () => null, RotateCcw: () => null }))

jest.mock('../useAdhkarFlow', () => ({
  useAdhkarFlow: () => ({
    state: { index: 0, count: 0, finished: false },
    tap: jest.fn(),
    restart: jest.fn(),
    markedInWird: false,
  }),
}))

describe('AdhkarRoute', () => {
  it('shows the adhkar library and morning flow', () => {
    render(<AdhkarRoute />)

    expect(screen.getByText(ADHKAR_COPY.libraryTitle)).toBeTruthy()
    expect(screen.getByTestId('adhkar-category-morning')).toBeTruthy()
    expect(screen.getByTestId('adhkar-flow-morning')).toBeTruthy()
  })

  it('switches between morning and evening categories', () => {
    render(<AdhkarRoute />)

    fireEvent.press(screen.getByTestId('adhkar-category-evening'))
    expect(screen.getByTestId('adhkar-flow-evening')).toBeTruthy()
  })
})
