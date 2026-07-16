// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'

import {
  applyMode,
  applyTheme,
  MODE_STORAGE_KEY,
  readMode,
  THEME_STORAGE_KEY,
  toggleTheme,
} from '../impure/appearance'

describe('appearance', () => {
  // The runtime's built-in localStorage shim is method-incomplete under vitest — replace it
  // with a real in-memory implementation for these tests.
  const store = new Map<string, string>()

  beforeEach(() => {
    store.clear()
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => void store.set(key, String(value)),
        removeItem: (key: string) => void store.delete(key),
      },
    })
    document.documentElement.setAttribute('data-theme', 'light')
    document.documentElement.setAttribute('data-mode', 'classic')
  })

  it('applyTheme sets the attribute and persists', () => {
    applyTheme('dark')
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
  })

  it('toggleTheme flips light → dark → light', () => {
    expect(toggleTheme()).toBe('dark')
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    expect(toggleTheme()).toBe('light')
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
  })

  it('applyMode sets the attribute and readMode round-trips', () => {
    applyMode('modern')
    expect(document.documentElement.getAttribute('data-mode')).toBe('modern')
    expect(readMode()).toBe('modern')
  })

  it('readMode falls back to classic on garbage storage', () => {
    window.localStorage.setItem(MODE_STORAGE_KEY, 'neon')
    expect(readMode()).toBe('classic')
  })
})
