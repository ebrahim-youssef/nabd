import { ChevronDown } from 'lucide-react'

import { INTENTIONS_LIBRARY } from '@/content/intentions'

// The intentions reference (NBD-13). Each deed is a native disclosure the user opens to read
// its intention — no JS, server-rendered, accessible by default.
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
              <ChevronDown
                aria-hidden
                className="text-muted-foreground size-5 shrink-0 transition-transform group-open:rotate-180"
              />
            </summary>
            <p className="border-gold/40 text-body text-muted-foreground ms-6 me-4 mb-4 border-s-2 ps-3">
              {entry.intention}
            </p>
          </details>
        </li>
      ))}
    </ul>
  )
}
