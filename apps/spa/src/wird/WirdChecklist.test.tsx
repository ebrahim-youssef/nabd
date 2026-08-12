import { fireEvent, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { toDayId, WIRD_LEVELS } from '@nabd/shared'

import { db } from '../db/db'
import { renderApp } from '../test/memoryApp'
import { addVersion } from './db'

const CREATED_AT = 1_755_000_000_000

beforeEach(async () => {
  localStorage.clear()
  await db.transaction('rw', db.wirdEntries, db.wirdVersions, async () => {
    await db.wirdEntries.clear()
    await db.wirdVersions.clear()
  })
})

describe('WirdChecklist', () => {
  it('toggles an item through the real route tree and reflects the latest Dexie event', async () => {
    const day = toDayId(new Date())
    const item = WIRD_LEVELS[0].wird.items[0]
    await addVersion(day, WIRD_LEVELS[0].wird, CREATED_AT)
    renderApp('/app')

    const row = await screen.findByTestId(`wird-item-${item.id}`)
    expect(row).toHaveAttribute('aria-pressed', 'false')

    fireEvent.click(row)
    fireEvent.click(row)
    await waitFor(() => expect(row).toHaveAttribute('aria-pressed', 'true'))
    expect(await db.wirdEntries.where('[day+itemId]').equals([day, item.id]).count()).toBe(1)
    fireEvent.click(row)
    await waitFor(() => expect(row).toHaveAttribute('aria-pressed', 'false'))

    expect(await db.wirdEntries.where('[day+itemId]').equals([day, item.id]).count()).toBe(2)
  })

  it('keeps voluntary items visually distinct', async () => {
    const day = toDayId(new Date())
    const level = WIRD_LEVELS.find(({ wird }) => wird.items.some((item) => item.optional))
    expect(level).toBeDefined()
    if (!level) return
    const voluntary = level.wird.items.find((item) => item.optional)
    expect(voluntary).toBeDefined()
    if (!voluntary) return
    await addVersion(day, level.wird, CREATED_AT)

    renderApp('/app')

    const row = await screen.findByTestId(`wird-item-${voluntary.id}`)
    expect(row).toHaveTextContent(voluntary.label)
    expect(row).toHaveTextContent('تطوّع')
  })
})
