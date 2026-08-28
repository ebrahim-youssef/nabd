import { fireEvent, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { LOCATION_FAILURE_COPY } from '@nabd/shared'

import { applyCalculationMethodId } from './prayerMethod'
import { renderApp } from '../test/memoryApp'

const coords = { latitude: 30.0444, longitude: 31.2357 }
const prayerIds = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha']

describe('PrayerTimesToday', () => {
  beforeEach(() => localStorage.clear())

  it('shows the location prompt before coordinates exist', () => {
    renderApp('/app/prayer-times')

    expect(screen.getByTestId('enable-location-page')).toBeInTheDocument()
  })

  it('shows the denied explanation after a rejected enable request', async () => {
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition: (_success: unknown, failure: (error: { code: number }) => void) =>
          failure({ code: 1 }),
      },
    })
    renderApp('/app/prayer-times')

    fireEvent.click(screen.getByTestId('enable-location-page'))

    expect(await screen.findByTestId('location-failure-page')).toHaveTextContent(
      LOCATION_FAILURE_COPY.denied,
    )
  })

  it('renders all day rows with one current or next chip when coordinates are cached', () => {
    localStorage.setItem('nabd:coords', JSON.stringify(coords))
    renderApp('/app/prayer-times')

    expect(screen.getByTestId('prayer-times-today')).toBeInTheDocument()
    for (const id of prayerIds) expect(screen.getByTestId(`time-row-${id}`)).toBeInTheDocument()
    expect(screen.getAllByText(/الآن|التالي/)).toHaveLength(1)
  })

  it('recalculates Fajr when the selected method event arrives', async () => {
    localStorage.setItem('nabd:coords', JSON.stringify(coords))
    renderApp('/app/prayer-times')
    const before = screen.getByTestId('time-value-fajr').textContent

    applyCalculationMethodId('umm_al_qura')

    await waitFor(() => expect(screen.getByTestId('time-value-fajr').textContent).not.toBe(before))
  })
})

describe('usePrayerTimes event updates', () => {
  it('populates the screen after a coordinate event without remounting', async () => {
    localStorage.clear()
    renderApp('/app/prayer-times')
    expect(screen.getByTestId('enable-location-page')).toBeInTheDocument()

    localStorage.setItem('nabd:coords', JSON.stringify(coords))
    window.dispatchEvent(new Event('nabd:coords'))

    await waitFor(() => expect(screen.getByTestId('prayer-times-today')).toBeInTheDocument())
  })
})
