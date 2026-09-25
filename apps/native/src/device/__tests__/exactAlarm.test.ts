jest.mock('expo', () => ({
  ...jest.requireActual('expo'),
  requireOptionalNativeModule: jest.fn(),
}))

import { requireOptionalNativeModule } from 'expo'
import { Platform } from 'react-native'

import { logger } from '../../observability/logger'
import { readExactAlarmSnapshot } from '../exactAlarm'

const mockedRequireOptionalNativeModule = requireOptionalNativeModule as jest.MockedFunction<
  typeof requireOptionalNativeModule
>

function setPlatform(os: 'android' | 'ios', version: number): void {
  Object.defineProperty(Platform, 'OS', { configurable: true, value: os })
  Object.defineProperty(Platform, 'Version', { configurable: true, value: version })
}

describe('exact-alarm snapshot', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    setPlatform('android', 35)
  })

  it('reads not-required from the native module', () => {
    mockedRequireOptionalNativeModule.mockReturnValue({
      getExactAlarmStatus: () => 'not-required',
    } as never)
    setPlatform('android', 30)

    expect(readExactAlarmSnapshot()).toEqual({ apiLevel: 30, access: 'not-required' })
  })

  it('reads granted from the native module', () => {
    mockedRequireOptionalNativeModule.mockReturnValue({
      getExactAlarmStatus: () => 'granted',
    } as never)

    expect(readExactAlarmSnapshot()).toEqual({ apiLevel: 35, access: 'granted' })
  })

  it('reads denied from the native module', () => {
    mockedRequireOptionalNativeModule.mockReturnValue({
      getExactAlarmStatus: () => 'denied',
    } as never)

    expect(readExactAlarmSnapshot()).toEqual({ apiLevel: 35, access: 'denied' })
  })

  it('returns unknown and logs when the native module is missing', () => {
    mockedRequireOptionalNativeModule.mockReturnValue(null)

    expect(readExactAlarmSnapshot()).toEqual({ apiLevel: 35, access: 'unknown' })
    expect(logger.error).toHaveBeenCalled()
  })

  it('returns unknown and logs when reading the native module throws', () => {
    mockedRequireOptionalNativeModule.mockImplementation(() => {
      throw new Error('native module unavailable')
    })

    expect(readExactAlarmSnapshot()).toEqual({ apiLevel: 35, access: 'unknown' })
    expect(logger.error).toHaveBeenCalled()
  })

  it('returns unknown and logs an unexpected native value', () => {
    mockedRequireOptionalNativeModule.mockReturnValue({
      getExactAlarmStatus: () => 'garbage',
    } as never)

    expect(readExactAlarmSnapshot()).toEqual({ apiLevel: 35, access: 'unknown' })
    expect(logger.error).toHaveBeenCalled()
  })
})
