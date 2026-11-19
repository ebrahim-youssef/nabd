import type { ReactNode } from 'react'
import { fireEvent, render, screen } from '@testing-library/react-native'
import { useRouter } from 'expo-router'

import { WIRD_LEVELS } from '../../content/levels'
import { buildDayPlan } from '../../day-plan/logic'
import type { DayPlan } from '../../day-plan/types'
import type { DayPrayerTimes } from '../../prayer-times/logic'
import type { DayId } from '../../wird/types'
import { TodayRoute } from '../TodayRoute'
import { useTodayDayPlan } from '../useTodayDayPlan'
import { useToggleItem } from '../../wird/useToggleItem'

jest.mock('../useTodayDayPlan')
jest.mock('../../wird/useToggleItem')
jest.mock('expo-router', () => ({ useRouter: jest.fn() }))
jest.mock('lucide-react-native', () => ({ ChevronLeft: () => null, ChevronRight: () => null }))
jest.mock('../../shell/ScreenContainer', () => ({
  ScreenContainer: ({ children, testID }: { children: ReactNode; testID: string }) => {
    const { View } = require('react-native')
    return <View testID={testID}>{children}</View>
  },
}))

const mockedUseTodayDayPlan = useTodayDayPlan as jest.MockedFunction<typeof useTodayDayPlan>
const mockedUseToggleItem = useToggleItem as jest.MockedFunction<typeof useToggleItem>
const mockedUseRouter = useRouter as jest.MockedFunction<typeof useRouter>
const DAY = '2026-06-10'
const TODAY = '2026-06-11'
const NOW = Date.parse('2026-06-11T13:05:00+03:00')
const TIMES: DayPrayerTimes = {
  fajr: Date.parse('2026-06-11T04:00:00+03:00'),
  sunrise: Date.parse('2026-06-11T05:30:00+03:00'),
  dhuhr: Date.parse('2026-06-11T12:00:00+03:00'),
  asr: Date.parse('2026-06-11T15:30:00+03:00'),
  maghrib: Date.parse('2026-06-11T18:30:00+03:00'),
  isha: Date.parse('2026-06-11T20:00:00+03:00'),
}
const NEXT_FAJR = Date.parse('2026-06-12T04:00:00+03:00')
const refresh = jest.fn()
const toggle = jest.fn()

