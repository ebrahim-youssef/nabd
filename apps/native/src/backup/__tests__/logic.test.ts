import { CURRENT_SCHEMA_VERSION } from '../../db/database'
import { WIRD_LEVELS } from '@nabd/shared'
import {
  BACKUP_TABLES,
  BACKUP_FORMAT_VERSION,
  BACKUP_MAX_BYTES,
  conflictTableFrom,
  parseBackup,
  planRestore,
  serializeBackup,
  type BackupEnvelope,
  type BackupRows,
} from '../logic'

const rows: BackupRows = {
  onboarding_state: [
    {
      id: 1,
      answers_json: JSON.stringify({ prayers: 'always', quran: 'hizb', adhkar: 'daily' }),
      selected_level_id: 'level-1',
      completed_at: 1_700_000_000_000,
      effective_from: '2026-10-18',
      wird_version_id: 'version-1',
    },
  ],
  wird_versions: [
    {
      id: 'version-1',
      effective_from: '2026-10-18',
      definition_json: JSON.stringify(WIRD_LEVELS[0].wird),
      created_at: 1_700_000_000_000,
    },
  ],
  wird_entries: [
    {
      id: 'entry-1',
      day: '2026-10-18',
      version_id: 'version-1',
      item_id: 'item-1',
      done: 1,
      at: 1_700_000_000_000,
    },
  ],
  qada_events: [{ id: 'qada-1', prayer_id: 'fajr', delta: 1, at: 1_700_000_000_000 }],
  adhkar_flow_progress: [
    { category_id: 'morning', day: '2026-10-18', index: 2, count: 3, finished: 0 },
  ],
  app_preferences: [{ key: 'nabd:theme', value: 'light', updated_at: 1_700_000_000_000 }],
}

const emptyRows: BackupRows = {
  onboarding_state: [],
  wird_versions: [],
  wird_entries: [],
  qada_events: [],
  adhkar_flow_progress: [],
  app_preferences: [],
}

function validBackup(): BackupEnvelope {
  const parsed = parseBackup(serializeBackup(rows, '2026-10-18T10:00:00.000Z'))
  if (!parsed.ok) throw new Error(parsed.error)
  return parsed.value
}

function serializedBackup(change: (value: Record<string, unknown>) => void): string {
  const value = JSON.parse(serializeBackup(rows, '2026-10-18T10:00:00.000Z')) as Record<
    string,
    unknown
  >
  change(value)
  return JSON.stringify(value)
}

