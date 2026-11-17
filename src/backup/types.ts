export type OnboardingStateRow = {
  id: number
  answers_json: string
  selected_level_id: string
  completed_at: number
  effective_from: string
  wird_version_id: string
}

export type WirdVersionRow = {
  id: string
  effective_from: string
  definition_json: string
  created_at: number
}

export type WirdEntryRow = {
  id: string
  day: string
  version_id: string
  item_id: string
  done: number
  at: number
}

export type QadaEventRow = {
  id: string
  prayer_id: string
  delta: number
  at: number
}

export type AdhkarFlowProgressRow = {
  category_id: string
  day: string
  index: number
  count: number
  finished: number
}

export type AppPreferenceRow = {
  key: string
  value: string
  updated_at: number
}

export type BackupRows = {
  onboarding_state: OnboardingStateRow[]
  wird_versions: WirdVersionRow[]
  wird_entries: WirdEntryRow[]
  qada_events: QadaEventRow[]
  adhkar_flow_progress: AdhkarFlowProgressRow[]
  app_preferences: AppPreferenceRow[]
}

export type BackupEnvelope = {
  formatVersion: 1
  schemaVersion: number
  exportedAt: string
  data: BackupRows
}

export type BackupTable = keyof BackupRows

export type RestoreCounts = Record<BackupTable, number>

export type RestorePlan = {
  inserts: BackupRows
  counts: RestoreCounts
}
