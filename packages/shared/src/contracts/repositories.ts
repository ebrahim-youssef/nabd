import type { FlowState } from '../logic/adhkar'
import type { QadaPrayerId } from '../logic/qada'
import type { Result } from '../types/result'
import type { DayId, WirdDefinition, WirdEntry, WirdVersion } from '../types/wird'

// Contracts describe product persistence without choosing Dexie, SQLite, ids, clocks, or sync.
// Each platform owns those details and passes explicit day/time values into its adapter.

export type WirdRepository = {
  listVersions(): Promise<WirdVersion[]>
  getDayEntries(day: DayId): Promise<WirdEntry[]>
  getMonthEntries(month: string): Promise<WirdEntry[]>
  getEntriesInRange(fromDay: DayId, toDay: DayId): Promise<WirdEntry[]>
  getAllEntries(): Promise<WirdEntry[]>
  addVersion(
    effectiveFrom: DayId,
    definition: WirdDefinition,
    createdAt: number,
  ): Promise<Result<WirdVersion>>
  appendEntry(
    day: DayId,
    versionId: string,
    itemId: string,
    done: boolean,
    at: number,
  ): Promise<Result<WirdEntry>>
}

export type OnboardingRepository = {
  countWirdVersions(): Promise<number>
  seedWirdFromLevel(
    definition: WirdDefinition,
    effectiveFrom: DayId,
    createdAt: number,
  ): Promise<Result<WirdVersion | null>>
}

export type DhikrCompletionRepository = {
  completeDhikr(
    day: DayId,
    versionId: string,
    itemId: string,
    at: number,
  ): Promise<Result<WirdEntry>>
  completeLinkedWirdItem(day: DayId, itemId: string, at: number): Promise<Result<WirdEntry | null>>
  isWirdItemDoneToday(day: DayId, itemId: string): Promise<boolean>
}

export type AdhkarFlowProgress = FlowState & {
  categoryId: string
  day: DayId
}

export type AdhkarProgressRepository = {
  readFlowProgress(categoryId: string): Promise<AdhkarFlowProgress | undefined>
  writeFlowProgress(categoryId: string, day: DayId, state: FlowState): Promise<void>
  clearFlowProgress(categoryId: string): Promise<void>
}

export type QadaEvent = {
  id: string
  prayerId: QadaPrayerId
  delta: number
  at: number
}

export type QadaRepository = {
  listQadaEvents(): Promise<QadaEvent[]>
  addQadaDebt(days: number, at: number): Promise<Result<null>>
  payQadaPrayer(prayerId: QadaPrayerId, at: number): Promise<Result<null>>
}
