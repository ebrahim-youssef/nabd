import { fireEvent, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { toDayId, WIRD_LEVELS } from '@nabd/shared'

import { db } from '../db/db'
import { renderApp } from '../test/memoryApp'
import { addVersion } from '../wird/db'

const CREATED_AT = 1_755_000_000_000
const COUNTER_TAPS = 10

beforeEach(async () => {
  await db.transaction('rw', db.wirdEntries, db.wirdVersions, async () => {
    await db.wirdEntries.clear()
    await db.wirdVersions.clear()
  })
})

describe('DhikrCounter', () => {
  it('counts in Arabic-Indic numerals and marks the linked checklist item done at its target', async () => {
    const day = toDayId(new Date())
    const item = WIRD_LEVELS[0].wird.items.find(({ id }) => id === 'istighfar')
    expect(item).toBeDefined()
    if (!item?.target) return
    await addVersion(day, WIRD_LEVELS[0].wird, CREATED_AT)
    renderApp('/app')

    const counter = await screen.findByTestId(`dhikr-${item.id}`)
    expect(screen.getByTestId(`dhikr-count-${item.id}`)).toHaveTextContent('٠/١٠')

    for (let tap = 0; tap < COUNTER_TAPS; tap += 1) fireEvent.click(counter)

    await waitFor(() => expect(counter).toHaveAttribute('aria-pressed', 'true'))
    expect(await db.wirdEntries.where('[day+itemId]').equals([day, item.id]).count()).toBe(1)
  })
})
