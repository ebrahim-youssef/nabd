import 'fake-indexeddb/auto'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { WIRD_LEVELS } from '@nabd/shared'

import { db } from '../db/db'
import { countWirdVersions, seedWirdFromLevel } from './db'

vi.mock('../logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

const LEVEL = WIRD_LEVELS[0]
const EFFECTIVE_FROM = '2026-08-12'
const CREATED_AT = 1_755_000_000_000

beforeEach(async () => {
  await db.wirdVersions.clear()
})

describe('onboardingRepository', () => {
  it('seeds exactly one immutable version from the selected level', async () => {
    const result = await seedWirdFromLevel(LEVEL.wird, EFFECTIVE_FROM, CREATED_AT)

    expect(result).toMatchObject({
      ok: true,
      value: { effectiveFrom: EFFECTIVE_FROM, definition: LEVEL.wird, createdAt: CREATED_AT },
    })
    expect(await countWirdVersions()).toBe(1)
  })

  it('creates nothing when a version already exists', async () => {
    await seedWirdFromLevel(LEVEL.wird, EFFECTIVE_FROM, CREATED_AT)

    const second = await seedWirdFromLevel(LEVEL.wird, '2026-08-13', CREATED_AT + 1)

    expect(second).toEqual({ ok: true, value: null })
    expect(await countWirdVersions()).toBe(1)
  })

  it('serializes concurrent seed attempts into one version', async () => {
    const results = await Promise.all([
      seedWirdFromLevel(LEVEL.wird, EFFECTIVE_FROM, CREATED_AT),
      seedWirdFromLevel(LEVEL.wird, EFFECTIVE_FROM, CREATED_AT),
    ])

    expect(results.filter((result) => result.ok && result.value !== null)).toHaveLength(1)
    expect(results.filter((result) => result.ok && result.value === null)).toHaveLength(1)
    expect(await countWirdVersions()).toBe(1)
  })
})
