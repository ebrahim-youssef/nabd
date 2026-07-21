'use client'

import { useState } from 'react'

import {
  readNotificationPrefs,
  requestNotificationPermission,
  writeNotificationPrefs,
  type NotificationPrefs,
} from '@/lib/impure/notifications'
import { cn } from '@/lib/utils'

const MOMENTS: {
  key: keyof NotificationPrefs
  label: string
}[] = [
  { key: 'beforeAdhan', label: 'قبل الأذان بربع ساعة' },
  { key: 'atAdhan', label: 'عند الأذان' },
  { key: 'atIqamah', label: 'عند الإقامة' },
  { key: 'morningAdhkar', label: 'تذكير أذكار الصباح' },
  { key: 'eveningAdhkar', label: 'تذكير أذكار المساء' },
]

const COPY = {
  title: 'التنبيهات',
  disabledNote: 'فعّل التنبيهات أعلاه لاختيار الأنواع.',
} as const

export function NotificationSettings() {
  const [prefs, setPrefs] = useState<NotificationPrefs>(readNotificationPrefs)
  const enabled = prefs.enabled

  const setMoment = (key: keyof NotificationPrefs, value: boolean) => {
    const next = { ...prefs, [key]: value }
    setPrefs(next)
    writeNotificationPrefs(next)
  }

  // Enabling must clear the OS permission first, or the toggle would be dead (the scheduler
  // never fires without a granted permission). Called from a user gesture, as the API requires.
  const toggleEnabled = async (value: boolean) => {
    if (!value) {
      setMoment('enabled', false)
      return
    }
    const result = await requestNotificationPermission()
    if (result === 'granted') setMoment('enabled', true)
  }

  return (
    <section className="flex flex-col gap-3" data-testid="notification-settings">
      <h2 className="font-display text-title text-primary">{COPY.title}</h2>

      <label
        className={cn(
          'border-border bg-surface shadow-card-sm flex cursor-pointer items-center gap-3 rounded-card border p-4 transition-all duration-200',
          enabled && 'border-primary bg-primary/10',
        )}
      >
        <input
          type="checkbox"
          checked={enabled}
          onChange={(event) => void toggleEnabled(event.target.checked)}
          className="accent-primary size-5"
          data-testid="notification-enabled"
        />
        <span className="text-body text-foreground font-medium">تفعيل التنبيهات</span>
      </label>

      <div className={cn('flex flex-col gap-2 ps-7', !enabled && 'opacity-40 pointer-events-none')}>
        {MOMENTS.map((moment) => (
          <label
            key={moment.key}
            className="flex cursor-pointer items-center gap-3 rounded-card p-2 transition-colors hover:bg-accent/5"
          >
            <input
              type="checkbox"
              checked={prefs[moment.key] === true}
              onChange={(event) => setMoment(moment.key, event.target.checked)}
              className="accent-primary size-4"
              data-testid={`notification-moment-${moment.key}`}
            />
            <span className={cn('text-small', prefs[moment.key] && 'text-foreground font-medium')}>
              {moment.label}
            </span>
          </label>
        ))}
      </div>

      {!enabled && <p className="text-muted-foreground text-label ps-7">{COPY.disabledNote}</p>}
    </section>
  )
}
