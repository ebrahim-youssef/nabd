// Appearance (NBD-37): theme (lighting) + mode (character) are device preferences — they
// live in localStorage, never in Dexie, never synced (same convention as coordinates and
// notification prefs). The inline layout script applies them before first paint; these
// helpers are the only write path afterwards.

export type Theme = 'light' | 'dark'
export type Mode = 'classic' | 'modern'

export const THEME_STORAGE_KEY = 'nabd:theme'
export const MODE_STORAGE_KEY = 'nabd:mode'

const THEME_ATTRIBUTE = 'data-theme'
const MODE_ATTRIBUTE = 'data-mode'

const DEFAULT_THEME: Theme = 'light'
const DEFAULT_MODE: Mode = 'classic'

export function readMode(): Mode {
  try {
    return window.localStorage.getItem(MODE_STORAGE_KEY) === 'modern' ? 'modern' : DEFAULT_MODE
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

// Inline no-FOUC script for the root layout: applies the stored preferences before first
// paint. Dependency-free and defensive because it is serialized into the initial HTML.
export const APPEARANCE_INIT_SCRIPT = `try{var d=document.documentElement;if(localStorage.getItem('${THEME_STORAGE_KEY}')==='dark')d.setAttribute('${THEME_ATTRIBUTE}','dark');if(localStorage.getItem('${MODE_STORAGE_KEY}')==='modern')d.setAttribute('${MODE_ATTRIBUTE}','modern')}catch(e){}`
