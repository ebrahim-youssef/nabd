import { fireEvent, render, screen } from '@testing-library/react-native'

import { formatPrayerTime } from '../../prayer-times/formatPrayerTime'
import { useTodayPrayerTimes } from '../../prayer-times/useTodayPrayerTimes'
import { WirdChecklist } from '../WirdChecklist'
import { useToggleItem } from '../useToggleItem'
import { useWirdDay } from '../WirdDayProvider'

jest.mock('../WirdDayProvider', () => ({ useWirdDay: jest.fn() }))
jest.mock('../useToggleItem', () => ({ useToggleItem: jest.fn() }))
jest.mock('../../prayer-times/useTodayPrayerTimes', () => ({ useTodayPrayerTimes: jest.fn() }))

const mockedUseWirdDay = useWirdDay as jest.MockedFunction<typeof useWirdDay>
const mockedUseToggleItem = useToggleItem as jest.MockedFunction<typeof useToggleItem>
const mockedUseTodayPrayerTimes = useTodayPrayerTimes as jest.MockedFunction<
  typeof useTodayPrayerTimes
>

const area = {
  id: 'area',
  label: 'Area',
  order: 0,
  items: [
    {
      id: 'item',
      label: 'Item',
      kind: 'checkbox' as const,
      done: false,
      minimum: 'Minimum',
      targetToday: true,
      optional: true,
    },
  ],
}

describe('WirdChecklist', () => {
  beforeEach(() => {
    mockedUseToggleItem.mockReturnValue({
      toggle: jest.fn(),
      pendingItemIds: new Set(),
      hasError: false,
    })
    mockedUseWirdDay.mockReturnValue({
      isLoading: false,
      areas: [area],
      versionId: 'version',
      refresh: jest.fn(),
      day: '2026-09-14',
    })
    mockedUseTodayPrayerTimes.mockReturnValue({
      times: null,
      prayerStatus: null,
      methodId: 'egyptian',
      changeMethod: jest.fn(),
      status: { state: 'unavailable', message: '', action: null },
      coordinates: null,
      isRefreshing: false,
      runAction: jest.fn(),
    } as never)
  })

  it('collapses and expands an area from its pressable header', () => {
    render(<WirdChecklist />)

    fireEvent.press(screen.getByTestId('area-header-area'))
    expect(screen.queryByTestId('area-items-area')).toBeNull()

    fireEvent.press(screen.getByTestId('area-header-area'))
    expect(screen.getByTestId('area-items-area')).toBeTruthy()
  })

  it('renders item metadata and the toggle error copy', () => {
    mockedUseToggleItem.mockReturnValue({
      toggle: jest.fn(),
      pendingItemIds: new Set(),
      hasError: true,
    })

    render(<WirdChecklist />)

    expect(screen.getByText('Minimum')).toBeTruthy()
    expect(screen.getByText('اليوم مستحب')).toBeTruthy()
    expect(screen.getByText('تطوّع')).toBeTruthy()
    expect(screen.getByRole('alert')).toBeTruthy()
  })

  it('keeps the mounted list visible while repository data refreshes', () => {
    const { rerender } = render(<WirdChecklist />)
    const checklist = screen.getByTestId('wird-checklist')

    mockedUseWirdDay.mockReturnValue({
      isLoading: true,
      areas: [area],
      versionId: 'version',
      refresh: jest.fn(),
      day: '2026-09-14',
    })
    rerender(<WirdChecklist />)

    expect(screen.queryByTestId('wird-checklist')).toBe(checklist)
    expect(screen.queryByTestId('wird-checklist-loading')).toBeNull()
  })

  it('shows prayer times and keeps the status line visible when prayers collapse', async () => {
    const prayerAt = new Date('2026-09-14T04:30:00.000Z').getTime()
    const prayerArea = {
      id: 'prayers',
      label: 'الصلوات',
      order: 0,
      items: [
        {
          id: 'fajr',
          label: 'الفجر',
          kind: 'checkbox' as const,
          done: false,
        },
      ],
    }
    mockedUseWirdDay.mockReturnValue({
      isLoading: false,
      areas: [prayerArea],
      versionId: 'version',
      refresh: jest.fn(),
      day: '2026-09-14',
    })
    mockedUseTodayPrayerTimes.mockReturnValue({
      times: {
        fajr: prayerAt,
        sunrise: prayerAt + 20_000,
        dhuhr: prayerAt + 30_000,
        asr: prayerAt + 40_000,
        maghrib: prayerAt + 50_000,
        isha: prayerAt + 60_000,
      },
      prayerStatus: 'باقي ١٠ دقائق على الفجر',
      methodId: 'egyptian',
      changeMethod: jest.fn(),
      status: { state: 'ready', message: '', action: null },
      coordinates: { latitude: 30, longitude: 31 },
      isRefreshing: false,
      runAction: jest.fn(),
    } as never)

    const view = await render(<WirdChecklist />)

    expect(screen.getByTestId('prayer-time-fajr')).toHaveTextContent(formatPrayerTime(prayerAt))
    expect(screen.getByTestId('prayer-status')).toHaveTextContent('باقي ١٠ دقائق على الفجر')

    await fireEvent.press(screen.getByTestId('area-header-prayers'))

    expect(screen.queryByTestId('area-items-prayers')).toBeNull()
    expect(screen.getByTestId('prayer-status')).toBeTruthy()

    await view.unmount()
  })

  it('shows neither a prayer badge nor a status line without location times', async () => {
    const prayerArea = {
      id: 'prayers',
      label: 'الصلوات',
      order: 0,
      items: [
        {
          id: 'fajr',
          label: 'الفجر',
          kind: 'checkbox' as const,
          done: false,
        },
      ],
    }
    mockedUseWirdDay.mockReturnValue({
      isLoading: false,
      areas: [prayerArea],
      versionId: 'version',
      refresh: jest.fn(),
      day: '2026-09-14',
    })

    const view = await render(<WirdChecklist />)

    expect(screen.queryByTestId('prayer-time-fajr')).toBeNull()
    expect(screen.queryByTestId('prayer-status')).toBeNull()

    await view.unmount()
  })
})
