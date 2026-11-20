import type { ReactNode } from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import { useRouter } from 'expo-router'

import { WIRD_LEVELS } from '../../content/levels'
import { buildDayPlan } from '../../day-plan/logic'
import type { DayPlan } from '../../day-plan/types'
import type { DayPrayerTimes } from '../../prayer-times/logic'
import type { PersistedOnboarding } from '../../onboarding/db'
import { HomeScreen } from '../HomeScreen'
import { useHomeDayPlan } from '../useHomeDayPlan'
import { useToggleItem } from '../../wird/useToggleItem'

jest.mock('../useHomeDayPlan')
jest.mock('../../wird/useToggleItem')
jest.mock('expo-router', () => ({ useRouter: jest.fn() }))
jest.mock('../../shell/ScreenContainer', () => ({
  ScreenContainer: ({ children, testID }: { children: ReactNode; testID: string }) => {
    const { View } = require('react-native')
    return <View testID={testID}>{children}</View>
  },
}))

const mockedUseHomeDayPlan = useHomeDayPlan as jest.MockedFunction<typeof useHomeDayPlan>
const mockedUseToggleItem = useToggleItem as jest.MockedFunction<typeof useToggleItem>
const mockedUseRouter = useRouter as jest.MockedFunction<typeof useRouter>
const DAY = '2026-06-10'
const NOW = Date.parse('2026-06-10T13:05:00+03:00')
const TIMES: DayPrayerTimes = {
  fajr: Date.parse('2026-06-10T04:00:00+03:00'),
  sunrise: Date.parse('2026-06-10T05:30:00+03:00'),
  dhuhr: Date.parse('2026-06-10T12:00:00+03:00'),
  asr: Date.parse('2026-06-10T15:30:00+03:00'),
  maghrib: Date.parse('2026-06-10T18:30:00+03:00'),
  isha: Date.parse('2026-06-10T20:00:00+03:00'),
}
const NEXT_FAJR = Date.parse('2026-06-11T04:00:00+03:00')
const refresh = jest.fn()
const runLocationAction = jest.fn()

