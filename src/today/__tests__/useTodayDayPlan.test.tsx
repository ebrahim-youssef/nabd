import { renderHook } from '@testing-library/react-native'

import { WIRD_LEVELS } from '../../content/levels'
import { logger } from '../../observability/logger'
import { useTodayDayPlan } from '../useTodayDayPlan'
import type { WirdVersion } from '../../wird/types'

const DAY = '2026-06-10'
const mockCurrentDay = '2026-06-11'
const olderDefinition = {
  ...WIRD_LEVELS[1].wird,
  items: WIRD_LEVELS[1].wird.items.map((item) =>
    item.id === 'fajr' ? { ...item, label: 'صلاة الفجر (النسخة السابقة)' } : item,
  ),
}
const mockData = {
  versions: [
    {
      id: 'version-old',
      effectiveFrom: '2026-06-01',
      definition: olderDefinition,
      createdAt: 1,
    },
    {
      id: 'version-new',
      effectiveFrom: mockCurrentDay,
      definition: WIRD_LEVELS[1].wird,
      createdAt: 2,
    },
  ] as WirdVersion[],
  entries: [],
  monthEntries: [],
}
const mockRefresh = jest.fn()
const mockListVersions = jest.fn<Promise<WirdVersion[]>, []>(async () => mockData.versions)
const mockGetDayEntries = jest.fn<Promise<never[]>, [string]>(async () => [])
const mockGetMonthEntries = jest.fn<Promise<never[]>, [string]>(async () => [])
const mockRepository = {
  healVersionFromLevels: jest.fn(),
  listVersions: mockListVersions,
  getDayEntries: mockGetDayEntries,
  getMonthEntries: mockGetMonthEntries,
}
let mockRead: (() => Promise<unknown>) | undefined
const mockQueryState: {
  data: typeof mockData | undefined
  isLoading: boolean
  hasError: boolean
  refresh: () => void
} = {
  data: mockData,
  isLoading: false,
  hasError: false,
  refresh: mockRefresh,
}

jest.mock('expo-sqlite', () => ({ useSQLiteContext: () => ({}) }))
jest.mock('../../day-plan/WirdTodayProvider', () => ({ useWirdToday: () => mockCurrentDay }))
jest.mock('../../device/useLocationCapability', () => ({
  useLocationCapability: () => ({ coordinates: null }),
}))
jest.mock('../../preferences/db', () => ({
  PREFERENCE_KEYS: { calculationMethod: 'calculation-method' },
  createPreferencesRepository: () => ({ read: () => Promise.resolve('egyptian') }),
}))
jest.mock('../../shell/useLiveRepositoryQuery', () => ({
  useLiveRepositoryQuery: (read: () => Promise<unknown>) => {
    mockRead = read
    return mockQueryState
  },
}))
jest.mock('../../wird/useWirdRepository', () => ({
  useWirdRepository: () => mockRepository,
}))

describe('useTodayDayPlan', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRead = undefined
    mockQueryState.data = mockData
    mockQueryState.isLoading = false
    mockQueryState.hasError = false
    mockListVersions.mockResolvedValue(mockData.versions)
    mockGetDayEntries.mockResolvedValue([])
    mockGetMonthEntries.mockResolvedValue([])
  })

  it('uses the version that was in force on a past day', () => {
    const { result } = renderHook(() => useTodayDayPlan(DAY))

    expect(result.current.versionId).toBe('version-old')
    expect(result.current.plan.blocks.flatMap(({ items }) => items)).toContainEqual(
      expect.objectContaining({ id: 'fajr', label: 'صلاة الفجر (النسخة السابقة)' }),
    )
  })

  it.each([
    ['loading', true, false],
    ['failed', false, true],
  ] as const)('exposes %s query status', (status, isLoading, hasError) => {
    mockQueryState.data = undefined
    mockQueryState.isLoading = isLoading
    mockQueryState.hasError = hasError

    const { result } = renderHook(() => useTodayDayPlan(DAY))

    expect(result.current.status).toBe(status)
  })

  it('uses the earliest version for a day before the first version took effect', () => {
    const { result } = renderHook(() => useTodayDayPlan('2026-05-31'))

    expect(result.current.versionId).toBe('version-old')
    expect(result.current.plan.blocks.flatMap(({ items }) => items)).toContainEqual(
      expect.objectContaining({ id: 'fajr', label: 'صلاة الفجر (النسخة السابقة)' }),
    )
  })

  it('continues using the saved version when best-effort healing fails', async () => {
    const cause = new Error('database locked during healing')
    mockRepository.healVersionFromLevels.mockRejectedValueOnce(cause)
    const logError = jest.spyOn(logger, 'error').mockImplementation(() => undefined)
    const { result } = renderHook(() => useTodayDayPlan(DAY))
    const read = mockRead
    if (!read) throw new Error('Today plan query did not capture its read function')

    await expect(read()).resolves.toMatchObject({ versions: mockData.versions })

    expect(result.current.status).toBe('ready')
    expect(mockListVersions).toHaveBeenCalledTimes(1)
    expect(mockGetDayEntries).toHaveBeenCalledWith(DAY)
    expect(result.current.plan.blocks.flatMap(({ items }) => items)).toContainEqual(
      expect.objectContaining({ id: 'fajr' }),
    )
    expect(logError).toHaveBeenCalledWith(
      `Native Today version healing failed for day ${mockCurrentDay}`,
      cause,
    )
  })

  it('does not swallow failures from the version read', async () => {
    const cause = new Error('version read failed')
    mockListVersions.mockRejectedValueOnce(cause)
    renderHook(() => useTodayDayPlan(DAY))
    const read = mockRead
    if (!read) throw new Error('Today plan query did not capture its read function')

    await expect(read()).rejects.toBe(cause)
  })
})
