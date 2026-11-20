import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import { Share } from 'react-native'

import { BottomSheet } from '../../ui/BottomSheet'
import { CompletionCelebration } from '../CompletionCelebration'
import { WIRD_COPY } from '../copy'

const mockRead = jest.fn()
const mockWrite = jest.fn()
const mockDatabase = {}
const mockRepository = {}
let mockDay = '2026-11-20'
let mockProgress = { done: 1, required: 2 }
let mockHasData = true

jest.mock('expo-sqlite', () => ({ useSQLiteContext: () => mockDatabase }))
jest.mock('lucide-react-native', () => ({ Star: () => null }))
jest.mock('../../day-plan/WirdTodayProvider', () => ({ useWirdToday: () => mockDay }))
jest.mock('../../preferences/db', () => ({
  PREFERENCE_KEYS: { celebratedDay: 'nabd:celebrated-day' },
  createPreferencesRepository: () => ({ read: mockRead, write: mockWrite }),
}))
jest.mock('../useWirdRepository', () => ({ useWirdRepository: () => mockRepository }))
jest.mock('../../shell/useLiveRepositoryQuery', () => ({
  useLiveRepositoryQuery: () => ({
    data: mockHasData ? { day: mockDay, progress: mockProgress, streak: 2 } : undefined,
  }),
}))
jest.mock('../../../theme/tokens', () => ({ useThemeColors: () => ({ gold: 'gold' }) }))

describe('CompletionCelebration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockDay = '2026-11-20'
    mockProgress = { done: 1, required: 2 }
    mockHasData = true
    mockRead.mockResolvedValue(null)
    mockWrite.mockResolvedValue(undefined)
  })

  it('renders no sheet until the preference and plan reads resolve', async () => {
    let finishRead: (value: null) => void = () => undefined
    mockRead.mockImplementationOnce(
      () =>
        new Promise<null>((resolve) => {
          finishRead = resolve
        }),
    )
    const { rerender, UNSAFE_queryByType } = render(<CompletionCelebration />)
    await waitFor(() => expect(mockRead).toHaveBeenCalled(), { timeout: 5000 })
    expect(UNSAFE_queryByType(BottomSheet)).toBeNull()
    mockHasData = false
    rerender(<CompletionCelebration />)
    await act(async () => finishRead(null))
    expect(UNSAFE_queryByType(BottomSheet)).toBeNull()
    mockHasData = true
    rerender(<CompletionCelebration />)
    expect(UNSAFE_queryByType(BottomSheet)).not.toBeNull()
  })

  it('shows once when the plan completes and writes the day before showing', async () => {
    const { rerender } = render(<CompletionCelebration />)
    await waitFor(() => expect(mockRead).toHaveBeenCalledTimes(1), { timeout: 5000 })
    expect(screen.queryByText(WIRD_COPY.celebrationTitle)).toBeNull()
    mockProgress = { done: 2, required: 2 }
    rerender(<CompletionCelebration />)
    await waitFor(() => expect(screen.getByText(WIRD_COPY.celebrationTitle)).toBeTruthy(), {
      timeout: 5000,
    })
    expect(mockWrite).toHaveBeenCalledWith('nabd:celebrated-day', mockDay, expect.any(Number))
    expect(screen.getByText('يومان متتاليان')).toBeTruthy()
    fireEvent.press(screen.getByText(WIRD_COPY.celebrationDismiss))
    rerender(<CompletionCelebration />)
    expect(screen.queryByText(WIRD_COPY.celebrationTitle)).toBeNull()
    expect(mockWrite).toHaveBeenCalledTimes(1)
  })

  it('does not show when the day was already celebrated', async () => {
    mockProgress = { done: 2, required: 2 }
    mockRead.mockResolvedValue(mockDay)
    render(<CompletionCelebration />)
    await waitFor(() => expect(mockRead).toHaveBeenCalled(), { timeout: 5000 })
    expect(screen.queryByText(WIRD_COPY.celebrationTitle)).toBeNull()
    expect(mockWrite).not.toHaveBeenCalled()
  })

  it('shares the celebration text', async () => {
    mockProgress = { done: 2, required: 2 }
    const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: Share.sharedAction })
    render(<CompletionCelebration />)
    await waitFor(() => expect(screen.getByText(WIRD_COPY.celebrationShare)).toBeTruthy(), {
      timeout: 5000,
    })
    fireEvent.press(screen.getByText(WIRD_COPY.celebrationShare))
    expect(share).toHaveBeenCalledWith({ message: WIRD_COPY.celebrationShareText })
    share.mockRestore()
  })

  it('does not show when the preference read fails', async () => {
    mockProgress = { done: 2, required: 2 }
    mockRead.mockRejectedValue(new Error('read failed'))
    render(<CompletionCelebration />)
    await waitFor(() => expect(mockRead).toHaveBeenCalled(), { timeout: 5000 })
    await act(async () => {})
    expect(screen.queryByText(WIRD_COPY.celebrationTitle)).toBeNull()
    expect(mockWrite).not.toHaveBeenCalled()
  })

  it('does not show when the preference write fails', async () => {
    mockProgress = { done: 2, required: 2 }
    mockWrite.mockRejectedValue(new Error('write failed'))
    render(<CompletionCelebration />)
    await waitFor(() => expect(mockWrite).toHaveBeenCalled(), { timeout: 5000 })
    expect(screen.queryByText(WIRD_COPY.celebrationTitle)).toBeNull()
  })

  it('waits for the preference write before showing the sheet', async () => {
    mockProgress = { done: 2, required: 2 }
    let finishWrite: () => void = () => undefined
    mockWrite.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          finishWrite = resolve
        }),
    )
    render(<CompletionCelebration />)
    await waitFor(() => expect(mockWrite).toHaveBeenCalled(), { timeout: 5000 })
    expect(screen.queryByText(WIRD_COPY.celebrationTitle)).toBeNull()
    await act(async () => finishWrite())
    expect(screen.getByText(WIRD_COPY.celebrationTitle)).toBeTruthy()
  })

  it('does not show a previous day after its write finishes late', async () => {
    mockProgress = { done: 2, required: 2 }
    let finishWrite: () => void = () => undefined
    mockWrite.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finishWrite = resolve
        }),
    )
    const { rerender } = render(<CompletionCelebration />)
    await waitFor(() => expect(mockWrite).toHaveBeenCalled(), { timeout: 5000 })
    mockDay = '2026-11-21'
    mockProgress = { done: 0, required: 2 }
    rerender(<CompletionCelebration />)
    await act(async () => finishWrite())
    expect(screen.queryByText(WIRD_COPY.celebrationTitle)).toBeNull()
  })

  it('does not show when the plan becomes incomplete while its write is pending', async () => {
    mockProgress = { done: 2, required: 2 }
    let finishWrite: () => void = () => undefined
    mockWrite.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finishWrite = resolve
        }),
    )
    const { rerender } = render(<CompletionCelebration />)
    await waitFor(() => expect(mockWrite).toHaveBeenCalled(), { timeout: 5000 })
    mockProgress = { done: 1, required: 2 }
    rerender(<CompletionCelebration />)
    await act(async () => finishWrite())
    expect(screen.queryByText(WIRD_COPY.celebrationTitle)).toBeNull()
  })

  it('does not celebrate an empty plan', async () => {
    mockProgress = { done: 0, required: 0 }
    render(<CompletionCelebration />)
    await waitFor(() => expect(mockRead).toHaveBeenCalled(), { timeout: 5000 })
    expect(mockWrite).not.toHaveBeenCalled()
  })
})
