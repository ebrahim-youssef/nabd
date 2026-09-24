import { requireOptionalNativeModule } from 'expo'
import { Platform } from 'react-native'

import { logger } from '../observability/logger'
import type { ExactAlarmAccess, ExactAlarmSnapshot } from './types'

type NabdDeviceModule = {
  getExactAlarmStatus: () => unknown
}

const NATIVE_MODULE_NAME = 'NabdDevice'
const UNKNOWN_API_LEVEL = 0
const UNKNOWN_ACCESS: ExactAlarmAccess = 'unknown'
const READ_OPERATION = 'read-exact-alarm-status'

function apiLevel(): number {
  if (Platform.OS !== 'android' || typeof Platform.Version !== 'number') {
    return UNKNOWN_API_LEVEL
  }
  return Platform.Version
}

function isNativeAccess(value: unknown): value is Exclude<ExactAlarmAccess, 'unknown'> {
  return value === 'not-required' || value === 'granted' || value === 'denied'
}

function unknownSnapshot(
  apiLevelValue: number,
  message: string,
  cause: unknown,
): ExactAlarmSnapshot {
  logger.error(message, cause, { operation: READ_OPERATION })
  return { apiLevel: apiLevelValue, access: UNKNOWN_ACCESS }
}

export function readExactAlarmSnapshot(): ExactAlarmSnapshot {
  const apiLevelValue = apiLevel()

  try {
    const nativeModule = requireOptionalNativeModule<NabdDeviceModule>(NATIVE_MODULE_NAME)
    if (!nativeModule) {
      return unknownSnapshot(apiLevelValue, 'Native exact-alarm module is unavailable', null)
    }

    const access = nativeModule.getExactAlarmStatus()
    if (!isNativeAccess(access)) {
      return unknownSnapshot(apiLevelValue, 'Native exact-alarm status is invalid', access)
    }

    return { apiLevel: apiLevelValue, access }
  } catch (cause) {
    return unknownSnapshot(apiLevelValue, 'Native exact-alarm read failed', cause)
  }
}
