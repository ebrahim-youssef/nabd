import { act, render, waitFor } from '@testing-library/react-native'
import { useSQLiteContext } from 'expo-sqlite'
import { AppState } from 'react-native'

import {
  acknowledgePendingPrayerActions,
  readPendingPrayerActions,
  subscribePrayerActionQueued,
} from '../prayerActions'
import { drainPrayerActions } from '../prayerActionDrain'
import { PrayerActionDrainBootstrap } from '../PrayerActionDrainBootstrap'

jest.mock('expo-sqlite', () => ({ useSQLiteContext: jest.fn() }))
jest.mock('../../wird/db', () => ({
  createWirdRepository: jest.fn(() => ({ setItemState: jest.fn() })),
}))
jest.mock('../prayerActions', () => ({
  acknowledgePendingPrayerActions: jest.fn(() => true),
  readPendingPrayerActions: jest.fn(() => ({ valid: [], malformedIds: [] })),
  subscribePrayerActionQueued: jest.fn(() => jest.fn()),
}))
jest.mock('../prayerActionDrain', () => ({
  drainPrayerActions: jest.fn(async () => ({
    applied: 0,
    unchanged: 0,
    duplicate: 0,
    stale: 0,
    failed: 0,
  })),
}))
jest.mock('../../shell/useLiveRepositoryQuery', () => ({
  refreshLiveRepositoryQueries: jest.fn(),
}))

const mockedUseSQLiteContext = useSQLiteContext as jest.MockedFunction<typeof useSQLiteContext>
const mockedRead = readPendingPrayerActions as jest.MockedFunction<typeof readPendingPrayerActions>
const mockedAcknowledge = acknowledgePendingPrayerActions as jest.MockedFunction<
  typeof acknowledgePendingPrayerActions
>
const mockedSubscribe = subscribePrayerActionQueued as jest.MockedFunction<
  typeof subscribePrayerActionQueued
>
const mockedDrain = drainPrayerActions as jest.MockedFunction<typeof drainPrayerActions>

describe('PrayerActionDrainBootstrap', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockedUseSQLiteContext.mockReturnValue({} as never)
    mockedRead.mockReturnValue({ valid: [], malformedIds: [] })
    mockedAcknowledge.mockReturnValue(true)
    mockedSubscribe.mockReturnValue(jest.fn())
    mockedDrain.mockResolvedValue({
      applied: 0,
      unchanged: 0,
      duplicate: 0,
      stale: 0,
      failed: 0,
    })
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('drains on mount, resume, and native queue events, then unsubscribes on unmount', async () => {
    let appStateListener:
      | ((state: 'active' | 'background' | 'inactive' | 'unknown' | 'extension') => void)
      | undefined
    let nativeEventListener: (() => void) | undefined
    const removeAppStateListener = jest.fn()
    const unsubscribeNativeEvent = jest.fn()
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, listener) => {
      appStateListener = listener
      return { remove: removeAppStateListener } as never
    })
    mockedSubscribe.mockImplementation((listener) => {
      nativeEventListener = listener
      return unsubscribeNativeEvent
    })

    const { unmount } = render(<PrayerActionDrainBootstrap />)

    await waitFor(() => expect(mockedDrain).toHaveBeenCalledTimes(1))
    act(() => appStateListener?.('active'))
    await waitFor(() => expect(mockedDrain).toHaveBeenCalledTimes(2))
    act(() => nativeEventListener?.())
    await waitFor(() => expect(mockedDrain).toHaveBeenCalledTimes(3))

    unmount()

    expect(removeAppStateListener).toHaveBeenCalledTimes(1)
    expect(unsubscribeNativeEvent).toHaveBeenCalledTimes(1)
  })
})
