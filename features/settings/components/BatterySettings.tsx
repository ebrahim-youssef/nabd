'use client'

import { BatteryCharging } from 'lucide-react'
import { useEffect, useState } from 'react'

import { requestBatteryExemption } from '@/lib/impure/battery'
import { isNativePlatform } from '@/lib/impure/native'

// حماية التنبيهات section (NBD-58, native only): lets a user who skipped the battery-saver step
// in onboarding exempt نبض later, so background prayer alarms fire reliably. Hidden on web —
// a browser has no OS battery-optimization setting to open.
const COPY = {
  title: 'حماية التنبيهات',
  heading: 'حماية التنبيهات من توفير البطارية',
  body: 'بعض الأجهزة توقف التطبيقات في الخلفية، فقد لا يصلك الأذان والتطبيق مغلق. فعّل الحماية لتصل التنبيهات في وقتها.',
  enable: 'تفعيل الحماية',
} as const

export function BatterySettings() {
  // Deferred a tick so SSR/static-export (native flag false at build) and the first client
  // render match; the flag is only true inside the Android WebView at runtime (same deferral
  // pattern as LocationSettings' localStorage read).
  const [native, setNative] = useState(false)
  useEffect(() => {
    const timer = window.setTimeout(() => setNative(isNativePlatform()), 0)
    return () => window.clearTimeout(timer)
  }, [])

  if (!native) return null

  return (
    <section className="flex flex-col gap-3" data-testid="battery-settings">
      <h2 className="font-display text-title text-primary">{COPY.title}</h2>
      <div className="border-border bg-surface shadow-card-sm flex flex-col gap-3 rounded-card border p-4">
        <span className="text-body text-foreground flex items-center gap-2 font-medium">
          <span
            aria-hidden
            className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-icon"
          >
            <BatteryCharging className="size-5" />
          </span>
          {COPY.heading}
        </span>
        <p className="text-muted-foreground text-small">{COPY.body}</p>
        <button
          type="button"
          onClick={() => void requestBatteryExemption()}
          data-testid="enable-battery-exemption"
          className="border-primary/40 bg-primary/10 text-primary hover:bg-primary hover:text-on-primary flex items-center justify-center gap-2 rounded-card border p-3 text-body font-medium transition-colors"
        >
          <BatteryCharging className="size-4.5" aria-hidden />
          {COPY.enable}
        </button>
      </div>
    </section>
  )
}
