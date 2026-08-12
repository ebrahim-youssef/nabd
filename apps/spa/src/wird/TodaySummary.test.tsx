import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { toArabicIndic, toDayId, WIRD_LEVELS } from '@nabd/shared'

import { db } from '../db/db'
import { renderApp } from '../test/memoryApp'
import { addVersion, appendEntryForDay } from './db'

const CREATED_AT = 1_755_000_000_000

beforeEach(async () => {
  localStorage.clear()
  await db.transaction('rw', db.wirdEntries, db.wirdVersions, async () => {
    await db.wirdEntries.clear()
    await db.wirdVersions.clear()
  })
})

describe('TodaySummary', () => {
  it('updates required progress from the same live checklist while tallying voluntary separately', async () => {
    const day = toDayId(new Date())
    const level = WIRD_LEVELS.find(({ wird }) => wird.items.some((item) => item.optional))
    expect(level).toBeDefined()
    if (!level) return
    const required = level.wird.items.find((item) => !item.optional)
    const voluntary = level.wird.items.find((item) => item.optional)
    expect(required).toBeDefined()
    expect(voluntary).toBeDefined()
    if (!required || !voluntary) return
    await addVersion(day, level.wird, CREATED_AT)
    renderApp('/app')

    const summary = await screen.findByTestId('today-summary')
    const requiredTotal = level.wird.items.filter((item) => !item.optional).length
    expect(screen.getByTestId('summary-total')).toHaveTextContent(toArabicIndic(requiredTotal))
    expect(screen.getByTestId('summary-voluntary')).toHaveTextContent('٠/')

    await appendEntryForDay(day, required.id, true, CREATED_AT + 1)
    await screen.findByText('١', { selector: '[data-testid="summary-done"]' })
    await appendEntryForDay(day, voluntary.id, true, CREATED_AT + 2)

    expect(await screen.findByTestId('summary-voluntary')).toHaveTextContent('١/')
    expect(summary).toBeInTheDocument()
  })
})
