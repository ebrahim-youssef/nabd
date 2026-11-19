import { requireOptionalNativeModule } from 'expo'

import { isDayId } from '../lib/day'
import { logger } from '../observability/logger'
import type { DayId } from '../wird/types'

const NATIVE_MODULE_NAME = 'NabdDevice'
const PRAYER_ACTION_QUEUED_EVENT = 'onPrayerActionQueued'
const PRAYER_ITEM_IDS = new Set(['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'])

export type PrayerActionQueueEntry = {
  actionId: string
  itemId: string
  day: DayId
  versionId: string
  at: number
}

export type PrayerActionQueueRead = {
  valid: PrayerActionQueueEntry[]
  malformedIds: string[]
}

type NativePrayerActionsModule = {
  readPendingPrayerActions?: () => unknown
  acknowledgePendingPrayerActions?: (ids: string[]) => unknown
  addListener?: (eventName: string, listener: () => void) => { remove: () => void } | undefined
}

export function readPendingPrayerActions(): PrayerActionQueueRead {
  try {
    const native = requireOptionalNativeModule<NativePrayerActionsModule>(NATIVE_MODULE_NAME)
    if (!native?.readPendingPrayerActions) return { valid: [], malformedIds: [] }
    const encoded = native.readPendingPrayerActions()
    if (typeof encoded !== 'string') {
      logger.error('Native pending prayer action queue was not a JSON string', encoded, {
        operation: 'read-pending-prayer-actions',
      })
      return { valid: [], malformedIds: [] }
    }
    return parsePrayerActionQueue(encoded)
  } catch (cause: unknown) {
    logger.error('Native pending prayer action read failed', cause, {
      operation: 'read-pending-prayer-actions',
    })
    return { valid: [], malformedIds: [] }
  }
}

export function acknowledgePendingPrayerActions(ids: string[]): boolean {
  try {
    const native = requireOptionalNativeModule<NativePrayerActionsModule>(NATIVE_MODULE_NAME)
    if (!native?.acknowledgePendingPrayerActions) return true
    const result = native.acknowledgePendingPrayerActions(ids)
    if (typeof result === 'boolean') return result
    logger.error(
      'Native pending prayer action acknowledgement returned a non-boolean result',
      result,
      { operation: 'acknowledge-pending-prayer-actions' },
    )
    return false
  } catch (cause: unknown) {
    logger.error('Native pending prayer action acknowledgement failed', cause, {
      operation: 'acknowledge-pending-prayer-actions',
    })
    return false
  }
}

export function subscribePrayerActionQueued(listener: () => void): () => void {
  try {
    const native = requireOptionalNativeModule<NativePrayerActionsModule>(NATIVE_MODULE_NAME)
    if (!native?.addListener) return () => undefined
    const subscription = native.addListener(PRAYER_ACTION_QUEUED_EVENT, listener)
    if (!subscription) return () => undefined
    return () => {
      try {
        subscription.remove()
      } catch (cause: unknown) {
        logger.warn('Native prayer action event cleanup failed', {
          operation: 'unsubscribe-prayer-action-queued',
          error: cause,
        })
      }
    }
  } catch (cause: unknown) {
    logger.error('Native prayer action event subscription failed', cause, {
      operation: 'subscribe-prayer-action-queued',
    })
    return () => undefined
  }
}

function parsePrayerActionQueue(encoded: string): PrayerActionQueueRead {
  let parsed: unknown
  try {
    parsed = JSON.parse(encoded) as unknown
  } catch (cause: unknown) {
    logger.error('Native pending prayer action queue contains invalid JSON', cause, {
      operation: 'read-pending-prayer-actions',
    })
    return { valid: [], malformedIds: [] }
  }
  if (!Array.isArray(parsed)) {
    logger.error(
      'Native pending prayer action queue is not an array',
      new Error('Expected a JSON array'),
      { operation: 'read-pending-prayer-actions' },
    )
    return { valid: [], malformedIds: [] }
  }

  const valid: PrayerActionQueueEntry[] = []
  const malformedIds: string[] = []
  for (const candidate of parsed) {
    const action = parsePrayerActionEntry(candidate)
    if (action) {
      valid.push(action)
      continue
    }
    const actionId = isRecord(candidate) ? nonEmptyString(candidate.actionId) : null
    if (actionId) malformedIds.push(actionId)
    else {
      logger.warn('Native pending prayer action entry has no usable action id', {
        operation: 'read-pending-prayer-actions',
      })
    }
  }
  return { valid, malformedIds: [...new Set(malformedIds)] }
}

function parsePrayerActionEntry(value: unknown): PrayerActionQueueEntry | null {
  if (!isRecord(value)) return null
  const actionId = nonEmptyString(value.actionId)
  const itemId = nonEmptyString(value.itemId)
  const day = nonEmptyString(value.day)
  const versionId = nonEmptyString(value.versionId)
  if (
    !actionId ||
    !itemId ||
    !PRAYER_ITEM_IDS.has(itemId) ||
    !day ||
    !isDayId(day) ||
    !versionId ||
    typeof value.at !== 'number' ||
    !Number.isFinite(value.at)
  )
    return null
  return { actionId, itemId, day, versionId, at: value.at }
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
