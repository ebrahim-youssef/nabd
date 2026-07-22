'use client'

import { useEffect } from 'react'

// Lets a modal/sheet opt into being closed by the Android hardware back button before the app
// navigates or exits (NBD-75). NativeChrome dispatches a cancelable `nabd:back` event on the
// window; while `isOpen`, this hook catches it, cancels it (so NativeChrome knows the press was
// consumed and does NOT also navigate), and runs `onClose`. On web the event never fires, so
// this is inert — safe to use in any surface. Reusable by the bottom sheets in NBD-77.
export function useBackDismiss(isOpen: boolean, onClose: () => void): void {
  useEffect(() => {
    if (!isOpen) return
    const handler = (event: Event) => {
      event.preventDefault()
      onClose()
    }
    window.addEventListener('nabd:back', handler)
    return () => window.removeEventListener('nabd:back', handler)
  }, [isOpen, onClose])
}
