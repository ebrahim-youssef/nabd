import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  applyMode,
  applyTheme,
  APPEARANCE_INIT_SCRIPT,
  MODE_STORAGE_KEY,
  readMode,
  readTheme,
  THEME_STORAGE_KEY,
  toggleTheme,
} from '../appearance'
import { injectPrePaintScript } from '../../../pre-paint'

function setStored(key: string, value: string | null) {
  if (value === null) window.localStorage.removeItem(key)
  else window.localStorage.setItem(key, value)
}

afterEach(() => {
  window.localStorage.clear()
  document.documentElement.removeAttribute('data-theme')
  document.documentElement.removeAttribute('data-mode')
})

describe('appearance defaults', () => {
  it('defaults to light theme and classic mode with empty storage', () => {
    expect(readTheme()).toBe('light')
    expect(readMode()).toBe('classic')
  })

  it('falls back to defaults for invalid stored values', () => {
    setStored(THEME_STORAGE_KEY, 'neon')
    setStored(MODE_STORAGE_KEY, 'antique')
    expect(readTheme()).toBe('light')
    expect(readMode()).toBe('classic')
  })

  it('returns valid stored values', () => {
    setStored(THEME_STORAGE_KEY, 'dark')
    setStored(MODE_STORAGE_KEY, 'modern')
    expect(readTheme()).toBe('dark')
    expect(readMode()).toBe('modern')
  })
})

describe('appearance apply and persist', () => {
  it('applies theme and mode to the document and persists them', () => {
    applyTheme('dark')
    applyMode('modern')

    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    expect(document.documentElement.getAttribute('data-mode')).toBe('modern')
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
    expect(window.localStorage.getItem(MODE_STORAGE_KEY)).toBe('modern')
  })

  it('toggles theme from light to dark and back', () => {
    document.documentElement.setAttribute('data-theme', 'light')
    expect(toggleTheme()).toBe('dark')
    expect(toggleTheme()).toBe('light')
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('light')
  })
})

describe('appearance storage failures', () => {
  it('reads the default theme and mode when storage is blocked', () => {
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage denied')
    })
    try {
      expect(readTheme()).toBe('light')
      expect(readMode()).toBe('classic')
      expect(vi.mocked(Storage.prototype.getItem)).toHaveBeenCalled()
    } finally {
      getItem.mockRestore()
    }
  })

  it('persists to the document even when storage writes throw', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage damaged')
    })
    try {
      applyTheme('dark')
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    } finally {
      setItem.mockRestore()
    }
  })
})

describe('fixed pre-paint script', () => {
  it('injects the static appearance script before the SPA module script', async () => {
    const indexHtml = await readFile(resolve(process.cwd(), 'index.html'), 'utf8')
    const transformed = injectPrePaintScript(indexHtml)

    const moduleScriptIndex = transformed.indexOf('<script type="module" src="/src/main.tsx">')
    const initScriptIndex = transformed.indexOf(`<script>${APPEARANCE_INIT_SCRIPT}</script>`)

    expect(initScriptIndex).toBeGreaterThanOrEqual(0)
    expect(moduleScriptIndex).toBeGreaterThan(initScriptIndex)
  })

  it('keeps the injected script fixed and dependency-free', () => {
    expect(APPEARANCE_INIT_SCRIPT).not.toMatch(/<\/script/)
    expect(APPEARANCE_INIT_SCRIPT).toContain('nabd:theme')
    expect(APPEARANCE_INIT_SCRIPT).toContain("'dark'")
    expect(APPEARANCE_INIT_SCRIPT).toContain("'modern'")
    expect(APPEARANCE_INIT_SCRIPT).not.toContain('innerHTML')
  })
})
