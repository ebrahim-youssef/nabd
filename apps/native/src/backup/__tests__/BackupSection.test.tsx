import { fireEvent, render, screen } from '@testing-library/react-native'

import { BACKUP_COPY, countLabel } from '../copy'
import type { BackupStatus } from '../useBackup'
import { BackupSection } from '../BackupSection'
import { useBackup } from '../useBackup'

jest.mock('../useBackup', () => ({ useBackup: jest.fn() }))

const mockedUseBackup = useBackup as jest.MockedFunction<typeof useBackup>

const counts = {
  onboarding_state: 0,
  wird_versions: 0,
  wird_entries: 0,
  qada_events: 0,
  adhkar_flow_progress: 0,
  app_preferences: 2,
}

const preview = {
  backup: {
    formatVersion: 1 as const,
    schemaVersion: 1,
    exportedAt: '2026-10-18T10:00:00.000Z',
    data: {
      onboarding_state: [],
      wird_versions: [],
      wird_entries: [],
      qada_events: [],
      adhkar_flow_progress: [],
      app_preferences: [],
    },
  },
  counts,
}

const emptyPreview = {
  ...preview,
  counts: { ...counts, app_preferences: 0 },
}

function state(overrides: Partial<ReturnType<typeof useBackup>> = {}) {
  return {
    cancelRestore: jest.fn(),
    chooseFile: jest.fn(),
    confirmRestore: jest.fn(),
    exportBackup: jest.fn(),
    isBusy: false,
    preview: null,
    status: null,
    ...overrides,
  } as ReturnType<typeof useBackup>
}

describe('BackupSection', () => {
  beforeEach(() => jest.clearAllMocks())

  it('uses the Arabic product name in backup copy', () => {
    expect(JSON.stringify(BACKUP_COPY)).toContain('نبض')
    expect(JSON.stringify(BACKUP_COPY)).not.toContain('nabd')
  })

  it('renders the backup card and its export and import actions', async () => {
    mockedUseBackup.mockReturnValue(state())

    await render(<BackupSection />)

    expect(screen.getByTestId('settings-backup')).toBeTruthy()
    expect(screen.getByTestId('backup-export')).toHaveTextContent(BACKUP_COPY.export)
    expect(screen.getByTestId('backup-import')).toHaveTextContent(BACKUP_COPY.import)
  })

  it('shows a confirmation view and confirms the planned restore', async () => {
    const confirmRestore = jest.fn()
    mockedUseBackup.mockReturnValue(state({ preview, confirmRestore }))

    await render(<BackupSection />)

    expect(screen.getByTestId('backup-preview')).toBeTruthy()
    expect(screen.getByTestId('backup-count-app_preferences')).toHaveTextContent('سجلان')
    await fireEvent.press(screen.getByTestId('backup-confirm'))

    expect(confirmRestore).toHaveBeenCalledTimes(1)
    expect(screen.queryByTestId('backup-count-onboarding_state')).toBeNull()
  })

  it('shows only a close action when the preview has no new records', async () => {
    const cancelRestore = jest.fn()
    const confirmRestore = jest.fn()
    mockedUseBackup.mockReturnValue(state({ preview: emptyPreview, cancelRestore, confirmRestore }))

    await render(<BackupSection />)

    expect(screen.getByTestId('backup-preview-empty')).toHaveTextContent(
      'كل ما في هذا الملف موجود على جهازك بالفعل.',
    )
    expect(screen.queryByTestId('backup-count-app_preferences')).toBeNull()
    expect(screen.queryByTestId('backup-confirm')).toBeNull()
    expect(screen.getByTestId('backup-cancel')).toBeTruthy()
  })

  it.each([
    [0, 'لا سجلات'],
    [1, 'سجل واحد'],
    [2, 'سجلان'],
    [3, '٣ سجلات'],
    [10, '١٠ سجلات'],
    [11, '١١ سجلًا'],
    [100, '١٠٠ سجلًا'],
  ])('formats %s backup records for Arabic UI as %s', (count, expected) => {
    expect(countLabel(count)).toBe(expected)
  })

  it('notifies the owner after a successful restore', async () => {
    const onRestored = jest.fn()
    const confirmRestore = jest.fn().mockResolvedValue({ ok: true, value: counts })
    mockedUseBackup.mockReturnValue(state({ preview, confirmRestore }))

    await render(<BackupSection onRestored={onRestored} />)
    await fireEvent.press(screen.getByTestId('backup-confirm'))

    expect(onRestored).toHaveBeenCalledTimes(1)
  })

  it('does not notify the owner after a failed restore', async () => {
    const onRestored = jest.fn()
    const confirmRestore = jest.fn().mockResolvedValue({
      ok: false,
      error: { reason: 'write_failed' },
    })
    mockedUseBackup.mockReturnValue(state({ preview, confirmRestore }))

    await render(<BackupSection onRestored={onRestored} />)
    await fireEvent.press(screen.getByTestId('backup-confirm'))

    expect(onRestored).not.toHaveBeenCalled()
  })

  it('cancels a preview without writing anything', async () => {
    const cancelRestore = jest.fn()
    const confirmRestore = jest.fn()
    mockedUseBackup.mockReturnValue(state({ preview, cancelRestore, confirmRestore }))

    await render(<BackupSection />)
    await fireEvent.press(screen.getByTestId('backup-cancel'))

    expect(cancelRestore).toHaveBeenCalledTimes(1)
    expect(confirmRestore).not.toHaveBeenCalled()
  })

  it.each([
    [{ kind: 'exported' }, BACKUP_COPY.status.exported],
    [{ kind: 'export_failed', error: 'write_failed' }, BACKUP_COPY.status.exportFailed],
    [{ kind: 'export_failed', error: 'share_failed' }, BACKUP_COPY.status.shareFailed],
    [{ kind: 'export_failed', error: 'snapshot_failed' }, BACKUP_COPY.status.snapshotFailed],
    [
      { kind: 'import_failed', error: { kind: 'transport', error: 'oversized_file' } },
      BACKUP_COPY.status.oversizedFile,
    ],
    [
      { kind: 'import_failed', error: { kind: 'transport', error: 'read_failed' } },
      BACKUP_COPY.status.readFailed,
    ],
    [
      { kind: 'import_failed', error: { kind: 'parse', reason: 'malformed_json' } },
      BACKUP_COPY.status.invalidFile,
    ],
    [
      { kind: 'import_failed', error: { kind: 'conflict', table: 'wird_versions' } },
      BACKUP_COPY.status.conflict,
    ],
    [
      { kind: 'import_failed', error: { kind: 'snapshot_failed' } },
      BACKUP_COPY.status.snapshotFailed,
    ],
    [
      { kind: 'restore_failed', error: { reason: 'write_failed' } },
      BACKUP_COPY.status.restoreFailed,
    ],
    [
      { kind: 'restore_failed', error: { reason: 'conflict', table: 'wird_versions' } },
      BACKUP_COPY.status.conflict,
    ],
  ] as const)('shows the user-facing status for %j', async (status, message) => {
    mockedUseBackup.mockReturnValue(state({ status: status as BackupStatus }))

    await render(<BackupSection />)

    expect(screen.getByTestId('backup-status')).toHaveTextContent(message)
  })
})
