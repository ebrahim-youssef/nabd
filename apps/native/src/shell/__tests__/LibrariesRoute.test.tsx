import { fireEvent, render, screen } from '@testing-library/react-native'

import {
  ADHKAR_COPY,
  ADHKAR_LIBRARY,
  INTENTIONS_COPY,
  INTENTIONS_LIBRARY,
  toArabicIndic,
} from '@nabd/shared'

import { LibrariesRoute } from '../LibrariesRoute'

const mockPush = jest.fn()

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: mockPush }),
}))

jest.mock('lucide-react-native', () => ({
  ArrowRight: () => null,
  ChevronLeft: () => null,
  HeartHandshake: () => null,
  Sparkles: () => null,
}))

describe('LibrariesRoute', () => {
  beforeEach(() => {
    mockPush.mockClear()
  })

  it('renders both library cards with Arabic-Indic counts from the real libraries', () => {
    render(<LibrariesRoute />)

    expect(screen.getByTestId('libraries-hub')).toBeTruthy()
    expect(screen.getByText(ADHKAR_COPY.libraryTitle)).toBeTruthy()
    expect(screen.getByText(INTENTIONS_COPY.libraryTitle)).toBeTruthy()
    expect(
      screen.getByText(
        `${toArabicIndic(ADHKAR_LIBRARY.length)} ${ADHKAR_COPY.sections} · ${toArabicIndic(
          ADHKAR_LIBRARY.reduce((sum, category) => sum + category.items.length, 0),
        )} ${ADHKAR_COPY.adhkar}`,
      ),
    ).toBeTruthy()
    expect(
      screen.getByText(
        `${toArabicIndic(INTENTIONS_LIBRARY.length)} ${INTENTIONS_COPY.deeds} · ${toArabicIndic(
          INTENTIONS_LIBRARY.reduce((sum, deed) => sum + deed.intentions.length, 0),
        )} ${INTENTIONS_COPY.intentions}`,
      ),
    ).toBeTruthy()
  })

  it('navigates to the selected native library route', () => {
    render(<LibrariesRoute />)

    fireEvent.press(screen.getByText(ADHKAR_COPY.libraryTitle))
    expect(mockPush).toHaveBeenLastCalledWith('/adhkar')

    fireEvent.press(screen.getByText(INTENTIONS_COPY.libraryTitle))
    expect(mockPush).toHaveBeenLastCalledWith('/niyyat')
  })
})
