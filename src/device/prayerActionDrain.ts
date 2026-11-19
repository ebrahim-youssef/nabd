import type { WirdRepository } from '../db/contracts'
import { logger } from '../observability/logger'
import type { PrayerActionQueueEntry, PrayerActionQueueRead } from './prayerActions'

export type PrayerActionDrainSummary = {
  applied: number
  unchanged: number
  duplicate: number
  stale: number
  failed: number
}

export type PrayerActionDrainDependencies = {
  queue: {
    read: () => PrayerActionQueueRead
    acknowledge: (ids: string[]) => boolean
  }
  repository: Pick<WirdRepository, 'setItemState'>
  refreshViews: () => void
}

const EMPTY_SUMMARY: PrayerActionDrainSummary = {
  applied: 0,
  unchanged: 0,
  duplicate: 0,
  stale: 0,
  failed: 0,
}
const DRAIN_OPERATION = 'drain-prayer-actions'

let activeDrain: Promise<PrayerActionDrainSummary> | null = null
let drainQueued = false
let queuedDependencies: PrayerActionDrainDependencies | null = null

export function drainPrayerActions(
  dependencies: PrayerActionDrainDependencies,
): Promise<PrayerActionDrainSummary> {
  if (activeDrain) {
    drainQueued = true
    queuedDependencies = dependencies
    return activeDrain
  }

  const operation = (async () => {
    let summary = { ...EMPTY_SUMMARY }
    let nextDependencies = dependencies
    do {
      drainQueued = false
      const currentDependencies = nextDependencies
      queuedDependencies = null
      summary = addSummaries(summary, await performDrain(currentDependencies))
      nextDependencies = queuedDependencies ?? currentDependencies
    } while (drainQueued)
    return summary
  })()
  let serializedOperation: Promise<PrayerActionDrainSummary>
  serializedOperation = operation.finally(() => {
    if (activeDrain === serializedOperation) activeDrain = null
  })
  activeDrain = serializedOperation
  return serializedOperation
}

async function performDrain(
  dependencies: PrayerActionDrainDependencies,
): Promise<PrayerActionDrainSummary> {
  const summary = { ...EMPTY_SUMMARY }
  const { valid, malformedIds } = dependencies.queue.read()
  if (malformedIds.length > 0) {
    for (const actionId of malformedIds) {
      logger.error(
        `Discarding malformed pending prayer action ${actionId}`,
        new Error('Pending action failed validation'),
        { operation: DRAIN_OPERATION },
      )
    }
    if (!acknowledge(dependencies, malformedIds)) {
      summary.failed += 1
      return summary
    }
  }

  for (const action of valid) {
    let result: Awaited<ReturnType<WirdRepository['setItemState']>>
    try {
      result = await dependencies.repository.setItemState({
        actionId: action.actionId,
        itemId: action.itemId,
        day: action.day,
        versionId: action.versionId,
        done: true,
        at: action.at,
      })
    } catch (cause: unknown) {
      logWriteFailure(action, cause)
      summary.failed += 1
      break
    }
    if (!result.ok) {
      logWriteFailure(action, new Error(`Wird repository returned ${result.error}`))
      summary.failed += 1
      break
    }

    summary[result.value.outcome] += 1
    if (!acknowledge(dependencies, [action.actionId])) {
      summary.failed += 1
      break
    }
  }

  if (summary.applied > 0 || summary.unchanged > 0 || summary.stale > 0) {
    dependencies.refreshViews()
  }
  return summary
}

function acknowledge(dependencies: PrayerActionDrainDependencies, actionIds: string[]): boolean {
  try {
    if (dependencies.queue.acknowledge(actionIds)) return true
  } catch (cause: unknown) {
    logger.error('Pending prayer action acknowledgement failed', cause, {
      operation: DRAIN_OPERATION,
      actionIds,
    })
    return false
  }
  logger.error(
    'Pending prayer action acknowledgement was not committed',
    new Error('Native acknowledgement returned false'),
    { operation: DRAIN_OPERATION, actionIds },
  )
  return false
}

function logWriteFailure(action: PrayerActionQueueEntry, cause: unknown): void {
  logger.error(
    `Pending prayer action write failed for ${action.actionId} on ${action.day}`,
    cause,
    { operation: DRAIN_OPERATION, actionId: action.actionId, day: action.day },
  )
}

function addSummaries(
  previous: PrayerActionDrainSummary,
  next: PrayerActionDrainSummary,
): PrayerActionDrainSummary {
  return {
    applied: previous.applied + next.applied,
    unchanged: previous.unchanged + next.unchanged,
    duplicate: previous.duplicate + next.duplicate,
    stale: previous.stale + next.stale,
    failed: previous.failed + next.failed,
  }
}
