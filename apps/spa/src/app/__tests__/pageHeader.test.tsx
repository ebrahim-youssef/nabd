import { describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router'
import { render, screen } from '@testing-library/react'

import { shellCopy } from '@nabd/shared'

import { PageHeader } from '../PageHeader'

describe('PageHeader', () => {
  it('renders the title and an always-visible accessible back link', () => {
    render(
      <MemoryRouter>
        <PageHeader title="العنوان" backHref="/app" />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { level: 1, name: 'العنوان' })).toBeInTheDocument()
    expect(screen.getByTestId('page-back')).toHaveAttribute('href', '/app')
    expect(screen.getByTestId('page-back')).toHaveAttribute('aria-label', shellCopy.back)
  })
})
