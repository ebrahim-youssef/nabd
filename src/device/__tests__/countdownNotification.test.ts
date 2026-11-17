jest.mock('expo', () => ({
  ...jest.requireActual('expo'),
  requireOptionalNativeModule: jest.fn(),
}))

jest.mock('../countdown', () => ({
  boundaries: jest.fn(),
}))

import { requireOptionalNativeModule } from 'expo'
import { Platform } from 'react-native'

import { logger } from '../../observability/logger'
import { boundaries } from '../countdown'
import {
  clearCountdownNotification,
  getCountdownNotificationStatus,
  setCountdownNotification,
} from '../countdownNotification'

const mockedRequireOptionalNativeModule = requireOptionalNativeModule as jest.MockedFunction<
  typeof requireOptionalNativeModule
>
const mockedBoundaries = boundaries as jest.MockedFunction<typeof boundaries>

function setPlatform(os: 'android' | 'ios'): void {
  Object.defineProperty(Platform, 'OS', { configurable: true, value: os })
}

describe('countdown notification wrapper', () => {
  const points = [
    { id: 'fajr' as const, label: 'الفجر', at: 2_000, sunrise: false },
    { id: 'sunrise' as const, label: 'الشروق', at: 3_000, sunrise: true },
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    setPlatform('android')
    mockedBoundaries.mockReturnValue(points)
  })

  it('does not call native code on non-Android', () => {
    setPlatform('ios')

    expect(setCountdownNotification(1_000, { latitude: 30, longitude: 31 }, 'القاهرة')).toBe(
      'unsupported',
    )
    expect(mockedRequireOptionalNativeModule).not.toHaveBeenCalled()
  })

  it.each(['posted', 'permission-denied', 'channel-blocked', 'invalid'] as const)(
    'returns the native result %s',
    (result) => {
      mockedRequireOptionalNativeModule.mockReturnValue({
        setCountdown: jest.fn(() => result),
      } as never)

      expect(setCountdownNotification(1_000, { latitude: 30, longitude: 31 }, 'القاهرة')).toBe(
        result,
      )
    },
  )

  it('builds the native payload from the countdown boundaries and city', () => {
    const setCountdown = jest.fn(() => 'posted')
    mockedRequireOptionalNativeModule.mockReturnValue({ setCountdown } as never)

    setCountdownNotification(1_000, { latitude: 30, longitude: 31 }, 'القاهرة', 'egyptian')

    expect(mockedBoundaries).toHaveBeenCalledWith(
      1_000,
      { latitude: 30, longitude: 31 },
      'egyptian',
    )
    expect(setCountdown).toHaveBeenCalledWith(
      JSON.stringify({ boundaries: points, city: 'القاهرة' }),
    )
  })

  it('logs and returns error when native code throws', () => {
    mockedRequireOptionalNativeModule.mockImplementation(() => {
      throw new Error('native module unavailable')
    })

    expect(setCountdownNotification(1_000, { latitude: 30, longitude: 31 }, null)).toBe('error')
    expect(logger.error).toHaveBeenCalled()
  })

  it('clears native countdown state', () => {
    const clearCountdown = jest.fn()
    mockedRequireOptionalNativeModule.mockReturnValue({ clearCountdown } as never)

    clearCountdownNotification()

    expect(clearCountdown).toHaveBeenCalledTimes(1)
  })

  it('reads a typed native status', () => {
    mockedRequireOptionalNativeModule.mockReturnValue({
      getCountdownStatus: jest.fn(() => 'posted'),
    } as never)

    expect(getCountdownNotificationStatus()).toBe('posted')
  })
})
