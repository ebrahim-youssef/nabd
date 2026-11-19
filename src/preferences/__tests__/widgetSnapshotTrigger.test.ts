import type { ProductDatabase } from '../../db/productDatabase'
import { requestWidgetSnapshotWrite } from '../../device/widgetSnapshotWriter'
import { createPreferencesRepository, PREFERENCE_KEYS } from '../db'

jest.mock('../../device/widgetSnapshotWriter', () => ({
  requestWidgetSnapshotWrite: jest.fn(),
}))

it('requests a snapshot after calculation method writes and clears', async () => {
  const database = {
    runAsync: jest.fn().mockResolvedValue(undefined),
  } as unknown as ProductDatabase
  const preferences = createPreferencesRepository(database)

  await preferences.write(PREFERENCE_KEYS.calculationMethod, 'egyptian', 1)
  await preferences.write(PREFERENCE_KEYS.theme, 'dark', 2)
  await preferences.clear(PREFERENCE_KEYS.calculationMethod)

  expect(requestWidgetSnapshotWrite).toHaveBeenCalledTimes(2)
})