describe('HomeScreen', () => {
  const toggle = jest.fn()
  const openRouter = { push: jest.fn() }

  beforeEach(() => {
    jest.clearAllMocks()
    toggle.mockResolvedValue(true)
    mockedUseToggleItem.mockReturnValue({
      toggle,
      pendingItemIds: new Set(),
      hasError: false,
      optimisticItems: new Map(),
      getOptimisticDone: (_day, _id, done) => done,
    })
    mockedUseRouter.mockReturnValue(openRouter as never)
  })

  it.each([
    ['05:10', Date.parse('2026-06-10T05:10:00+03:00'), 'fajr', ['morning-adhkar']],
    ['13:05', NOW, 'dhuhr', ['morning-adhkar']],
    ['23:40', Date.parse('2026-06-10T23:40:00+03:00'), 'isha', ['evening-adhkar', 'qiyam']],
  ])('shows the current block and only open timed acts at %s', (_label, now, current, openActs) => {
    const prayerNames: Record<string, string> = {
      fajr: 'الفجر',
      dhuhr: 'الظهر',
      isha: 'العشاء',
    }
    const plan = makePlan(now as number)
    showPlan(plan)

    render(<HomeScreen persisted={persisted()} />)

    expect(screen.getByTestId('current-block-title')).toHaveTextContent(
      prayerNames[current as string],
    )
    expect(screen.getAllByTestId(/^timed-act-/).map((node) => node.props.testID)).toEqual(
      (openActs as string[]).map((id) => `timed-act-${id}`),
    )
    const unrecordedCount = plan.unrecorded.length
    const unrecordedName =
      unrecordedCount > 0 ? `لم يُسجَّل، ${arabicNumber(unrecordedCount)}` : 'لم يُسجَّل'
    expect(screen.getByRole('button', { name: unrecordedName })).toBeTruthy()
    expect(
      screen.getByRole('button', {
        name: `أعمال اليوم، ${arabicNumber(plan.anyTimeProgress.done)}/${arabicNumber(
          plan.anyTimeProgress.total,
        )}`,
      }),
    ).toBeTruthy()
    expect(
      screen.getByText(
        `${arabicNumber(plan.progress.done)} من ${arabicNumber(plan.progress.required)} مطلوبة`,
      ),
    ).toBeTruthy()
  })

  it('shows Friday shared Dhuhr copy and uses the plan counts for both tiles', () => {
    const friday = buildDayPlan({
      now: NOW,
      day: '2026-06-12',
      times: TIMES,
      nextFajr: NEXT_FAJR,
      definition: WIRD_LEVELS[2].wird,
      entries: [],
    })
    showPlan(friday)

    render(<HomeScreen persisted={persisted()} />)

    expect(screen.getByTestId('current-block-title')).toHaveTextContent('الجمعة / الظهر')
    expect(screen.getByText(arabicNumber(friday.unrecorded.length))).toBeTruthy()
    expect(
      screen.getByText(
        `${arabicNumber(friday.anyTimeProgress.done)}/${arabicNumber(friday.anyTimeProgress.total)}`,
      ),
    ).toBeTruthy()
    expect(
      screen.getByText(
        `${arabicNumber(friday.progress.done)} من ${arabicNumber(friday.progress.required)} مطلوبة`,
      ),
    ).toBeTruthy()
  })

  it('shows the next prayer when the sunrise gap has no current block', () => {
    const plan = makePlan(TIMES.sunrise)
    showPlan(plan)
    render(<HomeScreen persisted={persisted()} />)
    expect(screen.getByTestId('current-block-title')).toHaveTextContent('الظهر')
    expect(screen.getByTestId('current-block')).toHaveTextContent('يبدأ', { exact: false })
  })

  it('shows the needs-review link for the latest stale prayer action', () => {
    showPlan(makePlan(NOW))
    mockedUseHomeDayPlan.mockImplementation(() => ({
      ...homeDayPlan(makePlan(NOW)),
      prayerActionReview: { actionId: 'stale-action', day: '2026-06-09', at: NOW },
    }))

    render(<HomeScreen persisted={persisted()} />)

    expect(screen.getByTestId('prayer-action-review')).toHaveTextContent(
      'تسجيل من الإشعار يحتاج مراجعة',
    )
    expect(screen.getByTestId('prayer-action-review').props.accessibilityRole).toBe('link')
  })

  it('hides the needs-review link when no stale prayer action is pending', () => {
    showPlan(makePlan(NOW))

    render(<HomeScreen persisted={persisted()} />)

    expect(screen.queryByTestId('prayer-action-review')).toBeNull()
  })

  it('sets a ticked row to done and offers undo that records false', async () => {
    showPlan(makePlan(NOW))
    render(<HomeScreen persisted={persisted()} />)

    fireEvent.press(screen.getByRole('checkbox', { name: /سنة الظهر القبلية/ }))
    expect(toggle).toHaveBeenLastCalledWith(DAY, 'rawatib-dhuhr-before', true, false)
    expect(await screen.findByText('سُجّل سنة الظهر القبلية')).toBeTruthy()
    fireEvent.press(screen.getByRole('button', { name: 'تراجع' }))
    await waitFor(() => expect(toggle).toHaveBeenLastCalledWith(DAY, 'rawatib-dhuhr-before', false))
    await waitFor(() => expect(screen.queryByTestId('home-toast')).toBeNull())
  })

  it('does not show a success toast after a stale write', async () => {
    let resolveWrite: (saved: boolean) => void = () => {}
    toggle.mockReturnValueOnce(
      new Promise<boolean>((resolve) => {
        resolveWrite = resolve
      }),
    )
    showPlan(makePlan(NOW))
    render(<HomeScreen persisted={persisted()} />)

    fireEvent.press(screen.getByRole('checkbox', { name: /سنة الظهر القبلية/ }))
    expect(screen.queryByTestId('home-toast')).toBeNull()
    await act(async () => resolveWrite(false))
    expect(await screen.findByText('تعذّر حفظ سنة الظهر القبلية. حاول مرة أخرى.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'تراجع' })).toBeNull()
  })

  it('keeps only the hero and daily lines while loading', () => {
    showPlan(makePlan(NOW), undefined, 'loading')
    render(<HomeScreen persisted={persisted()} />)

    expect(
      screen.queryByTestId('hero-expanded') ?? screen.queryByTestId('hero-collapsed'),
    ).toBeTruthy()
    expect(screen.getByText('الحمد لله')).toBeTruthy()
    expect(screen.queryByTestId('current-block')).toBeNull()
    expect(screen.queryAllByTestId(/^timed-act-/)).toHaveLength(0)
    expect(screen.queryAllByTestId(/^home-row-/)).toHaveLength(0)
    expect(screen.queryByRole('button', { name: /أعمال اليوم/ })).toBeNull()
    expect(screen.queryByRole('progressbar')).toBeNull()
    expect(screen.queryByText(/مطلوبة/)).toBeNull()
  })

  it('shows retry instead of rows after a failed read and retries the query', () => {
    showPlan(makePlan(NOW), undefined, 'failed')
    render(<HomeScreen persisted={persisted()} />)

    expect(screen.getByText('تعذّر تحميل اليوم. حاول مرة أخرى.')).toBeTruthy()
    expect(screen.queryByTestId('current-block')).toBeNull()
    expect(screen.queryAllByTestId(/^timed-act-/)).toHaveLength(0)
    expect(screen.queryAllByTestId(/^home-row-/)).toHaveLength(0)
    expect(screen.queryByRole('button', { name: /أعمال اليوم/ })).toBeNull()
    fireEvent.press(screen.getByRole('button', { name: 'إعادة المحاولة' }))
    expect(refresh).toHaveBeenCalled()
  })

  it('shows the failed-save toast without undo when an undo write fails', async () => {
    toggle.mockResolvedValueOnce(true).mockResolvedValueOnce(false)
    showPlan(makePlan(NOW))
    render(<HomeScreen persisted={persisted()} />)

    fireEvent.press(screen.getByRole('checkbox', { name: /سنة الظهر القبلية/ }))
    fireEvent.press(await screen.findByRole('button', { name: 'تراجع' }))

    expect(await screen.findByText('تعذّر حفظ سنة الظهر القبلية. حاول مرة أخرى.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'تراجع' })).toBeNull()
  })

  it('shows the failed-save toast without undo for a sheet row', async () => {
    toggle.mockResolvedValueOnce(false)
    showPlan(makePlan(NOW))
    render(<HomeScreen persisted={persisted()} />)

    fireEvent.press(screen.getByRole('button', { name: /أعمال اليوم/ }))
    fireEvent.press(screen.getByRole('checkbox', { name: /الاستغفار/ }))

    expect(
      await screen.findByText('تعذّر حفظ الاستغفار — أستغفر الله العظيم. حاول مرة أخرى.'),
    ).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'تراجع' })).toBeNull()
  })

  it('keeps unrecorded undo after refresh removes the ticked row', async () => {
    const plan = makePlan(NOW)
    const item = plan.unrecorded[0]
    if (!item) throw new Error('Expected an unrecorded item in the fixture plan')
    let currentPlan = plan
    showPlan(plan)
    mockedUseHomeDayPlan.mockImplementation(() => ({
      day: DAY,
      plan: currentPlan,
      versionId: 'version-1',
      refresh,
      now: NOW,
      times: TIMES,
      nextFajr: NEXT_FAJR,
      coordinates: { latitude: 1, longitude: 2 },
      runLocationAction,
      dailyLines: {
        intention: { deed: 'الصلاة', text: 'أحافظ عليها' },
        dhikr: { text: 'الحمد لله' },
      },
      prayerActionReview: null,
      markPrayerActionReviewSeen: jest.fn(async () => undefined),
      status: 'ready',
    }))
    const view = render(<HomeScreen persisted={persisted()} />)

    fireEvent.press(screen.getByRole('button', { name: /لم يُسجَّل/ }))
    fireEvent.press(screen.getByTestId(`sheet-row-${item.id}`))
    expect(await screen.findByText(`سُجّل ${item.label}`)).toBeTruthy()

    await act(async () => {
      currentPlan = {
        ...plan,
        unrecorded: plan.unrecorded.filter(({ id }) => id !== item.id),
      }
      view.rerender(<HomeScreen persisted={persisted()} />)
    })
    expect(screen.queryByTestId(`sheet-row-${item.id}`)).toBeNull()
    expect(screen.queryByTestId('sheet-row-morning-adhkar')).toBeNull()
    fireEvent.press(screen.getByRole('button', { name: 'تراجع' }))
    await waitFor(() => expect(toggle).toHaveBeenLastCalledWith(DAY, item.id, false))
  })

  it('lists exactly the plan unrecorded items and opens the selected day', () => {
    const plan = makePlan(NOW)
    showPlan(plan)
    render(<HomeScreen persisted={persisted()} />)
    fireEvent.press(screen.getByRole('button', { name: /لم يُسجَّل/ }))

    for (const item of plan.unrecorded) expect(screen.getByText(item.label)).toBeTruthy()
    expect(screen.getAllByTestId('unrecorded-row')).toHaveLength(plan.unrecorded.length)
    fireEvent.press(screen.getByRole('button', { name: 'افتح اليوم' }))
    expect(openRouter.push).toHaveBeenCalledWith(`/today/${DAY}`)
  })

  it('records a target dhikr with one tap in the any-time sheet', () => {
    showPlan(makePlan(NOW))
    render(<HomeScreen persisted={persisted()} />)
    fireEvent.press(screen.getByRole('button', { name: /أعمال اليوم/ }))
    fireEvent.press(screen.getByRole('checkbox', { name: /الاستغفار/ }))

    expect(toggle).toHaveBeenCalledWith(DAY, 'istighfar', true, false)
  })

  it('shows the no-location prompt and starts the existing location request flow', () => {
    showPlan(makePlan(NOW), null)
    render(<HomeScreen persisted={persisted()} />)
    expect(screen.getByTestId('hero-collapsed')).toBeTruthy()
    expect(screen.getByText('لا نعرف مواقيت الصلاة بعد')).toBeTruthy()
    fireEvent.press(screen.getByRole('button', { name: 'حدّد موقعك' }))
    expect(runLocationAction).toHaveBeenCalledTimes(1)
    fireEvent.press(screen.getByRole('button', { name: 'افتح اليوم' }))
    expect(openRouter.push).toHaveBeenCalledWith(`/today/${DAY}`)
  })
})

function makePlan(now: number): DayPlan {
  const day = new Date(now).toISOString().slice(0, 10)
  return buildDayPlan({
    now,
    day,
    times: TIMES,
    nextFajr: NEXT_FAJR,
    definition: WIRD_LEVELS[2].wird,
    entries: [],
  })
}

function showPlan(
  plan: DayPlan,
  coordinates: { latitude: number; longitude: number } | null = { latitude: 1, longitude: 2 },
  status: 'loading' | 'ready' | 'failed' = 'ready',
) {
  const displayedPlan = coordinates
    ? plan
    : buildDayPlan({
        now: NOW,
        day: DAY,
        times: null,
        nextFajr: null,
        definition: WIRD_LEVELS[2].wird,
        entries: [],
      })
  mockedUseHomeDayPlan.mockReturnValue({
    day: DAY,
    plan: displayedPlan,
    versionId: 'version-1',
    refresh,
    now: NOW,
    times: coordinates ? TIMES : null,
    nextFajr: coordinates ? NEXT_FAJR : null,
    coordinates,
    runLocationAction,
    dailyLines: { intention: { deed: 'الصلاة', text: 'أحافظ عليها' }, dhikr: { text: 'الحمد لله' } },
    prayerActionReview: null,
    markPrayerActionReviewSeen: jest.fn(async () => undefined),
    status,
  })
}

function homeDayPlan(plan: DayPlan) {
  return {
    day: DAY,
    plan,
    versionId: 'version-1',
    refresh,
    now: NOW,
    times: TIMES,
    nextFajr: NEXT_FAJR,
    coordinates: { latitude: 1, longitude: 2 },
    runLocationAction,
    dailyLines: {
      intention: { deed: 'الصلاة', text: 'أحافظ عليها' },
      dhikr: { text: 'الحمد لله' },
    },
    prayerActionReview: null,
    markPrayerActionReviewSeen: jest.fn(async () => undefined),
    status: 'ready' as const,
  }
}

function persisted(): PersistedOnboarding {
  return {
    answers: {},
    selectedLevelId: WIRD_LEVELS[2].id,
    completedAt: 0,
    effectiveFrom: DAY,
    activeWird: {
      id: 'version-1',
      effectiveFrom: DAY,
      definition: WIRD_LEVELS[2].wird,
      createdAt: 0,
    },
  }
}

function arabicNumber(value: number): string {
  return String(value).replace(/[0-9]/g, (digit) => '٠١٢٣٤٥٦٧٨٩'[Number(digit)])
}
