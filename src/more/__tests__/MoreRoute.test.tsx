import { fireEvent, render, screen } from '@testing-library/react-native'
import { MoreRoute } from '../MoreRoute'
import { useStats } from '../../stats/useStats'

const mockPush = jest.fn()
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }))
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { version: '1.2.3' } },
}))
jest.mock('lucide-react-native', () => {
  const icon = () => null
  return {
    ArrowRight: icon,
    ChevronLeft: icon,
    BarChart3: icon,
    BookHeart: icon,
    Clock: icon,
    DatabaseBackup: icon,
    History: icon,
    Settings: icon,
  }
})
jest.mock('../../prayer-times/useTodayPrayerTimes', () => ({
  useTodayPrayerTimes: () => ({ nextPrayer: { id: 'asr', label: 'العصر', at: 1800000000000 } }),
}))
jest.mock('../../stats/useStats', () => ({ useStats: jest.fn(), currentStreak: () => 12 }))
jest.mock('../../wird/useWirdLevel', () => ({
  useWirdLevel: () => ({ isLoading: false, canChangeLevel: true, currentLevelId: 'level-1' }),
}))

beforeEach(() => {
  mockPush.mockReset()
  ;(useStats as jest.Mock).mockReturnValue({
    isLoading: false,
    error: false,
    data: { completions: [], qada: { fajr: 243 } },
  })
})

it.each([
  ['مواقيت الصلاة', '/prayer-times'],
  ['الإحصائيات', '/stats'],
  ['قضاء الفوائت', '/qada'],
  ['مكتبة النوايا', '/niyyat'],
  ['الإعدادات', '/settings'],
  ['النسخ الاحتياطي', '/backup'],
])('opens %s', (label, href) => {
  render(<MoreRoute />)
  fireEvent.press(screen.getByText(label))
  expect(mockPush).toHaveBeenCalledWith(href)
})

it('shows the current values and version without a back button', () => {
  render(<MoreRoute />)
  expect(screen.getByText(/العصر/)).toBeTruthy()
  expect(screen.getByText('١٢ يومًا متتاليًا')).toBeTruthy()
  expect(screen.getByText('٢٤٣ فائتة')).toBeTruthy()
  expect(screen.getByText('نبض ١.٢.٣')).toBeTruthy()
  expect(screen.queryByTestId('page-back')).toBeNull()
})

it('hides unavailable values while rows remain navigable', () => {
  ;(useStats as jest.Mock).mockReturnValue({
    isLoading: true,
    error: false,
    data: { completions: [], qada: {} },
  })
  render(<MoreRoute />)
  expect(screen.queryByText('١٢ يومًا متتاليًا')).toBeNull()
  fireEvent.press(screen.getByText('الإحصائيات'))
  expect(mockPush).toHaveBeenCalledWith('/stats')
})
