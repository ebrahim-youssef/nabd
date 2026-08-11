import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import type { RouteObject } from 'react-router'

import { shellCopy } from '@nabd/shared'

import { PublicNotFound } from './not-found'
import { renderApp } from '../test/memoryApp'

const PUBLIC_NOT_FOUND_ROUTES: RouteObject[] = [{ path: '*', Component: PublicNotFound }]

describe('public not-found', () => {
  it('renders an Arabic catch-all outside the app shell', () => {
    renderApp('/nope', PUBLIC_NOT_FOUND_ROUTES)

    expect(screen.getByText(shellCopy.notFound)).toBeInTheDocument()
    expect(screen.queryByTestId('bottom-nav')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: shellCopy.returnLanding })).toHaveAttribute('href', '/')
    expect(document.head.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe(
      'noindex, nofollow',
    )
  })
})
