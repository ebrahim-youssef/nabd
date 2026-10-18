import { act, renderHook, waitFor } from '@testing-library/react-native'
import { AppState } from 'react-native'

import { devicePlatform } from '../platform'
import { useBatteryOptimization } from '../useBatteryOptimization'

jest.mock('../platform', () => ({
  devicePlatform: {
    readBatteryProtectionStatus: jest.fn(),
    requestBatteryProtection: jest.fn(),
  },
}))

const mockedReadBatteryProtectionStatus =
  devicePlatform.readBatteryProtectionStatus as jest.MockedFunction<
    typeof devicePlatform.readBatteryProtectionStatus
  >
const mockedRequestBatteryProtection =
  devicePlatform.requestBatteryProtection as jest.MockedFunction<
    typeof devicePlatform.requestBatteryProtection
  >

let appStateListener: ((state: string) => void) | undefined

describe('useBatteryOptimization', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    appStateListener = undefined
    mockedReadBatteryProtectionStatus.mockReturnValue('optimized')
    mockedRequestBatteryProtection.mockReturnValue('exemptionDialog')
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, listener) => {
      appStateListener = listener as (state: string) => void
      return { remove: jest.fn() } as never
    })
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('reads status again when the app becomes active', async () => {
    const { result } = renderHook(() => useBatteryOptimization())

    await waitFor(() => expect(result.current.status).toBe('optimized'))
    mockedReadBatteryProtectionStatus.mockReturnValue('exempt')
    mockedReadBatteryProtectionStatus.mockClear()

    act(() => appStateListener?.('active'))

    await waitFor(() => expect(result.current.status).toBe('exempt'))
    expect(mockedReadBatteryProtectionStatus).toHaveBeenCalledTimes(1)
  })

  it('exposes the native request result', () => {
    const { result } = renderHook(() => useBatteryOptimization())

    expect(result.current.request()).toBe('exemptionDialog')
    expect(mockedRequestBatteryProtection).toHaveBeenCalledTimes(1)
  })
})
