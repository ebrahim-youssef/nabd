import { fireEvent, render, screen, waitFor, within } from '@testing-library/react-native'

import { BACKUP_COPY, countLabel } from '../copy'
import { BackupSection } from '../BackupSection'
import { useBackup } from '../useBackup'
import { useToast } from '../../ui/ToastProvider'

jest.mock('../useBackup', () => ({ useBackup: jest.fn() }))
jest.mock('../../ui/ToastProvider', () => ({ useToast: jest.fn() }))
jest.mock('lucide-react-native', () => {
  const { View } = require('react-native')
  return { Upload: View, Download: View, ShieldCheck: View, TriangleAlert: View, ChevronLeft: View }
})

const mockedUseBackup = useBackup as jest.MockedFunction<typeof useBackup>
const mockedUseToast = useToast as jest.MockedFunction<typeof useToast>
const counts = {
  onboarding_state: 0,
  wird_versions: 0,
  wird_entries: 412,
  qada_events: 0,
  adhkar_flow_progress: 0,
  app_preferences: 2,
  wird_actions: 0,
}
const preview = {
  backup: {} as NonNullable<ReturnType<typeof useBackup>['preview']>['backup'],
  counts,
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
  const show = jest.fn()
  beforeEach(() => {
    jest.clearAllMocks()
    mockedUseToast.mockReturnValue({ show })
  })

  it('uses the Arabic product name in backup copy', () => {
    expect(JSON.stringify(BACKUP_COPY)).toContain('نبض')
    expect(JSON.stringify(BACKUP_COPY)).not.toContain('nabd')
  })

  it('renders the backup card and its export and import actions', () => {
    mockedUseBackup.mockReturnValue(state())
    render(<BackupSection />)
    expect(screen.getByTestId('settings-backup')).toBeTruthy()
    expect(within(screen.getByTestId('backup-export')).getByText(BACKUP_COPY.export)).toBeTruthy()
    expect(within(screen.getByTestId('backup-import')).getByText(BACKUP_COPY.import)).toBeTruthy()
  })

  it('allows only cancelling a review with no new records', () => {
    const cancelRestore = jest.fn()
    const confirmRestore = jest.fn()
    const emptyCounts = { ...counts, wird_entries: 0, app_preferences: 0 }
    mockedUseBackup.mockReturnValue(
      state({ preview: { ...preview, counts: emptyCounts }, cancelRestore, confirmRestore }),
    )
    render(<BackupSection />)
    expect(screen.getByText(BACKUP_COPY.previewEmpty)).toBeTruthy()
    expect(screen.queryByTestId('backup-count-app_preferences')).toBeNull()
    expect(screen.getByRole('button', { name: BACKUP_COPY.confirm })).toBeDisabled()
    fireEvent.press(screen.getByRole('button', { name: BACKUP_COPY.cancel }))
    expect(cancelRestore).toHaveBeenCalledTimes(1)
    expect(confirmRestore).not.toHaveBeenCalled()
  })

  it('exports and shows a success toast', async () => {
    const exportBackup = jest.fn().mockResolvedValue({ ok: true, value: undefined })
    mockedUseBackup.mockReturnValue(state({ exportBackup }))
    await render(<BackupSection />)
    await fireEvent.press(screen.getByTestId('backup-export'))
    await waitFor(() => expect(show).toHaveBeenCalledWith({ message: BACKUP_COPY.status.exported }))
  })

  it('shows planned counts in the review and discards a cancelled import', async () => {
    const cancelRestore = jest.fn()
    const confirmRestore = jest.fn()
    mockedUseBackup.mockReturnValue(state({ preview, cancelRestore, confirmRestore }))
    await render(<BackupSection />)
    expect(screen.getByText('مراجعة الاستيراد')).toBeTruthy()
    expect(screen.getByText('٤١٢ سجلًا')).toBeTruthy()
    expect(screen.getByText('سجلان')).toBeTruthy()
    expect(screen.queryByTestId('backup-count-onboarding_state')).toBeNull()
    await fireEvent.press(screen.getByText('إلغاء'))
    expect(cancelRestore).toHaveBeenCalledTimes(1)
    expect(confirmRestore).not.toHaveBeenCalled()
  })

  it('confirms the import, refreshes and shows a success toast', async () => {
    const onRestored = jest.fn()
    const confirmRestore = jest.fn().mockResolvedValue({ ok: true, value: counts })
    mockedUseBackup.mockReturnValue(state({ preview, confirmRestore }))
    await render(<BackupSection onRestored={onRestored} />)
    await fireEvent.press(screen.getByText('تأكيد الاستيراد'))
    await waitFor(() =>
      expect(show).toHaveBeenCalledWith({ message: BACKUP_COPY.status.restored(414) }),
    )
    expect(confirmRestore).toHaveBeenCalledTimes(1)
    expect(onRestored).toHaveBeenCalledTimes(1)
  })

  it('shows an invalid file warning above the actions', async () => {
    mockedUseBackup.mockReturnValue(
      state({
        status: { kind: 'import_failed', error: { kind: 'parse', reason: 'malformed_json' } },
      }),
    )
    await render(<BackupSection />)
    expect(screen.getByText(BACKUP_COPY.status.invalidFile)).toBeTruthy()
    expect(screen.getByTestId('backup-import')).toBeTruthy()
  })

  it('disables both actions while busy', async () => {
    mockedUseBackup.mockReturnValue(state({ isBusy: true }))
    await render(<BackupSection />)
    expect(screen.getByTestId('backup-export')).toBeDisabled()
    expect(screen.getByTestId('backup-import')).toBeDisabled()
  })

  it('keeps the review open and does not refresh after a failed import', async () => {
    const onRestored = jest.fn()
    const confirmRestore = jest
      .fn()
      .mockResolvedValue({ ok: false, error: { reason: 'write_failed' } })
    mockedUseBackup.mockReturnValue(state({ preview, confirmRestore }))
    await render(<BackupSection onRestored={onRestored} />)
    await fireEvent.press(screen.getByText('تأكيد الاستيراد'))
    expect(onRestored).not.toHaveBeenCalled()
    expect(show).not.toHaveBeenCalled()
    expect(screen.getByText('مراجعة الاستيراد')).toBeTruthy()
  })

  it.each([
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
  ] as const)('shows the error for %j', async (status, message) => {
    mockedUseBackup.mockReturnValue(state({ status }))
    await render(<BackupSection />)
    expect(screen.getByText(message)).toBeTruthy()
  })

  it.each([
    [0, 'لا سجلات'],
    [1, 'سجل واحد'],
    [2, 'سجلان'],
    [3, '٣ سجلات'],
    [10, '١٠ سجلات'],
    [11, '١١ سجلًا'],
    [100, '١٠٠ سجلًا'],
  ])('formats %s records as %s', (count, expected) => expect(countLabel(count)).toBe(expected))
})
