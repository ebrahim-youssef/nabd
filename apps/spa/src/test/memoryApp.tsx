import { render } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import type { RouteObject } from 'react-router'

import { routes } from '../router'

export function renderApp(initialPath: string, overrides?: RouteObject[]) {
  const router = createMemoryRouter(overrides ?? routes, { initialEntries: [initialPath] })
  const result = render(<RouterProvider router={router} />)
  return { router, unmount: result.unmount }
}
