import { Award } from 'lucide-react'
import { useEffect, useState } from 'react'

import { summarizeChecklist, toDayId, WIRD_COPY } from '@nabd/shared'

import { shareText } from '../share'
import { useWirdChecklist } from './useWirdChecklist'

export const CELEBRATED_KEY = 'nabd:celebrated-day'

export function CompletionCelebration() {
  const [day] = useState(() => toDayId(new Date()))
  const { areas, isLoading } = useWirdChecklist(day)
  const [show, setShow] = useState(false)
  // Only the clipboard route needs telling — see `shareText` for why the other outcomes are silent.
  const [copied, setCopied] = useState(false)
  const summary = summarizeChecklist(areas)
  const complete = !isLoading && summary.total > 0 && summary.remaining === 0

  useEffect(() => {
    if (!complete) return
    const timer = window.setTimeout(() => {
      try {
        if (window.localStorage.getItem(CELEBRATED_KEY) === day) return
        window.localStorage.setItem(CELEBRATED_KEY, day)
        setShow(true)
      } catch {
        // Marker failure suppresses the optional celebration without blocking the checklist.
      }
    }, 0)
    return () => window.clearTimeout(timer)
  }, [complete, day])

  if (!show) return null

  return (
    <div
      role="dialog"
      aria-label={WIRD_COPY.celebrationTitle}
      data-testid="completion-celebration"
      className="pattern-khatam fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 px-6 text-center text-on-primary"
    >
      <span className="relative flex size-28 items-center justify-center rounded-icon border-4 border-gold">
        <span aria-hidden className="absolute -inset-2 rounded-icon border border-on-primary/20" />
        <Award className="size-14 text-gold" aria-hidden />
      </span>
      <h2 className="font-display text-display">{WIRD_COPY.celebrationTitle}</h2>
      <p className="max-w-md font-scripture text-scripture opacity-90">
        {WIRD_COPY.celebrationHadith}
      </p>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => {
            void shareText(WIRD_COPY.celebrationShareText).then((how) =>
              setCopied(how === 'copied'),
            )
          }}
          data-testid="celebration-share"
          className="rounded-button border border-on-primary/40 px-6 py-3 text-body font-semibold text-on-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
        >
          {WIRD_COPY.celebrationShare}
        </button>
        <button
          type="button"
          onClick={() => setShow(false)}
          data-testid="celebration-dismiss"
          className="rounded-button bg-surface px-6 py-3 text-body font-semibold text-primary shadow-card-small focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
        >
          {WIRD_COPY.celebrationDismiss}
        </button>
      </div>
      {copied && (
        <p className="text-small opacity-90" data-testid="celebration-copied">
          {WIRD_COPY.celebrationCopied}
        </p>
      )}
    </div>
  )
}
