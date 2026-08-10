import {
  QUESTIONS,
  WIRD_LEVELS,
  isDayId,
  isComplete,
  levelById,
  type Answers,
  type LevelId,
  type WirdDefinition,
  type WirdVersion,
} from '@nabd/shared'

import { ONBOARDING_STATE_ID } from './constants'

type SqlValue = string | number | null

export type OnboardingDatabase = {
  getFirstAsync<T>(source: string, ...parameters: SqlValue[]): Promise<T | null>
  runAsync(source: string, ...parameters: SqlValue[]): Promise<unknown>
  withExclusiveTransactionAsync(
    task: (transaction: OnboardingDatabase) => Promise<void>,
  ): Promise<void>
}

type OnboardingRow = {
  answers_json: string
  selected_level_id: string
  completed_at: number
  effective_from: string
  wird_version_id: string
}

type WirdVersionRow = {
  id: string
  level_id: string
  effective_from: string
  definition_json: string
  created_at: number
}

export type PersistedOnboarding = {
  answers: Answers
  selectedLevelId: LevelId
  completedAt: number
  effectiveFrom: string
  activeWird: WirdVersion
}

export type CompleteOnboardingInput = {
  answers: Answers
  selectedLevelId: LevelId
  completedAt: number
  effectiveFrom: string
  versionId: string
}

const SELECT_ONBOARDING =
  'SELECT answers_json, selected_level_id, completed_at, effective_from, wird_version_id FROM onboarding_state WHERE id = ?'
const SELECT_WIRD_VERSION =
  'SELECT id, level_id, effective_from, definition_json, created_at FROM wird_versions WHERE id = ?'
const SELECT_ANY_WIRD_VERSION = 'SELECT id FROM wird_versions LIMIT 1'
const INSERT_ONBOARDING = `INSERT INTO onboarding_state
  (id, answers_json, selected_level_id, completed_at, effective_from, wird_version_id)
  VALUES (?, ?, ?, ?, ?, ?)`
const INSERT_WIRD = `INSERT INTO wird_versions
  (id, level_id, effective_from, definition_json, created_at)
  VALUES (?, ?, ?, ?, ?)`

function parseAnswers(source: string): Answers | null {
  try {
    const value: unknown = JSON.parse(source)
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null
    const answers = Object.entries(value).every(
      ([key, answer]) => typeof key === 'string' && typeof answer === 'string',
    )
      ? (value as Answers)
      : null
    return answers && hasCanonicalAnswers(answers) ? answers : null
  } catch {
    return null
  }
}

function hasCanonicalAnswers(answers: Answers): boolean {
  return Object.keys(answers).length === QUESTIONS.length && isComplete(QUESTIONS, answers)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0
}

function isWeekday(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 6
}

function isSchedule(value: unknown): boolean {
  if (value === undefined) return true
  if (!isRecord(value)) return false
  if (value.type === 'daily') return true
  if (value.type === 'monthly-goal') return isPositiveInteger(value.target)
  return value.type === 'weekdays' && Array.isArray(value.days) && value.days.every(isWeekday)
}

function parseDefinition(source: string): WirdDefinition | null {
  try {
    const value: unknown = JSON.parse(source)
    if (!isRecord(value) || !Array.isArray(value.areas) || !Array.isArray(value.items)) return null
    const validAreas = value.areas.every(
      (area) =>
        isRecord(area) &&
        typeof area.id === 'string' &&
        typeof area.label === 'string' &&
        typeof area.order === 'number' &&
        Number.isFinite(area.order),
    )
    const areaIds = new Set(
      value.areas.filter(isRecord).map((area) => (typeof area.id === 'string' ? area.id : '')),
    )
    const validItems = value.items.every((item) => {
      if (
        !isRecord(item) ||
        typeof item.id !== 'string' ||
        typeof item.areaId !== 'string' ||
        !areaIds.has(item.areaId) ||
        typeof item.label !== 'string' ||
        (item.kind !== 'checkbox' && item.kind !== 'counter') ||
        !isSchedule(item.schedule)
      ) {
        return false
      }
      if (item.kind === 'counter' && !isPositiveInteger(item.target)) return false
      if (item.target !== undefined && !isPositiveInteger(item.target)) return false
      if (item.optional !== undefined && typeof item.optional !== 'boolean') return false
      if (item.minimum !== undefined && typeof item.minimum !== 'string') return false
      return (
        item.targetDays === undefined ||
        (Array.isArray(item.targetDays) && item.targetDays.every(isWeekday))
      )
    })
    return validAreas && areaIds.size === value.areas.length && validItems
      ? (value as WirdDefinition)
      : null
  } catch {
    return null
  }
}

