import { fireEvent, render, screen } from '@testing-library/react-native'

import { shellCopy } from '../copy'

import { BottomNav } from '../BottomNav'

const mockUsePathname = jest.fn(() => '/')
const mockNavigate = jest.fn()

jest.mock('expo-router', () => ({
  usePathname: () => mockUsePathname(),
  useRouter: () => ({ navigate: mockNavigate }),
}))
jest.mock('../../day-plan/WirdTodayProvider', () => ({ useWirdToday: () => '2026-11-19' }))

jest.mock('lucide-react-native', () => ({
  BookOpen: () => null,
  CalendarDays: () => null,
  Ellipsis: () => null,
  Home: () => null,
}))

describe('BottomNav', () => {
  function renderBottomNav() {
    return render(<BottomNav />)
  }

  beforeEach(() => {
    mockUsePathname.mockReturnValue('/')
    mockNavigate.mockReset()
  })

  it('renders the four Arabic items in the new tab order', () => {
    renderBottomNav()

    expect(screen.getByTestId('bottom-nav')).toBeTruthy()
    expect(screen.getByTestId('bottom-nav').props.accessibilityLabel).toBe(shellCopy.navAriaLabel)
    expect(screen.getByTestId('nav-home')).toBeTruthy()
    expect(screen.getByTestId('nav-today')).toBeTruthy()
    expect(screen.getByTestId('nav-adhkar')).toBeTruthy()
    expect(screen.getByTestId('nav-more')).toBeTruthy()
    expect(screen.getByText(shellCopy.nav.home)).toBeTruthy()
    expect(screen.getByText(shellCopy.nav.today)).toBeTruthy()
    expect(screen.getByText(shellCopy.nav.adhkar)).toBeTruthy()
    expect(screen.getByText(shellCopy.nav.more)).toBeTruthy()
    expect(screen.getAllByRole('button').map((tab) => tab.props.testID)).toEqual([
      'nav-home',
      'nav-today',
      'nav-adhkar',
      'nav-more',
    ])
  })

  it('stays absent during onboarding and appears after completion', async () => {
    const view = await render(<BottomNav isVisible={false} />)

    expect(screen.queryByTestId('bottom-nav')).toBeNull()

    await view.rerender(<BottomNav isVisible />)

    expect(screen.getByTestId('bottom-nav')).toBeTruthy()
  })

  it('navigates the Today tab directly to the current wird day', () => {
    renderBottomNav()

    fireEvent.press(screen.getByTestId('nav-today'))

    expect(mockNavigate).toHaveBeenCalledWith('/today/2026-11-19')
  })

  it.each([
    ['/', 'nav-home'],
    ['/today', 'nav-today'],
    ['/today/2026-11-19', 'nav-today'],
    ['/adhkar', 'nav-adhkar'],
    ['/adhkar/morning', 'nav-adhkar'],
    ['/more', 'nav-more'],
    ['/prayer-times', 'nav-more'],
    ['/stats', 'nav-more'],
    ['/qada', 'nav-more'],
    ['/niyyat', 'nav-more'],
    ['/libraries', 'nav-more'],
    ['/settings', 'nav-more'],
    ['/backup', 'nav-more'],
  ] as const)('marks %s as active in %s', (pathname, activeId) => {
    mockUsePathname.mockReturnValue(pathname)
    renderBottomNav()

    expect(screen.getByTestId(activeId).props.accessibilityState.selected).toBe(true)
    for (const id of ['nav-home', 'nav-today', 'nav-adhkar', 'nav-more']) {
      if (id !== activeId) {
        expect(screen.getByTestId(id).props.accessibilityState.selected).toBe(false)
      }
    }
  })
})
