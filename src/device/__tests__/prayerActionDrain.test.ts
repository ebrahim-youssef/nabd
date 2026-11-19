import type { SetItemStateInput } from '../../db/contracts'
import { logger } from '../../observability/logger'
import type { SetItemStateOutcome } from '../../db/contracts'
import type { PrayerActionQueueEntry, PrayerActionQueueRead } from '../prayerActions'
import { drainPrayerActions, getLastPrayerActionDrainFailed } from '../prayerActionDrain'
import * as widgetSnapshotWriter from '../widgetSnapshotWriter'

const firstEntry: PrayerActionQueueEntry = {
  actionId: 'prayer:2026-11-19:fajr:v1',
  itemId: 'fajr',
  day: '2026-11-19',
  versionId: 'v1',
  at: 1_800_000_000_000,
  done: true,
}
const secondEntry: PrayerActionQueueEntry = {
  ...firstEntry,
  actionId: 'prayer:2026-11-19:isha:v1',
  itemId: 'isha',
  at: firstEntry.at + 1,
}

function writeResult(outcome: SetItemStateOutcome) {
  return { ok: true as const, value: { outcome, entry: null } }
}

function createDependencies(entries: PrayerActionQueueEntry[] = []) {
  let queuedEntries = [...entries]
  const acknowledge = jest.fn((ids: string[]) => {
    queuedEntries = queuedEntries.filter((entry) => !ids.includes(entry.actionId))
    return true
  })
  const read = jest.fn((): PrayerActionQueueRead => ({
    valid: [...queuedEntries],
    malformedIds: [],
  }))
  const repository = {
    setItemState: jest.fn(async (_input: SetItemStateInput) => writeResult('applied')),
  }
  const refreshViews = jest.fn()

  return {
    deps: { queue: { read, acknowledge }, repository, refreshViews },
    acknowledge,
    read,
    repository,
    refreshViews,
    queuedEntries: () => queuedEntries,
  }
}

