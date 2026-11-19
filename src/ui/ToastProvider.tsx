import type { ReactNode } from 'react'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { View } from 'react-native'

import { BOTTOM_NAV_CLEARANCE } from '../shell/BottomNav'
import { Toast } from './Toast'

export const TOAST_DURATION_MS = 5_000

type ToastMessage = { message: string; onUndo?: () => void }
type ToastContextValue = { show: (toast: ToastMessage) => void }
const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastMessage | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const hide = useCallback(() => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
    setToast(null)
  }, [])

  const show = useCallback((next: ToastMessage) => {
    if (timer.current) clearTimeout(timer.current)
    setToast(next)
    timer.current = setTimeout(() => {
      timer.current = null
      setToast(null)
    }, TOAST_DURATION_MS)
  }, [])
  const contextValue = useMemo(() => ({ show }), [show])

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current)
    },
    [],
  )

  return (
    <ToastContext.Provider value={contextValue}>
      <View className="flex-1" testID="toast-provider">
        {children}
        {toast ? (
          <View
            className="absolute inset-x-4 z-50"
            pointerEvents="box-none"
            style={{ bottom: BOTTOM_NAV_CLEARANCE }}
          >
            <Toast
              message={toast.message}
              onUndo={
                toast.onUndo
                  ? () => {
                      try {
                        toast.onUndo?.()
                      } finally {
                        hide()
                      }
                    }
                  : undefined
              }
              testID="global-toast"
            />
          </View>
        ) : null}
      </View>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used inside ToastProvider')
  return context
}