describe('TodayRoute', () => {
  const router = { push: jest.fn() }

  beforeEach(() => {
    jest.clearAllMocks()
    mockedUseToggleItem.mockReturnValue({ toggle, pendingItemIds: new Set(), hasError: false })
    mockedUseRouter.mockReturnValue(router as never)
  })

  it('renders every prayer block, any-time act, and monthly goal', () => {
    showDay(DAY, 'version-1', WIRD_LEVELS[1].wird, NOW)
    render(<TodayRoute day={DAY} />)

    for (const name of ['الفجر', 'الظهر', 'العصر', 'المغرب', 'العشاء']) {
      expect(screen.getByText(name)).toBeTruthy()
    }
    expect(screen.getAllByText('قيام الليل').length).toBeGreaterThan(0)
    expect(screen.getByText('صيام ثلاثة أيام من الشهر')).toBeTruthy()
  })

  it('marks the current block only when the displayed day is today', () => {
    showDay(TODAY, 'version-1', WIRD_LEVELS[1].wird, NOW)
    const todayView = render(<TodayRoute day={TODAY} />)
    expect(screen.getAllByText('الآن')).toHaveLength(1)
    todayView.unmount()

    showDay(DAY, 'version-1', WIRD_LEVELS[1].wird, NOW)
    render(<TodayRoute day={DAY} />)
    expect(screen.queryByText('الآن')).toBeNull()
  })

  it('steps back to the previous day and hides next on today', () => {
    showDay(TODAY, 'version-1', WIRD_LEVELS[1].wird, NOW)
    render(<TodayRoute day={TODAY} />)

    fireEvent.press(screen.getByRole('button', { name: 'اليوم السابق' }))
    expect(router.push).toHaveBeenCalledWith('/today/2026-06-10')
    expect(screen.queryByRole('button', { name: 'اليوم التالي' })).toBeNull()
  })

  it('shows an older version item and records a past-day tick with that version', () => {
    const olderDefinition = {
      ...WIRD_LEVELS[1].wird,
      items: WIRD_LEVELS[1].wird.items
        .filter((item) => item.id !== 'istighfar')
        .map((item) =>
          item.id === 'fajr' ? { ...item, label: 'صلاة الفجر (النسخة السابقة)' } : item,
        ),
    }
    const plan = buildDayPlan({
      now: NOW,
      day: DAY,
      times: TIMES,
      nextFajr: NEXT_FAJR,
      definition: olderDefinition,
      entries: [],
    })
    showDay(DAY, 'version-old', olderDefinition, NOW, plan)
    render(<TodayRoute day={DAY} />)

    expect(screen.getByText('صلاة الفجر (النسخة السابقة)')).toBeTruthy()
    expect(screen.queryByText(/الاستغفار/)).toBeNull()
    fireEvent.press(screen.getByTestId('today-row-fajr'))
    expect(toggle).toHaveBeenCalledWith(DAY, 'fajr', true)
    expect(mockedUseToggleItem).toHaveBeenCalledWith('version-old', refresh)
    expect(screen.getByTestId('today-toast')).toBeTruthy()
    fireEvent.press(screen.getByRole('button', { name: 'تراجع' }))
    expect(toggle).toHaveBeenLastCalledWith(DAY, 'fajr', false)
  })

  it('marks optional rows as voluntary and excludes them from required progress', () => {
    const definition = {
      ...WIRD_LEVELS[1].wird,
      items: WIRD_LEVELS[1].wird.items.map((item) =>
        item.id === 'rawatib-dhuhr-before' ? { ...item, optional: true } : item,
      ),
    }
    const plan = buildDayPlan({
      now: NOW,
      day: DAY,
      times: TIMES,
      nextFajr: NEXT_FAJR,
      definition,
      entries: [],
    })
    showDay(DAY, 'version-1', definition, NOW, plan)
    render(<TodayRoute day={DAY} />)

    expect(screen.getAllByText('تطوّع').length).toBeGreaterThan(0)
    expect(screen.getByText('٠ من ٣')).toBeTruthy()
    const scheduledItems = [
      ...plan.blocks.flatMap(({ items }) => items),
      ...plan.timedActs.flatMap(({ items }) => items),
      ...plan.anyTime,
      ...plan.monthly.map(({ item }) => item),
    ]
    expect(plan.progress.required).toBe(scheduledItems.filter(({ optional }) => !optional).length)
    expect(
      screen.getByText(
        `${arabicNumber(plan.progress.done)} من ${arabicNumber(plan.progress.required)} مطلوبة`,
      ),
    ).toBeTruthy()
  })

  it('lists all items without prayer times and still allows a tick', () => {
    const plan = buildDayPlan({
      now: NOW,
      day: DAY,
      times: null,
      nextFajr: null,
      definition: WIRD_LEVELS[1].wird,
      entries: [],
    })
    showDay(DAY, 'version-1', WIRD_LEVELS[1].wird, NOW, plan)
    render(<TodayRoute day={DAY} />)

    const expectedIds = [
      ...plan.blocks.flatMap(({ items }) => items),
      ...plan.timedActs.flatMap(({ items }) => items),
      ...plan.anyTime,
      ...plan.monthly.map(({ item }) => item),
    ].map(({ id }) => id)
    expect(expectedIds).toHaveLength(screen.getAllByRole('checkbox').length)
    for (const id of expectedIds) expect(screen.getByTestId(`today-row-${id}`)).toBeTruthy()
    fireEvent.press(screen.getAllByRole('checkbox')[0])
    expect(toggle).toHaveBeenCalledWith(DAY, expect.any(String), true)
  })
})

function showDay(
  day: DayId,
  versionId: string,
  definition: (typeof WIRD_LEVELS)[number]['wird'],
  now: number,
  providedPlan?: DayPlan,
) {
  const plan =
    providedPlan ??
    buildDayPlan({
      now,
      day,
      times: TIMES,
      nextFajr: NEXT_FAJR,
      definition,
      entries: [],
    })
  mockedUseTodayDayPlan.mockReturnValue({
    currentDay: TODAY,
    plan,
    versionId,
    refresh,
  })
}

function arabicNumber(value: number): string {
  return String(value).replace(/[0-9]/g, (digit) => '٠١٢٣٤٥٦٧٨٩'[Number(digit)])
}
