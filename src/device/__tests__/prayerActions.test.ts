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
  done: true,
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
          { ...validEntry, actionId: 'undo', done: false },
          { ...validEntry, actionId: 'widget-item', itemId: 'custom-item' },
          { ...validEntry, actionId: 'bad-item', itemId: ' ' },
          { ...validEntry, actionId: 'bad-day', day: '2026-2-19' },
          { ...validEntry, actionId: 'bad-negative-at', at: -1 },
          { ...validEntry, actionId: 'bad-at', at: Number.POSITIVE_INFINITY },
        ]),
    } as never)

    expect(readPendingPrayerActions()).toEqual({
      valid: [
        validEntry,
        { ...validEntry, actionId: 'undo', done: false },
        { ...validEntry, actionId: 'widget-item', itemId: 'custom-item' },
      ],
      malformedIds: ['bad-item', 'bad-day', 'bad-negative-at', 'bad-at'],
    })
  })

  it('defaults legacy non-prayer entries to done', () => {
    mockedRequireOptionalNativeModule.mockReturnValue({
      readPendingPrayerActions: () =>
        JSON.stringify([{ ...validEntry, done: undefined, itemId: 'custom' }]),
    } as never)

    expect(readPendingPrayerActions()).toEqual({
      valid: [{ ...validEntry, itemId: 'custom', done: true }],
      malformedIds: [],
    })
  })

  it('rejects a non-boolean desired state', () => {
    mockedRequireOptionalNativeModule.mockReturnValue({
      readPendingPrayerActions: () => JSON.stringify([{ ...validEntry, done: 'true' }]),
    } as never)

    expect(readPendingPrayerActions()).toEqual({ valid: [], malformedIds: [validEntry.actionId] })
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
