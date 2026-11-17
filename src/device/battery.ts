import { requireOptionalNativeModule } from 'expo'
import { Platform } from 'react-native'

import { logger } from '../observability/logger'
import { mapBatteryOptimizationStatus } from './logic'
import type { BatteryOptimizationRequestResult, BatteryOptimizationStatus } from './types'

type NabdDeviceModule = {
  isIgnoringBatteryOptimizations: () => unknown
  requestIgnoreBatteryOptimizations: () => unknown
}

const NATIVE_MODULE_NAME = 'NabdDevice'
const READ_OPERATION = 'read-battery-optimization-status'
const REQUEST_OPERATION = 'request-battery-optimization-exemption'

type OpenResult = Exclude<BatteryOptimizationRequestResult, 'unsupported'>

function isOpenResult(value: unknown): value is OpenResult {
  return value === 'exemptionDialog' || value === 'settingsList' || value === 'none'
}

export function readBatteryOptimizationStatus(): BatteryOptimizationStatus {
  if (Platform.OS !== 'android') return 'unsupported'

  try {
    const nativeModule = requireOptionalNativeModule<NabdDeviceModule>(NATIVE_MODULE_NAME)
    if (!nativeModule) {
      logger.error('Native battery-optimization module is unavailable', null, {
        operation: READ_OPERATION,
      })
      return 'unsupported'
    }

    const status = mapBatteryOptimizationStatus(nativeModule.isIgnoringBatteryOptimizations())
    if (status === 'unsupported') {
      logger.error('Native battery-optimization status is invalid', null, {
        operation: READ_OPERATION,
      })
    }
    return status
  } catch (cause: unknown) {
    logger.error('Native battery-optimization read failed', cause, {
      operation: READ_OPERATION,
    })
    return 'unsupported'
  }
}

export function requestBatteryOptimizationExemption(): BatteryOptimizationRequestResult {
  if (Platform.OS !== 'android') return 'unsupported'

  try {
    const nativeModule = requireOptionalNativeModule<NabdDeviceModule>(NATIVE_MODULE_NAME)
    if (!nativeModule) {
      logger.error('Native battery-optimization module is unavailable', null, {
        operation: REQUEST_OPERATION,
      })
      return 'none'
    }

    const result = nativeModule.requestIgnoreBatteryOptimizations()
    if (!isOpenResult(result)) {
      logger.error('Native battery-optimization request result is invalid', null, {
        operation: REQUEST_OPERATION,
      })
      return 'none'
    }
    return result
  } catch (cause: unknown) {
    logger.error('Native battery-optimization request failed', cause, {
      operation: REQUEST_OPERATION,
    })
    return 'none'
  }
}
