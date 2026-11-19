import { Platform } from 'react-native'
import { requireOptionalNativeModule } from 'expo'

import { logger } from '../observability/logger'
import type { WidgetSnapshot } from './widgetSnapshot'

const NATIVE_MODULE_NAME = 'NabdDevice'
const WRITE_OPERATION = 'write-widget-snapshot'

type NativeWidgetSnapshotModule = {
  writeWidgetSnapshot?: (json: string) => unknown
  clearWidgetSnapshot?: () => unknown
}

type WidgetSnapshotRun = () => Promise<void>

let snapshotRun: WidgetSnapshotRun | null = null
let activeWrite: Promise<void> | null = null
let rerunRequested = false

export function configureWidgetSnapshotWriter(run: WidgetSnapshotRun): () => void {
  snapshotRun = run
  return () => {
    if (snapshotRun === run) snapshotRun = null
  }
}

export function requestWidgetSnapshotWrite(): Promise<void> {
  if (Platform.OS !== 'android' || !snapshotRun || !hasNativeSnapshotMethods()) {
    return Promise.resolve()
  }
  if (activeWrite) {
    rerunRequested = true
    return activeWrite
  }

  const run = snapshotRun
  const operation = (async () => {
    do {
      rerunRequested = false
      try {
        await run()
      } catch (cause: unknown) {
        logger.error('Widget snapshot refresh failed', cause, { operation: WRITE_OPERATION })
      }
    } while (rerunRequested)
  })()
  const tracked = operation.finally(() => {
    if (activeWrite === tracked) activeWrite = null
  })
  activeWrite = tracked
  return tracked
}

function hasNativeSnapshotMethods(): boolean {
  try {
    const native = requireOptionalNativeModule<NativeWidgetSnapshotModule>(NATIVE_MODULE_NAME)
    return Boolean(native?.writeWidgetSnapshot && native.clearWidgetSnapshot)
  } catch {
    return false
  }
}

export function writeWidgetSnapshot(json: string): void {
  if (Platform.OS !== 'android') return
  try {
    const native = requireOptionalNativeModule<NativeWidgetSnapshotModule>(NATIVE_MODULE_NAME)
    if (!native?.writeWidgetSnapshot) return
    const result = native.writeWidgetSnapshot(json)
    if (result !== true) {
      logger.error(
        'Native widget snapshot write returned false',
        new Error('Snapshot was not committed'),
        { operation: WRITE_OPERATION },
      )
    }
  } catch (cause: unknown) {
    logger.error('Native widget snapshot write failed', cause, { operation: WRITE_OPERATION })
  }
}

export function clearWidgetSnapshot(): void {
  if (Platform.OS !== 'android') return
  try {
    const native = requireOptionalNativeModule<NativeWidgetSnapshotModule>(NATIVE_MODULE_NAME)
    if (!native?.clearWidgetSnapshot) return
    const result = native.clearWidgetSnapshot()
    if (result !== true) {
      logger.error(
        'Native widget snapshot clear returned false',
        new Error('Snapshot was not cleared'),
        { operation: WRITE_OPERATION },
      )
    }
  } catch (cause: unknown) {
    logger.error('Native widget snapshot clear failed', cause, { operation: WRITE_OPERATION })
  }
}

export function publishWidgetSnapshot(
  snapshot: WidgetSnapshot | null,
  onboardingComplete: boolean,
): void {
  if (!onboardingComplete || snapshot === null) {
    clearWidgetSnapshot()
    return
  }
  writeWidgetSnapshot(JSON.stringify(snapshot))
}
