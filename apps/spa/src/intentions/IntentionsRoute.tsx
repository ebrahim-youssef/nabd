import { ChevronDown } from 'lucide-react'

import { INTENTIONS_COPY, INTENTIONS_LIBRARY, toArabicIndic } from '@nabd/shared'

import { PageHeader } from '../app/PageHeader'

export function IntentionsRoute() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={INTENTIONS_COPY.libraryTitle} backHref="/app/libraries" />
      <p className="text-body text-muted-foreground">{INTENTIONS_COPY.introduction}</p>
      <ul className="flex flex-col gap-3" data-testid="intentions-library">
        {INTENTIONS_LIBRARY.map((entry) => (
          <li key={entry.id}>
            <details
              className="group rounded-card border border-border bg-surface shadow-card-small transition-shadow open:shadow-card"
              data-testid={`deed-${entry.id}`}
            >
              <summary className="flex cursor-pointer items-center gap-3 p-4 text-body font-medium text-foreground [&::-webkit-details-marker]:hidden">
                <span aria-hidden className="shrink-0 text-small text-gold">
                  ۞
                </span>
                <span className="min-w-0 flex-1">{entry.deed}</span>
                <span
                  className="shrink-0 rounded-chip bg-surface-2 px-2.5 py-0.5 text-small text-muted-foreground"
                  data-testid={`deed-count-${entry.id}`}
                >
                  {toArabicIndic(entry.intentions.length)} {INTENTIONS_COPY.countLabel}
                </span>
                <ChevronDown
                  aria-hidden
                  className="size-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                />
              </summary>
              <ul className="mb-4 me-4 ms-6 flex flex-col gap-3 border-s-2 border-gold/40 ps-3">
                {entry.intentions.map((intention) => (
                  <li key={intention.text} className="flex flex-col gap-0.5">
                    <span className="flex items-start gap-2 text-body text-foreground">
                      <span aria-hidden className="shrink-0 pt-1 text-small text-gold">
                        ✦
                      </span>
                      {intention.text}
                    </span>
                    {intention.evidence && (
                      <span className="ms-6 font-scripture text-small text-muted-foreground">
                        {intention.evidence}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </details>
          </li>
        ))}
      </ul>
      <p className="text-label text-muted-foreground">{INTENTIONS_COPY.attribution}</p>
    </div>
  )
}
