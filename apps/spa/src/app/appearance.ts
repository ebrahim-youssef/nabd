// Appearance (NBD-37): theme (lighting) + mode (character) are device preferences — they live
// in localStorage, never in Dexie, never synced. The fixed pre-paint script injected at build
// time applies them before first paint; these helpers are the only write path afterwards.
// Every read/apply tolerates a throwing storage layer so the app never breaks on a blocked
// or disabled localStorage.

import { DEFAULT_MODE, DEFAULT_THEME, VALID_MODES, VALID_THEMES } from '@nabd/shared'
import type { Mode, Theme } from '@nabd/shared'

export { APPEARANCE_INIT_SCRIPT } from './appearance-init'
export type { Mode, Theme } from '@nabd/shared'

export const THEME_STORAGE_KEY = 'nabd:theme'
export const MODE_STORAGE_KEY = 'nabd:mode'

const THEME_ATTRIBUTE = 'data-theme'
const MODE_ATTRIBUTE = 'data-mode'

export function readTheme(): Theme {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
    return VALID_THEMES.includes(stored as Theme) ? (stored as Theme) : DEFAULT_THEME
  } catch {
    return DEFAULT_THEME
  }
}

export function readMode(): Mode {
  try {
    const stored = window.localStorage.getItem(MODE_STORAGE_KEY)
    return VALID_MODES.includes(stored as Mode) ? (stored as Mode) : DEFAULT_MODE
  } catch {
    return DEFAULT_MODE
  }
}

export function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute(THEME_ATTRIBUTE, theme)
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // Losing the preference only costs re-toggling it next visit.
  }
}

export function applyMode(mode: Mode): void {
  document.documentElement.setAttribute(MODE_ATTRIBUTE, mode)
  try {
    window.localStorage.setItem(MODE_STORAGE_KEY, mode)
  } catch {
    // Same silent degradation as applyTheme.
  }
}

export function toggleTheme(): Theme {
  const next: Theme =
    document.documentElement.getAttribute(THEME_ATTRIBUTE) === 'dark' ? DEFAULT_THEME : 'dark'
  applyTheme(next)
  return next
}
