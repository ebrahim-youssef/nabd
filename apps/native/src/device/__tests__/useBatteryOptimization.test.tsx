import { act, renderHook, waitFor } from '@testing-library/react-native'
import { AppState } from 'react-native'

import { readBatteryOptimizationStatus, requestBatteryOptimizationExemption } from '../battery'
import { useBatteryOptimization } from '../useBatteryOptimization'

jest.mock('../battery', () => ({
  readBatteryOptimizationStatus: jest.fn(),
  requestBatteryOptimizationExemption: jest.fn(),
}))

const mockedReadBatteryOptimizationStatus = readBatteryOptimizationStatus as jest.MockedFunction<
  typeof readBatteryOptimizationStatus
>
const mockedRequestBatteryOptimizationExemption =
  requestBatteryOptimizationExemption as jest.MockedFunction<
    typeof requestBatteryOptimizationExemption
  >

let appStateListener: ((state: string) => void) | undefined

describe('useBatteryOptimization', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    appStateListener = undefined
    mockedReadBatteryOptimizationStatus.mockReturnValue('optimized')
    mockedRequestBatteryOptimizationExemption.mockReturnValue('exemptionDialog')
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
    mockedReadBatteryOptimizationStatus.mockReturnValue('exempt')
    mockedReadBatteryOptimizationStatus.mockClear()

    act(() => appStateListener?.('active'))

    await waitFor(() => expect(result.current.status).toBe('exempt'))
    expect(mockedReadBatteryOptimizationStatus).toHaveBeenCalledTimes(1)
  })

  it('exposes the native request result', () => {
    const { result } = renderHook(() => useBatteryOptimization())

    expect(result.current.request()).toBe('exemptionDialog')
    expect(mockedRequestBatteryOptimizationExemption).toHaveBeenCalledTimes(1)
  })
})
