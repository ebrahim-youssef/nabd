import { useCallback, useEffect, useState } from 'react'
import { AppState } from 'react-native'

import { devicePlatform } from './platform'
import type { BatteryOptimizationRequestResult, BatteryOptimizationStatus } from './types'

export type BatteryOptimizationView = {
  status: BatteryOptimizationStatus
  request: () => BatteryOptimizationRequestResult
}

export function useBatteryOptimization(): BatteryOptimizationView {
  const [status, setStatus] = useState<BatteryOptimizationStatus>(() =>
    devicePlatform.readBatteryProtectionStatus(),
  )

  const refresh = useCallback(() => {
    setStatus(devicePlatform.readBatteryProtectionStatus())
  }, [])

  const request = useCallback(
    (): BatteryOptimizationRequestResult => devicePlatform.requestBatteryProtection(),
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
