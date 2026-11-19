import { WIRD_LEVELS } from '../../content/levels'
import type { ProductDatabase } from '../../db/productDatabase'
import { requestWidgetSnapshotWrite } from '../../device/widgetSnapshotWriter'
import { createWirdRepository } from '../db'

jest.mock('../../device/widgetSnapshotWriter', () => ({
  requestWidgetSnapshotWrite: jest.fn(),
}))

it('requests a widget snapshot after a version is committed', async () => {
  const database = {
    getFirstAsync: jest.fn().mockResolvedValue({
      id: 'version-1',
      effective_from: '2026-11-19',
      definition_json: JSON.stringify(WIRD_LEVELS[0].wird),
      created_at: 1,
    }),
  } as unknown as ProductDatabase

  await expect(
    createWirdRepository(database).addVersion('2026-11-19', WIRD_LEVELS[0].wird, 1),
  ).resolves.toMatchObject({ ok: true })

  expect(requestWidgetSnapshotWrite).toHaveBeenCalledTimes(1)
})
