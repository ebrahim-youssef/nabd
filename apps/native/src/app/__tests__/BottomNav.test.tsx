import { render, screen } from '@testing-library/react-native'

import { shellCopy } from '@nabd/shared'

import { BottomNav } from '../BottomNav'

const mockUsePathname = jest.fn(() => '/')
const mockPush = jest.fn()

jest.mock('expo-router', () => ({
  usePathname: () => mockUsePathname(),
  useRouter: () => ({ push: mockPush }),
}))

jest.mock('lucide-react-native', () => ({
  BarChart3: () => null,
  Clock: () => null,
  Home: () => null,
  LibraryBig: () => null,
  Settings: () => null,
}))

jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual('react-native-safe-area-context')
  return {
    ...actual,
    useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
  }
})

describe('BottomNav', () => {
  function renderBottomNav() {
    return render(<BottomNav />)
  }

  beforeEach(() => {
    mockUsePathname.mockReturnValue('/')
    mockPush.mockReset()
  })

  it('renders the five Arabic items with the legacy test ids', () => {
    renderBottomNav()

    expect(screen.getByTestId('bottom-nav')).toBeTruthy()
    expect(screen.getByTestId('bottom-nav').props.accessibilityLabel).toBe(shellCopy.navAriaLabel)
    expect(screen.getByTestId('nav-libraries')).toBeTruthy()
    expect(screen.getByTestId('nav-prayer-times')).toBeTruthy()
    expect(screen.getByTestId('nav-home')).toBeTruthy()
    expect(screen.getByTestId('nav-stats')).toBeTruthy()
    expect(screen.getByTestId('nav-settings')).toBeTruthy()
    expect(screen.getByText(shellCopy.nav.libraries)).toBeTruthy()
    expect(screen.getByText(shellCopy.nav.prayerTimes)).toBeTruthy()
    expect(screen.getByText(shellCopy.nav.home)).toBeTruthy()
    expect(screen.getByText(shellCopy.nav.stats)).toBeTruthy()
    expect(screen.getByText(shellCopy.nav.settings)).toBeTruthy()
  })

  it.each([
    ['/', 'nav-home'],
    ['/qada', 'nav-stats'],
    ['/adhkar', 'nav-libraries'],
  ] as const)('marks %s as active in %s', (pathname, activeId) => {
    mockUsePathname.mockReturnValue(pathname)
    renderBottomNav()

    expect(screen.getByTestId(activeId).props.accessibilityState.selected).toBe(true)
    for (const id of [
      'nav-libraries',
      'nav-prayer-times',
      'nav-home',
      'nav-stats',
      'nav-settings',
    ]) {
      if (id !== activeId) {
        expect(screen.getByTestId(id).props.accessibilityState.selected).toBe(false)
      }
    }
  })
})
