import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import type { RouteObject } from 'react-router'

import { shellCopy } from '@nabd/shared'

import { AppShell } from '../AppShell'

describe('accessible route loading', () => {
  function renderWithPendingRoute() {
    const routes: RouteObject[] = [
      {
        path: '/app',
        Component: AppShell,
        children: [
          { index: true, Component: () => <div>home</div> },
          {
            path: 'libraries',
            loader: async () => {
              await new Promise((resolve) => setTimeout(resolve, 60))
              return null
            },
            Component: () => <div>libraries</div>,
          },
        ],
      },
    ]
    const router = createMemoryRouter(routes, { initialEntries: ['/app'] })
    render(<RouterProvider router={router} />)
    return router
  }

  it('exposes a polite live region and announces in-flight navigation', async () => {
    renderWithPendingRoute()

    const status = screen.getByRole('status')
    expect(status).toHaveAttribute('aria-live', 'polite')
    expect(screen.queryByText(shellCopy.loading)).not.toBeInTheDocument()

    fireEvent.click(screen.getByTestId('nav-libraries'))

    expect(screen.getByText(shellCopy.loading)).toBeInTheDocument()
    expect(status).toHaveAttribute('aria-busy', 'true')

    await waitFor(() => expect(screen.queryByText(shellCopy.loading)).not.toBeInTheDocument())
    expect(status).toHaveAttribute('aria-busy', 'false')
  })

  it('keeps the live region inert while navigation is idle', () => {
    renderWithPendingRoute()

    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'false')
    expect(screen.queryByText(shellCopy.loading)).not.toBeInTheDocument()
  })
})
