import { fireEvent, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { QADA_PRAYERS, toArabicIndic } from '@nabd/shared'

import { db } from '../db/db'
import { renderApp } from '../test/memoryApp'
import { addQadaDebt } from './db'

const CREATED_AT = 1_755_000_000_000

beforeEach(async () => {
  localStorage.clear()
  await db.qadaEvents.clear()
})

describe('QadaLedger', () => {
  it('shows the empty state before any event', async () => {
    renderApp('/app/qada')

    expect(await screen.findByTestId('qada-ledger')).toHaveTextContent('لا فوائت مسجّلة')
  })

  it('shows the seeded debt on every prayer row', async () => {
    await addQadaDebt(3, CREATED_AT)
    renderApp('/app/qada')

    for (const prayer of QADA_PRAYERS) {
      expect(await screen.findByTestId(`qada-count-${prayer.id}`)).toHaveTextContent(
        toArabicIndic(3),
      )
    }
  })

  it('decrements only the paid prayer', async () => {
    await addQadaDebt(3, CREATED_AT)
    renderApp('/app/qada')

    fireEvent.click(await screen.findByTestId('qada-pay-fajr'))

    await waitFor(() => {
      expect(screen.getByTestId('qada-count-fajr')).toHaveTextContent('فائتتان')
    })
    expect(screen.getByTestId('qada-count-dhuhr')).toHaveTextContent(toArabicIndic(3))
  })
})
