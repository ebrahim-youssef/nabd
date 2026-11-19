import { fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import { useEffect } from 'react'

import BackupRoute from '../../../app/(tabs)/backup'
import { useBackup } from '../useBackup'
import { BACKUP_COPY } from '../copy'
import { requestPrayerReschedule } from '../../device/prayerAlarms'

const mockRefreshWirdDay = jest.fn()
const mockMount = jest.fn()
const mockUnmount = jest.fn()
const mockShow = jest.fn()
const counts = {
  onboarding_state: 0,
  wird_versions: 0,
  wird_entries: 1,
  qada_events: 0,
  adhkar_flow_progress: 0,
  app_preferences: 0,
  wird_actions: 0,
}

jest.mock('../useBackup', () => ({ useBackup: jest.fn() }))
jest.mock('../../day-plan/WirdTodayProvider', () => ({
  useRefreshWirdDay: () => mockRefreshWirdDay,
}))
jest.mock('../../device/prayerAlarms', () => ({ requestPrayerReschedule: jest.fn() }))
jest.mock('../../ui/ToastProvider', () => ({ useToast: () => ({ show: mockShow }) }))
jest.mock('../../shell/PageHeader', () => ({ PageHeader: () => null }))
jest.mock('lucide-react-native', () => ({
  ChevronLeft: () => null,
  Download: () => null,
  ShieldCheck: () => null,
  TriangleAlert: () => null,
  Upload: () => null,
}))

function renderRoute(confirmRestore: jest.Mock) {
  function useBackupForTest() {
    useEffect(() => {
      mockMount()
      return () => mockUnmount()
    }, [])
    return {
      cancelRestore: jest.fn(),
      chooseFile: jest.fn(),
      confirmRestore,
      exportBackup: jest.fn(),
      isBusy: false,
      preview: { backup: {}, counts },
      status: null,
    } as never
  }
  jest.mocked(useBackup).mockImplementation(useBackupForTest)
  return render(<BackupRoute />)
}

describe('backup route restore', () => {
  beforeEach(() => jest.clearAllMocks())

  it('refreshes the day and remounts backup state after a successful restore', async () => {
    const confirmRestore = jest.fn().mockResolvedValue({ ok: true, value: counts })
    renderRoute(confirmRestore)
    await waitFor(() => expect(mockMount).toHaveBeenCalledTimes(1))
    await fireEvent.press(screen.getByRole('button', { name: BACKUP_COPY.confirm }))
    await waitFor(() => expect(mockRefreshWirdDay).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(mockMount).toHaveBeenCalledTimes(2))
    expect(mockUnmount).toHaveBeenCalledTimes(1)
    expect(requestPrayerReschedule).toHaveBeenCalledTimes(1)
    expect(confirmRestore).toHaveBeenCalledTimes(1)
  })

  it('does not refresh or remount after a failed restore', async () => {
    const confirmRestore = jest.fn().mockResolvedValue({
      ok: false,
      error: { reason: 'write_failed' },
    })
    renderRoute(confirmRestore)
    await waitFor(() => expect(mockMount).toHaveBeenCalledTimes(1))
    await fireEvent.press(screen.getByRole('button', { name: BACKUP_COPY.confirm }))
    await waitFor(() => expect(confirmRestore).toHaveBeenCalledTimes(1))
    expect(mockRefreshWirdDay).not.toHaveBeenCalled()
    expect(requestPrayerReschedule).not.toHaveBeenCalled()
    expect(mockMount).toHaveBeenCalledTimes(1)
    expect(mockUnmount).not.toHaveBeenCalled()
  })
})
