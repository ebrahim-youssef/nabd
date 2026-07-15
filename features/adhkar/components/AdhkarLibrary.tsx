import { ADHKAR_LIBRARY } from '@/content/adhkar'

// The browsable adhkar reference (NBD-12). Pure static content — a server component with no
// data access, independent of the user's wird.
export function AdhkarLibrary() {
  return (
    <div className="flex flex-col gap-10" data-testid="adhkar-library">
      {ADHKAR_LIBRARY.map((category) => (
        <section key={category.id} className="flex flex-col gap-4">
          <h2 className="font-display text-title text-primary">{category.title}</h2>
          <ul className="flex flex-col gap-3">
            {category.items.map((dhikr) => (
              <li
                key={dhikr.id}
                className="bg-surface-2 flex flex-col gap-2 rounded-card p-4"
                data-testid={`dhikr-${dhikr.id}`}
              >
                <p className="font-scripture text-scripture text-foreground">{dhikr.text}</p>
                <div className="text-muted-foreground flex flex-wrap items-center gap-3 text-caption">
                  {dhikr.repeat > 1 && <span>يُقال {formatRepeat(dhikr.repeat)}</span>}
                  <span>{dhikr.source}</span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

const REPEAT_TWICE = 2

function formatRepeat(repeat: number): string {
  if (repeat === REPEAT_TWICE) return 'مرّتين'
  return `${repeat} مرّات`
}
