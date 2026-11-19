jest.mock('expo', () => ({
  ...jest.requireActual('expo'),
  requireOptionalNativeModule: jest.fn(),
}))

import { requireOptionalNativeModule } from 'expo'

import { logger } from '../../observability/logger'
import {
  acknowledgePendingPrayerActions,
  readPendingPrayerActions,
  subscribePrayerActionQueued,
} from '../prayerActions'

const mockedRequireOptionalNativeModule = requireOptionalNativeModule as jest.MockedFunction<
  typeof requireOptionalNativeModule
>

const validEntry = {
  actionId: 'prayer:2026-11-19:fajr:v1',
  itemId: 'fajr',
  day: '2026-11-19',
  versionId: 'v1',
  at: 1_800_000_000_000,
}

describe('native prayer action adapter', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('reads and validates queue entries while preserving queue order', () => {
    mockedRequireOptionalNativeModule.mockReturnValue({
      readPendingPrayerActions: () =>
        JSON.stringify([
          validEntry,
          { ...validEntry, actionId: 'bad-item', itemId: 'sunrise' },
          { ...validEntry, actionId: 'bad-day', day: '2026-2-19' },
          { ...validEntry, actionId: 'bad-at', at: Number.POSITIVE_INFINITY },
        ]),
    } as never)

    expect(readPendingPrayerActions()).toEqual({
      valid: [validEntry],
      malformedIds: ['bad-item', 'bad-day', 'bad-at'],
    })
  })

  it('returns an empty queue when the native module is unavailable', () => {
    mockedRequireOptionalNativeModule.mockReturnValue(null)

    expect(readPendingPrayerActions()).toEqual({ valid: [], malformedIds: [] })
  })

  it('acknowledges action ids through the native module', () => {
    const acknowledge = jest.fn(() => true)
    mockedRequireOptionalNativeModule.mockReturnValue({
      readPendingPrayerActions: () => '[]',
      acknowledgePendingPrayerActions: acknowledge,
    } as never)

    expect(acknowledgePendingPrayerActions(['one', 'two'])).toBe(true)
    expect(acknowledge).toHaveBeenCalledWith(['one', 'two'])
  })

  it('treats acknowledgement as a successful no-op without the native module', () => {
    mockedRequireOptionalNativeModule.mockReturnValue(null)

    expect(acknowledgePendingPrayerActions(['one'])).toBe(true)
  })

  it('subscribes to native queue events and removes the listener', () => {
    const remove = jest.fn()
    const addListener = jest.fn(() => ({ remove }))
    const listener = jest.fn()
    mockedRequireOptionalNativeModule.mockReturnValue({ addListener } as never)

    const unsubscribe = subscribePrayerActionQueued(listener)
    unsubscribe()

    expect(addListener).toHaveBeenCalledWith('onPrayerActionQueued', listener)
    expect(remove).toHaveBeenCalledTimes(1)
  })

  it('returns a no-op subscription when the native module is unavailable', () => {
    mockedRequireOptionalNativeModule.mockReturnValue(null)
    const listener = jest.fn()

    expect(() => subscribePrayerActionQueued(listener)()).not.toThrow()
    expect(logger.error).not.toHaveBeenCalled()
  })
})