function parsePersisted(
  row: OnboardingRow | null,
  version: WirdVersionRow | null,
): PersistedOnboarding | null {
  if (!row || !version) return null
  const level = WIRD_LEVELS.find((candidate) => candidate.id === row.selected_level_id)
  if (
    !level ||
    version.id !== row.wird_version_id ||
    version.level_id !== level.id ||
    version.effective_from !== row.effective_from ||
    !isDayId(row.effective_from) ||
    !Number.isFinite(row.completed_at) ||
    !Number.isFinite(version.created_at)
  ) {
    return null
  }
  const answers = parseAnswers(row.answers_json)
  const definition = parseDefinition(version.definition_json)
  if (!answers || !definition) return null
  return {
    answers,
    selectedLevelId: row.selected_level_id as LevelId,
    completedAt: row.completed_at,
    effectiveFrom: row.effective_from,
    activeWird: {
      id: version.id,
      effectiveFrom: version.effective_from,
      definition,
      createdAt: version.created_at,
    },
  }
}

export function createOnboardingRepository(database: OnboardingDatabase) {
  async function loadFrom(source: OnboardingDatabase): Promise<PersistedOnboarding | null> {
    const row = await source.getFirstAsync<OnboardingRow>(SELECT_ONBOARDING, ONBOARDING_STATE_ID)
    if (!row) return null
    const version = await source.getFirstAsync<WirdVersionRow>(
      SELECT_WIRD_VERSION,
      row.wird_version_id,
    )
    return parsePersisted(row, version)
  }

  return {
    async load(): Promise<PersistedOnboarding | null> {
      return loadFrom(database)
    },

    async complete(input: CompleteOnboardingInput): Promise<PersistedOnboarding> {
      const level = levelById(WIRD_LEVELS, input.selectedLevelId)
      if (
        !level ||
        !hasCanonicalAnswers(input.answers) ||
        !isDayId(input.effectiveFrom) ||
        !Number.isFinite(input.completedAt) ||
        input.versionId.length === 0
      ) {
        throw new Error('Invalid native onboarding completion')
      }

      let persisted: PersistedOnboarding | null = null
      await database.withExclusiveTransactionAsync(async (transaction) => {
        persisted = await loadFrom(transaction)
        if (persisted) return

        const state = await transaction.getFirstAsync<OnboardingRow>(
          SELECT_ONBOARDING,
          ONBOARDING_STATE_ID,
        )
        const version =
          await transaction.getFirstAsync<Pick<WirdVersionRow, 'id'>>(SELECT_ANY_WIRD_VERSION)
        if (state || version) throw new Error('Native onboarding persistence is malformed')

        await transaction.runAsync(
          INSERT_WIRD,
          input.versionId,
          input.selectedLevelId,
          input.effectiveFrom,
          JSON.stringify(level.wird),
          input.completedAt,
        )
        await transaction.runAsync(
          INSERT_ONBOARDING,
          ONBOARDING_STATE_ID,
          JSON.stringify(input.answers),
          input.selectedLevelId,
          input.completedAt,
          input.effectiveFrom,
          input.versionId,
        )
      })
      if (persisted) return persisted
      const completed = await this.load()
      if (!completed) throw new Error('SQLite onboarding completion round trip failed')
      return completed
    },
  }
}
