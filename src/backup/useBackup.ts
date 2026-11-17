import { useSQLiteContext } from 'expo-sqlite'
import { useCallback, useMemo, useRef, useState } from 'react'

import { logger } from '../observability/logger'
import { createBackupRepository, type BackupRestoreResult, type RestoreFailure } from './db'
import { conflictTableFrom, parseBackup, planRestore, serializeBackup } from './logic'
import { pickBackupText, writeBackupFile, type BackupTransportError } from './transport'
import type { BackupEnvelope, BackupTable, RestoreCounts } from './types'

export type BackupPreview = {
  backup: BackupEnvelope
  counts: RestoreCounts
}

export type BackupImportError =
  | { kind: 'transport'; error: Extract<BackupTransportError, 'oversized_file' | 'read_failed'> }
  | { kind: 'parse'; reason: string }
  | { kind: 'conflict'; table: BackupTable }
  | { kind: 'snapshot_failed' }

export type BackupStatus =
  | { kind: 'exported' }
  | {
      kind: 'export_failed'
      error: Extract<BackupTransportError, 'share_failed' | 'write_failed'> | 'snapshot_failed'
    }
  | { kind: 'import_failed'; error: BackupImportError }
  | { kind: 'restored'; counts: RestoreCounts }
  | { kind: 'restore_failed'; error: RestoreFailure | 'unknown' }

export type BackupPreviewResult =
  { ok: true; value: BackupPreview } | { ok: false; error: BackupImportError }

function importFailure(error: BackupImportError): BackupPreviewResult {
  return { ok: false, error }
}

export function useBackup() {
  const database = useSQLiteContext()
  const repository = useMemo(() => createBackupRepository(database), [database])
  const [preview, setPreview] = useState<BackupPreview | null>(null)
  const [status, setStatus] = useState<BackupStatus | null>(null)
  const [isBusy, setIsBusy] = useState(false)
  const inFlight = useRef(false)

  const exportBackup = useCallback(async () => {
    if (inFlight.current) return null

    inFlight.current = true
    setIsBusy(true)
    try {
      let snapshot
      try {
        snapshot = await repository.readSnapshot()
      } catch (cause: unknown) {
        logger.error('Native backup snapshot export failed', cause)
        setStatus({ kind: 'export_failed', error: 'snapshot_failed' })
        return { ok: false as const, error: 'snapshot_failed' as const }
      }

      const exportedAtIso = new Date().toISOString()
      const result = await writeBackupFile(serializeBackup(snapshot, exportedAtIso), exportedAtIso)
      if (!result.ok) {
        const error = result.error === 'share_failed' ? 'share_failed' : 'write_failed'
        setStatus({ kind: 'export_failed', error })
        return result
      }
      setStatus({ kind: 'exported' })
      return result
    } finally {
      inFlight.current = false
      setIsBusy(false)
    }
  }, [repository])

  const chooseFile = useCallback(async (): Promise<BackupPreviewResult | null> => {
    if (inFlight.current) return null

    inFlight.current = true
    setIsBusy(true)
    setStatus(null)
    setPreview(null)
    try {
      const picked = await pickBackupText()
      if (picked === null) return null
      if (!picked.ok) {
        const error: BackupImportError = {
          kind: 'transport',
          error: picked.error === 'oversized_file' ? 'oversized_file' : 'read_failed',
        }
        setStatus({ kind: 'import_failed', error })
        return importFailure(error)
      }

      const parsed = parseBackup(picked.value)
      if (!parsed.ok) {
        logger.error('Native backup file validation failed', parsed.error)
        const error: BackupImportError = { kind: 'parse', reason: parsed.error }
        setStatus({ kind: 'import_failed', error })
        return importFailure(error)
      }

      let deviceRows
      try {
        deviceRows = await repository.readSnapshot()
      } catch (cause: unknown) {
        logger.error('Native backup restore preview snapshot failed', cause)
        const error: BackupImportError = { kind: 'snapshot_failed' }
        setStatus({ kind: 'import_failed', error })
        return importFailure(error)
      }

      const planned = planRestore(parsed.value, deviceRows)
      if (!planned.ok) {
        const table = conflictTableFrom(planned.error)
        const error: BackupImportError = table
          ? { kind: 'conflict', table }
          : { kind: 'snapshot_failed' }
        logger.error('Native backup restore preview failed', planned.error)
        setStatus({ kind: 'import_failed', error })
        return importFailure(error)
      }

      const nextPreview = { backup: parsed.value, counts: planned.value.counts }
      setPreview(nextPreview)
      return { ok: true, value: nextPreview }
    } finally {
      inFlight.current = false
      setIsBusy(false)
    }
  }, [repository])

  const confirmRestore = useCallback(async (): Promise<BackupRestoreResult | null> => {
    if (inFlight.current || !preview) return null

    inFlight.current = true
    setIsBusy(true)
    try {
      let result: BackupRestoreResult
      try {
        result = await repository.restore(preview.backup)
      } catch (cause: unknown) {
        logger.error('Native backup restore action failed', cause)
        setStatus({ kind: 'restore_failed', error: 'unknown' })
        return { ok: false, error: { reason: 'write_failed' } }
      }

      if (!result.ok) {
        setStatus({ kind: 'restore_failed', error: result.error })
        return result
      }
      setPreview(null)
      setStatus({ kind: 'restored', counts: result.value })
      return result
    } finally {
      inFlight.current = false
      setIsBusy(false)
    }
  }, [preview, repository])

  const cancelRestore = useCallback(() => {
    if (inFlight.current) return
    setPreview(null)
    setStatus(null)
  }, [])

  return { cancelRestore, chooseFile, confirmRestore, exportBackup, isBusy, preview, status }
}
