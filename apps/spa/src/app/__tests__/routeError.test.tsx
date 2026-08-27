import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import type { RouteObject } from 'react-router'

import { shellCopy } from '@nabd/shared'

import { routes } from '../../router'
import { renderApp } from '../../test/memoryApp'

const { captureExceptionMock } = vi.hoisted(() => ({
  captureExceptionMock: vi.fn(),
}))

vi.mock('../../observability/sentry', () => ({
  initializeSentry: () => {},
  captureException: captureExceptionMock,
  Sentry: {},
}))

const THROWING_MESSAGE = 'internal-top-secret-failure'

function ThrowingRoute(): never {
  throw new Error(THROWING_MESSAGE)
}

// The boundaries are only worth testing where they actually live, so every case here drives the
// exported production route tree with one component swapped for a throwing one. A boundary that
// is removed or moved in `router.tsx` fails these tests instead of passing against a substitute
// tree built inside the test file.
function throwAt(tree: RouteObject[], match: (route: RouteObject) => boolean): RouteObject[] {
  return tree.map((route) => {
    if (match(route)) return { ...route, Component: ThrowingRoute, children: undefined }
    if (route.children) return { ...route, children: throwAt(route.children, match) }
    return route
  })
}

describe('route error boundaries', () => {
  beforeEach(() => {
    captureExceptionMock.mockClear()
  })

  it('keeps a failing application page inside the shell without leaking the error', () => {
    renderApp(
      '/app',
      throwAt(routes, (route) => route.index === true),
    )

    expect(screen.getByText(shellCopy.error)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: shellCopy.retry })).toHaveAttribute('href', '/app')
    expect(screen.queryByText(THROWING_MESSAGE)).not.toBeInTheDocument()
    expect(screen.queryByText(new RegExp(shellCopy.notFound))).not.toBeInTheDocument()
    expect(screen.getByTestId('bottom-nav')).toBeInTheDocument()
    expect(captureExceptionMock).toHaveBeenCalledTimes(1)
  })

  it('reports the in-shell route error to Sentry', () => {
    renderApp(
      '/app',
      throwAt(routes, (route) => route.index === true),
    )

    expect(captureExceptionMock).toHaveBeenCalledTimes(1)
    const [reported] = captureExceptionMock.mock.calls[0] as [Error]
    expect(reported).toBeInstanceOf(Error)
    expect(reported.message).toBe(THROWING_MESSAGE)
  })

  it('never exposes the error stack', () => {
    renderApp(
      '/app',
      throwAt(routes, (route) => route.index === true),
    )

    expect(screen.queryByText(/stack/i)).not.toBeInTheDocument()
    expect(screen.getByText(shellCopy.error).textContent).toBe(shellCopy.error)
  })

  it('contains a failure in the shell itself with a full-page surface', () => {
    renderApp(
      '/app',
      throwAt(routes, (route) => route.path === '/app'),
    )

    expect(screen.getByText(shellCopy.error)).toBeInTheDocument()
    expect(screen.queryByText(THROWING_MESSAGE)).not.toBeInTheDocument()
    expect(screen.queryByTestId('bottom-nav')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: shellCopy.returnLanding })).toHaveAttribute('href', '/')
    expect(document.head.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe(
      'noindex, nofollow',
    )
  })

  it('contains a failure in the public catch-all without making it indexable', () => {
    renderApp(
      '/totally-unknown',
      throwAt(routes, (route) => route.path === '*'),
    )

    expect(screen.getByText(shellCopy.error)).toBeInTheDocument()
    expect(screen.queryByText(THROWING_MESSAGE)).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: shellCopy.returnLanding })).toHaveAttribute('href', '/')
    expect(document.head.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe(
      'noindex, nofollow',
    )
  })

  it('contains a failure on the public landing route', () => {
    renderApp(
      '/',
      throwAt(routes, (route) => route.path === '/'),
    )

    expect(screen.getByText(shellCopy.error)).toBeInTheDocument()
    expect(screen.queryByText(THROWING_MESSAGE)).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: shellCopy.returnLanding })).toHaveAttribute('href', '/')
  })
})
