import { fireEvent, render, screen } from '@testing-library/react-native'
import { PrayerTimesRoute } from '../PrayerTimesRoute'
import { useTodayPrayerTimes } from '../useTodayPrayerTimes'

jest.mock('expo-router', () => ({
  useRouter: () => ({ canGoBack: () => false, replace: jest.fn() }),
}))
jest.mock('lucide-react-native', () => {
  const icon = () => null
  return { ArrowRight: icon, ChevronLeft: icon, AlertCircle: icon, Globe: icon, MapPin: icon }
})
jest.mock('../useTodayPrayerTimes', () => ({ useTodayPrayerTimes: jest.fn() }))
const runAction = jest.fn()
const refresh = jest.fn()
const base = {
  changeMethod: jest.fn(),
  isRefreshing: false,
  methodId: 'egyptian',
  points: [
    { id: 'dhuhr', label: 'الظهر', at: 1000 },
    { id: 'asr', label: 'العصر', at: 9000000 },
  ],
  currentPoint: { id: 'dhuhr', label: 'الظهر', at: 1000 },
  nextPrayer: { id: 'asr', label: 'العصر', at: 9000000 },
  instant: 60000,
  date: new Date('2026-09-20T12:00:00Z'),
  prayerStatus: 'أذّن الظهر',
  refresh,
  runAction,
  status: { state: 'ready', message: '', action: null },
  times: {},
}
beforeEach(() => {
  jest.clearAllMocks()
  ;(useTodayPrayerTimes as jest.Mock).mockReturnValue(base)
})

it('marks the current point and shows the next prayer', () => {
  render(<PrayerTimesRoute now={() => 60000} />)
  expect(screen.getByTestId('prayer-row-dhuhr')).toHaveTextContent('الآن', { exact: false })
  expect(screen.getAllByText('العصر').length).toBeGreaterThan(0)
})
it('shows the empty location action without a list', () => {
  ;(useTodayPrayerTimes as jest.Mock).mockReturnValue({
    ...base,
    times: null,
    points: [],
    status: {
      state: 'permission-required',
      message: 'permission',
      action: { label: 'تفعيل الموقع' },
    },
  })
  render(<PrayerTimesRoute />)
  fireEvent.press(screen.getByText('تفعيل الموقع'))
  expect(runAction).toHaveBeenCalled()
  expect(screen.queryByTestId('prayer-times-table')).toBeNull()
})
it.each(['settings-required', 'offline-cache'])(
  'shows the existing %s location message',
  (state) => {
    ;(useTodayPrayerTimes as jest.Mock).mockReturnValue({
      ...base,
      status: { state, message: 'حالة الموقع', action: { label: 'إعادة المحاولة' } },
    })
    render(<PrayerTimesRoute />)
    expect(screen.getByText('حالة الموقع')).toBeTruthy()
    fireEvent.press(screen.getByText('إعادة المحاولة'))
    expect(runAction).toHaveBeenCalled()
  },
)
it('disables refresh while refreshing', () => {
  ;(useTodayPrayerTimes as jest.Mock).mockReturnValue({ ...base, isRefreshing: true })
  render(<PrayerTimesRoute />)
  expect(screen.getByTestId('prayer-times-location-action').props.accessibilityState.disabled).toBe(
    true,
  )
  expect(screen.getByTestId('prayer-times-location-action').props.className).toContain(
    'opacity-[0.45]',
  )
  fireEvent.press(screen.getByTestId('prayer-times-location-action'))
  expect(refresh).not.toHaveBeenCalled()
})
it('opens the method sheet and writes the selected method', () => {
  render(<PrayerTimesRoute />)
  fireEvent.press(screen.getByTestId('prayer-methods'))
  fireEvent.press(screen.getByRole('radio', { name: 'أم القرى (مكة المكرمة)' }))
  expect(base.changeMethod).toHaveBeenCalledWith('umm_al_qura')
})

it('refreshes the location from the ready row', () => {
  render(<PrayerTimesRoute />)
  fireEvent.press(screen.getByTestId('prayer-times-location-action'))
  expect(refresh).toHaveBeenCalledWith({ force: true })
})
