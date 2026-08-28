import { fireEvent, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

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

afterEach(() => vi.unstubAllGlobals())

async function completeToday() {
  const day = toDayId(new Date())
  const level = WIRD_LEVELS[0]
  await addVersion(day, level.wird, CREATED_AT)
  renderApp('/app')
  await screen.findByTestId('wird-checklist')
  const required = level.wird.items.filter((item) => !item.optional && isScheduledOn(item, day))
  for (const [index, item] of required.entries()) {
    await appendEntryForDay(day, item.id, true, CREATED_AT + index + 1)
  }
  return screen.findByRole('dialog', { name: WIRD_COPY.celebrationTitle })
}

describe('CompletionCelebration sharing', () => {
  it('confirms a clipboard copy when the platform has no share sheet', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    await completeToday()

    fireEvent.click(screen.getByTestId('celebration-share'))

    expect(await screen.findByTestId('celebration-copied')).toHaveTextContent(
      WIRD_COPY.celebrationCopied,
    )
    expect(writeText).toHaveBeenCalledWith(WIRD_COPY.celebrationShareText)
  })

  it('stays quiet when the share sheet handled it', async () => {
    vi.stubGlobal('navigator', { share: vi.fn().mockResolvedValue(undefined) })
    await completeToday()

    fireEvent.click(screen.getByTestId('celebration-share'))

    // The sheet is its own feedback, so a successful share must not also claim a clipboard copy.
    await waitFor(() => expect(screen.queryByTestId('celebration-copied')).toBeNull())
  })

  it('stays quiet when sharing fails outright', async () => {
    vi.stubGlobal('navigator', {})
    await completeToday()

    fireEvent.click(screen.getByTestId('celebration-share'))

    await waitFor(() => expect(screen.queryByTestId('celebration-copied')).toBeNull())
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
