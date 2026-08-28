import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { toDayId } from '@nabd/shared'
import type { WirdDefinition } from '@nabd/shared'

import { db } from '../db/db'
import { addVersion, appendEntry } from '../wird/db'
import { useItemStats } from './useItemStats'

const CREATED_AT = 1_755_000_000_000
const FIRST_DEFINITION: WirdDefinition = {
  areas: [{ id: 'area', label: 'الأولى', order: 0 }],
  items: [{ id: 'item', areaId: 'area', label: 'العنصر الأول', kind: 'checkbox' }],
}
const SECOND_DEFINITION: WirdDefinition = {
  areas: [{ id: 'area', label: 'الثانية', order: 0 }],
  items: [{ id: 'item', areaId: 'area', label: 'العنصر الثاني', kind: 'checkbox' }],
}

beforeEach(async () => {
  await db.transaction('rw', db.wirdEntries, db.wirdVersions, async () => {
    await db.wirdEntries.clear()
    await db.wirdVersions.clear()
  })
})

describe('useItemStats', () => {
  it('keeps an item consistency across versions that define it', async () => {
    const today = new Date()
    const firstDay = new Date(today)
    firstDay.setDate(today.getDate() - 2)
    const secondDay = new Date(today)
    secondDay.setDate(today.getDate() - 1)
    const firstResult = await addVersion(toDayId(firstDay), FIRST_DEFINITION, CREATED_AT)
    const secondResult = await addVersion(toDayId(secondDay), SECOND_DEFINITION, CREATED_AT + 1)
    expect(firstResult.ok).toBe(true)
    expect(secondResult.ok).toBe(true)
    if (!firstResult.ok || !secondResult.ok) return
    await appendEntry(toDayId(firstDay), firstResult.value.id, 'item', true, CREATED_AT + 2)

    const { result } = renderHook(() => useItemStats())

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.stats).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ itemId: 'item', activeDays: 2, doneDays: 1 }),
      ]),
    )
  })
})
