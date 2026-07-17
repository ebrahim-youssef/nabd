'use client'

import { AlarmClock, RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'

import { isNativePlatform } from '@/lib/impure/native'
import { toArabicIndic } from '@/lib/pure/format'

import { listPendingAlarms, scheduleTestAlarm, type PendingAlarm } from '../native-alarms'

// TEMPORARY debug panel (NBD-49, r6 §7): confirms the native alarm fires — with its adhan
// sound — without waiting for a real prayer, and lists what is scheduled. Native-shell only
// (renders nothing on the web). REMOVE once the owner has verified alarms on-device.
const MINUTE_MS = 60_000
const QUICK_TEST_MINUTES = 1
const TIME_FORMAT = new Intl.DateTimeFormat('ar-EG', {
  hour: 'numeric',
  minute: '2-digit',
  second: '2-digit',
})

export function AlarmDebug() {
  const [native, setNative] = useState(false)
  const [minutes, setMinutes] = useState(QUICK_TEST_MINUTES)
  const [status, setStatus] = useState<string | null>(null)
  const [pending, setPending] = useState<PendingAlarm[]>([])

  // Deferred a tick: Capacitor's bridge is absent during SSR (same guard the scheduler uses),
  // and deferring keeps the first client render identical to the server markup.
  useEffect(() => {
    const timer = window.setTimeout(() => setNative(isNativePlatform()), 0)
    return () => window.clearTimeout(timer)
  }, [])

  if (!native) return null

  const refresh = async () => setPending(await listPendingAlarms())

  const test = async (mins: number) => {
    const ok = await scheduleTestAlarm(Date.now() + mins * MINUTE_MS)
    setStatus(
      ok
        ? `تمت جدولة أذان تجريبي بعد ${toArabicIndic(mins)} دقيقة — أغلق التطبيق وانتظر.`
        : 'تعذّرت الجدولة — تأكد من صلاحية الإشعارات للتطبيق.',
    )
    await refresh()
  }

  return (
    <section className="flex flex-col gap-3" data-testid="alarm-debug">
      <div className="flex items-center gap-2">
        <h2 className="font-display text-title text-primary">تشخيص المنبّه</h2>
        <span className="border-gold/40 bg-gold-soft text-gold rounded-chip border px-2 py-0.5 text-label">
          مؤقّت
        </span>
      </div>

      <div className="border-border bg-surface shadow-card-sm flex flex-col gap-3 rounded-card border p-4">
        <button
          type="button"
          onClick={() => void test(QUICK_TEST_MINUTES)}
          data-testid="alarm-test-quick"
          className="border-primary/40 bg-primary/10 text-primary hover:bg-primary hover:text-on-primary flex items-center justify-center gap-2 rounded-card border p-3 text-body font-medium transition-colors"
        >
          <AlarmClock className="size-4.5" aria-hidden />
          جرّب أذاناً بعد دقيقة
        </button>

        <div className="flex items-center gap-2">
          <label className="text-muted-foreground text-small" htmlFor="alarm-debug-minutes">
            بعد
          </label>
          <input
            id="alarm-debug-minutes"
            type="number"
            min={1}
            max={120}
            value={minutes}
            onChange={(event) => setMinutes(Math.max(1, Number(event.target.value) || 1))}
            data-testid="alarm-minutes"
            className="border-border bg-surface w-20 rounded-card border p-2 text-center tabular-nums"
          />
          <span className="text-muted-foreground text-small">دقيقة</span>
          <button
            type="button"
            onClick={() => void test(minutes)}
            data-testid="alarm-test-custom"
            className="border-border bg-surface text-foreground hover:border-accent/40 ms-auto rounded-card border px-4 py-2 text-small font-medium transition-colors"
          >
            جدولة
          </button>
        </div>

        {status && (
          <p className="text-primary text-small" data-testid="alarm-status">
            {status}
          </p>
        )}
      </div>

      <div className="border-border bg-surface shadow-card-sm flex flex-col gap-2 rounded-card border p-4">
        <div className="flex items-center justify-between gap-3">
          <span className="text-body text-foreground font-medium">
            الإنذارات المجدولة ({toArabicIndic(pending.length)})
          </span>
          <button
            type="button"
            onClick={() => void refresh()}
            aria-label="تحديث القائمة"
            data-testid="alarm-refresh"
            className="border-border bg-surface text-muted-foreground hover:text-foreground flex items-center gap-1.5 rounded-chip border px-3 py-1 text-small transition-colors"
          >
            <RefreshCw className="size-3.5" aria-hidden />
            تحديث
          </button>
        </div>
        {pending.length === 0 ? (
          <p className="text-muted-foreground text-small">لا إنذارات مجدولة — اضغط «تحديث».</p>
        ) : (
          <ul className="flex flex-col gap-1.5" data-testid="alarm-pending-list">
            {pending.map((alarm) => (
              <li
                key={alarm.id}
                className="text-muted-foreground flex items-center justify-between gap-3 text-small"
              >
                <span className="min-w-0 truncate">{alarm.title || `#${alarm.id}`}</span>
                <span className="shrink-0 tabular-nums">
                  {alarm.at ? TIME_FORMAT.format(new Date(alarm.at)) : '—'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="text-muted-foreground text-label">
        أداة تشخيص مؤقّتة تظهر داخل التطبيق فقط — تُزال بعد التأكد من عمل المنبّه.
      </p>
    </section>
  )
}
