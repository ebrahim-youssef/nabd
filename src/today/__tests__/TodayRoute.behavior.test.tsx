import type { ReactNode } from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native'
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
    toggle.mockResolvedValue(true)
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

  it('shows the header without blocks or progress while loading', () => {
    showDay(DAY, 'version-1', WIRD_LEVELS[1].wird, NOW, undefined, 'loading')
    render(<TodayRoute day={DAY} />)

    expect(screen.getByText('اليوم')).toBeTruthy()
    expect(screen.queryByTestId('today-block-fajr')).toBeNull()
    expect(screen.queryByRole('progressbar')).toBeNull()
    expect(screen.queryByText(/٠ من ٠/)).toBeNull()
  })

  it('shows a retry action after a failed read', () => {
    showDay(DAY, 'version-1', WIRD_LEVELS[1].wird, NOW, undefined, 'failed')
    render(<TodayRoute day={DAY} />)

    expect(screen.getByText('تعذّر تحميل اليوم. حاول مرة أخرى.')).toBeTruthy()
    fireEvent.press(screen.getByRole('button', { name: 'إعادة المحاولة' }))
    expect(refresh).toHaveBeenCalled()
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

  it('shows an unavailable day without progress or rows and hides its previous stepper', () => {
    showDay('2026-05-31', null, WIRD_LEVELS[1].wird, NOW, undefined, 'unavailable', '2026-06-01')
    render(<TodayRoute day="2026-05-31" />)

    expect(screen.getByText('لا توجد خطة لهذا اليوم.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'اليوم السابق' })).toBeNull()
    expect(screen.queryByRole('progressbar')).toBeNull()
    expect(screen.queryByTestId(/^today-row-/)).toBeNull()
  })

  it('hides the previous stepper on the first day with a plan', () => {
    showDay('2026-06-01', 'version-old', WIRD_LEVELS[1].wird, NOW, undefined, 'ready', '2026-06-01')
    render(<TodayRoute day="2026-06-01" />)

    expect(screen.queryByRole('button', { name: 'اليوم السابق' })).toBeNull()
  })

  it('shows an older version item and records a past-day tick with that version', async () => {
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
    expect(await screen.findByTestId('today-toast')).toBeTruthy()
    fireEvent.press(screen.getByRole('button', { name: 'تراجع' }))
    expect(toggle).toHaveBeenLastCalledWith(DAY, 'fajr', false)
    await waitFor(() => expect(screen.queryByTestId('today-toast')).toBeNull())
  })

  it('shows a failed-save toast without undo when the write fails', async () => {
    let resolveWrite: (saved: boolean) => void = () => {}
    toggle.mockReturnValueOnce(
      new Promise<boolean>((resolve) => {
        resolveWrite = resolve
      }),
    )
    showDay(DAY, 'version-1', WIRD_LEVELS[1].wird, NOW)
    render(<TodayRoute day={DAY} />)

    fireEvent.press(screen.getByTestId('today-row-fajr'))
    expect(screen.queryByTestId('today-toast')).toBeNull()
    await act(async () => resolveWrite(false))
    expect(await screen.findByText('تعذّر حفظ الفجر (جماعة). حاول مرة أخرى.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'تراجع' })).toBeNull()
  })

  it('shows a failed-save toast without undo when the undo write fails', async () => {
    toggle.mockResolvedValueOnce(true).mockResolvedValueOnce(false)
    showDay(DAY, 'version-1', WIRD_LEVELS[1].wird, NOW)
    render(<TodayRoute day={DAY} />)

    fireEvent.press(screen.getByTestId('today-row-fajr'))
    fireEvent.press(await screen.findByRole('button', { name: 'تراجع' }))

    expect(await screen.findByText('تعذّر حفظ الفجر (جماعة). حاول مرة أخرى.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'تراجع' })).toBeNull()
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
  versionId: string | null,
  definition: (typeof WIRD_LEVELS)[number]['wird'],
  now: number,
  providedPlan?: DayPlan,
  status: 'loading' | 'ready' | 'failed' | 'unavailable' = 'ready',
  earliestVersionDay: DayId | null = '2026-06-01',
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
    status,
    earliestVersionDay,
  })
}

function arabicNumber(value: number): string {
  return String(value).replace(/[0-9]/g, (digit) => '٠١٢٣٤٥٦٧٨٩'[Number(digit)])
}
