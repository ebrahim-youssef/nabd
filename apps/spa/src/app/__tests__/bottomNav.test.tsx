import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'

import { shellCopy } from '@nabd/shared'

import { renderApp } from '../../test/memoryApp'

const NAV_TEST_IDS = ['nav-libraries', 'nav-prayer-times', 'nav-home', 'nav-stats', 'nav-settings']

describe('BottomNav', () => {
  it('renders the five Arabic links in order with the legacy test ids', () => {
    renderApp('/app')

    const labels = NAV_TEST_IDS.map((id) => screen.getByTestId(id).textContent)
    expect(labels).toEqual([
      shellCopy.nav.libraries,
      shellCopy.nav.prayerTimes,
      shellCopy.nav.home,
      shellCopy.nav.stats,
      shellCopy.nav.settings,
    ])

    expect(screen.getByTestId('bottom-nav')).toHaveAttribute('aria-label', shellCopy.navAriaLabel)
    expect(screen.getByTestId('nav-libraries')).toHaveAttribute('href', '/app/libraries')
    expect(screen.getByTestId('nav-prayer-times')).toHaveAttribute('href', '/app/prayer-times')
    expect(screen.getByTestId('nav-home')).toHaveAttribute('href', '/app')
    expect(screen.getByTestId('nav-stats')).toHaveAttribute('href', '/app/stats')
    expect(screen.getByTestId('nav-settings')).toHaveAttribute('href', '/app/settings')
  })

  it.each([
    ['/app', 'nav-home'],
    ['/app/libraries', 'nav-libraries'],
    ['/app/adhkar', 'nav-libraries'],
    ['/app/niyyat', 'nav-libraries'],
    ['/app/prayer-times', 'nav-prayer-times'],
    ['/app/stats', 'nav-stats'],
    ['/app/qada', 'nav-stats'],
    ['/app/settings', 'nav-settings'],
  ] as const)('marks the active pill for %s as %s', (path, activeId) => {
    renderApp(path)

    for (const id of NAV_TEST_IDS) {
      const link = screen.getByTestId(id)
      if (id === activeId) {
        expect(link).toHaveAttribute('aria-current', 'page')
      } else {
        expect(link).not.toHaveAttribute('aria-current')
      }
    }
  })

  it('uses exact matching for home, so it is not active on descendants', () => {
    renderApp('/app/settings')

    expect(screen.getByTestId('nav-home')).not.toHaveAttribute('aria-current')
    expect(screen.getByTestId('nav-settings')).toHaveAttribute('aria-current', 'page')
  })

  it('does not activate a section for a merely similar route prefix', () => {
    renderApp('/app/libraries2')

    for (const id of NAV_TEST_IDS) {
      expect(screen.getByTestId(id)).not.toHaveAttribute('aria-current')
    }
  })
})
