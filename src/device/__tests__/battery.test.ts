jest.mock('expo', () => ({
  ...jest.requireActual('expo'),
  requireOptionalNativeModule: jest.fn(),
}))

import { requireOptionalNativeModule } from 'expo'
import { Platform } from 'react-native'

import { logger } from '../../observability/logger'
import { readBatteryOptimizationStatus, requestBatteryOptimizationExemption } from '../battery'

const mockedRequireOptionalNativeModule = requireOptionalNativeModule as jest.MockedFunction<
  typeof requireOptionalNativeModule
>

function setPlatform(os: 'android' | 'ios'): void {
  Object.defineProperty(Platform, 'OS', { configurable: true, value: os })
}

describe('battery optimization adapter', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    setPlatform('android')
  })

  it('reports an exempt Android app', () => {
    mockedRequireOptionalNativeModule.mockReturnValue({
      isIgnoringBatteryOptimizations: () => true,
    } as never)

    expect(readBatteryOptimizationStatus()).toBe('exempt')
  })

  it('reports an optimized Android app', () => {
    mockedRequireOptionalNativeModule.mockReturnValue({
      isIgnoringBatteryOptimizations: () => false,
    } as never)

    expect(readBatteryOptimizationStatus()).toBe('optimized')
  })

  it('reports unsupported and logs when the native status read throws', () => {
    mockedRequireOptionalNativeModule.mockImplementation(() => {
      throw new Error('native module unavailable')
    })

    expect(readBatteryOptimizationStatus()).toBe('unsupported')
    expect(logger.error).toHaveBeenCalled()
  })

  it('reports unsupported and does nothing off Android', () => {
    setPlatform('ios')

    expect(readBatteryOptimizationStatus()).toBe('unsupported')
    expect(requestBatteryOptimizationExemption()).toBe('unsupported')
    expect(mockedRequireOptionalNativeModule).not.toHaveBeenCalled()
  })

  it('returns the native request result', () => {
    mockedRequireOptionalNativeModule.mockReturnValue({
      requestIgnoreBatteryOptimizations: () => 'settingsList',
    } as never)

    expect(requestBatteryOptimizationExemption()).toBe('settingsList')
  })
})
