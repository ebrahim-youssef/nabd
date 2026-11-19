import { fireEvent, render, screen, waitFor } from '@testing-library/react-native'

import { WIRD_LEVELS } from '../../content/levels'
import { requestPrayerReschedule } from '../../device/prayerAlarms'
import { useWirdLevel } from '../../wird/useWirdLevel'
import { LevelRoute } from '../LevelRoute'

const mockBack = jest.fn()
const mockShow = jest.fn()
const mockChangeLevel = jest.fn()
const mockSetWirdLevel = jest.fn()
const mockRefresh = jest.fn()
const mockRepository = { listVersions: jest.fn(), setWirdLevel: mockSetWirdLevel }
const mockLevel = {
  currentLevelId: 'level-1' as (typeof WIRD_LEVELS)[number]['id'],
  canChangeLevel: true,
  isLoading: false,
  changeLevel: mockChangeLevel,
}

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack, canGoBack: () => true, replace: jest.fn() }),
}))
jest.mock('lucide-react-native', () => ({ ArrowRight: () => null }))
jest.mock('../../day-plan/WirdTodayProvider', () => ({ useWirdToday: () => '2026-09-20' }))
jest.mock('../../wird/useWirdLevel', () => ({ useWirdLevel: jest.fn() }))
jest.mock('../../wird/useWirdRepository', () => ({
  useWirdRepository: () => mockRepository,
}))
jest.mock('../../device/prayerAlarms', () => ({ requestPrayerReschedule: jest.fn() }))
jest.mock('../../shell/useLiveRepositoryQuery', () => ({
  useLiveRepositoryQuery: () => ({
    data: [
      {
        effectiveFrom: '2026-09-19',
        createdAt: 1,
        definition: jest.requireActual('../../content/levels').WIRD_LEVELS[0].wird,
      },
    ],
    isLoading: false,
    refresh: mockRefresh,
  }),
}))
jest.mock('../../ui/ToastProvider', () => ({ useToast: () => ({ show: mockShow }) }))

describe('level page', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockLevel.currentLevelId = 'level-1'
    mockLevel.canChangeLevel = true
    mockLevel.isLoading = false
    mockChangeLevel.mockResolvedValue({ ok: true })
    jest.mocked(useWirdLevel).mockImplementation(() => mockLevel)
  })

  it('disables saving until a different level is selected, then saves and returns with a toast', async () => {
    render(<LevelRoute />)
    const save = screen.getByRole('button', { name: 'حفظ — يبدأ من الغد' })
    expect(save).toBeDisabled()
    expect(screen.getByText('الحالي')).toBeTruthy()
    fireEvent.press(screen.getByText(WIRD_LEVELS[1].title))
    expect(save).toBeEnabled()
    fireEvent.press(save)
    await waitFor(() =>
      expect(mockChangeLevel).toHaveBeenCalledWith('level-2', '2026-09-20', expect.any(Number)),
    )
    expect(mockShow).toHaveBeenCalledWith({ message: expect.any(String) })
    expect(mockBack).toHaveBeenCalledTimes(1)
  })

  it('marks today’s level and compares the selection with the scheduled level', () => {
    mockLevel.currentLevelId = 'level-2'
    render(<LevelRoute />)
    expect(screen.getByText('الحالي')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'حفظ — يبدأ من الغد' })).toBeDisabled()
    fireEvent.press(screen.getByText(WIRD_LEVELS[0].title))
    expect(screen.getByRole('button', { name: 'حفظ — يبدأ من الغد' })).toBeEnabled()
  })
  it('shows a failure toast and stays on the page when saving fails', async () => {
    mockChangeLevel.mockResolvedValueOnce({ ok: false, error: 'set_failed' })
    render(<LevelRoute />)
    fireEvent.press(screen.getByText(WIRD_LEVELS[1].title))
    fireEvent.press(screen.getByRole('button', { name: 'حفظ — يبدأ من الغد' }))
    await waitFor(() => expect(mockShow).toHaveBeenCalledWith({ message: expect.any(String) }))
    expect(mockBack).not.toHaveBeenCalled()
  })

  it('stays on the page when the write rejects', async () => {
    mockChangeLevel.mockRejectedValueOnce(new Error('write failed'))
    render(<LevelRoute />)
    fireEvent.press(screen.getByText(WIRD_LEVELS[1].title))
    fireEvent.press(screen.getByRole('button', { name: 'حفظ — يبدأ من الغد' }))
    await waitFor(() => expect(mockShow).toHaveBeenCalledWith({ message: expect.any(String) }))
    expect(mockBack).not.toHaveBeenCalled()
  })

  it('requests an alarm reschedule after a successful level change', async () => {
    jest
      .mocked(useWirdLevel)
      .mockImplementation(
        jest.requireActual<typeof import('../../wird/useWirdLevel')>('../../wird/useWirdLevel')
          .useWirdLevel,
      )
    mockSetWirdLevel.mockResolvedValueOnce({ ok: true, value: undefined })
    render(<LevelRoute />)

    fireEvent.press(screen.getByText(WIRD_LEVELS[1].title))
    fireEvent.press(screen.getByRole('button', { name: 'حفظ — يبدأ من الغد' }))

    await waitFor(() => expect(requestPrayerReschedule).toHaveBeenCalledTimes(1))
    expect(mockSetWirdLevel).toHaveBeenCalledWith(
      WIRD_LEVELS[1].wird,
      '2026-09-20',
      expect.any(Number),
    )
  })

  it('does not request an alarm reschedule after a failed level change', async () => {
    jest
      .mocked(useWirdLevel)
      .mockImplementation(
        jest.requireActual<typeof import('../../wird/useWirdLevel')>('../../wird/useWirdLevel')
          .useWirdLevel,
      )
    mockSetWirdLevel.mockResolvedValueOnce({ ok: false, error: 'set_failed' })
    render(<LevelRoute />)

    fireEvent.press(screen.getByText(WIRD_LEVELS[1].title))
    fireEvent.press(screen.getByRole('button', { name: 'حفظ — يبدأ من الغد' }))

    await waitFor(() => expect(mockShow).toHaveBeenCalled())
    expect(mockSetWirdLevel).toHaveBeenCalledTimes(1)
    expect(requestPrayerReschedule).not.toHaveBeenCalled()
  })
})
