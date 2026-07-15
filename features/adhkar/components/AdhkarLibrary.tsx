import { ChevronDown } from 'lucide-react'

import { ADHKAR_LIBRARY } from '@/content/adhkar'
import { toArabicIndic } from '@/lib/pure/format'

// The browsable adhkar reference (NBD-12, accordions per NBD-23). Pure static content — a
// server component with no data access, independent of the user's wird. Categories are
// native <details> disclosures (closed by default) so long lists stay scannable.
export function AdhkarLibrary() {
  return (
    <div className="flex flex-col gap-3" data-testid="adhkar-library">
      {ADHKAR_LIBRARY.map((category) => (
        <details
          key={category.id}
          className="group bg-surface-2 rounded-card"
          data-testid={`adhkar-category-${category.id}`}
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4">
            <span className="flex items-center gap-2">
              <h2 className="font-display text-title text-primary">{category.title}</h2>
              <ChevronDown
                aria-hidden
                className="text-muted-foreground size-5 transition-transform group-open:rotate-180"
              />
            </span>
            <span className="text-muted-foreground text-small">
              {toArabicIndic(category.items.length)} ذكرًا
            </span>
          </summary>
          <ul className="flex flex-col gap-3 px-4 pb-4">
            {category.items.map((dhikr) => (
              <li
                key={dhikr.id}
                className="bg-surface flex flex-col gap-2 rounded-card p-4"
                data-testid={`dhikr-${dhikr.id}`}
              >
                <p className="font-scripture text-scripture text-foreground">{dhikr.text}</p>
                <div className="text-muted-foreground flex flex-wrap items-center gap-3 text-small">
                  {dhikr.repeat > 1 && (
                    <span className="text-gold shrink-0 font-medium">
                      ×{toArabicIndic(dhikr.repeat)}
                    </span>
                  )}
                  {dhikr.virtue && <span>{dhikr.virtue}</span>}
                </div>
              </li>
            ))}
          </ul>
        </details>
      ))}
    </div>
  )
}
