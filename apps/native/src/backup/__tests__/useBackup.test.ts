import { act, renderHook, waitFor } from '@testing-library/react-native'
import { useSQLiteContext } from 'expo-sqlite'

import { createBackupRepository } from '../db'
import { serializeBackup, type BackupRows } from '../logic'
import { pickBackupText, writeBackupFile } from '../transport'
import { useBackup } from '../useBackup'

jest.mock('expo-sqlite', () => ({ useSQLiteContext: jest.fn() }))
jest.mock('../db', () => ({ createBackupRepository: jest.fn() }))
jest.mock('../transport', () => ({
  pickBackupText: jest.fn(),
  writeBackupFile: jest.fn(),
}))

const mockedUseSQLiteContext = useSQLiteContext as jest.MockedFunction<typeof useSQLiteContext>
const mockedCreateBackupRepository = createBackupRepository as jest.MockedFunction<
  typeof createBackupRepository
>
const mockedPickBackupText = pickBackupText as jest.MockedFunction<typeof pickBackupText>
const mockedWriteBackupFile = writeBackupFile as jest.MockedFunction<typeof writeBackupFile>

const emptyRows: BackupRows = {
  onboarding_state: [],
  wird_versions: [],
  wird_entries: [],
  qada_events: [],
  adhkar_flow_progress: [],
  app_preferences: [],
}

const backupRows: BackupRows = {
  ...emptyRows,
  app_preferences: [{ key: 'nabd:theme', value: 'dark', updated_at: 1_760_000_000_000 }],
}

const backupText = serializeBackup(backupRows, '2026-10-18T10:00:00.000Z')

describe('useBackup', () => {
  let repository: {
    readSnapshot: jest.Mock
    restore: jest.Mock
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockedUseSQLiteContext.mockReturnValue({} as ReturnType<typeof useSQLiteContext>)
    repository = {
      readSnapshot: jest.fn().mockResolvedValue(emptyRows),
      restore: jest.fn().mockResolvedValue({
        ok: true,
        value: {
          onboarding_state: 0,
          wird_versions: 0,
          wird_entries: 0,
          qada_events: 0,
          adhkar_flow_progress: 0,
          app_preferences: 1,
        },
      }),
    }
    mockedCreateBackupRepository.mockReturnValue(repository)
    mockedPickBackupText.mockResolvedValue({ ok: true, value: backupText })
    mockedWriteBackupFile.mockResolvedValue({ ok: true, value: undefined })
    jest.spyOn(Date.prototype, 'toISOString').mockReturnValue('2026-10-18T12:00:00.000Z')
  })

  afterEach(() => jest.restoreAllMocks())

  it('exports a fresh snapshot with the current ISO time', async () => {
    const { result } = renderHook(() => useBackup())

    await act(async () => result.current.exportBackup())

    expect(repository.readSnapshot).toHaveBeenCalledTimes(1)
    expect(mockedWriteBackupFile).toHaveBeenCalledWith(
      serializeBackup(emptyRows, '2026-10-18T12:00:00.000Z'),
      '2026-10-18T12:00:00.000Z',
    )
    expect(result.current.status).toEqual({ kind: 'exported' })
  })

  it('returns an export failure status when file transport fails', async () => {
    mockedWriteBackupFile.mockResolvedValue({ ok: false, error: 'share_failed' })
    const { result } = renderHook(() => useBackup())

    await act(async () => result.current.exportBackup())

    expect(result.current.status).toEqual({ kind: 'export_failed', error: 'share_failed' })
  })

  it('previews the rows that planRestore will add', async () => {
    const { result } = renderHook(() => useBackup())

    let previewResult
    await act(async () => {
      previewResult = await result.current.chooseFile()
    })

    expect(previewResult).toEqual({
      ok: true,
      value: {
        backup: expect.any(Object),
        counts: {
          onboarding_state: 0,
          wird_versions: 0,
          wird_entries: 0,
          qada_events: 0,
          adhkar_flow_progress: 0,
          app_preferences: 1,
        },
      },
    })
    expect(result.current.preview?.counts.app_preferences).toBe(1)
  })

  it('reports malformed files without opening a restore confirmation', async () => {
    mockedPickBackupText.mockResolvedValue({ ok: true, value: '{' })
    const { result } = renderHook(() => useBackup())

    await act(async () => result.current.chooseFile())

    expect(result.current.preview).toBeNull()
    expect(result.current.status).toEqual({
      kind: 'import_failed',
      error: { kind: 'parse', reason: 'malformed_json' },
    })
  })

  it('reports an existing append-only conflict during preview', async () => {
    const deviceRows: BackupRows = {
      ...emptyRows,
      wird_versions: [
        { id: 'version-1', effective_from: '2026-10-18', definition_json: '{}', created_at: 1 },
      ],
    }
    const conflictingRows: BackupRows = {
      ...emptyRows,
      wird_versions: [
        { id: 'version-1', effective_from: '2026-10-18', definition_json: '{}', created_at: 2 },
      ],
    }
    mockedPickBackupText.mockResolvedValue({
      ok: true,
      value: serializeBackup(conflictingRows, '2026-10-18T10:00:00.000Z'),
    })
    repository.readSnapshot.mockResolvedValue(deviceRows)
    const { result } = renderHook(() => useBackup())

    await act(async () => result.current.chooseFile())

    expect(result.current.status).toEqual({
      kind: 'import_failed',
      error: { kind: 'conflict', table: 'wird_versions' },
    })
    expect(result.current.preview).toBeNull()
  })

  it('confirms a preview with one repository restore', async () => {
    const { result } = renderHook(() => useBackup())
    await act(async () => result.current.chooseFile())

    await act(async () => result.current.confirmRestore())

    expect(repository.restore).toHaveBeenCalledTimes(1)
    expect(result.current.preview).toBeNull()
    expect(result.current.status).toEqual({
      kind: 'restored',
      counts: {
        onboarding_state: 0,
        wird_versions: 0,
        wird_entries: 0,
        qada_events: 0,
        adhkar_flow_progress: 0,
        app_preferences: 1,
      },
    })
  })

  it('ignores a second choose action while the first is in flight', async () => {
    let resolvePick: ((value: { ok: true; value: string }) => void) | undefined
    mockedPickBackupText.mockReturnValue(
      new Promise((resolve) => {
        resolvePick = resolve
      }),
    )
    const { result } = renderHook(() => useBackup())

    let first: unknown
    let second: unknown
    await act(async () => {
      const firstPromise = result.current.chooseFile()
      const secondPromise = result.current.chooseFile()
      first = await Promise.race([firstPromise, Promise.resolve('pending')])
      second = await secondPromise
    })
    expect(first).toBe('pending')
    expect(second).toBeNull()
    expect(mockedPickBackupText).toHaveBeenCalledTimes(1)

    await act(async () => {
      resolvePick?.({ ok: true, value: backupText })
    })
    await waitFor(() => expect(result.current.preview).not.toBeNull())
  })
})
