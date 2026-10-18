import { getDocumentAsync } from 'expo-document-picker'
import { File, Paths } from 'expo-file-system'
import { shareAsync } from 'expo-sharing'

import { logger } from '../observability/logger'
import { BACKUP_MAX_BYTES } from './logic'

const BACKUP_MIME_TYPE = 'application/json'
const BACKUP_PICKER_MIME_TYPES = ['application/json', 'text/plain', 'application/octet-stream']
const BACKUP_FILE_PREFIX = 'nabd-backup-'
const BACKUP_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}/

export type BackupTransportError =
  'oversized_file' | 'read_failed' | 'write_failed' | 'share_failed'

export type BackupTransportResult<T> =
  { ok: true; value: T } | { ok: false; error: BackupTransportError }

function logTransportFailure(message: string, cause: unknown, context?: Record<string, unknown>) {
  logger.error(message, cause, context)
}

export async function writeBackupFile(
  text: string,
  exportedAtIso: string,
): Promise<BackupTransportResult<undefined>> {
  const date = BACKUP_DATE_PATTERN.exec(exportedAtIso)?.[0]
  if (!date) {
    logTransportFailure('Native backup export timestamp was invalid', undefined)
    return { ok: false, error: 'write_failed' }
  }
  const fileName = `${BACKUP_FILE_PREFIX}${date}.json`

  let file: File
  try {
    file = new File(Paths.cache, fileName)
    file.write(text)
  } catch (cause: unknown) {
    logTransportFailure('Native backup file write failed', cause, { fileName })
    return { ok: false, error: 'write_failed' }
  }

  try {
    await shareAsync(file.uri, { mimeType: BACKUP_MIME_TYPE })
    return { ok: true, value: undefined }
  } catch (cause: unknown) {
    logTransportFailure('Native backup file share failed', cause, { fileName })
    return { ok: false, error: 'share_failed' }
  }
}

export async function pickBackupText(): Promise<BackupTransportResult<string> | null> {
  try {
    const result = await getDocumentAsync({
      type: BACKUP_PICKER_MIME_TYPES,
      copyToCacheDirectory: true,
    })
    if (result.canceled) return null

    const asset = result.assets[0]
    if (!asset) {
      logTransportFailure('Native backup file pick returned no asset', undefined)
      return { ok: false, error: 'read_failed' }
    }
    if (asset.size !== undefined && asset.size > BACKUP_MAX_BYTES) {
      logTransportFailure('Native backup file exceeded the size limit', undefined, {
        size: asset.size,
      })
      return { ok: false, error: 'oversized_file' }
    }

    const file = new File(asset.uri)
    if (file.size > BACKUP_MAX_BYTES) {
      logTransportFailure('Native backup file exceeded the size limit', undefined, {
        size: file.size,
      })
      return { ok: false, error: 'oversized_file' }
    }
    return { ok: true, value: await file.text() }
  } catch (cause: unknown) {
    logTransportFailure('Native backup file read failed', cause)
    return { ok: false, error: 'read_failed' }
  }
}
