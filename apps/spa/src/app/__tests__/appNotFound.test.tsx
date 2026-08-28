import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import type { RouteObject } from 'react-router'

import { shellCopy } from '@nabd/shared'

import { AppShell } from '../AppShell'
import { AppNotFound } from '../NotFound'
import { renderApp } from '../../test/memoryApp'

describe('application not-found', () => {
  function renderAppNotFound() {
    const routes: RouteObject[] = [
      {
        path: '/app',
        Component: AppShell,
        children: [{ path: '*', Component: AppNotFound }],
      },
    ]
    renderApp('/app/unmatched-path', routes)
  }

  it('renders the Arabic not-found inside the app shell for unknown app paths', () => {
    renderAppNotFound()

    expect(screen.getByText(shellCopy.notFound)).toBeInTheDocument()
    expect(screen.getByTestId('bottom-nav')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: shellCopy.returnHome })).toHaveAttribute('href', '/app')
  })
})
