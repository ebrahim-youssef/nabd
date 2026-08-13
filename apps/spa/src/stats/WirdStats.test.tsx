import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { toArabicIndic, toDayId, WIRD_LEVELS } from '@nabd/shared'

import { db } from '../db/db'
import { renderApp } from '../test/memoryApp'
import { addVersion, appendEntry } from '../wird/db'

const CREATED_AT = 1_755_000_000_000

beforeEach(async () => {
  localStorage.clear()
  await db.transaction('rw', db.wirdEntries, db.wirdVersions, async () => {
    await db.wirdEntries.clear()
    await db.wirdVersions.clear()
  })
})

describe('WirdStats', () => {
  it('renders the derived tiles and chart with a seeded completion', async () => {
    const day = toDayId(new Date())
    const versionResult = await addVersion(day, WIRD_LEVELS[0].wird, CREATED_AT)
    expect(versionResult.ok).toBe(true)
    if (!versionResult.ok) return
    const item = WIRD_LEVELS[0].wird.items.find((candidate) => candidate.areaId === 'prayers')
    expect(item).toBeDefined()
    if (!item) return
    await appendEntry(day, versionResult.value.id, item.id, true, CREATED_AT + 1)

    renderApp('/app/stats')

    expect(await screen.findByTestId('streak-card')).toBeInTheDocument()
    expect(screen.getByTestId('week-chart')).toBeInTheDocument()
    const requiredCount = WIRD_LEVELS[0].wird.items.filter(
      (candidate) => !candidate.optional,
    ).length
    expect(screen.getByTestId('tile-completion-value')).toHaveTextContent(
      toArabicIndic(Math.round(100 / requiredCount)),
    )
    expect(screen.getByTestId('tile-best-streak-value')).toHaveTextContent(toArabicIndic(0))
    expect(screen.getByTestId('stat-prayers')).toHaveTextContent(
      `${toArabicIndic(1)}/${toArabicIndic(5)}`,
    )
  })
})
