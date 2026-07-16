import { ChevronDown } from 'lucide-react'

import { INTENTIONS_LIBRARY } from '@/content/intentions'
import { toArabicIndic } from '@/lib/pure/format'

// The intentions reference (NBD-13, bulleted NBD-36). Each deed is a native disclosure that
// opens to its set of intentions — one bullet per niyyah with its evidence line — so the
// count chip tells the user how many intentions a single deed can carry.
export function IntentionsLibrary() {
  return (
    <ul className="flex flex-col gap-3" data-testid="intentions-library">
      {INTENTIONS_LIBRARY.map((entry) => (
        <li key={entry.id}>
          <details
            className="border-border bg-surface shadow-card-sm group rounded-card border transition-shadow open:shadow-card"
            data-testid={`deed-${entry.id}`}
          >
            <summary className="text-body text-foreground flex cursor-pointer items-center gap-3 p-4 font-medium [&::-webkit-details-marker]:hidden">
              <span aria-hidden className="text-gold text-small shrink-0">
                ۞
              </span>
              <span className="min-w-0 flex-1">{entry.deed}</span>
              <span
                className="bg-surface-2 text-muted-foreground rounded-chip px-2.5 py-0.5 text-small shrink-0"
                data-testid={`deed-count-${entry.id}`}
              >
                {toArabicIndic(entry.intentions.length)} نيّات
              </span>
              <ChevronDown
                aria-hidden
                className="text-muted-foreground size-5 shrink-0 transition-transform group-open:rotate-180"
              />
            </summary>
            <ul className="border-gold/40 ms-6 me-4 mb-4 flex flex-col gap-3 border-s-2 ps-3">
              {entry.intentions.map((intention) => (
                <li key={intention.text} className="flex flex-col gap-0.5">
                  <span className="text-body text-foreground flex items-start gap-2">
                    <span aria-hidden className="text-gold text-small pt-1 shrink-0">
                      ✦
                    </span>
                    {intention.text}
                  </span>
                  {intention.evidence && (
                    <span className="font-scripture text-small text-muted-foreground ms-6">
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
  )
}
