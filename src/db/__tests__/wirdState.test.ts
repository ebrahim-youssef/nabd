import type { ProductDatabase } from '../productDatabase'
import { requestWidgetSnapshotWrite } from '../../device/widgetSnapshotWriter'
import { runWirdStateTransaction } from '../wirdState'

jest.mock('../../device/widgetSnapshotWriter', () => ({
  requestWidgetSnapshotWrite: jest.fn(),
}))

describe('runWirdStateTransaction', () => {
  it('requests a widget snapshot after the database transaction commits', async () => {
    const events: string[] = []
    const database = {
      withExclusiveTransactionAsync: jest.fn(
        async (task: (transaction: ProductDatabase) => Promise<void>) => {
          await task({} as ProductDatabase)
          events.push('commit')
        },
      ),
    } as unknown as ProductDatabase
    jest.mocked(requestWidgetSnapshotWrite).mockImplementation(() => {
      events.push('snapshot')
      return Promise.resolve()
    })

    await expect(runWirdStateTransaction(database, async () => 'saved')).resolves.toBe('saved')

    expect(events).toEqual(['commit', 'snapshot'])
  })
})
