// Appearance (NBD-37): theme (lighting) + mode (character) are device preferences — they live
// in localStorage, never in Dexie, never synced. The fixed pre-paint script injected at build
// time applies them before first paint; these helpers are the only write path afterwards.
// Every read/apply tolerates a throwing storage layer so the app never breaks on a blocked
// or disabled localStorage.

export type Theme = 'light' | 'dark'
export type Mode = 'classic' | 'modern'

export const THEME_STORAGE_KEY = 'nabd:theme'
export const MODE_STORAGE_KEY = 'nabd:mode'

const THEME_ATTRIBUTE = 'data-theme'
const MODE_ATTRIBUTE = 'data-mode'

const DEFAULT_THEME: Theme = 'light'
const DEFAULT_MODE: Mode = 'classic'

const VALID_THEMES: readonly Theme[] = ['light', 'dark']
const VALID_MODES: readonly Mode[] = ['classic', 'modern']

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

// Inline no-FOUC script for the app document: applies the stored preferences before first
// paint. It is a fixed build-time constant (no user/DOM interpolation), dependency-free, and
// defensive because it is serialized into the initial HTML — a CSP hash/nonce decision for it
// is deferred (NBD-83 leaves CSP out of scope).
export const APPEARANCE_INIT_SCRIPT =
  "try{var d=document.documentElement;if(localStorage.getItem('nabd:theme')==='dark')d.setAttribute('data-theme','dark');if(localStorage.getItem('nabd:mode')==='modern')d.setAttribute('data-mode','modern')}catch(e){}"
