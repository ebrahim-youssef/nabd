import { useCallback, useEffect, useState } from 'react'
import { AppState } from 'react-native'

import { readBatteryOptimizationStatus, requestBatteryOptimizationExemption } from './battery'
import type { BatteryOptimizationRequestResult, BatteryOptimizationStatus } from './types'

export type BatteryOptimizationView = {
  status: BatteryOptimizationStatus
  request: () => BatteryOptimizationRequestResult
}

export function useBatteryOptimization(): BatteryOptimizationView {
  const [status, setStatus] = useState<BatteryOptimizationStatus>(() =>
    readBatteryOptimizationStatus(),
  )

  const refresh = useCallback(() => {
    setStatus(readBatteryOptimizationStatus())
  }, [])

  const request = useCallback(
    (): BatteryOptimizationRequestResult => requestBatteryOptimizationExemption(),
    [],
  )

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') refresh()
    })
    return () => subscription.remove()
  }, [refresh])

  return { status, request }
}
