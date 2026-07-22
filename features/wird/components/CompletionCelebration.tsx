'use client'

import { Award } from 'lucide-react'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { today } from '@/lib/impure/clock'
import { hapticSuccess } from '@/lib/impure/haptics'
import { shareText } from '@/lib/impure/share'

import { useWirdChecklist } from '../hooks/useWirdChecklist'
import { summarizeChecklist } from '../logic'

// Once per day: the last required check-off flips this key so a reload never re-celebrates.
const CELEBRATED_KEY = 'nabd:celebrated-day'

const COPY = {
  title: 'أتمَمْتَ وِرْدَكَ اليوم',
  hadith: '«أَحَبُّ الأَعْمَالِ إِلَى اللهِ أَدْوَمُهَا وَإِنْ قَلَّ» — متفق عليه',
  share: 'شارك إنجازك',
  shareText: 'أتممتُ وِردي اليوم بفضل الله — نبض، رفيقك اليومي للوِرد.',
  copied: 'نُسخ إلى الحافظة ✓',
  dismiss: 'واصِل',
} as const

// Full-screen celebration when the day's required wird hits ١٠٠٪ (NBD-32, design-notes-r3
// §7). Shows exactly once per day (device-local marker); voluntary تطوّع never gates it.
export function CompletionCelebration() {
  const [day] = useState(() => today())
  const { areas, isLoading } = useWirdChecklist(day)
  const [show, setShow] = useState(false)
  const [copied, setCopied] = useState(false)

  const summary = summarizeChecklist(areas)
  const complete = !isLoading && summary.total > 0 && summary.remaining === 0

  useEffect(() => {
    if (!complete) return
    // Deferred a tick: localStorage is client-only (same pattern as the coords cache).
    const timer = window.setTimeout(() => {
      try {
        if (window.localStorage.getItem(CELEBRATED_KEY) === day) return
        window.localStorage.setItem(CELEBRATED_KEY, day)
        setShow(true)
        hapticSuccess()
      } catch {
        // No marker storage just means no celebration — never block the checklist.
      }
    }, 0)
    return () => window.clearTimeout(timer)
  }, [complete, day])

  if (!show) return null

  return (
    <div
      role="dialog"
      aria-label={COPY.title}
      data-testid="completion-celebration"
      className="pattern-khatam text-on-primary animate-in fade-in fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 px-6 text-center duration-300"
    >
      <span className="border-gold animate-in zoom-in-75 fade-in relative flex size-28 items-center justify-center rounded-full border-4 duration-500">
        <span aria-hidden className="border-on-primary/20 absolute -inset-2 rounded-full border" />
        <Award className="text-gold size-14" aria-hidden />
      </span>
      <h2 className="font-display text-display animate-in fade-in slide-in-from-bottom-2 duration-500">
        {COPY.title}
      </h2>
      <p className="font-scripture text-scripture animate-in fade-in max-w-md opacity-90 duration-700">
        {COPY.hadith}
      </p>
      <div className="flex items-center gap-3">
        <Button
          variant="secondary"
          onClick={() => {
            void shareText(COPY.shareText).then((how) => setCopied(how === 'copied'))
          }}
          data-testid="celebration-share"
        >
          {COPY.share}
        </Button>
        <Button variant="ghost" onClick={() => setShow(false)} data-testid="celebration-dismiss">
          {COPY.dismiss}
        </Button>
      </div>
      {copied && <p className="text-small opacity-90">{COPY.copied}</p>}
    </div>
  )
}
