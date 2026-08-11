import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'

import { shellCopy } from '@nabd/shared'

import { renderApp } from '../../test/memoryApp'

describe('AppShell', () => {
  it('renders the shell with the fixed bottom navigation and the transitional index', () => {
    renderApp('/app')

    expect(screen.getByTestId('bottom-nav')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: shellCopy.appName })).toBeInTheDocument()
    expect(screen.getByTestId('theme-toggle')).toBeInTheDocument()
  })

  it('adds a robots noindex meta while an app route is mounted', () => {
    renderApp('/app/settings')

    const meta = document.head.querySelector('meta[name="robots"]')
    expect(meta?.getAttribute('content')).toBe('noindex, nofollow')
  })
})
