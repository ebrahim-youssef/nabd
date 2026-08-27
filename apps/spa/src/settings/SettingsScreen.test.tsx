import 'fake-indexeddb/auto'

import { fireEvent, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { WIRD_LEVELS } from '@nabd/shared'

import { db } from '../db/db'
import { renderApp } from '../test/memoryApp'
import { addVersion } from '../wird/db'

const CREATED_AT = 1_755_000_000_000

beforeEach(async () => {
  localStorage.clear()
  document.documentElement.removeAttribute('data-mode')
  await db.wirdVersions.clear()
  vi.stubGlobal('navigator', {
    geolocation: {
      getCurrentPosition: (success: PositionCallback) =>
        success({ coords: { latitude: 30, longitude: 31 } } as GeolocationPosition),
    },
  })
  vi.stubGlobal('isSecureContext', true)
  vi.stubGlobal('Notification', {
    permission: 'granted',
    requestPermission: vi.fn().mockResolvedValue('granted'),
  })
})

describe('SettingsScreen', () => {
  it('changes the selected calculation method', async () => {
    await addVersion('2026-08-12', WIRD_LEVELS[0].wird, CREATED_AT)
    renderApp('/app/settings')

    fireEvent.click(await screen.findByTestId('method-umm_al_qura'))

    expect(screen.getByTestId('method-umm_al_qura')).toHaveAttribute('aria-pressed', 'true')
  })

  it('applies the selected display mode', async () => {
    await addVersion('2026-08-12', WIRD_LEVELS[0].wird, CREATED_AT)
    renderApp('/app/settings')

    fireEvent.click(await screen.findByTestId('mode-modern'))

    expect(document.documentElement).toHaveAttribute('data-mode', 'modern')
  })

  it('shows the next-day level hint', async () => {
    await addVersion('2026-08-12', WIRD_LEVELS[0].wird, CREATED_AT)
    renderApp('/app/settings')

    expect(await screen.findByTestId('level-hint')).toHaveTextContent('يبدأ الورد الجديد من الغد')
  })

  it('shows the granted location state after enabling location', async () => {
    await addVersion('2026-08-12', WIRD_LEVELS[0].wird, CREATED_AT)
    renderApp('/app/settings')

    fireEvent.click(await screen.findByTestId('enable-location-settings'))

    await waitFor(() => expect(screen.getByTestId('location-granted')).toBeVisible())
  })

  it('persists enabled notification moments independently', async () => {
    await addVersion('2026-08-12', WIRD_LEVELS[0].wird, CREATED_AT)
    renderApp('/app/settings')

    fireEvent.click(await screen.findByTestId('notification-enabled'))
    fireEvent.click(await screen.findByTestId('notification-moment-atIqamah'))

    expect(JSON.parse(localStorage.getItem('nabd:notification-prefs') ?? '')).toMatchObject({
      enabled: true,
      atIqamah: false,
    })
  })
})
