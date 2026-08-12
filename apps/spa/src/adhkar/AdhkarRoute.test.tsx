import { fireEvent, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { ADHKAR_LIBRARY, INTENTIONS_LIBRARY, toDayId, WIRD_LEVELS } from '@nabd/shared'

import { db } from '../db/db'
import { renderApp } from '../test/memoryApp'
import { addVersion } from '../wird/db'

const AT = 1_755_000_000_000

beforeEach(async () => {
  await db.transaction('rw', db.adhkarFlow, db.wirdEntries, db.wirdVersions, async () => {
    await db.adhkarFlow.clear()
    await db.wirdEntries.clear()
    await db.wirdVersions.clear()
  })
})

describe('adhkar and intentions routes', () => {
  it('renders tabs and the independent after-prayer list through the application route tree', async () => {
    renderApp('/app/adhkar')
    const category = ADHKAR_LIBRARY.find((entry) => entry.id === 'after-prayer')!
    fireEvent.click(screen.getByTestId(`adhkar-tab-${category.id}`))
    expect(await screen.findByTestId('adhkar-list')).toBeInTheDocument()
    expect(screen.getByTestId(`list-item-${category.items[0].id}`)).toBeInTheDocument()
  })

  it('persists a guided flow for today and restores it after route remount', async () => {
    const category = ADHKAR_LIBRARY.find((entry) => entry.id === 'morning')!
    const first = renderApp('/app/adhkar?tab=morning')
    await screen.findByTestId('flow-active-card')
    fireEvent.click(screen.getByTestId('flow-active-card'))
    await waitFor(() =>
      expect(db.adhkarFlow.get(category.id)).resolves.toMatchObject({ index: 1, count: 0 }),
    )
    first.unmount()
    renderApp('/app/adhkar?tab=morning')
    await waitFor(() => expect(screen.getByTestId('flow-count')).toHaveTextContent('٠'))
  })

  it('completes a linked wird item when a guided category completes', async () => {
    const day = toDayId(new Date())
    const category = ADHKAR_LIBRARY.find((entry) => entry.id === 'evening')!
    await addVersion(day, WIRD_LEVELS[0].wird, AT)
    renderApp('/app/adhkar?tab=evening')
    for (const dhikr of category.items) {
      for (let count = 0; count < dhikr.repeat; count += 1) {
        fireEvent.click(await screen.findByTestId('flow-active-card'))
      }
    }
    await screen.findByTestId('flow-finished')
    await waitFor(() =>
      expect(
        db.wirdEntries.where('[day+itemId]').equals([day, 'evening-adhkar']).count(),
      ).resolves.toBe(1),
    )
  })

  it('renders the intentions library through its ungated route', async () => {
    renderApp('/app/niyyat')
    const deed = INTENTIONS_LIBRARY[0]
    expect(await screen.findByTestId('intentions-library')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId(`deed-${deed.id}`).querySelector('summary')!)
    expect(screen.getByText(deed.intentions[0].text)).toBeVisible()
  })
})
