'use client'

import { Moon, Sun } from 'lucide-react'

import { toggleTheme } from '@/lib/impure/appearance'

// Header theme toggle (NBD-37): flips data-theme on <html>. The two icons swap purely via
// the CSS dark: variant, so the button needs no state and renders identically on the server.
export function ThemeToggle() {
  return (
    <button
      type="button"
      onClick={() => toggleTheme()}
      aria-label="تبديل المظهر الليلي"
      data-testid="theme-toggle"
      className="border-border bg-surface text-primary shadow-card-sm hover:bg-primary hover:text-on-primary flex size-9 shrink-0 items-center justify-center rounded-full border transition-colors"
    >
      <Moon className="size-5 dark:hidden" aria-hidden />
      <Sun className="hidden size-5 dark:block" aria-hidden />
    </button>
  )
}