describe('drainPrayerActions', () => {
  beforeEach(() => jest.clearAllMocks())

  it('applies a queued prayer and acknowledges it after the repository write', async () => {
    const state = createDependencies([firstEntry])
    const snapshotWrite = jest.spyOn(widgetSnapshotWriter, 'requestWidgetSnapshotWrite')

    await expect(drainPrayerActions(state.deps)).resolves.toEqual({
      applied: 1,
      unchanged: 0,
      duplicate: 0,
      stale: 0,
      failed: 0,
    })

    expect(state.repository.setItemState).toHaveBeenCalledWith({
      ...firstEntry,
      done: true,
    })
    expect(state.acknowledge).toHaveBeenCalledWith([firstEntry.actionId])
    expect(state.repository.setItemState.mock.invocationCallOrder[0]).toBeLessThan(
      state.acknowledge.mock.invocationCallOrder[0],
    )
    expect(state.refreshViews).toHaveBeenCalledTimes(1)
    expect(state.queuedEntries()).toEqual([])
    expect(snapshotWrite).toHaveBeenCalledTimes(1)
    snapshotWrite.mockRestore()
  })

  it('applies the queued absolute desired state when it is false', async () => {
    const undoneEntry = { ...firstEntry, actionId: 'widget:undo', done: false }
    const state = createDependencies([undoneEntry])

    await drainPrayerActions(state.deps)

    expect(state.repository.setItemState).toHaveBeenCalledWith(undoneEntry)
  })

  it('acknowledges a duplicate action on a later drain', async () => {
    const state = createDependencies([firstEntry])
    state.acknowledge.mockImplementation(() => true)
    state.repository.setItemState
      .mockResolvedValueOnce(writeResult('applied'))
      .mockResolvedValueOnce(writeResult('duplicate'))

    await drainPrayerActions(state.deps)
    await expect(drainPrayerActions(state.deps)).resolves.toMatchObject({ duplicate: 1 })

    expect(state.repository.setItemState).toHaveBeenCalledTimes(2)
    expect(state.acknowledge).toHaveBeenLastCalledWith([firstEntry.actionId])
  })

  it.each(['stale', 'unchanged'] as const)('acknowledges the final %s outcome', async (outcome) => {
    const state = createDependencies([firstEntry])
    state.repository.setItemState.mockResolvedValue(writeResult(outcome))

    await expect(drainPrayerActions(state.deps)).resolves.toMatchObject({ [outcome]: 1 })

    expect(state.acknowledge).toHaveBeenCalledWith([firstEntry.actionId])
    expect(state.refreshViews).toHaveBeenCalledTimes(1)
  })

  it('acknowledges malformed ids and does not write them', async () => {
    const state = createDependencies([firstEntry])
    state.deps.queue.read.mockReturnValue({
      valid: [firstEntry],
      malformedIds: ['bad-action'],
    })

    await drainPrayerActions(state.deps)

    expect(logger.error).toHaveBeenCalledWith(
      'Discarding malformed pending prayer action bad-action',
      expect.any(Error),
      { operation: 'drain-prayer-actions' },
    )
    expect(state.repository.setItemState).toHaveBeenCalledTimes(1)
    expect(state.acknowledge).toHaveBeenNthCalledWith(1, ['bad-action'])
    expect(state.acknowledge).toHaveBeenNthCalledWith(2, [firstEntry.actionId])
  })

  it('keeps a failed action and later entries for a subsequent drain', async () => {
    const state = createDependencies([firstEntry, secondEntry])
    state.repository.setItemState.mockRejectedValueOnce(new Error('write failed'))

    await expect(drainPrayerActions(state.deps)).resolves.toMatchObject({ failed: 1 })
    expect(getLastPrayerActionDrainFailed()).toBe(true)
    expect(state.acknowledge).not.toHaveBeenCalled()
    expect(state.queuedEntries()).toEqual([firstEntry, secondEntry])
    expect(logger.error).toHaveBeenCalledWith(
      `Pending prayer action write failed for ${firstEntry.actionId} on ${firstEntry.day}`,
      expect.any(Error),
      { operation: 'drain-prayer-actions', actionId: firstEntry.actionId, day: firstEntry.day },
    )

    await expect(drainPrayerActions(state.deps)).resolves.toMatchObject({
      applied: 2,
      failed: 0,
    })
    expect(getLastPrayerActionDrainFailed()).toBe(false)
    expect(state.repository.setItemState.mock.calls.map(([input]) => input.actionId)).toEqual([
      firstEntry.actionId,
      firstEntry.actionId,
      secondEntry.actionId,
    ])
    expect(state.queuedEntries()).toEqual([])
  })

  it('queues concurrent drain requests and runs one follow-up after new entries arrive', async () => {
    const state = createDependencies([firstEntry])
    let releaseFirstWrite!: () => void
    let signalFirstWriteStarted!: () => void
    const firstWriteStarted = new Promise<void>((resolve) => {
      signalFirstWriteStarted = resolve
    })
    let inFlightWrites = 0
    let maximumInFlightWrites = 0
    state.repository.setItemState.mockImplementation(async () => {
      inFlightWrites += 1
      maximumInFlightWrites = Math.max(maximumInFlightWrites, inFlightWrites)
      if (state.repository.setItemState.mock.calls.length === 1) {
        signalFirstWriteStarted()
        await new Promise<void>((resolve) => {
          releaseFirstWrite = resolve
        })
      }
      inFlightWrites -= 1
      return writeResult('applied')
    })

    const firstDrain = drainPrayerActions(state.deps)
    await firstWriteStarted
    state.queuedEntries().push(secondEntry)
    const queuedDrain = drainPrayerActions(state.deps)
    releaseFirstWrite()

    await expect(firstDrain).resolves.toMatchObject({ applied: 2 })
    await expect(queuedDrain).resolves.toMatchObject({ applied: 2 })
    expect(maximumInFlightWrites).toBe(1)
    expect(state.repository.setItemState.mock.calls.map(([input]) => input.actionId)).toEqual([
      firstEntry.actionId,
      secondEntry.actionId,
    ])
  })

  it('does not refresh live repository queries when the queue is empty', async () => {
    const state = createDependencies()

    await drainPrayerActions(state.deps)

    expect(state.refreshViews).not.toHaveBeenCalled()
  })
})
