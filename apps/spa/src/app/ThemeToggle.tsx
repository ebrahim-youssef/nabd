import { Moon, Sun } from 'lucide-react'

import { shellCopy } from '@nabd/shared'

import { toggleTheme } from './appearance'

// Header theme toggle (NBD-37): flips data-theme on <html>. The two icons swap purely via
// the CSS dark: variant, so the button needs no state.
export function ThemeToggle() {
  return (
    <button
      type="button"
      onClick={() => toggleTheme()}
      aria-label={shellCopy.themeToggle}
      data-testid="theme-toggle"
      className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-primary shadow-card-small transition-colors hover:bg-primary hover:text-on-primary"
    >
      <Moon className="size-5 dark:hidden" aria-hidden />
      <Sun className="hidden size-5 dark:block" aria-hidden />
    </button>
  )
}
