import { fireEvent, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { isScheduledOn, toDayId, WIRD_COPY, WIRD_LEVELS } from '@nabd/shared'

import { db } from '../db/db'
import { renderApp } from '../test/memoryApp'
import { CELEBRATED_KEY } from './CompletionCelebration'
import { addVersion, appendEntryForDay } from './db'

const CREATED_AT = 1_755_000_000_000

beforeEach(async () => {
  localStorage.clear()
  await db.transaction('rw', db.wirdEntries, db.wirdVersions, async () => {
    await db.wirdEntries.clear()
    await db.wirdVersions.clear()
  })
})

describe('CompletionCelebration', () => {
  it('shows once after all scheduled required items are done and does not show again that day', async () => {
    const day = toDayId(new Date())
    const level = WIRD_LEVELS[0]
    await addVersion(day, level.wird, CREATED_AT)
    renderApp('/app')
    await screen.findByTestId('wird-checklist')

    const required = level.wird.items.filter((item) => !item.optional && isScheduledOn(item, day))
    for (const [index, item] of required.entries()) {
      await appendEntryForDay(day, item.id, true, CREATED_AT + index + 1)
    }

    const dialog = await screen.findByRole('dialog', { name: WIRD_COPY.celebrationTitle })
    expect(localStorage.getItem(CELEBRATED_KEY)).toBe(day)
    fireEvent.click(screen.getByTestId('celebration-dismiss'))
    await waitFor(() => expect(dialog).not.toBeInTheDocument())

    renderApp('/app')
    await screen.findByTestId('wird-checklist')
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: WIRD_COPY.celebrationTitle })).toBeNull(),
    )
  })
})
