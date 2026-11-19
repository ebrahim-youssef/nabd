import { Platform } from 'react-native'
import { requireOptionalNativeModule } from 'expo'

import { logger } from '../../observability/logger'
import type { WidgetSnapshot } from '../widgetSnapshot'
import {
  configureWidgetSnapshotWriter,
  publishWidgetSnapshot,
  requestWidgetSnapshotWrite,
} from '../widgetSnapshotWriter'

jest.mock('expo', () => ({ requireOptionalNativeModule: jest.fn() }))

const snapshot: WidgetSnapshot = {
  schemaVersion: 1,
  generatedAt: 1,
  day: '2026-11-19',
  versionId: 'v1',
  blocks: [],
  nextPrayers: [],
  unrecordedCount: 0,
  writeFailed: true,
}

describe('widget snapshot writer', () => {
  const originalPlatform = Platform.OS
  const native = {
    writeWidgetSnapshot: jest.fn((_json: string) => true),
    clearWidgetSnapshot: jest.fn(() => true),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(logger, 'error').mockImplementation(() => undefined)
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' })
    jest.mocked(requireOptionalNativeModule).mockReturnValue(native)
  })

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: originalPlatform })
    jest.restoreAllMocks()
  })

  it('coalesces concurrent requests into one follow-up write', async () => {
    let finishFirst!: () => void
    const firstRun = new Promise<void>((resolve) => {
      finishFirst = resolve
    })
    const run = jest.fn().mockReturnValueOnce(firstRun).mockResolvedValue(undefined)
    const unregister = configureWidgetSnapshotWriter(run)

    const initial = requestWidgetSnapshotWrite()
    await Promise.resolve()
    void requestWidgetSnapshotWrite()
    void requestWidgetSnapshotWrite()
    finishFirst()
    await initial

    expect(run).toHaveBeenCalledTimes(2)
    unregister()
  })

  it('clears the native snapshot for a null plan or incomplete onboarding', async () => {
    publishWidgetSnapshot(null, true)
    publishWidgetSnapshot(snapshot, false)

    expect(native.clearWidgetSnapshot).toHaveBeenCalledTimes(2)
    expect(native.writeWidgetSnapshot).not.toHaveBeenCalled()
  })

  it('serializes writeFailed from the last drain into the native snapshot', () => {
    publishWidgetSnapshot(snapshot, true)

    expect(native.writeWidgetSnapshot).toHaveBeenCalledWith(JSON.stringify(snapshot))
    expect(JSON.parse(native.writeWidgetSnapshot.mock.calls[0][0])).toMatchObject({
      writeFailed: true,
    })
  })

  it('does not run without both native snapshot functions or outside Android', async () => {
    const run = jest.fn().mockResolvedValue(undefined)
    const unregister = configureWidgetSnapshotWriter(run)
    jest.mocked(requireOptionalNativeModule).mockReturnValue(null)
    await requestWidgetSnapshotWrite()
    expect(run).not.toHaveBeenCalled()

    jest.mocked(requireOptionalNativeModule).mockReturnValue({ writeWidgetSnapshot: jest.fn() })
    await requestWidgetSnapshotWrite()
    expect(run).not.toHaveBeenCalled()

    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' })
    jest.mocked(requireOptionalNativeModule).mockReturnValue(native)
    await requestWidgetSnapshotWrite()
    expect(run).not.toHaveBeenCalled()
    unregister()
  })

  it('logs a native write failure without throwing', () => {
    native.writeWidgetSnapshot.mockReturnValue(false)

    expect(() => publishWidgetSnapshot(snapshot, true)).not.toThrow()
    expect(logger.error).toHaveBeenCalledWith(
      'Native widget snapshot write returned false',
      expect.any(Error),
      { operation: 'write-widget-snapshot' },
    )
  })
})