describe('backup logic', () => {
  it('centralizes backup tables and conflict parsing', () => {
    expect(BACKUP_TABLES).toEqual([
      'onboarding_state',
      'wird_versions',
      'wird_entries',
      'qada_events',
      'adhkar_flow_progress',
      'app_preferences',
    ])
    expect(conflictTableFrom('restore_conflict:wird_versions:version-1')).toBe('wird_versions')
    expect(conflictTableFrom('invalid_error')).toBeUndefined()
  })

  it('round trips the versioned SQLite envelope', () => {
    const exportedAt = '2026-10-18T10:00:00.000Z'

    const text = serializeBackup(rows, exportedAt)
    const parsed = parseBackup(text)

    expect(parsed).toEqual({
      ok: true,
      value: {
        formatVersion: BACKUP_FORMAT_VERSION,
        schemaVersion: CURRENT_SCHEMA_VERSION,
        exportedAt,
        data: rows,
      },
    })
  })

  it('reports malformed JSON', () => {
    expect(parseBackup('{')).toEqual({ ok: false, error: 'malformed_json' })
  })

  it('rejects a JSON value that is not an object', () => {
    expect(parseBackup('null')).toEqual({ ok: false, error: 'not_an_object' })
  })

  it('reports the missing table', () => {
    const text = serializedBackup((value) => {
      delete (value.data as Record<string, unknown>).qada_events
    })

    expect(parseBackup(text)).toEqual({ ok: false, error: 'missing_table:qada_events' })
  })

  it('rejects a row with the wrong column type', () => {
    const text = serializedBackup((value) => {
      const entries = (value.data as Record<string, unknown>).wird_entries as Record<
        string,
        unknown
      >[]
      entries[0].done = true
    })

    expect(parseBackup(text)).toEqual({ ok: false, error: 'invalid_row:wird_entries' })
  })

  it.each([
    ['an empty definition', '{}'],
    ['items that are not an array', JSON.stringify({ areas: [], items: {} })],
  ])('rejects %s', (_description, definitionJson) => {
    const text = serializedBackup((value) => {
      const versions = (value.data as Record<string, unknown>).wird_versions as Record<
        string,
        unknown
      >[]
      versions[0].definition_json = definitionJson
    })

    expect(parseBackup(text)).toEqual({ ok: false, error: 'invalid_row:wird_versions' })
  })

  it('rejects a definition with an item missing its id', () => {
    const text = serializedBackup((value) => {
      const versions = (value.data as Record<string, unknown>).wird_versions as Record<
        string,
        unknown
      >[]
      const definition = JSON.parse(String(versions[0].definition_json)) as {
        items: Record<string, unknown>[]
      }
      delete definition.items[0].id
      versions[0].definition_json = JSON.stringify(definition)
    })

    expect(parseBackup(text)).toEqual({ ok: false, error: 'invalid_row:wird_versions' })
  })

  it('rejects a definition with two items that share an id', () => {
    const text = serializedBackup((value) => {
      const versions = (value.data as Record<string, unknown>).wird_versions as Record<
        string,
        unknown
      >[]
      const definition = JSON.parse(String(versions[0].definition_json)) as {
        items: Record<string, unknown>[]
      }
      definition.items[1].id = definition.items[0].id
      versions[0].definition_json = JSON.stringify(definition)
    })

    expect(parseBackup(text)).toEqual({ ok: false, error: 'invalid_row:wird_versions' })
  })

  it.each(['{', '{}', JSON.stringify({ prayers: 'always', quran: 'hizb', unknown: 'daily' })])(
    'rejects malformed answers JSON %s',
    (answersJson) => {
      const text = serializedBackup((value) => {
        const onboarding = (value.data as Record<string, unknown>).onboarding_state as Record<
          string,
          unknown
        >[]
        onboarding[0].answers_json = answersJson
      })

      expect(parseBackup(text)).toEqual({ ok: false, error: 'invalid_row:onboarding_state' })
    },
  )

  it('rejects text over the raw byte cap before parsing it', () => {
    expect(parseBackup('x'.repeat(BACKUP_MAX_BYTES + 1))).toEqual({
      ok: false,
      error: 'oversized_text',
    })
  })

  it('rejects a future schema version', () => {
    const text = serializedBackup((value) => {
      value.schemaVersion = CURRENT_SCHEMA_VERSION + 1
    })

    expect(parseBackup(text)).toEqual({ ok: false, error: 'future_schema_version' })
  })

  it('rejects an older schema version', () => {
    const text = serializedBackup((value) => {
      value.schemaVersion = CURRENT_SCHEMA_VERSION - 1
    })

    expect(parseBackup(text)).toEqual({ ok: false, error: 'older_schema_version' })
  })

  it('rejects an unknown format version', () => {
    const text = serializedBackup((value) => {
      value.formatVersion = BACKUP_FORMAT_VERSION + 1
    })

    expect(parseBackup(text)).toEqual({ ok: false, error: 'unknown_format_version' })
  })

  it('rejects duplicate primary keys inside a table', () => {
    const text = serializedBackup((value) => {
      const versions = (value.data as Record<string, unknown>).wird_versions as unknown[]
      versions.push(versions[0])
    })

    expect(parseBackup(text)).toEqual({ ok: false, error: 'duplicate_primary_key:wird_versions' })
  })

  it('rejects a dangling wird version reference', () => {
    const text = serializedBackup((value) => {
      const entries = (value.data as Record<string, unknown>).wird_entries as Record<
        string,
        unknown
      >[]
      entries[0].version_id = 'missing-version'
    })

    expect(parseBackup(text)).toEqual({ ok: false, error: 'dangling_wird_version_reference' })
  })

  it('rejects prototype-pollution keys', () => {
    const text = serializedBackup((value) => {
      const data = value.data as Record<string, unknown>
      const preference = (data.app_preferences as Record<string, unknown>[])[0]
      Object.defineProperty(preference, '__proto__', {
        enumerable: true,
        value: 'blocked',
      })
    })

    expect(parseBackup(text)).toEqual({ ok: false, error: 'prototype_pollution_key' })
  })

  it('plans every row for a fresh device', () => {
    const planned = planRestore(validBackup(), emptyRows)

    expect(planned).toEqual({
      ok: true,
      value: {
        inserts: rows,
        counts: {
          onboarding_state: 1,
          wird_versions: 1,
          wird_entries: 1,
          qada_events: 1,
          adhkar_flow_progress: 1,
          app_preferences: 1,
        },
      },
    })
  })

  it('skips identical rows and leaves device-owned mutable keys alone', () => {
    const deviceRows: BackupRows = {
      ...rows,
      onboarding_state: [{ ...rows.onboarding_state[0], selected_level_id: 'level-2' }],
      app_preferences: [{ ...rows.app_preferences[0], value: 'dark' }],
      adhkar_flow_progress: [{ ...rows.adhkar_flow_progress[0], index: 1 }],
    }

    const planned = planRestore(validBackup(), deviceRows)

    expect(planned).toEqual({
      ok: true,
      value: {
        inserts: emptyRows,
        counts: {
          onboarding_state: 0,
          wird_versions: 0,
          wird_entries: 0,
          qada_events: 0,
          adhkar_flow_progress: 0,
          app_preferences: 0,
        },
      },
    })
  })

  it('refuses a conflicting append-only row', () => {
    const deviceRows: BackupRows = {
      ...emptyRows,
      wird_versions: [
        { ...rows.wird_versions[0], created_at: rows.wird_versions[0].created_at + 1 },
      ],
    }

    expect(planRestore(validBackup(), deviceRows)).toEqual({
      ok: false,
      error: 'restore_conflict:wird_versions:version-1',
    })
  })
})
