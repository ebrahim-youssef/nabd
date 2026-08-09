import { Keyboard } from '@capacitor/keyboard'

import { isNativePlatform } from './native'

// Keyboard behavior for the Android shell (NBD-79). `resize: 'native'` (capacitor.config.ts)
// shrinks the WebView when the keyboard opens so a focused field is never hidden behind it.
// This adds a belt-and-suspenders scroll: when the keyboard shows, nudge the focused element
// fully into the resized viewport (helps the bottom-sheet inputs, e.g. the qada estimate).
// Guarded + fire-and-forget: inert on web, and a listener failure never breaks a form.
export function initKeyboard(): () => void {
  if (!isNativePlatform()) return () => {}
  let remove: (() => void) | undefined
  void Keyboard.addListener('keyboardWillShow', () => {
    const active = document.activeElement
    if (active instanceof HTMLElement) {
      active.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }
  })
    .then((handle) => {
      remove = () => void handle.remove().catch(() => {})
    })
    .catch(() => {})
  return () => remove?.()
}
