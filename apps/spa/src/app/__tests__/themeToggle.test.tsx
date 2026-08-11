import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'

import { ThemeToggle } from '../ThemeToggle'
import { THEME_STORAGE_KEY } from '../appearance'
import { shellCopy } from '@nabd/shared'

describe('ThemeToggle', () => {
  it('renders with an accessible name and toggles the persisted theme', () => {
    document.documentElement.setAttribute('data-theme', 'light')
    window.localStorage.removeItem(THEME_STORAGE_KEY)

    render(<ThemeToggle />)
    const button = screen.getByTestId('theme-toggle')
    expect(button).toHaveAttribute('aria-label', shellCopy.themeToggle)

    fireEvent.click(button)
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')

    fireEvent.click(button)
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('light')
  })
})
