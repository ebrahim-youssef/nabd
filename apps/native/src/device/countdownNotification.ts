import { requireOptionalNativeModule } from 'expo'
import { Platform } from 'react-native'

import type { CalculationMethodId, Coords } from '@nabd/shared'

import { logger } from '../observability/logger'
import { boundaries } from './countdown'

const NATIVE_MODULE_NAME = 'NabdDevice'
const SET_OPERATION = 'set-countdown-notification'
const CLEAR_OPERATION = 'clear-countdown-notification'
const STATUS_OPERATION = 'get-countdown-notification-status'

export type CountdownNotificationResult =
  'posted' | 'permission-denied' | 'channel-blocked' | 'invalid' | 'unsupported' | 'error'

type NativeCountdownModule = {
  setCountdown: (payloadJson: string) => unknown
  clearCountdown: () => unknown
  getCountdownStatus: () => unknown
}

const NATIVE_RESULTS = new Set<CountdownNotificationResult>([
  'posted',
  'permission-denied',
  'channel-blocked',
  'invalid',
])

function isAndroid(): boolean {
  return Platform.OS === 'android'
}

function nativeModule(): NativeCountdownModule | null {
  return requireOptionalNativeModule<NativeCountdownModule>(NATIVE_MODULE_NAME)
}

function nativeResult(value: unknown): CountdownNotificationResult {
  return typeof value === 'string' && NATIVE_RESULTS.has(value as CountdownNotificationResult)
    ? (value as CountdownNotificationResult)
    : 'error'
}

export function setCountdownNotification(
  now: number,
  coordinates: Coords,
  city: string | null,
  method?: CalculationMethodId,
): CountdownNotificationResult {
  if (!isAndroid()) return 'unsupported'

  try {
    const native = nativeModule()
    if (!native) {
      logger.error('Native countdown notification module is unavailable', null, {
        operation: SET_OPERATION,
      })
      return 'error'
    }

    const payloadJson = JSON.stringify({ boundaries: boundaries(now, coordinates, method), city })
    const result = nativeResult(native.setCountdown(payloadJson))
    if (result === 'error') {
      logger.error('Native countdown notification returned an invalid result', null, {
        operation: SET_OPERATION,
      })
    }
    return result
  } catch (cause: unknown) {
    logger.error('Native countdown notification setup failed', cause, {
      operation: SET_OPERATION,
    })
    return 'error'
  }
}

export function clearCountdownNotification(): void {
  if (!isAndroid()) return

  try {
    const native = nativeModule()
    if (!native) {
      logger.error('Native countdown notification module is unavailable', null, {
        operation: CLEAR_OPERATION,
      })
      return
    }
    native.clearCountdown()
  } catch (cause: unknown) {
    logger.error('Native countdown notification clear failed', cause, {
      operation: CLEAR_OPERATION,
    })
  }
}

export function getCountdownNotificationStatus(): CountdownNotificationResult {
  if (!isAndroid()) return 'unsupported'

  try {
    const native = nativeModule()
    if (!native) {
      logger.error('Native countdown notification module is unavailable', null, {
        operation: STATUS_OPERATION,
      })
      return 'error'
    }
    const result = nativeResult(native.getCountdownStatus())
    if (result === 'error') {
      logger.error('Native countdown notification returned an invalid status', null, {
        operation: STATUS_OPERATION,
      })
    }
    return result
  } catch (cause: unknown) {
    logger.error('Native countdown notification status read failed', cause, {
      operation: STATUS_OPERATION,
    })
    return 'error'
  }
}
