import { renderHook } from '@testing-library/react-native'

import { WIRD_LEVELS } from '../../content/levels'
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
  useLiveRepositoryQuery: () => ({ data: mockData, refresh: jest.fn() }),
}))
jest.mock('../../wird/useWirdRepository', () => ({
  useWirdRepository: () => ({ healVersionFromLevels: jest.fn() }),
}))

describe('useTodayDayPlan', () => {
  it('uses the version that was in force on a past day', () => {
    const { result } = renderHook(() => useTodayDayPlan(DAY))

    expect(result.current.versionId).toBe('version-old')
    expect(result.current.plan.blocks.flatMap(({ items }) => items)).toContainEqual(
      expect.objectContaining({ id: 'fajr', label: 'صلاة الفجر (النسخة السابقة)' }),
    )
  })

  it('uses the earliest version for a day before the first version took effect', () => {
    const { result } = renderHook(() => useTodayDayPlan('2026-05-31'))

    expect(result.current.versionId).toBe('version-old')
    expect(result.current.plan.blocks.flatMap(({ items }) => items)).toContainEqual(
      expect.objectContaining({ id: 'fajr', label: 'صلاة الفجر (النسخة السابقة)' }),
    )
  })
})
