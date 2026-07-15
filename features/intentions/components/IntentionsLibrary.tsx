import { INTENTIONS_LIBRARY } from '@/content/intentions'

// The intentions reference (NBD-13). Each deed is a native disclosure the user opens to read
// its intention — no JS, server-rendered, accessible by default.
export function IntentionsLibrary() {
  return (
    <ul className="flex flex-col gap-3" data-testid="intentions-library">
      {INTENTIONS_LIBRARY.map((entry) => (
        <li key={entry.id}>
          <details className="bg-surface-2 group rounded-card" data-testid={`deed-${entry.id}`}>
            <summary className="text-body text-foreground cursor-pointer list-none p-4 font-medium">
              {entry.deed}
            </summary>
            <p className="text-body text-muted-foreground px-4 pb-4">{entry.intention}</p>
          </details>
        </li>
      ))}
    </ul>
  )
}
