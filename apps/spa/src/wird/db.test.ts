import 'fake-indexeddb/auto'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { WIRD_LEVELS, nextDay } from '@nabd/shared'

import { db } from '../db/db'
import { addVersion, appendEntryForDay, getDayEntries, listVersions, setWirdLevel } from './db'

vi.mock('../logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

const DAY = '2026-08-12'
const ITEM_ID = WIRD_LEVELS[0].wird.items[0].id
const FIRST_TIME = 1_755_000_000_000
const SECOND_TIME = FIRST_TIME + 1

beforeEach(async () => {
  await db.transaction('rw', db.wirdEntries, db.wirdVersions, async () => {
    await db.wirdEntries.clear()
    await db.wirdVersions.clear()
  })
})

describe('wirdRepository', () => {
  it('appends check and uncheck events without replacing either row', async () => {
    await addVersion(DAY, WIRD_LEVELS[0].wird, FIRST_TIME)

    await appendEntryForDay(DAY, ITEM_ID, true, FIRST_TIME)
    await appendEntryForDay(DAY, ITEM_ID, false, SECOND_TIME)

    const entries = await getDayEntries(DAY)
    expect(entries).toHaveLength(2)
    expect([...entries].sort((a, b) => a.at - b.at).map(({ done }) => done)).toEqual([true, false])
  })

  it('resolves the version in force for the entry day', async () => {
    const first = await addVersion('2026-08-01', WIRD_LEVELS[0].wird, FIRST_TIME)
    const future = await addVersion('2026-08-13', WIRD_LEVELS[1].wird, SECOND_TIME)
    expect(first.ok).toBe(true)
    expect(future.ok).toBe(true)

    const result = await appendEntryForDay(DAY, ITEM_ID, true, SECOND_TIME)

    expect(result.ok).toBe(true)
    if (result.ok && first.ok) expect(result.value.versionId).toBe(first.value.id)
  })

  it('keeps the earlier check row after an uncheck', async () => {
    await addVersion(DAY, WIRD_LEVELS[0].wird, FIRST_TIME)
    const checked = await appendEntryForDay(DAY, ITEM_ID, true, FIRST_TIME)
    await appendEntryForDay(DAY, ITEM_ID, false, SECOND_TIME)

    expect(checked.ok).toBe(true)
    if (checked.ok) expect(await db.wirdEntries.get(checked.value.id)).toEqual(checked.value)
  })

  it('writes a manual level version effective tomorrow', async () => {
    await addVersion(DAY, WIRD_LEVELS[0].wird, FIRST_TIME)

    const result = await setWirdLevel(WIRD_LEVELS[1].wird, DAY, SECOND_TIME)

    expect(result).toMatchObject({ ok: true, value: { effectiveFrom: nextDay(DAY) } })
    expect((await listVersions()).map((version) => version.effectiveFrom).sort()).toEqual([
      DAY,
      nextDay(DAY),
    ])
  })

  it('does not append a version when tomorrow already has the chosen definition', async () => {
    await addVersion(DAY, WIRD_LEVELS[0].wird, FIRST_TIME)
    const tomorrow = await addVersion(nextDay(DAY), WIRD_LEVELS[1].wird, SECOND_TIME)

    const result = await setWirdLevel(WIRD_LEVELS[1].wird, DAY, SECOND_TIME + 1)

    expect(result).toEqual(tomorrow)
    expect(await listVersions()).toHaveLength(2)
  })
})
