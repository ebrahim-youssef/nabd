import { act, render } from '@testing-library/react-native'
import { useSQLiteContext } from 'expo-sqlite'
import { AppState } from 'react-native'

import { createDeviceRepository } from '../db'
import { createOnboardingRepository } from '../../onboarding/db'
import { createPreferencesRepository } from '../../preferences/db'
import { createWirdRepository } from '../../wird/db'
import {
  configureWidgetSnapshotWriter,
  publishWidgetSnapshot,
  requestWidgetSnapshotWrite,
} from '../widgetSnapshotWriter'
import { WidgetSnapshotWriterBootstrap } from '../WidgetSnapshotWriterBootstrap'

jest.mock('expo-sqlite', () => ({ useSQLiteContext: jest.fn() }))
jest.mock('../db', () => ({
  createDeviceRepository: jest.fn(() => ({
    readLocationCacheState: jest.fn().mockResolvedValue(null),
  })),
}))
jest.mock('../../onboarding/db', () => ({
  createOnboardingRepository: jest.fn(() => ({ load: jest.fn().mockResolvedValue(null) })),
}))
jest.mock('../../preferences/db', () => ({
  PREFERENCE_KEYS: { calculationMethod: 'nabd:prayer-calculation-method' },
  createPreferencesRepository: jest.fn(() => ({ read: jest.fn().mockResolvedValue(null) })),
}))
jest.mock('../../wird/db', () => ({
  createWirdRepository: jest.fn(() => ({ listVersions: jest.fn(), getDayEntries: jest.fn() })),
}))
jest.mock('../prayerActionDrain', () => ({ getLastPrayerActionDrainFailed: jest.fn(() => false) }))
jest.mock('../widgetSnapshotWriter', () => ({
  clearWidgetSnapshot: jest.fn(),
  configureWidgetSnapshotWriter: jest.fn(() => jest.fn()),
  publishWidgetSnapshot: jest.fn(),
  requestWidgetSnapshotWrite: jest.fn(() => Promise.resolve()),
}))

const mockedUseSQLiteContext = useSQLiteContext as jest.MockedFunction<typeof useSQLiteContext>
const mockedConfigure = jest.mocked(configureWidgetSnapshotWriter)
const mockedRequest = jest.mocked(requestWidgetSnapshotWrite)

describe('WidgetSnapshotWriterBootstrap', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockedUseSQLiteContext.mockReturnValue({} as never)
  })

  afterEach(() => jest.restoreAllMocks())

  it('requests the initial and resumed writes, and clears when onboarding is incomplete', async () => {
    let appStateListener:
      | ((state: 'active' | 'background' | 'inactive' | 'unknown' | 'extension') => void)
      | undefined
    const removeListener = jest.fn()
    let configuredRun: (() => Promise<void>) | undefined
    mockedConfigure.mockImplementation((nextRun) => {
      configuredRun = nextRun
      return jest.fn()
    })
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, listener) => {
      appStateListener = listener
      return { remove: removeListener } as never
    })

    const { unmount } = render(<WidgetSnapshotWriterBootstrap />)
    expect(mockedConfigure).toHaveBeenCalledTimes(1)
    expect(mockedRequest).toHaveBeenCalledTimes(1)
    act(() => appStateListener?.('active'))
    expect(mockedRequest).toHaveBeenCalledTimes(2)

    await act(async () => configuredRun?.())
    expect(createOnboardingRepository).toHaveBeenCalledTimes(1)
    expect(createPreferencesRepository).toHaveBeenCalledTimes(1)
    expect(createDeviceRepository).toHaveBeenCalledTimes(1)
    expect(createWirdRepository).toHaveBeenCalledTimes(1)
    expect(publishWidgetSnapshot).toHaveBeenCalledWith(null, false)

    unmount()
    expect(removeListener).toHaveBeenCalledTimes(1)
  })
})
